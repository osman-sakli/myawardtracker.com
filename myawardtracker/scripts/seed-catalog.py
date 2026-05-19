#!/usr/bin/env python3
"""Idempotent seeder for activity categories and award programs.

The frontend uses ``shared/src/constants.ts`` as the source of truth, but the
seeded ``CATALOG`` rows are convenient for ad-hoc queries and reporting against
the DynamoDB table directly.

Usage::

    export TABLE_NAME=$(cd infra && terraform output -raw dynamodb_table)
    python3 scripts/seed-catalog.py

Re-runnable safely — each row is upserted by (PK, SK).
"""

from __future__ import annotations

import os
import sys
from typing import Any

import boto3

# Mirrors backend/src/app/constants.py so the seed matches the running app.
CATEGORIES: dict[str, dict[str, Any]] = {
    "volunteer_service":     {"label": "Volunteer Service",          "tracks_hours": True},
    "personal_development":  {"label": "Personal Development",       "tracks_hours": True},
    "physical_fitness":      {"label": "Physical Fitness",           "tracks_hours": True},
    "expedition":            {"label": "Expedition / Exploration",   "tracks_hours": True},
    "internship":            {"label": "Internship",                 "tracks_hours": True},
    "leadership":            {"label": "Leadership",                 "tracks_hours": True},
    "award":                 {"label": "Award",                      "tracks_hours": False},
    "certification":         {"label": "Certification",              "tracks_hours": False},
    "extracurricular":       {"label": "Extracurricular",            "tracks_hours": True},
    "community_service":     {"label": "Community Service",          "tracks_hours": True},
    "membership":            {"label": "Organization Membership",    "tracks_hours": False},
}

AWARD_PROGRAMS: dict[str, dict[str, Any]] = {
    "congressional_award":   {"name": "Congressional Award",                  "goal_hours": 400},
    "pvsa":                  {"name": "President's Volunteer Service Award",  "goal_hours": 250},
    "girl_scouts":           {"name": "Girl Scouts Awards",                   "goal_hours": None},
    "school_club":           {"name": "School Club Record",                   "goal_hours": None},
    "nonprofit_volunteer":   {"name": "Nonprofit Volunteer Record",           "goal_hours": None},
    "general":               {"name": "College Application Portfolio",       "goal_hours": None},
}


def main() -> int:
    table_name = os.environ.get("TABLE_NAME")
    if not table_name:
        print("Set TABLE_NAME, e.g.:", file=sys.stderr)
        print('  export TABLE_NAME=$(cd infra && terraform output -raw dynamodb_table)', file=sys.stderr)
        return 1

    table = boto3.resource("dynamodb").Table(table_name)

    with table.batch_writer() as bw:
        for cat_id, body in CATEGORIES.items():
            bw.put_item(
                Item={
                    "PK": "CATALOG",
                    "SK": f"CAT#{cat_id}",
                    "entityType": "ActivityCategory",
                    "id": cat_id,
                    **body,
                }
            )
        for award_id, body in AWARD_PROGRAMS.items():
            bw.put_item(
                Item={
                    "PK": "CATALOG",
                    "SK": f"AWARD#{award_id}",
                    "entityType": "AwardProgram",
                    "id": award_id,
                    **body,
                }
            )

    print(
        f"Seeded {len(CATEGORIES)} categories and {len(AWARD_PROGRAMS)} "
        f"award programs into {table_name}."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
