"""Organization member listing and role management."""

from __future__ import annotations

from aws_lambda_powertools.event_handler.api_gateway import Router
from aws_lambda_powertools.event_handler.exceptions import (
    BadRequestError,
    ForbiddenError,
    NotFoundError,
)

from .. import db, rbac, tenancy
from ..auth import current_user
from ..models import MemberRoleChange

router = Router()


@router.get("/v1/orgs/<org_id>/members")
def list_members(org_id: str) -> dict:
    user = current_user(router.current_event)
    tenancy.org_role(router.current_event, org_id, user)  # asserts membership
    members = db.list_members(org_id)
    return {"members": members}


@router.patch("/v1/orgs/<org_id>/members/<member_sub>")
def change_role(org_id: str, member_sub: str) -> dict:
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("members:role", role)
    if member_sub == user.sub:
        raise BadRequestError("You cannot change your own role.")
    body = MemberRoleChange(**(router.current_event.json_body or {}))
    member = db.change_member_role(org_id, member_sub, body.role)
    if not member:
        raise NotFoundError("member not found")
    db.add_org_audit(
        org_id, user.sub, "member.role_changed", "member", member_sub,
        {"newRole": body.role},
    )
    return {"member": member}


@router.delete("/v1/orgs/<org_id>/members/<member_sub>")
def remove(org_id: str, member_sub: str) -> dict:
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("members:remove", role)

    target = db.get_member(org_id, member_sub)
    if not target:
        raise NotFoundError("member not found")
    if target.get("role") == "owner":
        raise ForbiddenError("Cannot remove the org owner; transfer ownership first.")
    db.remove_member(org_id, member_sub)
    db.add_org_audit(org_id, user.sub, "member.removed", "member", member_sub)
    return {"removed": True}


@router.delete("/v1/orgs/<org_id>/members/me")
def leave(org_id: str) -> dict:
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    if role == "owner":
        raise ForbiddenError("Owners cannot leave; transfer ownership or delete the org.")
    db.remove_member(org_id, user.sub)
    db.add_org_audit(org_id, user.sub, "member.left", "member", user.sub)
    return {"left": True}
