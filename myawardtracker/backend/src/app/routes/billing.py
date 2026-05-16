"""Stripe Checkout and billing-portal session creation."""

from __future__ import annotations

from aws_lambda_powertools.event_handler import Router
from aws_lambda_powertools.event_handler.exceptions import BadRequestError

from .. import config, db, stripe_client
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

    subscription = db.get_subscription(user.sub)
    checkout_url = stripe_client.create_checkout_session(
        plan_id=data.planId,
        price_id=price_id,
        success_url=data.successUrl,
        cancel_url=data.cancelUrl,
        customer_id=subscription.get("stripeCustomerId"),
        customer_email=user.email or None,
        client_reference_id=user.sub,
    )
    return {"checkoutUrl": checkout_url}


@router.post("/v1/billing/portal")
def create_portal() -> dict:
    user = current_user(router.current_event)
    body = router.current_event.json_body or {}
    return_url = body.get("returnUrl")
    if not return_url:
        raise BadRequestError("returnUrl is required")

    subscription = db.get_subscription(user.sub)
    customer_id = subscription.get("stripeCustomerId")
    if not customer_id:
        raise BadRequestError("no Stripe customer on file — start a checkout first")

    portal_url = stripe_client.create_billing_portal_session(
        customer_id=customer_id, return_url=return_url
    )
    return {"portalUrl": portal_url}
