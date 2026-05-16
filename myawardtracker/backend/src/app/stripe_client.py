"""Thin Stripe wrapper.

The SDK is configured lazily so a cold Lambda that never touches billing does
not pay the SSM lookup cost.
"""

from __future__ import annotations

import stripe

from . import config

_configured = False


def _client() -> "stripe":
    global _configured
    if not _configured:
        stripe.api_key = config.stripe_secret_key()
        _configured = True
    return stripe


def create_checkout_session(
    *,
    plan_id: str,
    price_id: str,
    success_url: str,
    cancel_url: str,
    customer_id: str | None,
    customer_email: str | None,
    client_reference_id: str,
) -> str:
    """Start a subscription Checkout session and return its hosted URL."""
    client = _client()
    params: dict = {
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": success_url,
        "cancel_url": cancel_url,
        "client_reference_id": client_reference_id,
        "metadata": {"planId": plan_id, "userId": client_reference_id},
        "subscription_data": {"metadata": {"planId": plan_id, "userId": client_reference_id}},
        "allow_promotion_codes": True,
    }
    if customer_id:
        params["customer"] = customer_id
    elif customer_email:
        params["customer_email"] = customer_email
    session = client.checkout.Session.create(**params)
    return session.url


def create_billing_portal_session(*, customer_id: str, return_url: str) -> str:
    client = _client()
    session = client.billing_portal.Session.create(
        customer=customer_id, return_url=return_url
    )
    return session.url


def construct_event(payload: bytes, signature: str) -> "stripe.Event":
    """Verify a webhook signature and return the parsed event."""
    return stripe.Webhook.construct_event(
        payload, signature, config.stripe_webhook_secret()
    )
