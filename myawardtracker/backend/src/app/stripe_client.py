"""Thin Stripe wrapper.

The SDK is configured lazily so a cold Lambda that never touches billing does
not pay the Secrets Manager lookup cost.
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
    customer_email: str | None,
    client_reference_id: str,
    mode: str = "payment",
) -> str:
    """Start a Checkout session and return its hosted URL.

    ``mode='payment'`` is used for the individual one-time purchase; org plans
    pass ``mode='subscription'`` for the yearly recurring charge.
    """
    client = _client()
    params: dict = {
        "mode": mode,
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": success_url,
        "cancel_url": cancel_url,
        "client_reference_id": client_reference_id,
        "metadata": {"planId": plan_id, "ref": client_reference_id},
        "allow_promotion_codes": True,
    }
    if mode == "payment":
        params["payment_intent_data"] = {
            "metadata": {"planId": plan_id, "ref": client_reference_id}
        }
    elif mode == "subscription":
        params["subscription_data"] = {
            "metadata": {"planId": plan_id, "ref": client_reference_id}
        }
    if customer_email:
        params["customer_email"] = customer_email
    session = client.checkout.Session.create(**params)
    return session.url


def construct_event(payload: bytes, signature: str) -> "stripe.Event":
    """Verify a webhook signature and return the parsed event."""
    return stripe.Webhook.construct_event(
        payload, signature, config.stripe_webhook_secret()
    )
