"""Daily snapshot aggregator tests.

Run the aggregator against a moto-mocked single table seeded with a single
org and a small mix of clock sessions. Verify the daily, member, and
monthly snapshots come out idempotent and arithmetically correct.
"""

from __future__ import annotations

import datetime as dt
import importlib

import pytest


def _seed_org_and_sessions(db, day: dt.date):
    org_id = "org-xyz"
    org = db.create_organization(
        owner_sub="owner-sub",
        owner_email="owner@example.test",
        owner_name="Olivia Owner",
        data={"name": "Riverside Club", "type": "school_club"},
    )
    assert org["id"]
    # Force a known id so we can reference it.
    db._table.update_item(  # type: ignore[attr-defined]
        Key={"PK": f"ORG#{org['id']}", "SK": f"ORG#{org['id']}"},
        UpdateExpression="SET #i = :i",
        ExpressionAttributeNames={"#i": "id"},
        ExpressionAttributeValues={":i": org_id},
    )

    # Seed three sessions on `day`: two approved, one rejected.
    base_iso = lambda h: dt.datetime(  # noqa: E731
        day.year, day.month, day.day, h, 0, tzinfo=dt.timezone.utc
    ).strftime("%Y-%m-%dT%H:%M:%SZ")

    sessions = [
        ("alice", "Alice Adams", 1, 2.5, "approved"),
        ("alice", "Alice Adams", 4, 1.0, "approved"),
        ("bob", "Bob Brown", 8, 3.0, "rejected"),
    ]
    for sub, name, hour, hours, status in sessions:
        started = base_iso(hour)
        ended = base_iso(hour + 1)
        sid = f"sess-{sub}-{hour}"
        sk = f"CLOCK#{sub}#{started}#{sid}"
        db._table.put_item(  # type: ignore[attr-defined]
            Item={
                "PK": f"ORG#{org_id}",
                "SK": sk,
                "entityType": "ClockSession",
                "id": sid,
                "orgId": org_id,
                "userSub": sub,
                "userName": name,
                "activityType": "Volunteer",
                "startedAt": started,
                "endedAt": ended,
                "hours": str(hours),  # stored as Decimal in prod; str round-trips fine
                "status": status,
                "GSI4PK": f"ORG#{org_id}#CLOCK",
                "GSI4SK": f"{started}#{sid}",
            }
        )

    return org_id


def test_aggregate_org_writes_expected_daily_and_member_rows(ddb_table):
    """Single org with mixed-status sessions yields correct totals."""
    from app import db
    # Import after moto fixture set up env + reloaded db.
    from handlers import snapshot_job  # type: ignore  # see shim below

    day = dt.date(2026, 5, 14)
    org_id = _seed_org_and_sessions(db, day)

    start_iso = dt.datetime.combine(day, dt.time.min, dt.timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )
    end_iso = dt.datetime.combine(day, dt.time.max, dt.timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )

    snapshot_job._aggregate_org(org_id, start_iso, end_iso, day)  # noqa: SLF001

    daily = db.get_org_daily_stats(org_id, day.isoformat())
    assert daily is not None
    assert daily["totalClockIns"] == 3
    assert daily["totalHours"] == pytest.approx(6.5)
    assert daily["approvedHours"] == pytest.approx(3.5)
    assert daily["rejectedHours"] == pytest.approx(3.0)
    assert daily["activeMembers"] == 2

    members = {
        m["userSub"]: m
        for m in db.list_member_stats_window(org_id, day.isoformat(), day.isoformat())
    }
    assert set(members) == {"alice", "bob"}
    assert members["alice"]["totalHours"] == pytest.approx(3.5)
    assert members["alice"]["sessionsCount"] == 2
    assert members["alice"]["approvedSessions"] == 2
    assert members["bob"]["sessionsCount"] == 1
    assert members["bob"]["approvedSessions"] == 0


def test_aggregate_org_is_idempotent(ddb_table):
    """Running the aggregator twice must yield identical rows (no double-count)."""
    from app import db
    from handlers import snapshot_job  # type: ignore

    day = dt.date(2026, 5, 14)
    org_id = _seed_org_and_sessions(db, day)

    start_iso = dt.datetime.combine(day, dt.time.min, dt.timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )
    end_iso = dt.datetime.combine(day, dt.time.max, dt.timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )

    snapshot_job._aggregate_org(org_id, start_iso, end_iso, day)  # noqa: SLF001
    first = db.get_org_daily_stats(org_id, day.isoformat())
    snapshot_job._aggregate_org(org_id, start_iso, end_iso, day)  # noqa: SLF001
    second = db.get_org_daily_stats(org_id, day.isoformat())

    # Snapshots are deterministic: same input → same numbers.
    for key in ("totalHours", "approvedHours", "rejectedHours", "totalClockIns", "activeMembers"):
        assert first[key] == second[key]


def test_monthly_rollup_includes_today(ddb_table):
    from app import db
    from handlers import snapshot_job  # type: ignore

    day = dt.date(2026, 5, 14)
    org_id = _seed_org_and_sessions(db, day)

    start_iso = dt.datetime.combine(day, dt.time.min, dt.timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )
    end_iso = dt.datetime.combine(day, dt.time.max, dt.timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )

    snapshot_job._aggregate_org(org_id, start_iso, end_iso, day)  # noqa: SLF001
    monthly = db.list_org_monthly_stats(org_id)
    row = next((m for m in monthly if m["yearMonth"] == "2026-05"), None)
    assert row is not None
    assert row["totalHours"] == pytest.approx(6.5)
    assert row["participationCount"] == 3
    # Top contributors sorted desc by hours.
    top = row["topMembers"]
    assert top[0]["userSub"] == "alice"
    assert top[0]["hours"] == pytest.approx(3.5)
