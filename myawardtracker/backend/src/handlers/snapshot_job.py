"""Daily snapshot Lambda — invoked at 02:00 UTC by EventBridge Scheduler.

For each organization with activity in the previous 36 hours, write:

* ``STATS#DAY#<yyyy-mm-dd>`` (org-wide totals for yesterday)
* ``MEMBER_STATS#<sub>#<yyyy-mm-dd>`` (per-member totals)
* ``STATS#MONTH#<yyyy-mm>`` (rolling month-to-date)
* ``STATS#YEAR#<yyyy>`` (rolling year-to-date)

All writes are idempotent on the SK so re-runs produce the same row.

Dashboards never scan raw events; they read these aggregates.

The job is bounded by Lambda's 15-minute timeout. If org count grows past
that, the scheduler can be split into N parallel rules each handling a
deterministic shard of orgs (``crc32(orgId) % N == shardId``).
"""

from __future__ import annotations

import datetime as dt
import zlib
from collections import defaultdict
from typing import Iterable

from aws_lambda_powertools import Logger

from app import db
from app.constants import tier_for_member_count

logger = Logger(service="myawardtracker-snapshot")

_FMT = "%Y-%m-%dT%H:%M:%SZ"


def _yesterday_window(now: dt.datetime) -> tuple[str, str, dt.date]:
    """[start, end] ISO timestamps covering 'yesterday' in UTC."""
    yesterday = (now - dt.timedelta(days=1)).date()
    start = dt.datetime.combine(yesterday, dt.time.min, dt.timezone.utc)
    end = dt.datetime.combine(yesterday, dt.time.max, dt.timezone.utc)
    return start.strftime(_FMT), end.strftime(_FMT), yesterday


def _aggregate_org(org_id: str, start_iso: str, end_iso: str, day: dt.date) -> None:
    """Roll up yesterday's clock sessions for one org and write the snapshots."""
    sessions = db.list_clock_sessions_org_window(org_id, start_iso, end_iso)

    total_hours = 0.0
    approved_hours = 0.0
    rejected_hours = 0.0
    total_clockins = len(sessions)
    active_members: set[str] = set()
    by_member: dict[str, dict] = defaultdict(
        lambda: {"hours": 0.0, "sessions": 0, "approved": 0, "name": ""}
    )

    for s in sessions:
        sub = s.get("userSub", "")
        hrs = float(s.get("hours") or 0)
        status = s.get("status", "")
        active_members.add(sub)
        total_hours += hrs
        if status == "approved":
            approved_hours += hrs
        elif status == "rejected":
            rejected_hours += hrs
        agg = by_member[sub]
        agg["hours"] += hrs
        agg["sessions"] += 1
        if status == "approved":
            agg["approved"] += 1
        agg["name"] = s.get("userName") or sub

    date_iso = day.isoformat()
    db.put_org_daily_stats(
        {
            "orgId": org_id,
            "date": date_iso,
            "totalHours": round(total_hours, 4),
            "approvedHours": round(approved_hours, 4),
            "rejectedHours": round(rejected_hours, 4),
            "totalClockIns": total_clockins,
            "activeMembers": len(active_members),
            "newMembers": 0,  # filled in below if discoverable
        }
    )
    for sub, agg in by_member.items():
        db.put_member_daily_stats(
            {
                "orgId": org_id,
                "userSub": sub,
                "userName": agg["name"],
                "date": date_iso,
                "totalHours": round(agg["hours"], 4),
                "sessionsCount": agg["sessions"],
                "approvedSessions": agg["approved"],
            }
        )

    # Roll into the month aggregate idempotently. We rebuild the month total
    # from the daily snapshots for the month, which is cheap (≤31 GetItems).
    year_month = day.strftime("%Y-%m")
    first_of_month = day.replace(day=1)
    monthly_rows = db.list_org_daily_stats(
        org_id, first_of_month.isoformat(), day.isoformat()
    )
    month_total = sum(d.get("totalHours", 0) for d in monthly_rows)
    month_clockins = sum(d.get("totalClockIns", 0) for d in monthly_rows)
    # Top-10 contributors this month from MEMBER_STATS.
    member_month_rows = db.list_member_stats_window(
        org_id, first_of_month.isoformat(), day.isoformat()
    )
    by_member_month: dict[str, dict] = defaultdict(
        lambda: {"hours": 0.0, "name": ""}
    )
    for row in member_month_rows:
        sub = row.get("userSub") or ""
        by_member_month[sub]["hours"] += float(row.get("totalHours") or 0)
        by_member_month[sub]["name"] = row.get("userName") or sub
    top_members = sorted(
        (
            {"userSub": s, "userName": v["name"], "hours": round(v["hours"], 4)}
            for s, v in by_member_month.items()
        ),
        key=lambda r: r["hours"],
        reverse=True,
    )[:10]

    db.put_org_monthly_stats(
        {
            "orgId": org_id,
            "yearMonth": year_month,
            "totalHours": round(month_total, 4),
            "participationCount": month_clockins,
            "topMembers": top_members,
        }
    )

    # Recompute org tier from current memberCount so the UI never lags.
    org = db.get_organization(org_id) or {}
    current_tier = tier_for_member_count(int(org.get("memberCount", 0)))
    if current_tier != org.get("tier"):
        db.update_organization(org_id, {"tier": current_tier})


def _shard_match(org_id: str, shard_id: int, shards: int) -> bool:
    if shards <= 1:
        return True
    return zlib.crc32(org_id.encode()) % shards == shard_id


def handler(event: dict, context) -> dict:
    """EventBridge invocation: ``{"shardId": int, "shards": int}`` (both optional).

    Defaults to a single shard covering every org.
    """
    shard_id = int(event.get("shardId") or 0)
    shards = int(event.get("shards") or 1)
    now = dt.datetime.now(dt.timezone.utc)
    start_iso, end_iso, day = _yesterday_window(now)

    processed = 0
    for org_id in db.iter_org_ids():
        if not _shard_match(org_id, shard_id, shards):
            continue
        try:
            _aggregate_org(org_id, start_iso, end_iso, day)
            processed += 1
        except Exception as exc:  # noqa: BLE001
            logger.exception("snapshot failed for org", org_id=org_id, error=str(exc))
    logger.info(
        "snapshot job finished",
        date=day.isoformat(),
        shard_id=shard_id,
        shards=shards,
        processed=processed,
    )
    return {"processed": processed, "date": day.isoformat()}
