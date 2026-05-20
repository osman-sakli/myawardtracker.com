"""Stripe webhook Lambda — the only public (un-authorized) route.

Trust comes from the signature check in :func:`stripe_client.construct_event`;
an event that fails verification is rejected with a 400 before any DB write.

Handles two plan shapes:

* Individual one-time purchase — ``checkout.session.completed`` with
  ``mode=payment``. Grants ``PAID_ACCESS_DAYS`` of access to ``USER#<sub>``.
* Organization yearly subscription — ``checkout.session.completed`` with
  ``mode=subscription`` plus ``customer.subscription.updated`` /
  ``customer.subscription.deleted`` for renewal and churn. Writes onto
  ``ORG#<orgId>``.
"""

from __future__ import annotations

import base64

from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

from app import db, stripe_client
from app.constants import PAID_ACCESS_DAYS

logger = Logger(service="myawardtracker-webhook")


def _is_org_ref(ref: str | None) -> bool:
    return bool(ref and ref.startswith("ORG#"))


def _parse_org_ref(ref: str) -> tuple[str, str]:
    """``ORG#<orgId>:<actorSub>`` -> (orgId, actorSub)."""
    rest = ref[len("ORG#"):]
    if ":" in rest:
        org_id, actor = rest.split(":", 1)
        return org_id, actor
    return rest, ""


def _tier_for_price(price_id: str) -> tuple[str, bool] | None:
    """Map a Stripe price id back to (tier, storageEnabled). Returns None on miss."""
    from app import config as cfg

    table = {
        cfg.STRIPE_PRICE_ORG_SMALL: ("small", False),
        cfg.STRIPE_PRICE_ORG_MEDIUM: ("medium", False),
        cfg.STRIPE_PRICE_ORG_LARGE: ("large", False),
        cfg.STRIPE_PRICE_ORG_SMALL_STORAGE: ("small", True),
        cfg.STRIPE_PRICE_ORG_MEDIUM_STORAGE: ("medium", True),
        cfg.STRIPE_PRICE_ORG_LARGE_STORAGE: ("large", True),
    }
    return table.get(price_id)


def _resolve_individual_user(stripe_object: dict) -> str | None:
    metadata = stripe_object.get("metadata") or {}
    ref = stripe_object.get("client_reference_id") or metadata.get("ref")
    if ref and not _is_org_ref(ref):
        return ref
    customer_id = stripe_object.get("customer")
    if customer_id:
        existing = db.find_subscription_by_stripe_customer(customer_id)
        if existing:
            return existing.get("userId")
    return None


# --- checkout.session.completed -------------------------------------------


def _handle_checkout_completed(session: dict) -> None:
    if session.get("payment_status") not in ("paid", "no_payment_required"):
        logger.info(
            "checkout completed but unpaid",
            payment_status=session.get("payment_status"),
        )
        return

    ref = session.get("client_reference_id") or ""

    # --- org subscription path ---
    if _is_org_ref(ref):
        org_id, actor_sub = _parse_org_ref(ref)
        # Resolve which tier/storage was bought from the line items.
        line_items = (session.get("line_items") or {}).get("data") or []
        if not line_items and session.get("id"):
            # Subscription Checkout often omits expanded line_items — fall back
            # to the subscription's first item via the API.
            try:
                client = stripe_client._client()  # noqa: SLF001
                items = client.checkout.Session.list_line_items(session["id"], limit=1).data
                line_items = [it.to_dict() for it in items]
            except Exception:
                line_items = []
        tier_storage: tuple[str, bool] | None = None
        for item in line_items:
            price = (item.get("price") or {}).get("id") or item.get("price_id")
            if not price:
                continue
            tier_storage = _tier_for_price(price)
            if tier_storage:
                break
        if not tier_storage:
            logger.warning("org checkout completed but tier not resolvable", org_id=org_id)
            return
        tier, storage_enabled = tier_storage
        db.grant_org_paid_access(
            org_id=org_id,
            tier=tier,
            storage_enabled=storage_enabled,
            days=PAID_ACCESS_DAYS,
            stripe_customer_id=session.get("customer"),
            stripe_subscription_id=session.get("subscription"),
        )
        db.add_org_audit(
            org_id, actor_sub or "system", "subscription.activated", "subscription", tier,
            {"storage": storage_enabled},
        )
        logger.info("org subscription activated", org_id=org_id, tier=tier)
        return

    # --- individual path (existing) ---
    user_id = ref or _resolve_individual_user(session)
    if not user_id:
        logger.warning("checkout.session.completed without a resolvable user")
        return
    db.grant_paid_access(
        user_id, days=PAID_ACCESS_DAYS, stripe_customer_id=session.get("customer")
    )
    db.add_audit(user_id, "subscription.purchased", "subscription", user_id)
    logger.info("granted paid access", user_id=user_id, days=PAID_ACCESS_DAYS)


# --- customer.subscription.updated ----------------------------------------


def _handle_subscription_updated(subscription: dict) -> None:
    """Re-issue access from a renewal/upgrade. Only org subscriptions land here
    because the Individual plan is mode=payment."""
    customer_id = subscription.get("customer")
    if not customer_id:
        return
    org_sub = db.find_org_subscription_by_stripe_customer(customer_id)
    if not org_sub:
        logger.info("subscription update for unknown org customer", customer=customer_id)
        return
    org_id = org_sub.get("orgId")
    items = (subscription.get("items") or {}).get("data") or []
    if not items:
        return
    price_id = (items[0].get("price") or {}).get("id")
    tier_storage = _tier_for_price(price_id) if price_id else None
    if not tier_storage:
        logger.warning("price not mapped to tier", price=price_id)
        return
    tier, storage_enabled = tier_storage
    if subscription.get("status") in {"active", "trialing"}:
        db.grant_org_paid_access(
            org_id=org_id,
            tier=tier,
            storage_enabled=storage_enabled,
            days=PAID_ACCESS_DAYS,
            stripe_customer_id=customer_id,
            stripe_subscription_id=subscription.get("id"),
        )
        db.add_org_audit(org_id, "system", "subscription.renewed", "subscription", tier)


def _handle_subscription_deleted(subscription: dict) -> None:
    customer_id = subscription.get("customer")
    if not customer_id:
        return
    org_sub = db.find_org_subscription_by_stripe_customer(customer_id)
    if not org_sub:
        return
    # Don't backdate paidUntil — let the existing window finish, but log the cancel.
    db.add_org_audit(
        org_sub.get("orgId", ""), "system", "subscription.canceled", "subscription",
        subscription.get("id", ""),
    )


_HANDLERS = {
    "checkout.session.completed": _handle_checkout_completed,
    "customer.subscription.updated": _handle_subscription_updated,
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
