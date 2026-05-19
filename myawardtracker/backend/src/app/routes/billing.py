"""Stripe Checkout session creation for the one-time Individual purchase."""

from __future__ import annotations

from aws_lambda_powertools.event_handler import Router
from aws_lambda_powertools.event_handler.exceptions import BadRequestError

from .. import config, stripe_client
from ..auth import current_user
from ..models import CheckoutRequest

router = Router()


@router.post("/v1/billing/checkout")
def create_checkout() -> dict:
    user = current_user(router.current_event)
    data = CheckoutRequest(**(router.current_event.json_body or {}))

    price_id = config.stripe_prices().get(data.planId)
    if not price_id:
        raise BadRequestError(f"no Stripe price configured for plan: {data.planId}")

    checkout_url = stripe_client.create_checkout_session(
        plan_id=data.planId,
        price_id=price_id,
        success_url=data.successUrl,
        cancel_url=data.cancelUrl,
        customer_email=user.email or None,
        client_reference_id=user.sub,
    )
    return {"checkoutUrl": checkout_url}
