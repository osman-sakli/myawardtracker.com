"""Stripe webhook Lambda — the only public (un-authorized) route.

Trust comes from the signature check in :func:`stripe_client.construct_event`;
an event that fails verification is rejected with a 400 before any DB write.

The Individual plan is a one-time purchase, so the only event that matters is
``checkout.session.completed`` — it grants a fixed window of paid access.
"""

from __future__ import annotations

import base64

from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

from app import db, stripe_client
from app.constants import PAID_ACCESS_DAYS

logger = Logger(service="myawardtracker-webhook")


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
    if session.get("payment_status") not in ("paid", "no_payment_required"):
        logger.info(
            "checkout completed but unpaid",
            payment_status=session.get("payment_status"),
        )
        return
    user_id = session.get("client_reference_id") or _resolve_user_id(session)
    if not user_id:
        logger.warning("checkout.session.completed without a resolvable user")
        return
    db.grant_paid_access(
        user_id, days=PAID_ACCESS_DAYS, stripe_customer_id=session.get("customer")
    )
    db.add_audit(user_id, "subscription.purchased", "subscription", user_id)
    logger.info("granted paid access", user_id=user_id, days=PAID_ACCESS_DAYS)


_HANDLERS = {
    "checkout.session.completed": _handle_checkout_completed,
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
