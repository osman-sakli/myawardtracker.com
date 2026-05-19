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

# Access lifecycle.
FREE_TRIAL_DAYS = 15
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
