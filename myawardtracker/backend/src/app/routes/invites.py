"""Invite + accept flow.

Tier enforcement happens here: an invite that would push the org past its
plan's member cap raises 402 with a structured ``requiredTier`` so the
frontend can offer the upgrade prompt.
"""

from __future__ import annotations

from aws_lambda_powertools.event_handler import Response
from aws_lambda_powertools.event_handler.api_gateway import Router
from aws_lambda_powertools.event_handler.exceptions import (
    BadRequestError,
    ForbiddenError,
    NotFoundError,
)

from .. import db, mailer, rbac, tenancy
from ..auth import current_user
from ..constants import ORG_TIERS, tier_for_member_count
from ..models import InviteAccept, InviteCreate

router = Router()


def _cap_for_tier(tier_id: str) -> int:
    for t in ORG_TIERS:
        if t[0] == tier_id:
            return t[1]
    return ORG_TIERS[-1][1]


@router.post("/v1/orgs/<org_id>/invites")
def create_invite(org_id: str):
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("members:invite", role)

    org = db.get_organization(org_id)
    if not org:
        raise NotFoundError("organization not found")

    member_count = int(org.get("memberCount", 0))
    sub_record = db.get_org_subscription(org_id)
    paid_tier = sub_record.get("tier") or org.get("tier", "small")
    cap = _cap_for_tier(paid_tier)
    if member_count + 1 > cap:
        required = tier_for_member_count(member_count + 1)
        return Response(
            status_code=402,
            content_type="application/json",
            body=(
                '{"error":"plan_limit","message":"Inviting this member would exceed '
                f'your {paid_tier} plan\'s {cap}-member cap. Upgrade to continue.",'
                f'"requiredTier":"{required}","currentTier":"{paid_tier}"}}'
            ),
        )

    data = InviteCreate(**(router.current_event.json_body or {}))
    invite = db.create_invite(org_id, data.email, data.role, user.sub)
    mail_sent = mailer.send_invite(
        to=data.email,
        org_name=org.get("name", "your organization"),
        role=data.role,
        inviter_name=user.name or user.email or "An organization admin",
        token=invite["token"],
    )
    db.add_org_audit(
        org_id, user.sub, "invite.created", "invite", invite["id"],
        {"email": data.email, "role": data.role, "mailSent": mail_sent},
    )
    return {"invite": invite, "emailSent": mail_sent}, 201


@router.get("/v1/orgs/<org_id>/invites")
def list_invites(org_id: str) -> dict:
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("members:invite", role)
    return {"invites": db.list_invites(org_id)}


@router.delete("/v1/orgs/<org_id>/invites/<token>")
def revoke_invite(org_id: str, token: str) -> dict:
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("members:invite", role)
    db.delete_invite(org_id, token)
    db.add_org_audit(org_id, user.sub, "invite.revoked", "invite", token)
    return {"revoked": True}


@router.post("/v1/invites/accept")
def accept_invite() -> dict:
    user = current_user(router.current_event)
    db.ensure_user(user.sub, user.email, user.name)
    body = InviteAccept(**(router.current_event.json_body or {}))
    invite = db.resolve_invite(body.token)
    if not invite:
        raise NotFoundError("invite is invalid or has expired")
    if invite["email"].lower() != (user.email or "").lower():
        raise ForbiddenError("This invite was sent to a different email address.")

    # Skip if already a member.
    if db.get_membership(user.sub, invite["orgId"]):
        db.delete_invite(invite["orgId"], invite["token"])
        return {"orgId": invite["orgId"], "alreadyMember": True}

    db.add_member(
        invite["orgId"], user.sub, user.email, user.name or user.email, invite["role"]
    )
    db.delete_invite(invite["orgId"], invite["token"])
    db.add_org_audit(
        invite["orgId"], user.sub, "member.joined", "member", user.sub,
        {"via": "invite", "role": invite["role"]},
    )
    return {"orgId": invite["orgId"], "role": invite["role"]}
