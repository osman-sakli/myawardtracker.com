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
) -> str:
    """Start a one-time-payment Checkout session and return its hosted URL.

    ``mode="payment"`` charges the card once and does not attach it to a saved
    customer or set ``setup_future_usage`` — so no card details are retained
    after the charge completes.
    """
    client = _client()
    params: dict = {
        "mode": "payment",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": success_url,
        "cancel_url": cancel_url,
        "client_reference_id": client_reference_id,
        "metadata": {"planId": plan_id, "userId": client_reference_id},
        "payment_intent_data": {
            "metadata": {"planId": plan_id, "userId": client_reference_id}
        },
        "allow_promotion_codes": True,
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
