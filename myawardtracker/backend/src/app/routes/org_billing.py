"""Stripe Checkout creation for organization plans."""

from __future__ import annotations

from aws_lambda_powertools.event_handler.api_gateway import Router
from aws_lambda_powertools.event_handler.exceptions import BadRequestError

from .. import config, db, rbac, stripe_client, tenancy
from ..auth import current_user
from ..models import CheckoutRequest

router = Router()


@router.post("/v1/orgs/<org_id>/billing/checkout")
def create_org_checkout(org_id: str) -> dict:
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("billing:manage", role)

    data = CheckoutRequest(**(router.current_event.json_body or {}))
    if data.planId == "individual":
        raise BadRequestError("Use /v1/billing/checkout for the individual plan.")
    price_id = config.stripe_prices().get(data.planId)
    if not price_id:
        raise BadRequestError(f"no Stripe price configured for plan: {data.planId}")

    # client_reference_id encodes both org and the human acting, so a refund
    # always traces to the buyer.
    ref = f"ORG#{org_id}:{user.sub}"
    url = stripe_client.create_checkout_session(
        plan_id=data.planId,
        price_id=price_id,
        success_url=data.successUrl,
        cancel_url=data.cancelUrl,
        customer_email=user.email or None,
        client_reference_id=ref,
        mode="subscription",
    )
    db.add_org_audit(org_id, user.sub, "billing.checkout_started", "subscription", data.planId)
    return {"checkoutUrl": url}


@router.get("/v1/orgs/<org_id>/billing/subscription")
def get_subscription(org_id: str) -> dict:
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("billing:manage", role)
    return {"subscription": db.get_org_subscription(org_id)}
