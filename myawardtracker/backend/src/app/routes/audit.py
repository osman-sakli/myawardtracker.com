"""Read-only audit history for the dashboard's activity log."""

from __future__ import annotations

from aws_lambda_powertools.event_handler.api_gateway import Router

from .. import db
from ..auth import current_user

router = Router()


@router.get("/v1/audit")
def list_audit() -> dict:
    user = current_user(router.current_event)
    return {"audit": db.list_audit(user.sub, limit=100)}
