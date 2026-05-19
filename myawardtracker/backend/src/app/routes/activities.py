"""Activity CRUD. Each activity belongs to a profile owned by the caller."""

from __future__ import annotations

from aws_lambda_powertools.event_handler import Router
from aws_lambda_powertools.event_handler.exceptions import BadRequestError, NotFoundError

from .. import db, entitlement, storage
from ..auth import current_user
from ..models import ActivityCreate, ActivityUpdate

router = Router()


@router.get("/v1/activities")
def list_activities() -> dict:
    user = current_user(router.current_event)
    activities = db.list_activities(user.sub)
    profile_id = router.current_event.get_query_string_value("profileId", "")
    if profile_id:
        activities = [a for a in activities if a.get("profileId") == profile_id]
    activities.sort(key=lambda a: a.get("date", ""), reverse=True)
    return {"activities": activities}


@router.post("/v1/activities")
def create_activity() -> tuple[dict, int]:
    user = current_user(router.current_event)
    record = db.ensure_user(user.sub, user.email, user.name)
    entitlement.require_access(record, db.get_subscription(user.sub))
    data = ActivityCreate(**(router.current_event.json_body or {}))
    if not db.get_profile(user.sub, data.profileId):
        raise BadRequestError("profileId does not reference an existing profile")
    activity = db.create_activity(user.sub, data.model_dump())
    db.add_audit(user.sub, "create", "activity", activity["id"])
    return {"activity": activity}, 201


@router.get("/v1/activities/<activity_id>")
def get_activity(activity_id: str) -> dict:
    user = current_user(router.current_event)
    activity = db.get_activity(user.sub, activity_id)
    if not activity:
        raise NotFoundError("activity not found")
    return {"activity": activity, "evidence": db.list_evidence(user.sub, activity_id)}


@router.patch("/v1/activities/<activity_id>")
def update_activity(activity_id: str) -> dict:
    user = current_user(router.current_event)
    data = ActivityUpdate(**(router.current_event.json_body or {}))
    activity = db.update_activity(
        user.sub, activity_id, data.model_dump(exclude_none=True)
    )
    if not activity:
        raise NotFoundError("activity not found")
    db.add_audit(user.sub, "update", "activity", activity_id)
    return {"activity": activity}


@router.delete("/v1/activities/<activity_id>")
def delete_activity(activity_id: str) -> dict:
    user = current_user(router.current_event)
    if not db.get_activity(user.sub, activity_id):
        raise NotFoundError("activity not found")
    for ev in db.list_evidence(user.sub, activity_id):
        if ev.get("s3Key"):
            storage.delete_object(ev["s3Key"])
        db.delete_evidence(user.sub, ev["id"])
    db.delete_activity(user.sub, activity_id)
    db.add_audit(user.sub, "delete", "activity", activity_id)
    return {"deleted": True}
