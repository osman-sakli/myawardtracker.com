"""Bi-weekly progress report email.

EventBridge cron can say "every Sunday" but not "every other Sunday", so the
schedule fires weekly and this handler no-ops on odd ISO weeks. On an even
week it sums each user's activity from the trailing 14 days and emails a
summary through SES.
"""

from __future__ import annotations

import datetime as dt

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

from app import config, db
from app.constants import CATEGORY_LABELS

logger = Logger(service="myawardtracker-report")

_PERIOD_DAYS = 14
_ses = boto3.client("ses", region_name=config.AWS_REGION)


def _is_report_week(today: dt.date) -> bool:
    """True on even ISO weeks — yields an every-other-Sunday cadence."""
    return today.isocalendar()[1] % 2 == 0


def _within_period(created_at: str | None, cutoff: dt.datetime) -> bool:
    if not created_at:
        return False
    try:
        ts = dt.datetime.strptime(created_at, "%Y-%m-%dT%H:%M:%SZ")
    except ValueError:
        return False
    return ts.replace(tzinfo=dt.timezone.utc) >= cutoff


def _summarize(activities: list[dict]) -> dict:
    total_hours = 0.0
    by_category: dict[str, float] = {}
    for act in activities:
        hours = float(act.get("hours") or 0)
        total_hours += hours
        cid = act.get("categoryId", "")
        by_category[cid] = by_category.get(cid, 0.0) + hours
    return {
        "count": len(activities),
        "totalHours": round(total_hours, 2),
        "byCategory": by_category,
    }


def _render(user: dict, summary: dict, start: dt.date, end: dt.date) -> tuple[str, str]:
    name = user.get("fullName") or "there"
    period = f"{start:%b %d} – {end:%b %d, %Y}"
    lines = [
        f"In the last two weeks ({period}) you logged "
        f"{summary['count']} activit{'y' if summary['count'] == 1 else 'ies'} "
        f"totalling {summary['totalHours']} hours.",
        "",
    ]
    for cid, hours in sorted(summary["byCategory"].items(), key=lambda kv: -kv[1]):
        if hours <= 0:
            continue
        lines.append(f"  - {CATEGORY_LABELS.get(cid, cid)}: {round(hours, 2)} hours")
    dashboard = f"{config.SITE_URL}/dashboard"
    text = (
        f"Hi {name},\n\n"
        + "\n".join(lines)
        + f"\n\nKeep it going: {dashboard}\n\n— My Award Tracker"
    )
    category_html = "".join(
        f"<li>{CATEGORY_LABELS.get(cid, cid)}: <strong>{round(hours, 2)}</strong> hours</li>"
        for cid, hours in sorted(summary["byCategory"].items(), key=lambda kv: -kv[1])
        if hours > 0
    )
    html = (
        f"<p>Hi {name},</p>"
        f"<p>In the last two weeks (<strong>{period}</strong>) you logged "
        f"<strong>{summary['count']}</strong> "
        f"activit{'y' if summary['count'] == 1 else 'ies'} totalling "
        f"<strong>{summary['totalHours']}</strong> hours.</p>"
        f"<ul>{category_html}</ul>"
        f'<p><a href="{dashboard}">Open your dashboard</a> to keep your '
        f"records up to date.</p>"
        f"<p>— My Award Tracker</p>"
    )
    return text, html


def _send(to_email: str, text: str, html: str) -> None:
    _ses.send_email(
        Source=config.REPORT_FROM_EMAIL,
        Destination={"ToAddresses": [to_email]},
        Message={
            "Subject": {"Data": "Your bi-weekly progress on My Award Tracker"},
            "Body": {
                "Text": {"Data": text},
                "Html": {"Data": html},
            },
        },
    )


def handler(event: dict, context: LambdaContext) -> dict:
    today = dt.datetime.now(dt.timezone.utc).date()
    if not _is_report_week(today):
        logger.info("odd ISO week — skipping report run", iso_week=today.isocalendar()[1])
        return {"skipped": True, "reason": "odd-week"}

    if not config.REPORT_FROM_EMAIL:
        logger.warning("REPORT_FROM_EMAIL not configured — skipping report run")
        return {"skipped": True, "reason": "no-sender"}

    now = dt.datetime.now(dt.timezone.utc)
    cutoff = now - dt.timedelta(days=_PERIOD_DAYS)
    start = (now - dt.timedelta(days=_PERIOD_DAYS)).date()

    sent = 0
    skipped = 0
    for user in db.list_all_users():
        email = user.get("email")
        if not email:
            skipped += 1
            continue
        activities = [
            a
            for a in db.list_activities(user["id"])
            if _within_period(a.get("createdAt"), cutoff)
        ]
        if not activities:
            skipped += 1
            continue
        summary = _summarize(activities)
        text, html = _render(user, summary, start, today)
        try:
            _send(email, text, html)
            sent += 1
        except Exception:  # noqa: BLE001 - one bad address must not abort the run
            logger.exception("failed to send report", user_id=user.get("id"))
            skipped += 1

    logger.info("bi-weekly report run complete", sent=sent, skipped=skipped)
    return {"sent": sent, "skipped": skipped}
