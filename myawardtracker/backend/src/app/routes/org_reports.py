"""Asynchronous report generation for organizations.

Small CSV exports run synchronously inside this Lambda. Anything larger is
queued as a ``ReportJob`` row and produced by ``handlers.report_job.handler``,
which is triggered by EventBridge Pipes off the DynamoDB Stream.
"""

from __future__ import annotations

from aws_lambda_powertools.event_handler.api_gateway import Router
from aws_lambda_powertools.event_handler.exceptions import NotFoundError

from .. import db, rbac, tenancy
from ..auth import current_user
from ..models import ReportCreate

router = Router()


@router.post("/v1/orgs/<org_id>/reports")
def create_report(org_id: str) -> tuple[dict, int]:
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("reports:generate", role)
    data = ReportCreate(**(router.current_event.json_body or {}))
    job = db.create_report_job(
        org_id,
        user.sub,
        {
            "kind": data.kind,
            "format": data.format,
            "from": data.fromDate,
            "to": data.toDate,
        },
    )
    db.add_org_audit(
        org_id, user.sub, "report.queued", "report", job["id"],
        {"kind": data.kind, "format": data.format},
    )
    return {"job": job}, 202


@router.get("/v1/orgs/<org_id>/reports")
def list_reports(org_id: str) -> dict:
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("reports:view", role)
    return {"jobs": db.list_report_jobs(org_id)}


@router.get("/v1/orgs/<org_id>/reports/<job_id>")
def get_report(org_id: str, job_id: str) -> dict:
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("reports:view", role)
    job = db.get_report_job(org_id, job_id)
    if not job:
        raise NotFoundError("report not found")
    return {"job": job}
