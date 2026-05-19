"""DynamoDB single-table data access.

Every read and write is scoped to a user's partition (``USER#<sub>``) so the
caller can never reach another tenant's data.
"""

from __future__ import annotations

import datetime as dt
import uuid
from decimal import Decimal
from typing import Any

import boto3
from boto3.dynamodb.conditions import Attr, Key

from . import config

_table = boto3.resource("dynamodb", region_name=config.AWS_REGION).Table(config.TABLE_NAME)

_INTERNAL_KEYS = {"PK", "SK", "GSI1PK", "GSI1SK", "GSI2PK", "GSI2SK", "entityType", "ttl"}


# --- helpers ---------------------------------------------------------------


def now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def new_id() -> str:
    return uuid.uuid4().hex


def _encode(value: Any) -> Any:
    """Make a value safe for DynamoDB: floats -> Decimal, drop None entries."""
    if isinstance(value, bool):
        return value
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {k: _encode(v) for k, v in value.items() if v is not None}
    if isinstance(value, (list, tuple)):
        return [_encode(v) for v in value]
    return value


def _decode(value: Any) -> Any:
    """Convert DynamoDB types back to JSON-friendly Python."""
    if isinstance(value, Decimal):
        return int(value) if value % 1 == 0 else float(value)
    if isinstance(value, dict):
        return {k: _decode(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_decode(v) for v in value]
    return value


def _public(item: dict) -> dict:
    return {k: v for k, v in _decode(item).items() if k not in _INTERNAL_KEYS}


def _pk(sub: str) -> str:
    return f"USER#{sub}"


def _query_all(**kwargs) -> list[dict]:
    """Query helper that follows pagination."""
    items: list[dict] = []
    while True:
        resp = _table.query(**kwargs)
        items.extend(resp.get("Items", []))
        start_key = resp.get("LastEvaluatedKey")
        if not start_key:
            return items
        kwargs["ExclusiveStartKey"] = start_key


# --- users -----------------------------------------------------------------


def get_user(sub: str) -> dict | None:
    item = _table.get_item(Key={"PK": _pk(sub), "SK": f"USER#{sub}"}).get("Item")
    return _public(item) if item else None


def ensure_user(sub: str, email: str, name: str) -> dict:
    """Return the user record, creating it on first sight (lazy provisioning)."""
    existing = get_user(sub)
    if existing:
        return existing
    ts = now_iso()
    user = {
        "id": sub,
        "email": email,
        "fullName": name or (email.split("@")[0] if email else "Student"),
        "role": "individual",
        "createdAt": ts,
        "updatedAt": ts,
    }
    _table.put_item(
        Item=_encode({**user, "PK": _pk(sub), "SK": f"USER#{sub}", "entityType": "User"})
    )
    return user


def update_user(sub: str, patch: dict) -> dict | None:
    raw = _table.get_item(Key={"PK": _pk(sub), "SK": f"USER#{sub}"}).get("Item")
    if not raw:
        return None
    merged = {**raw, **{k: v for k, v in patch.items() if v is not None}, "updatedAt": now_iso()}
    _table.put_item(Item=_encode(merged))
    return _public(merged)


def list_all_users() -> list[dict]:
    """Scan every user record — used by the bi-weekly report job only."""
    items: list[dict] = []
    kwargs: dict = {"FilterExpression": Attr("entityType").eq("User")}
    while True:
        resp = _table.scan(**kwargs)
        items.extend(resp.get("Items", []))
        start_key = resp.get("LastEvaluatedKey")
        if not start_key:
            return [_public(i) for i in items]
        kwargs["ExclusiveStartKey"] = start_key


# --- profiles --------------------------------------------------------------


def list_profiles(sub: str) -> list[dict]:
    items = _query_all(
        KeyConditionExpression=Key("PK").eq(_pk(sub)) & Key("SK").begins_with("PROFILE#")
    )
    return [_public(i) for i in items]


def get_profile(sub: str, profile_id: str) -> dict | None:
    item = _table.get_item(Key={"PK": _pk(sub), "SK": f"PROFILE#{profile_id}"}).get("Item")
    return _public(item) if item else None


def create_profile(sub: str, data: dict) -> dict:
    profile_id = new_id()
    ts = now_iso()
    profile = {"id": profile_id, "userId": sub, **data, "createdAt": ts, "updatedAt": ts}
    _table.put_item(
        Item=_encode(
            {**profile, "PK": _pk(sub), "SK": f"PROFILE#{profile_id}", "entityType": "Profile"}
        )
    )
    return profile


def update_profile(sub: str, profile_id: str, patch: dict) -> dict | None:
    raw = _table.get_item(Key={"PK": _pk(sub), "SK": f"PROFILE#{profile_id}"}).get("Item")
    if not raw:
        return None
    merged = {**raw, **{k: v for k, v in patch.items() if v is not None}, "updatedAt": now_iso()}
    _table.put_item(Item=_encode(merged))
    return _public(merged)


def delete_profile(sub: str, profile_id: str) -> None:
    _table.delete_item(Key={"PK": _pk(sub), "SK": f"PROFILE#{profile_id}"})


# --- activities ------------------------------------------------------------


def list_activities(sub: str) -> list[dict]:
    items = _query_all(
        KeyConditionExpression=Key("PK").eq(_pk(sub)) & Key("SK").begins_with("ACTIVITY#")
    )
    return [_public(i) for i in items]


def get_activity(sub: str, activity_id: str) -> dict | None:
    item = _table.get_item(Key={"PK": _pk(sub), "SK": f"ACTIVITY#{activity_id}"}).get("Item")
    return _public(item) if item else None


def create_activity(sub: str, data: dict) -> dict:
    activity_id = new_id()
    ts = now_iso()
    activity = {
        "id": activity_id,
        "userId": sub,
        "evidenceCount": 0,
        **data,
        "createdAt": ts,
        "updatedAt": ts,
    }
    _table.put_item(
        Item=_encode(
            {
                **activity,
                "PK": _pk(sub),
                "SK": f"ACTIVITY#{activity_id}",
                "entityType": "Activity",
                "GSI1PK": f"PROFILE#{data['profileId']}",
                "GSI1SK": f"ACT#{data['date']}#{activity_id}",
            }
        )
    )
    return activity


def update_activity(sub: str, activity_id: str, patch: dict) -> dict | None:
    raw = _table.get_item(Key={"PK": _pk(sub), "SK": f"ACTIVITY#{activity_id}"}).get("Item")
    if not raw:
        return None
    merged = {**raw, **{k: v for k, v in patch.items() if v is not None}, "updatedAt": now_iso()}
    merged["GSI1SK"] = f"ACT#{merged.get('date', '')}#{activity_id}"
    _table.put_item(Item=_encode(merged))
    return _public(merged)


def delete_activity(sub: str, activity_id: str) -> None:
    _table.delete_item(Key={"PK": _pk(sub), "SK": f"ACTIVITY#{activity_id}"})


def adjust_evidence_count(sub: str, activity_id: str, delta: int) -> None:
    try:
        _table.update_item(
            Key={"PK": _pk(sub), "SK": f"ACTIVITY#{activity_id}"},
            UpdateExpression=(
                "SET evidenceCount = if_not_exists(evidenceCount, :z) + :d, updatedAt = :u"
            ),
            ExpressionAttributeValues={":d": delta, ":z": 0, ":u": now_iso()},
            ConditionExpression="attribute_exists(PK)",
        )
    except _table.meta.client.exceptions.ConditionalCheckFailedException:
        pass  # activity already gone — nothing to adjust


# --- evidence --------------------------------------------------------------


def list_evidence(sub: str, activity_id: str | None = None) -> list[dict]:
    items = _query_all(
        KeyConditionExpression=Key("PK").eq(_pk(sub)) & Key("SK").begins_with("EVIDENCE#")
    )
    public = [_public(i) for i in items]
    if activity_id:
        public = [e for e in public if e.get("activityId") == activity_id]
    return public


def get_evidence(sub: str, evidence_id: str) -> dict | None:
    item = _table.get_item(Key={"PK": _pk(sub), "SK": f"EVIDENCE#{evidence_id}"}).get("Item")
    return _public(item) if item else None


def create_evidence(sub: str, data: dict) -> dict:
    evidence_id = data.get("id") or new_id()
    record = {"id": evidence_id, "userId": sub, **data, "createdAt": now_iso()}
    _table.put_item(
        Item=_encode(
            {**record, "PK": _pk(sub), "SK": f"EVIDENCE#{evidence_id}", "entityType": "Evidence"}
        )
    )
    return record


def delete_evidence(sub: str, evidence_id: str) -> dict | None:
    existing = get_evidence(sub, evidence_id)
    if not existing:
        return None
    _table.delete_item(Key={"PK": _pk(sub), "SK": f"EVIDENCE#{evidence_id}"})
    return existing


# --- subscription ----------------------------------------------------------


def get_subscription(sub: str) -> dict:
    """Return the stored purchase record, or ``{}`` if the user never paid."""
    item = _table.get_item(Key={"PK": _pk(sub), "SK": "SUBSCRIPTION#current"}).get("Item")
    return _public(item) if item else {}


def grant_paid_access(
    sub: str, days: int, stripe_customer_id: str | None = None
) -> dict:
    """Extend a user's paid window by ``days``.

    Stacking re-purchases: a payment that lands while access is still active
    extends from the existing ``paidUntil`` rather than from today, so the
    buyer never loses the days they already paid for.
    """
    now = dt.datetime.now(dt.timezone.utc)
    existing = get_subscription(sub)
    base = now
    prior = existing.get("paidUntil")
    if prior:
        try:
            prior_dt = dt.datetime.strptime(prior, "%Y-%m-%dT%H:%M:%SZ").replace(
                tzinfo=dt.timezone.utc
            )
            if prior_dt > now:
                base = prior_dt
        except ValueError:
            pass
    paid_until = base + dt.timedelta(days=days)
    ts = now_iso()
    record = {
        "userId": sub,
        "planId": "individual",
        "paidUntil": paid_until.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "lastPaymentAt": ts,
        "updatedAt": ts,
    }
    customer_id = stripe_customer_id or existing.get("stripeCustomerId")
    if customer_id:
        record["stripeCustomerId"] = customer_id
    item = {
        **record,
        "PK": _pk(sub),
        "SK": "SUBSCRIPTION#current",
        "entityType": "Subscription",
    }
    if customer_id:
        item["GSI2PK"] = f"STRIPE#{customer_id}"
        item["GSI2SK"] = _pk(sub)
    _table.put_item(Item=_encode(item))
    return record


def find_subscription_by_stripe_customer(customer_id: str) -> dict | None:
    items = _query_all(
        IndexName="GSI2",
        KeyConditionExpression=Key("GSI2PK").eq(f"STRIPE#{customer_id}"),
    )
    return _public(items[0]) if items else None


# --- audit -----------------------------------------------------------------


def add_audit(
    sub: str, action: str, target_type: str, target_id: str, detail: dict | None = None
) -> None:
    ts = now_iso()
    audit_id = new_id()
    _table.put_item(
        Item=_encode(
            {
                "PK": _pk(sub),
                "SK": f"AUDIT#{ts}#{audit_id}",
                "entityType": "Audit",
                "id": audit_id,
                "userId": sub,
                "action": action,
                "targetType": target_type,
                "targetId": target_id,
                "timestamp": ts,
                "detail": detail or {},
            }
        )
    )


def list_audit(sub: str, limit: int = 50) -> list[dict]:
    resp = _table.query(
        KeyConditionExpression=Key("PK").eq(_pk(sub)) & Key("SK").begins_with("AUDIT#"),
        ScanIndexForward=False,
        Limit=limit,
    )
    return [_public(i) for i in resp.get("Items", [])]
