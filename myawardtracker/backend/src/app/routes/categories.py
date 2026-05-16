"""Static reference data: activity categories and award programs."""

from __future__ import annotations

from aws_lambda_powertools.event_handler import Router

from ..auth import current_user
from ..constants import (
    ACTIVITY_CATEGORIES,
    AWARD_PROGRAM_NAMES,
    AWARD_PROGRAMS,
    CATEGORY_LABELS,
)

router = Router()


@router.get("/v1/categories")
def list_categories() -> dict:
    current_user(router.current_event)  # auth gate only
    categories = [
        {
            "id": cid,
            "label": CATEGORY_LABELS.get(cid, cid),
            "tracksHours": tracks_hours,
        }
        for cid, tracks_hours in ACTIVITY_CATEGORIES.items()
    ]
    award_programs = [
        {
            "id": pid,
            "name": AWARD_PROGRAM_NAMES.get(pid, pid),
            "goalHours": goal,
        }
        for pid, goal in AWARD_PROGRAMS.items()
    ]
    return {"categories": categories, "awardPrograms": award_programs}
