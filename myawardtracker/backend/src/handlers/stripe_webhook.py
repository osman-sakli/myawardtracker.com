"""Stripe webhook Lambda — the only public (un-authorized) route.

Trust comes from the signature check in :func:`stripe_client.construct_event`;
an event that fails verification is rejected with a 400 before any DB write.
"""

from __future__ import annotations

import base64
import datetime as dt

from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

from app import db, stripe_client

logger = Logger(service="myawardtracker-webhook")


def _ts_to_iso(ts: int | None) -> str | None:
    if not ts:
        return None
    return dt.datetime.fromtimestamp(ts, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _resolve_user_id(stripe_object: dict) -> str | None:
    """Find which app user a Stripe object belongs to."""
    metadata = stripe_object.get("metadata") or {}
    if metadata.get("userId"):
        return metadata["userId"]
    customer_id = stripe_object.get("customer")
    if customer_id:
        existing = db.find_subscription_by_stripe_customer(customer_id)
        if existing:
            return existing.get("userId")
    return None


def _handle_checkout_completed(session: dict) -> None:
    user_id = session.get("client_reference_id") or _resolve_user_id(session)
    if not user_id:
        logger.warning("checkout.session.completed without a resolvable user")
        return
    metadata = session.get("metadata") or {}
    db.put_subscription(
        user_id,
        {
            "planId": metadata.get("planId", "individual"),
            "status": "active",
            "stripeCustomerId": session.get("customer"),
            "stripeSubscriptionId": session.get("subscription"),
            "cancelAtPeriodEnd": False,
        },
    )
    db.add_audit(user_id, "subscription.activated", "subscription", user_id)


def _handle_subscription_change(subscription: dict) -> None:
    user_id = _resolve_user_id(subscription)
    if not user_id:
        logger.warning("subscription change without a resolvable user")
        return
    metadata = subscription.get("metadata") or {}
    existing = db.get_subscription(user_id)
    db.put_subscription(
        user_id,
        {
            "planId": metadata.get("planId") or existing.get("planId", "individual"),
            "status": subscription.get("status", "active"),
            "stripeCustomerId": subscription.get("customer"),
            "stripeSubscriptionId": subscription.get("id"),
            "cancelAtPeriodEnd": bool(subscription.get("cancel_at_period_end")),
            "currentPeriodEnd": _ts_to_iso(subscription.get("current_period_end")),
        },
    )


def _handle_subscription_deleted(subscription: dict) -> None:
    user_id = _resolve_user_id(subscription)
    if not user_id:
        return
    existing = db.get_subscription(user_id)
    db.put_subscription(
        user_id,
        {
            "planId": existing.get("planId", "individual"),
            "status": "canceled",
            "stripeCustomerId": subscription.get("customer"),
            "stripeSubscriptionId": subscription.get("id"),
            "cancelAtPeriodEnd": False,
        },
    )
    db.add_audit(user_id, "subscription.canceled", "subscription", user_id)


_HANDLERS = {
    "checkout.session.completed": _handle_checkout_completed,
    "customer.subscription.created": _handle_subscription_change,
    "customer.subscription.updated": _handle_subscription_change,
    "customer.subscription.deleted": _handle_subscription_deleted,
}


def handler(event: dict, context: LambdaContext) -> dict:
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    signature = headers.get("stripe-signature", "")

    raw = event.get("body") or ""
    payload = base64.b64decode(raw) if event.get("isBase64Encoded") else raw.encode()

    try:
        stripe_event = stripe_client.construct_event(payload, signature)
    except Exception:  # noqa: BLE001 - any failure means we must reject
        logger.warning("stripe signature verification failed")
        return {"statusCode": 400, "body": "invalid signature"}

    event_type = stripe_event["type"]
    logger.info("stripe webhook received", event_type=event_type)

    handler_fn = _HANDLERS.get(event_type)
    if handler_fn:
        handler_fn(stripe_event["data"]["object"])

    return {"statusCode": 200, "body": "ok"}
