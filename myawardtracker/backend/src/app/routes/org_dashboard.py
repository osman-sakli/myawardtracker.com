"""Organization dashboard endpoints — read precomputed aggregates only.

This is the heart of the cost story. Dashboards must NEVER scan raw event
tables. Every value here comes from ``STATS#DAY``, ``STATS#MONTH``, or
``MEMBER_STATS`` items written by the daily snapshot job.
"""

from __future__ import annotations

import datetime as dt

from aws_lambda_powertools.event_handler.api_gateway import Router

from .. import db, rbac, tenancy
from ..auth import current_user

router = Router()


@router.get("/v1/orgs/<org_id>/summary")
def summary(org_id: str) -> dict:
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("messages:read", role)

    window_days = int(router.current_event.get_query_string_value("days", "30"))
    window_days = max(1, min(window_days, 365))
    today = dt.date.today()
    start = today - dt.timedelta(days=window_days - 1)

    daily = db.list_org_daily_stats(org_id, start.isoformat(), today.isoformat())
    daily.sort(key=lambda d: d.get("date", ""))

    total_hours = sum(d.get("totalHours", 0) for d in daily)
    approved_hours = sum(d.get("approvedHours", 0) for d in daily)
    total_clockins = sum(d.get("totalClockIns", 0) for d in daily)
    active_members = max((d.get("activeMembers", 0) for d in daily), default=0)

    # Top members for the window — read MEMBER_STATS rows, summed.
    member_rows = db.list_member_stats_window(org_id, start.isoformat(), today.isoformat())
    by_member: dict[str, dict] = {}
    for row in member_rows:
        sub = row.get("userSub")
        if not sub:
            continue
        agg = by_member.setdefault(
            sub, {"userSub": sub, "userName": row.get("userName") or sub, "hours": 0.0}
        )
        agg["hours"] += float(row.get("totalHours", 0) or 0)
    top_members = sorted(by_member.values(), key=lambda m: m["hours"], reverse=True)[:10]

    return {
        "summary": {
            "orgId": org_id,
            "windowDays": window_days,
            "totalHours": total_hours,
            "approvedHours": approved_hours,
            "totalClockIns": total_clockins,
            "activeMembers": active_members,
            "topMembers": top_members,
            "daily": [
                {
                    "date": d.get("date"),
                    "hours": d.get("totalHours", 0),
                    "clockIns": d.get("totalClockIns", 0),
                }
                for d in daily
            ],
        }
    }


@router.get("/v1/orgs/<org_id>/leaderboard")
def leaderboard(org_id: str) -> dict:
    """Top contributors this month from the precomputed monthly rollup."""
    user = current_user(router.current_event)
    role = tenancy.org_role(router.current_event, org_id, user)
    rbac.require("messages:read", role)
    monthly = db.list_org_monthly_stats(org_id)
    current_month = dt.date.today().strftime("%Y-%m")
    row = next((m for m in monthly if m.get("yearMonth") == current_month), None)
    return {
        "month": current_month,
        "topMembers": (row or {}).get("topMembers", []) if row else [],
        "totalHours": (row or {}).get("totalHours", 0),
    }
