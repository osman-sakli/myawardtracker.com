"""Personal notification inbox (bell icon)."""

from __future__ import annotations

from aws_lambda_powertools.event_handler.api_gateway import Router

from .. import db
from ..auth import current_user

router = Router()


@router.get("/v1/notifications")
def list_notifications() -> dict:
    user = current_user(router.current_event)
    return {"notifications": db.list_notifications(user.sub)}


@router.post("/v1/notifications/<sk>/read")
def mark_read(sk: str) -> dict:
    user = current_user(router.current_event)
    # SK uses our '__' for '#' convention when transported in URLs.
    db.mark_notification_read(user.sub, sk.replace("__", "#"))
    return {"read": True}
