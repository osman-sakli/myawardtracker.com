"""Organization CRUD and listing the caller's memberships."""

from __future__ import annotations

from aws_lambda_powertools.event_handler.api_gateway import Router
from aws_lambda_powertools.event_handler.exceptions import (
    BadRequestError,
    ForbiddenError,
    NotFoundError,
)

from .. import db, entitlement, rbac, tenancy
from ..auth import current_user
from ..constants import tier_for_member_count
from ..models import OrganizationCreate, OrganizationUpdate

router = Router()


@router.get("/v1/orgs")
def list_my_orgs() -> dict:
    user = current_user(router.current_event)
    return {"memberships": db.list_organizations_for_user(user.sub)}


@router.post("/v1/orgs")
def create_org() -> tuple[dict, int]:
    user = current_user(router.current_event)
    db.ensure_user(user.sub, user.email, user.name)
    data = OrganizationCreate(**(router.current_event.json_body or {}))
    org = db.create_organization(
        owner_sub=user.sub,
        owner_email=user.email,
        owner_name=user.name or user.email,
        data=data.model_dump(),
    )
    db.add_org_audit(org["id"], user.sub, "org.created", "organization", org["id"])
    return {"org": org, "role": "owner"}, 201


@router.get("/v1/orgs/<org_id>")
def get_org(org_id: str) -> dict:
    user = current_user(router.current_event)
    org = tenancy.require_org(router.current_event, org_id, user)
    role = tenancy.org_role(router.current_event, org_id, user)
    subscription = entitlement.describe_org(org, db.get_org_subscription(org_id))
    # Recompute tier from the live memberCount each read.
    org["tier"] = tier_for_member_count(int(org.get("memberCount", 0)))
    return {"org": org, "role": role, "subscription": subscription}


@router.patch("/v1/orgs/<org_id>")
def update_org(org_id: str) -> dict:
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("org:update", role)
    data = OrganizationUpdate(**(router.current_event.json_body or {}))
    org = db.update_organization(org_id, data.model_dump(exclude_none=True))
    if not org:
        raise NotFoundError("organization not found")
    db.add_org_audit(org_id, user.sub, "org.updated", "organization", org_id)
    return {"org": org}


@router.delete("/v1/orgs/<org_id>")
def delete_org(org_id: str) -> dict:
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("org:delete", role)
    # Soft delete: mark and rely on the cleanup job to sweep child rows.
    if not db.update_organization(org_id, {"deletedAt": db.now_iso(), "name": "(deleted)"}):
        raise NotFoundError("organization not found")
    db.add_org_audit(org_id, user.sub, "org.deleted", "organization", org_id)
    return {"deleted": True}
