"""Asynchronous report worker.

Invoked by EventBridge Pipes off the DynamoDB Stream whenever a new
``ReportJob`` row is inserted (``entityType=ReportJob, status=queued``).

For CSV reports, we stream rows from the per-day aggregates. For PDF reports,
we render via reportlab. The output lands in
``s3://${REPORTS_BUCKET}/<orgId>/<jobId>.<ext>`` and we patch the
``ReportJob`` row with a presigned download URL good for 7 days.
"""

from __future__ import annotations

import csv
import datetime as dt
import io

import boto3
from aws_lambda_powertools import Logger
from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app import config, db

logger = Logger(service="myawardtracker-reports")

_s3 = boto3.client("s3", region_name=config.AWS_REGION)


def _gather_rows(org_id: str, kind: str, frm: str, to: str) -> tuple[list[str], list[list]]:
    """Pick the right precomputed aggregates and turn them into rows."""
    if kind == "volunteer_summary":
        members = db.list_member_stats_window(org_id, frm, to)
        members.sort(key=lambda m: m.get("totalHours", 0), reverse=True)
        headers = ["Member", "Total hours", "Sessions", "Approved sessions"]
        rows = [
            [
                m.get("userName") or m.get("userSub", ""),
                f"{float(m.get('totalHours') or 0):.2f}",
                int(m.get("sessionsCount") or 0),
                int(m.get("approvedSessions") or 0),
            ]
            for m in members
        ]
        return headers, rows

    if kind == "participation":
        daily = db.list_org_daily_stats(org_id, frm, to)
        daily.sort(key=lambda d: d.get("date", ""))
        headers = ["Date", "Total hours", "Approved hours", "Clock-ins", "Active members"]
        rows = [
            [
                d.get("date"),
                f"{float(d.get('totalHours') or 0):.2f}",
                f"{float(d.get('approvedHours') or 0):.2f}",
                int(d.get("totalClockIns") or 0),
                int(d.get("activeMembers") or 0),
            ]
            for d in daily
        ]
        return headers, rows

    if kind in ("leadership", "attendance", "org_contribution"):
        daily = db.list_org_daily_stats(org_id, frm, to)
        members = db.list_member_stats_window(org_id, frm, to)
        members.sort(key=lambda m: m.get("totalHours", 0), reverse=True)
        headers = ["Member", "Hours", "Sessions"]
        rows = [
            [
                m.get("userName") or m.get("userSub", ""),
                f"{float(m.get('totalHours') or 0):.2f}",
                int(m.get("sessionsCount") or 0),
            ]
            for m in members
        ]
        return headers, rows

    # student_timeline — currently a no-op; needs raw activities. Will be
    # implemented when the personal-activity stream is replicated to ORG#.
    return ["Notice"], [["student_timeline report not yet implemented"]]


def _write_csv(headers: list[str], rows: list[list]) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(headers)
    writer.writerows(rows)
    return buf.getvalue().encode()


def _write_pdf(title: str, headers: list[str], rows: list[list]) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=LETTER, title=title)
    styles = getSampleStyleSheet()
    elements = [
        Paragraph(title, styles["Title"]),
        Spacer(1, 18),
    ]
    data = [headers] + rows[:1000]  # cap to keep PDF small
    table = Table(data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e7eefc")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.append(table)
    doc.build(elements)
    return buf.getvalue()


def _process_job(org_id: str, job_id: str) -> None:
    job = db.get_report_job(org_id, job_id)
    if not job or job.get("status") != "queued":
        return
    db.update_report_job(org_id, job_id, {"status": "running"})
    try:
        org = db.get_organization(org_id) or {}
        title = f"{org.get('name', org_id)} — {job['kind']}"
        headers, rows = _gather_rows(org_id, job["kind"], job["from"], job["to"])
        fmt = job["format"]
        if fmt == "csv":
            body = _write_csv(headers, rows)
            content_type = "text/csv"
        else:
            body = _write_pdf(title, headers, rows)
            content_type = "application/pdf"

        key = f"{org_id}/{job_id}.{fmt}"
        _s3.put_object(
            Bucket=config.REPORTS_BUCKET,
            Key=key,
            Body=body,
            ContentType=content_type,
            ServerSideEncryption="AES256",
        )
        url = _s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": config.REPORTS_BUCKET, "Key": key},
            ExpiresIn=config.REPORT_DOWNLOAD_URL_TTL,
        )
        db.update_report_job(
            org_id,
            job_id,
            {
                "status": "done",
                "downloadUrl": url,
                "finishedAt": db.now_iso(),
                "rowCount": len(rows),
            },
        )
        logger.info("report ready", org_id=org_id, job_id=job_id, rows=len(rows))
        db.push_notification(
            job["requestedBySub"],
            {
                "orgId": org_id,
                "kind": "report_ready",
                "title": f"Report ready: {job['kind']}",
                "href": f"/dashboard/org/{org_id}/reports/{job_id}",
            },
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("report failed", org_id=org_id, job_id=job_id, error=str(exc))
        db.update_report_job(
            org_id, job_id, {"status": "failed", "error": str(exc)[:300]}
        )


def handler(event: dict, context) -> dict:
    """DynamoDB Streams payload, or direct invocation with ``{orgId, jobId}``."""
    records = event.get("Records") or []
    if not records and event.get("orgId") and event.get("jobId"):
        _process_job(event["orgId"], event["jobId"])
        return {"processed": 1}

    processed = 0
    for record in records:
        if record.get("eventName") != "INSERT":
            continue
        new_image = (record.get("dynamodb") or {}).get("NewImage") or {}
        entity = (new_image.get("entityType") or {}).get("S")
        status = (new_image.get("status") or {}).get("S")
        if entity != "ReportJob" or status != "queued":
            continue
        pk = (new_image.get("PK") or {}).get("S", "")
        sk = (new_image.get("SK") or {}).get("S", "")
        if not pk.startswith("ORG#") or not sk.startswith("REPORT#"):
            continue
        org_id = pk[len("ORG#"):]
        job_id = sk[len("REPORT#"):]
        _process_job(org_id, job_id)
        processed += 1
    return {"processed": processed}
