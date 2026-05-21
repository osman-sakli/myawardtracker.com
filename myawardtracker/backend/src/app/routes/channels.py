"""Chat channels and message history (HTTP fallback for WebSocket).

The WebSocket Lambda (``backend/src/handlers/ws.py``) is the live path. These
HTTP routes back-fill it: paginated history on connect, plus a non-WS post
path used by clients that can't open a socket.
"""

from __future__ import annotations

from aws_lambda_powertools.event_handler.api_gateway import Router
from aws_lambda_powertools.event_handler.exceptions import (
    BadRequestError,
    ForbiddenError,
    NotFoundError,
)

from .. import db, rbac, tenancy
from ..auth import current_user
from ..constants import DEFAULT_CHAT_RETENTION_DAYS, ORG_ROLES
from ..models import ChannelCreate, MessagePin, MessagePost, MessageReact

router = Router()


def _role_at_least(role: str, min_role: str | None) -> bool:
    if not min_role:
        return True
    levels = {r: i for i, r in enumerate(ORG_ROLES)}
    return levels.get(role, 99) <= levels.get(min_role, 99)


@router.get("/v1/orgs/<org_id>/channels")
def list_channels(org_id: str) -> dict:
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("messages:read", role)
    channels = [c for c in db.list_channels(org_id) if _role_at_least(role, c.get("minRole"))]
    return {"channels": channels}


@router.post("/v1/orgs/<org_id>/channels")
def create_channel(org_id: str) -> tuple[dict, int]:
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("channels:create", role)
    data = ChannelCreate(**(router.current_event.json_body or {}))
    channel = db.create_channel(org_id, data.model_dump(exclude_none=True), user.sub)
    db.add_org_audit(org_id, user.sub, "channel.created", "channel", channel["id"])
    return {"channel": channel}, 201


@router.get("/v1/orgs/<org_id>/channels/<channel_id>/messages")
def list_messages(org_id: str, channel_id: str) -> dict:
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("messages:read", role)
    channel = db.get_channel(org_id, channel_id)
    if not channel:
        raise NotFoundError("channel not found")
    if not _role_at_least(role, channel.get("minRole")):
        raise ForbiddenError("Your role cannot view this channel.")
    before = router.current_event.get_query_string_value("before", None)
    limit = int(router.current_event.get_query_string_value("limit", "50"))
    limit = max(1, min(limit, 200))
    messages = db.list_messages(org_id, channel_id, limit=limit, before=before)
    return {"messages": list(reversed(messages))}  # oldest-first for rendering


@router.post("/v1/orgs/<org_id>/channels/<channel_id>/messages")
def post_message(org_id: str, channel_id: str) -> tuple[dict, int]:
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("messages:post", role)
    channel = db.get_channel(org_id, channel_id)
    if not channel:
        raise NotFoundError("channel not found")
    if not _role_at_least(role, channel.get("minRole")):
        raise ForbiddenError("Your role cannot post in this channel.")

    org = db.get_organization(org_id) or {}
    retention = int(org.get("chatRetentionDays") or DEFAULT_CHAT_RETENTION_DAYS)

    data = MessagePost(**(router.current_event.json_body or {}))
    msg = db.post_message(
        org_id, channel_id, user.sub, user.name or user.email, data.body, retention
    )
    return {"message": msg}, 201


@router.post("/v1/orgs/<org_id>/channels/<channel_id>/messages/<msg_sk>/react")
def react(org_id: str, channel_id: str, msg_sk: str) -> dict:
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("messages:post", role)
    data = MessageReact(**(router.current_event.json_body or {}))
    msg = db.react_to_message(org_id, channel_id, msg_sk, user.sub, data.emoji)
    if not msg:
        raise NotFoundError("message not found")
    return {"message": msg}


@router.post("/v1/orgs/<org_id>/channels/<channel_id>/messages/<msg_sk>/pin")
def pin(org_id: str, channel_id: str, msg_sk: str) -> dict:
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("messages:pin", role)
    body = MessagePin(**(router.current_event.json_body or {}))
    db.pin_message(org_id, channel_id, msg_sk, body.pinned)
    db.add_org_audit(
        org_id, user.sub, "message.pinned" if body.pinned else "message.unpinned",
        "message", msg_sk,
    )
    return {"pinned": body.pinned}
