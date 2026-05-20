"""Backend mirror of shared/src/constants.ts.

The frontend imports the TypeScript source of truth; the Python backend keeps
this slim copy of the parts it needs for validation and aggregation.
"""

from __future__ import annotations

# category id -> tracks_hours
ACTIVITY_CATEGORIES: dict[str, bool] = {
    "volunteer_service": True,
    "personal_development": True,
    "physical_fitness": True,
    "expedition": True,
    "internship": True,
    "leadership": True,
    "award": False,
    "certification": False,
    "extracurricular": True,
    "community_service": True,
    "membership": False,
}

CATEGORY_LABELS: dict[str, str] = {
    "volunteer_service": "Volunteer Service",
    "personal_development": "Personal Development",
    "physical_fitness": "Physical Fitness",
    "expedition": "Expedition / Exploration",
    "internship": "Internship",
    "leadership": "Leadership",
    "award": "Award",
    "certification": "Certification",
    "extracurricular": "Extracurricular",
    "community_service": "Community Service",
    "membership": "Organization Membership",
}

ACTIVITY_STATUSES = {"planned", "in_progress", "completed", "verified"}

PLAN_IDS = {"individual"}
ORG_PLAN_IDS = {
    "org_small",
    "org_medium",
    "org_large",
    "org_small_storage",
    "org_medium_storage",
    "org_large_storage",
}

# Access lifecycle.
FREE_TRIAL_DAYS = 30  # was 15 — promoted to 30 in the SaaS migration.
PAID_ACCESS_DAYS = 365

# award program id -> goal hours (None when not hour-based)
AWARD_PROGRAMS: dict[str, int | None] = {
    "congressional_award": 400,
    "pvsa": 250,
    "girl_scouts": None,
    "school_club": None,
    "nonprofit_volunteer": None,
    "general": None,
}

AWARD_PROGRAM_NAMES: dict[str, str] = {
    "congressional_award": "Congressional Award",
    "pvsa": "President's Volunteer Service Award",
    "girl_scouts": "Girl Scouts Awards",
    "school_club": "School Club Record",
    "nonprofit_volunteer": "Nonprofit Volunteer Record",
    "general": "College Application Portfolio",
}

MAX_EVIDENCE_BYTES = 10 * 1024 * 1024
ALLOWED_EVIDENCE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "application/pdf",
}

# --- Org RBAC / billing ---------------------------------------------------

ORG_ROLES = ("owner", "admin", "manager", "moderator", "member", "viewer")
ORG_TYPES = (
    "school_club",
    "school",
    "nonprofit",
    "scout_troop",
    "university",
    "leadership_program",
    "community",
)

# Tier ladder: (tier_id, max_members, base_usd, storage_usd)
ORG_TIERS: list[tuple[str, int, int, int]] = [
    ("small", 50, 39, 69),
    ("medium", 300, 78, 138),
    ("large", 500, 117, 207),
]


def tier_for_member_count(member_count: int) -> str:
    """Return the smallest tier id whose cap covers ``member_count``."""
    for tier_id, cap, *_ in ORG_TIERS:
        if member_count <= cap:
            return tier_id
    return ORG_TIERS[-1][0]


# --- Retention -----------------------------------------------------------

DEFAULT_CHAT_RETENTION_DAYS = 30
CLOCK_SESSION_RETENTION_DAYS = 90
SNAPSHOT_RETENTION_DAYS = 730
INVITE_TTL_DAYS = 14
NOTIFICATION_RETENTION_DAYS = 30
AUDIT_RETENTION_DAYS = 365
WS_CONNECTION_TTL_HOURS = 2
