"""Evidence files: presigned uploads/downloads against the private S3 bucket.

The Lambda never touches file bytes — it only mints short-lived URLs and keeps
the metadata record in DynamoDB.
"""

from __future__ import annotations

from aws_lambda_powertools.event_handler import Router
from aws_lambda_powertools.event_handler.exceptions import BadRequestError, NotFoundError

from .. import db, storage
from ..auth import current_user
from ..db import new_id
from ..models import UploadUrlRequest

router = Router()


@router.get("/v1/evidence")
def list_evidence() -> dict:
    user = current_user(router.current_event)
    activity_id = router.current_event.get_query_string_value("activityId", "") or None
    return {"evidence": db.list_evidence(user.sub, activity_id)}


@router.post("/v1/evidence/upload-url")
def create_upload_url() -> tuple[dict, int]:
    user = current_user(router.current_event)
    data = UploadUrlRequest(**(router.current_event.json_body or {}))

    if not db.get_activity(user.sub, data.activityId):
        raise BadRequestError("activityId does not reference an existing activity")

    evidence_id = new_id()
    key = storage.evidence_key(user.sub, data.activityId, evidence_id)
    record = db.create_evidence(
        user.sub,
        {
            "id": evidence_id,
            "activityId": data.activityId,
            "fileName": data.fileName,
            "contentType": data.contentType,
            "sizeBytes": data.sizeBytes,
            "caption": data.caption,
            "s3Key": key,
        },
    )
    db.adjust_evidence_count(user.sub, data.activityId, 1)
    db.add_audit(user.sub, "create", "evidence", evidence_id)

    upload_url = storage.presign_upload(key, data.contentType)
    return {"uploadUrl": upload_url, "evidence": record}, 201


@router.get("/v1/evidence/<evidence_id>/download-url")
def create_download_url(evidence_id: str) -> dict:
    user = current_user(router.current_event)
    record = db.get_evidence(user.sub, evidence_id)
    if not record:
        raise NotFoundError("evidence not found")
    download_url = storage.presign_download(record["s3Key"], record.get("fileName"))
    return {"downloadUrl": download_url}


@router.delete("/v1/evidence/<evidence_id>")
def delete_evidence(evidence_id: str) -> dict:
    user = current_user(router.current_event)
    record = db.delete_evidence(user.sub, evidence_id)
    if not record:
        raise NotFoundError("evidence not found")
    if record.get("s3Key"):
        storage.delete_object(record["s3Key"])
    if record.get("activityId"):
        db.adjust_evidence_count(user.sub, record["activityId"], -1)
    db.add_audit(user.sub, "delete", "evidence", evidence_id)
    return {"deleted": True}
