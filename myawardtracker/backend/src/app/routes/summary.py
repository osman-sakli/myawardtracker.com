"""Dashboard aggregates computed on the fly from the caller's activities."""

from __future__ import annotations

from aws_lambda_powertools.event_handler import Router

from .. import db
from ..auth import current_user
from ..constants import (
    ACTIVITY_CATEGORIES,
    ACTIVITY_STATUSES,
    AWARD_PROGRAM_NAMES,
    AWARD_PROGRAMS,
    CATEGORY_LABELS,
)

router = Router()


def _round(value: float) -> float:
    return round(value, 2)


@router.get("/v1/summary")
def get_summary() -> dict:
    user = current_user(router.current_event)
    profile_id = router.current_event.get_query_string_value("profileId", "")

    activities = db.list_activities(user.sub)
    if profile_id:
        activities = [a for a in activities if a.get("profileId") == profile_id]

    total_hours = 0.0
    status_counts = {s: 0 for s in ACTIVITY_STATUSES}
    category_hours: dict[str, float] = {c: 0.0 for c in ACTIVITY_CATEGORIES}
    category_counts: dict[str, int] = {c: 0 for c in ACTIVITY_CATEGORIES}
    program_hours: dict[str, float] = {p: 0.0 for p in AWARD_PROGRAMS}
    program_counts: dict[str, int] = {p: 0 for p in AWARD_PROGRAMS}

    for act in activities:
        hours = float(act.get("hours") or 0)
        total_hours += hours

        status = act.get("status")
        if status in status_counts:
            status_counts[status] += 1

        category = act.get("categoryId")
        if category in category_hours:
            category_hours[category] += hours
            category_counts[category] += 1

        for program in act.get("awardPrograms") or []:
            if program in program_hours:
                program_hours[program] += hours
                program_counts[program] += 1

    category_breakdown = [
        {
            "categoryId": cid,
            "label": CATEGORY_LABELS.get(cid, cid),
            "hours": _round(category_hours[cid]),
            "activityCount": category_counts[cid],
        }
        for cid in ACTIVITY_CATEGORIES
        if category_counts[cid] > 0
    ]

    award_progress = []
    for pid, goal in AWARD_PROGRAMS.items():
        if program_counts[pid] == 0:
            continue
        hours = _round(program_hours[pid])
        award_progress.append(
            {
                "programId": pid,
                "name": AWARD_PROGRAM_NAMES.get(pid, pid),
                "goalHours": goal,
                "hours": hours,
                "activityCount": program_counts[pid],
                "percentComplete": (
                    min(100.0, _round(hours / goal * 100)) if goal else None
                ),
            }
        )

    recent = sorted(activities, key=lambda a: a.get("date", ""), reverse=True)[:5]

    return {
        "profileCount": len(db.list_profiles(user.sub)),
        "activityCount": len(activities),
        "totalHours": _round(total_hours),
        "statusCounts": status_counts,
        "categoryBreakdown": category_breakdown,
        "awardProgress": award_progress,
        "recentActivities": recent,
    }
