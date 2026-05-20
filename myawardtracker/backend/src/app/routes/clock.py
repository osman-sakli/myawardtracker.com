"""Clock-in / clock-out and the manager approval queue."""

from __future__ import annotations

from aws_lambda_powertools.event_handler.api_gateway import Router
from aws_lambda_powertools.event_handler.exceptions import (
    BadRequestError,
    NotFoundError,
)

from .. import db, rbac, tenancy
from ..auth import current_user
from ..models import ClockDecision, ClockIn, ClockOut

router = Router()


@router.post("/v1/orgs/<org_id>/clock/in")
def clock_in(org_id: str) -> tuple[dict, int]:
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("clock:self", role)
    data = ClockIn(**(router.current_event.json_body or {}))
    session = db.open_clock_session(
        org_id=org_id,
        user_sub=user.sub,
        user_name=user.name or user.email,
        activity_type=data.activityType,
        notes=data.notes,
        event_id=data.eventId,
        profile_id=data.profileId,
    )
    db.add_org_audit(org_id, user.sub, "clock.in", "clock", session["id"])
    return {"session": session}, 201


@router.post("/v1/orgs/<org_id>/clock/out")
def clock_out(org_id: str) -> dict:
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("clock:self", role)
    open_session = db.get_open_clock_session(org_id, user.sub)
    if not open_session:
        raise BadRequestError("You are not currently clocked in.")
    data = ClockOut(**(router.current_event.json_body or {}))
    # Reconstruct the SK from session id & timestamp.
    sk = f"CLOCK#{user.sub}#{open_session['startedAt']}#{open_session['id']}"
    session = db.close_clock_session(org_id, sk, data.notes)
    if not session:
        raise NotFoundError("session not found")
    db.add_org_audit(org_id, user.sub, "clock.out", "clock", session["id"])
    return {"session": session}


@router.get("/v1/orgs/<org_id>/clock/mine")
def my_sessions(org_id: str) -> dict:
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("clock:self", role)
    sessions = db.list_clock_sessions_for_user(org_id, user.sub)
    return {
        "sessions": sessions,
        "open": db.get_open_clock_session(org_id, user.sub),
    }


@router.get("/v1/orgs/<org_id>/clock/all")
def org_sessions(org_id: str) -> dict:
    """Manager view — recent sessions org-wide, defaults to last 7 days."""
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("clock:view_all", role)

    from_iso = router.current_event.get_query_string_value("from", None)
    to_iso = router.current_event.get_query_string_value("to", None)
    if not from_iso or not to_iso:
        end = db.now_dt()
        start = end - __import__("datetime").timedelta(days=7)
        from_iso = start.strftime("%Y-%m-%dT%H:%M:%SZ")
        to_iso = end.strftime("%Y-%m-%dT%H:%M:%SZ")

    sessions = db.list_clock_sessions_org_window(org_id, from_iso, to_iso)
    return {"sessions": sessions, "from": from_iso, "to": to_iso}


@router.post("/v1/orgs/<org_id>/clock/<member_sub>/<session_sk>/decide")
def decide(org_id: str, member_sub: str, session_sk: str) -> dict:
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("clock:approve", role)
    data = ClockDecision(**(router.current_event.json_body or {}))
    # The route passes the SK URL-encoded; client must encode '#'.
    sk = session_sk.replace("__", "#")  # simple safe-delimiter convention
    session = db.decide_clock_session(org_id, sk, user.sub, data.decision, data.note)
    if not session:
        raise NotFoundError("session not found or not awaiting decision")
    db.add_org_audit(
        org_id, user.sub,
        f"clock.{data.decision}d", "clock", session["id"],
        {"member": member_sub, "note": data.note},
    )
    # Notify the affected member.
    db.push_notification(
        member_sub,
        {
            "orgId": org_id,
            "kind": "clock_approved" if data.decision == "approve" else "clock_rejected",
            "title": "Clock session " + ("approved" if data.decision == "approve" else "rejected"),
            "body": data.note or "",
            "href": f"/dashboard/org/{org_id}/clock",
        },
    )
    return {"session": session}
