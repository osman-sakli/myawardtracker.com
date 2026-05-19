"""Account routes: the authenticated user and their subscription."""

from __future__ import annotations

from aws_lambda_powertools.event_handler import Router
from aws_lambda_powertools.event_handler.exceptions import BadRequestError

from .. import db, entitlement
from ..auth import current_user
from ..models import UserUpdate

router = Router()


@router.get("/v1/me")
def get_me() -> dict:
    user = current_user(router.current_event)
    record = db.ensure_user(user.sub, user.email, user.name)
    subscription = entitlement.describe(record, db.get_subscription(user.sub))
    return {"user": record, "subscription": subscription}


@router.patch("/v1/me")
def update_me() -> dict:
    user = current_user(router.current_event)
    db.ensure_user(user.sub, user.email, user.name)
    patch = UserUpdate(**(router.current_event.json_body or {}))

    if patch.defaultProfileId is not None and not db.get_profile(
        user.sub, patch.defaultProfileId
    ):
        raise BadRequestError("defaultProfileId does not reference an existing profile")

    record = db.update_user(user.sub, patch.model_dump(exclude_none=True))
    return {"user": record}
