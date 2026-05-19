"""Profile CRUD. Deleting a profile cascades to its activities and evidence."""

from __future__ import annotations

from aws_lambda_powertools.event_handler import Router
from aws_lambda_powertools.event_handler.exceptions import NotFoundError

from .. import db, entitlement, storage
from ..auth import current_user
from ..models import ProfileCreate, ProfileUpdate

router = Router()


@router.get("/v1/profiles")
def list_profiles() -> dict:
    user = current_user(router.current_event)
    return {"profiles": db.list_profiles(user.sub)}


@router.post("/v1/profiles")
def create_profile() -> tuple[dict, int]:
    user = current_user(router.current_event)
    record = db.ensure_user(user.sub, user.email, user.name)
    entitlement.require_access(record, db.get_subscription(user.sub))
    data = ProfileCreate(**(router.current_event.json_body or {}))
    profile = db.create_profile(user.sub, data.model_dump())
    db.add_audit(user.sub, "create", "profile", profile["id"])
    return {"profile": profile}, 201


@router.get("/v1/profiles/<profile_id>")
def get_profile(profile_id: str) -> dict:
    user = current_user(router.current_event)
    profile = db.get_profile(user.sub, profile_id)
    if not profile:
        raise NotFoundError("profile not found")
    return {"profile": profile}


@router.patch("/v1/profiles/<profile_id>")
def update_profile(profile_id: str) -> dict:
    user = current_user(router.current_event)
    data = ProfileUpdate(**(router.current_event.json_body or {}))
    profile = db.update_profile(user.sub, profile_id, data.model_dump(exclude_none=True))
    if not profile:
        raise NotFoundError("profile not found")
    db.add_audit(user.sub, "update", "profile", profile_id)
    return {"profile": profile}


@router.delete("/v1/profiles/<profile_id>")
def delete_profile(profile_id: str) -> dict:
    user = current_user(router.current_event)
    if not db.get_profile(user.sub, profile_id):
        raise NotFoundError("profile not found")

    for activity in db.list_activities(user.sub):
        if activity.get("profileId") != profile_id:
            continue
        for ev in db.list_evidence(user.sub, activity["id"]):
            if ev.get("s3Key"):
                storage.delete_object(ev["s3Key"])
            db.delete_evidence(user.sub, ev["id"])
        db.delete_activity(user.sub, activity["id"])

    db.delete_profile(user.sub, profile_id)
    db.add_audit(user.sub, "delete", "profile", profile_id)
    return {"deleted": True}
