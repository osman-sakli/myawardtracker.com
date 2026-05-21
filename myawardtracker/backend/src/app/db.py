"""DynamoDB single-table data access.

Personal data is partitioned by ``USER#<sub>``; organization data is partitioned
by ``ORG#<orgId>``. Every read and write binds the partition key from a
trusted source (Cognito sub for personal, validated path parameter + RBAC for
org), so a request can never reach another tenant's partition.

See ``docs/SAAS_ARCHITECTURE.md`` for the full access-pattern catalog.
"""

from __future__ import annotations

import datetime as dt
import secrets
import uuid
from decimal import Decimal
from typing import Any, Iterable

import boto3
from boto3.dynamodb.conditions import Attr, Key

from . import config
from .constants import (
    AUDIT_RETENTION_DAYS,
    CLOCK_SESSION_RETENTION_DAYS,
    DEFAULT_CHAT_RETENTION_DAYS,
    INVITE_TTL_DAYS,
    NOTIFICATION_RETENTION_DAYS,
    SNAPSHOT_RETENTION_DAYS,
    WS_CONNECTION_TTL_HOURS,
    tier_for_member_count,
)

_ddb = boto3.resource("dynamodb", region_name=config.AWS_REGION)
_table = _ddb.Table(config.TABLE_NAME)

_INTERNAL_KEYS = {
    "PK", "SK",
    "GSI1PK", "GSI1SK",
    "GSI2PK", "GSI2SK",
    "GSI3PK", "GSI3SK",
    "GSI4PK", "GSI4SK",
    "GSI5PK", "GSI5SK",
    "entityType",
    "ttl",
}


# --- helpers ---------------------------------------------------------------


def now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def now_dt() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def new_id() -> str:
    return uuid.uuid4().hex


def new_token() -> str:
    """URL-safe opaque token for invites etc."""
    return secrets.token_urlsafe(24)


def _ttl_from(days: int, base: dt.datetime | None = None) -> int:
    base = base or now_dt()
    return int((base + dt.timedelta(days=days)).timestamp())


def _ttl_hours_from(hours: int, base: dt.datetime | None = None) -> int:
    base = base or now_dt()
    return int((base + dt.timedelta(hours=hours)).timestamp())


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


def _pk_user(sub: str) -> str:
    return f"USER#{sub}"


def _pk_org(org_id: str) -> str:
    return f"ORG#{org_id}"


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
    item = _table.get_item(Key={"PK": _pk_user(sub), "SK": f"USER#{sub}"}).get("Item")
    return _public(item) if item else None


def get_user_by_email(email: str) -> dict | None:
    """Look up a user by email — single Query on GSI3, no scan."""
    items = _query_all(
        IndexName="GSI3",
        KeyConditionExpression=Key("GSI3PK").eq(f"EMAIL#{email.lower()}"),
        Limit=1,
    )
    return _public(items[0]) if items else None


def ensure_user(sub: str, email: str, name: str) -> dict:
    """Return the user record, creating it on first sight (lazy provisioning).

    The User item carries ``email`` as a top-level attribute *and* an
    ``EMAIL#<lowercased>`` GSI3 entry, so the DDB console row displays the
    email plainly and admin lookups by email are O(1).
    """
    existing = get_user(sub)
    if existing:
        # Keep email/name in sync if Cognito updates them.
        patch = {}
        if email and existing.get("email") != email:
            patch["email"] = email
        if name and not existing.get("fullName"):
            patch["fullName"] = name
        if patch:
            return update_user(sub, patch) or existing
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
        Item=_encode(
            {
                **user,
                "PK": _pk_user(sub),
                "SK": f"USER#{sub}",
                "entityType": "User",
                # Email lookup index. Lowercased so case differences don't fork rows.
                "GSI3PK": f"EMAIL#{email.lower()}" if email else f"USER#{sub}",
                "GSI3SK": f"USER#{sub}",
            }
        )
    )
    return user


def update_user(sub: str, patch: dict) -> dict | None:
    raw = _table.get_item(Key={"PK": _pk_user(sub), "SK": f"USER#{sub}"}).get("Item")
    if not raw:
        return None
    merged = {**raw, **{k: v for k, v in patch.items() if v is not None}, "updatedAt": now_iso()}
    # Keep email index in sync if email changed.
    new_email = merged.get("email")
    if new_email:
        merged["GSI3PK"] = f"EMAIL#{new_email.lower()}"
        merged["GSI3SK"] = f"USER#{sub}"
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
        KeyConditionExpression=Key("PK").eq(_pk_user(sub)) & Key("SK").begins_with("PROFILE#")
    )
    return [_public(i) for i in items]


def get_profile(sub: str, profile_id: str) -> dict | None:
    item = _table.get_item(Key={"PK": _pk_user(sub), "SK": f"PROFILE#{profile_id}"}).get("Item")
    return _public(item) if item else None


def create_profile(sub: str, data: dict) -> dict:
    profile_id = new_id()
    ts = now_iso()
    profile = {"id": profile_id, "userId": sub, **data, "createdAt": ts, "updatedAt": ts}
    _table.put_item(
        Item=_encode(
            {**profile, "PK": _pk_user(sub), "SK": f"PROFILE#{profile_id}", "entityType": "Profile"}
        )
    )
    return profile


def update_profile(sub: str, profile_id: str, patch: dict) -> dict | None:
    raw = _table.get_item(Key={"PK": _pk_user(sub), "SK": f"PROFILE#{profile_id}"}).get("Item")
    if not raw:
        return None
    merged = {**raw, **{k: v for k, v in patch.items() if v is not None}, "updatedAt": now_iso()}
    _table.put_item(Item=_encode(merged))
    return _public(merged)


def delete_profile(sub: str, profile_id: str) -> None:
    _table.delete_item(Key={"PK": _pk_user(sub), "SK": f"PROFILE#{profile_id}"})


# --- activities ------------------------------------------------------------


def list_activities(sub: str) -> list[dict]:
    items = _query_all(
        KeyConditionExpression=Key("PK").eq(_pk_user(sub)) & Key("SK").begins_with("ACTIVITY#")
    )
    return [_public(i) for i in items]


def get_activity(sub: str, activity_id: str) -> dict | None:
    item = _table.get_item(Key={"PK": _pk_user(sub), "SK": f"ACTIVITY#{activity_id}"}).get("Item")
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
                "PK": _pk_user(sub),
                "SK": f"ACTIVITY#{activity_id}",
                "entityType": "Activity",
                "GSI1PK": f"PROFILE#{data['profileId']}",
                "GSI1SK": f"ACT#{data['date']}#{activity_id}",
            }
        )
    )
    return activity


def update_activity(sub: str, activity_id: str, patch: dict) -> dict | None:
    raw = _table.get_item(Key={"PK": _pk_user(sub), "SK": f"ACTIVITY#{activity_id}"}).get("Item")
    if not raw:
        return None
    merged = {**raw, **{k: v for k, v in patch.items() if v is not None}, "updatedAt": now_iso()}
    merged["GSI1SK"] = f"ACT#{merged.get('date', '')}#{activity_id}"
    _table.put_item(Item=_encode(merged))
    return _public(merged)


def delete_activity(sub: str, activity_id: str) -> None:
    _table.delete_item(Key={"PK": _pk_user(sub), "SK": f"ACTIVITY#{activity_id}"})


def adjust_evidence_count(sub: str, activity_id: str, delta: int) -> None:
    try:
        _table.update_item(
            Key={"PK": _pk_user(sub), "SK": f"ACTIVITY#{activity_id}"},
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
        KeyConditionExpression=Key("PK").eq(_pk_user(sub)) & Key("SK").begins_with("EVIDENCE#")
    )
    public = [_public(i) for i in items]
    if activity_id:
        public = [e for e in public if e.get("activityId") == activity_id]
    return public


def get_evidence(sub: str, evidence_id: str) -> dict | None:
    item = _table.get_item(Key={"PK": _pk_user(sub), "SK": f"EVIDENCE#{evidence_id}"}).get("Item")
    return _public(item) if item else None


def create_evidence(sub: str, data: dict) -> dict:
    evidence_id = data.get("id") or new_id()
    record = {"id": evidence_id, "userId": sub, **data, "createdAt": now_iso()}
    _table.put_item(
        Item=_encode(
            {**record, "PK": _pk_user(sub), "SK": f"EVIDENCE#{evidence_id}", "entityType": "Evidence"}
        )
    )
    return record


def delete_evidence(sub: str, evidence_id: str) -> dict | None:
    existing = get_evidence(sub, evidence_id)
    if not existing:
        return None
    _table.delete_item(Key={"PK": _pk_user(sub), "SK": f"EVIDENCE#{evidence_id}"})
    return existing


# --- subscription (individual) --------------------------------------------


def get_subscription(sub: str) -> dict:
    """Return the stored purchase record, or ``{}`` if the user never paid."""
    item = _table.get_item(Key={"PK": _pk_user(sub), "SK": "SUBSCRIPTION#current"}).get("Item")
    return _public(item) if item else {}


def grant_paid_access(sub: str, days: int, stripe_customer_id: str | None = None) -> dict:
    """Extend a user's paid window by ``days``.

    Stacking re-purchases: a payment that lands while access is still active
    extends from the existing ``paidUntil`` rather than from today, so the
    buyer never loses the days they already paid for.
    """
    now = now_dt()
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
        "PK": _pk_user(sub),
        "SK": "SUBSCRIPTION#current",
        "entityType": "Subscription",
    }
    if customer_id:
        item["GSI2PK"] = f"STRIPE#{customer_id}"
        item["GSI2SK"] = _pk_user(sub)
    _table.put_item(Item=_encode(item))
    return record


def find_subscription_by_stripe_customer(customer_id: str) -> dict | None:
    items = _query_all(
        IndexName="GSI2",
        KeyConditionExpression=Key("GSI2PK").eq(f"STRIPE#{customer_id}"),
    )
    return _public(items[0]) if items else None


# --- audit (personal + org) ------------------------------------------------


def _put_audit(
    tenant_pk: str,
    actor_sub: str,
    action: str,
    target_type: str,
    target_id: str,
    detail: dict | None,
) -> None:
    ts = now_iso()
    audit_id = new_id()
    _table.put_item(
        Item=_encode(
            {
                "PK": tenant_pk,
                "SK": f"AUDIT#{ts}#{audit_id}",
                "entityType": "Audit",
                "id": audit_id,
                "tenantId": tenant_pk,
                "actorSub": actor_sub,
                "userId": actor_sub,  # legacy alias used by older frontend tables
                "action": action,
                "targetType": target_type,
                "targetId": target_id,
                "timestamp": ts,
                "detail": detail or {},
                "ttl": _ttl_from(AUDIT_RETENTION_DAYS),
            }
        )
    )


def add_audit(
    sub: str, action: str, target_type: str, target_id: str, detail: dict | None = None
) -> None:
    """Append a personal-audit row to ``USER#<sub>`` — preserves the v1 signature."""
    _put_audit(_pk_user(sub), sub, action, target_type, target_id, detail)


def add_org_audit(
    org_id: str,
    actor_sub: str,
    action: str,
    target_type: str,
    target_id: str,
    detail: dict | None = None,
) -> None:
    """Append an audit row scoped to an organization."""
    _put_audit(_pk_org(org_id), actor_sub, action, target_type, target_id, detail)


def list_audit(sub: str, limit: int = 50) -> list[dict]:
    """Personal audit history — preserves the v1 signature."""
    return _list_audit_pk(_pk_user(sub), limit)


def list_org_audit(org_id: str, limit: int = 100) -> list[dict]:
    return _list_audit_pk(_pk_org(org_id), limit)


def _list_audit_pk(tenant_pk: str, limit: int) -> list[dict]:
    resp = _table.query(
        KeyConditionExpression=Key("PK").eq(tenant_pk) & Key("SK").begins_with("AUDIT#"),
        ScanIndexForward=False,
        Limit=limit,
    )
    return [_public(i) for i in resp.get("Items", [])]


# --- organizations --------------------------------------------------------


def _slug_taken(slug: str) -> bool:
    items = _query_all(
        IndexName="GSI3",
        KeyConditionExpression=Key("GSI3PK").eq(f"ORGSLUG#{slug.lower()}"),
        Limit=1,
    )
    return bool(items)


def get_organization(org_id: str) -> dict | None:
    item = _table.get_item(Key={"PK": _pk_org(org_id), "SK": _pk_org(org_id)}).get("Item")
    return _public(item) if item else None


def get_organization_by_slug(slug: str) -> dict | None:
    items = _query_all(
        IndexName="GSI3",
        KeyConditionExpression=Key("GSI3PK").eq(f"ORGSLUG#{slug.lower()}"),
        Limit=1,
    )
    return _public(items[0]) if items else None


def create_organization(
    owner_sub: str,
    owner_email: str,
    owner_name: str,
    data: dict,
) -> dict:
    """Create the org row, the owner Member, and the matching Membership row.

    These three writes go in a single TransactWriteItems so a failed step never
    leaves a dangling org without an owner.
    """
    org_id = new_id()
    slug = (data.get("slug") or _slugify(data["name"]))[:60]
    if _slug_taken(slug):
        slug = f"{slug}-{secrets.token_hex(3)}"
    ts = now_iso()
    org = {
        "id": org_id,
        "name": data["name"],
        "slug": slug,
        "type": data["type"],
        "description": data.get("description"),
        "ownerSub": owner_sub,
        "memberCount": 1,
        "tier": tier_for_member_count(1),
        "storageEnabled": bool(data.get("storageEnabled", False)),
        "chatRetentionDays": int(data.get("chatRetentionDays", DEFAULT_CHAT_RETENTION_DAYS)),
        "createdAt": ts,
        "updatedAt": ts,
    }
    membership = {
        "id": new_id(),
        "orgId": org_id,
        "userSub": owner_sub,
        "email": owner_email,
        "fullName": owner_name,
        "role": "owner",
        "joinedAt": ts,
    }

    _table.meta.client.transact_write_items(
        TransactItems=[
            {
                "Put": {
                    "TableName": _table.name,
                    "Item": _encode(
                        {
                            **org,
                            "PK": _pk_org(org_id),
                            "SK": _pk_org(org_id),
                            "entityType": "Organization",
                            # Slug uniqueness index entry.
                            "GSI3PK": f"ORGSLUG#{slug.lower()}",
                            "GSI3SK": _pk_org(org_id),
                        }
                    ),
                    "ConditionExpression": "attribute_not_exists(PK)",
                }
            },
            {
                "Put": {
                    "TableName": _table.name,
                    "Item": _encode(
                        {
                            **membership,
                            "PK": _pk_org(org_id),
                            "SK": f"MEMBER#{owner_sub}",
                            "entityType": "Member",
                            # Channel-time index reused for org-wide member list.
                            "GSI4PK": f"ORG#{org_id}#MEMBERS",
                            "GSI4SK": f"{ts}#{owner_sub}",
                        }
                    ),
                }
            },
            {
                "Put": {
                    "TableName": _table.name,
                    "Item": _encode(
                        {
                            **membership,
                            "PK": _pk_user(owner_sub),
                            "SK": f"MEMBERSHIP#{org_id}",
                            "entityType": "Membership",
                            # Per-user listing of orgs.
                            "GSI3PK": _pk_user(owner_sub),
                            "GSI3SK": f"ORG#{org_id}",
                        }
                    ),
                }
            },
        ]
    )
    return org


def update_organization(org_id: str, patch: dict) -> dict | None:
    raw = _table.get_item(Key={"PK": _pk_org(org_id), "SK": _pk_org(org_id)}).get("Item")
    if not raw:
        return None
    merged = {**raw, **{k: v for k, v in patch.items() if v is not None}, "updatedAt": now_iso()}
    _table.put_item(Item=_encode(merged))
    return _public(merged)


def list_organizations_for_user(sub: str) -> list[dict]:
    """All orgs the user is a member of, with role attached."""
    items = _query_all(
        IndexName="GSI3",
        KeyConditionExpression=Key("GSI3PK").eq(_pk_user(sub)) & Key("GSI3SK").begins_with("ORG#"),
    )
    out: list[dict] = []
    for m in items:
        org_id = m.get("orgId")
        if not org_id:
            continue
        org = get_organization(org_id)
        if not org:
            continue
        out.append({"org": org, "role": m.get("role", "member")})
    return out


def _slugify(name: str) -> str:
    import re

    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "org"


# --- members --------------------------------------------------------------


def list_members(org_id: str) -> list[dict]:
    items = _query_all(
        KeyConditionExpression=Key("PK").eq(_pk_org(org_id)) & Key("SK").begins_with("MEMBER#")
    )
    return [_public(i) for i in items]


def get_member(org_id: str, sub: str) -> dict | None:
    item = _table.get_item(Key={"PK": _pk_org(org_id), "SK": f"MEMBER#{sub}"}).get("Item")
    return _public(item) if item else None


def get_membership(sub: str, org_id: str) -> dict | None:
    item = _table.get_item(Key={"PK": _pk_user(sub), "SK": f"MEMBERSHIP#{org_id}"}).get("Item")
    return _public(item) if item else None


def add_member(org_id: str, sub: str, email: str, full_name: str, role: str) -> dict:
    """Insert a Member + Membership pair and bump the org member count."""
    ts = now_iso()
    record = {
        "id": new_id(),
        "orgId": org_id,
        "userSub": sub,
        "email": email,
        "fullName": full_name,
        "role": role,
        "joinedAt": ts,
    }
    _table.meta.client.transact_write_items(
        TransactItems=[
            {
                "Put": {
                    "TableName": _table.name,
                    "Item": _encode(
                        {
                            **record,
                            "PK": _pk_org(org_id),
                            "SK": f"MEMBER#{sub}",
                            "entityType": "Member",
                            "GSI4PK": f"ORG#{org_id}#MEMBERS",
                            "GSI4SK": f"{ts}#{sub}",
                        }
                    ),
                    "ConditionExpression": "attribute_not_exists(PK)",
                }
            },
            {
                "Put": {
                    "TableName": _table.name,
                    "Item": _encode(
                        {
                            **record,
                            "PK": _pk_user(sub),
                            "SK": f"MEMBERSHIP#{org_id}",
                            "entityType": "Membership",
                            "GSI3PK": _pk_user(sub),
                            "GSI3SK": f"ORG#{org_id}",
                        }
                    ),
                }
            },
            {
                "Update": {
                    "TableName": _table.name,
                    "Key": {"PK": _pk_org(org_id), "SK": _pk_org(org_id)},
                    "UpdateExpression": (
                        "SET memberCount = if_not_exists(memberCount, :z) + :one, "
                        "tier = :t, updatedAt = :ts"
                    ),
                    "ExpressionAttributeValues": _encode(
                        {
                            ":one": 1,
                            ":z": 0,
                            # Tier is recomputed by the membership job; we set a
                            # safe placeholder here and the periodic re-tier
                            # job corrects it. Worst case: a brand-new org sits
                            # at its initial tier for up to 24 hours.
                            ":t": "small",
                            ":ts": ts,
                        }
                    ),
                }
            },
        ]
    )
    return record


def change_member_role(org_id: str, sub: str, role: str) -> dict | None:
    member = get_member(org_id, sub)
    if not member:
        return None
    member["role"] = role
    member["updatedAt"] = now_iso()
    membership = get_membership(sub, org_id) or {}
    membership.update({"role": role, "updatedAt": now_iso()})

    _table.meta.client.transact_write_items(
        TransactItems=[
            {
                "Update": {
                    "TableName": _table.name,
                    "Key": {"PK": _pk_org(org_id), "SK": f"MEMBER#{sub}"},
                    "UpdateExpression": "SET #r = :r, updatedAt = :ts",
                    "ExpressionAttributeNames": {"#r": "role"},
                    "ExpressionAttributeValues": _encode({":r": role, ":ts": now_iso()}),
                    "ConditionExpression": "attribute_exists(PK)",
                }
            },
            {
                "Update": {
                    "TableName": _table.name,
                    "Key": {"PK": _pk_user(sub), "SK": f"MEMBERSHIP#{org_id}"},
                    "UpdateExpression": "SET #r = :r, updatedAt = :ts",
                    "ExpressionAttributeNames": {"#r": "role"},
                    "ExpressionAttributeValues": _encode({":r": role, ":ts": now_iso()}),
                    "ConditionExpression": "attribute_exists(PK)",
                }
            },
        ]
    )
    return member


def remove_member(org_id: str, sub: str) -> None:
    """Remove a member. Owner can't be removed by this function — the route
    layer enforces that constraint."""
    _table.meta.client.transact_write_items(
        TransactItems=[
            {
                "Delete": {
                    "TableName": _table.name,
                    "Key": {"PK": _pk_org(org_id), "SK": f"MEMBER#{sub}"},
                }
            },
            {
                "Delete": {
                    "TableName": _table.name,
                    "Key": {"PK": _pk_user(sub), "SK": f"MEMBERSHIP#{org_id}"},
                }
            },
            {
                "Update": {
                    "TableName": _table.name,
                    "Key": {"PK": _pk_org(org_id), "SK": _pk_org(org_id)},
                    "UpdateExpression": "ADD memberCount :neg SET updatedAt = :ts",
                    "ExpressionAttributeValues": _encode(
                        {":neg": -1, ":ts": now_iso(), ":zero": 0}
                    ),
                    "ConditionExpression": "memberCount > :zero",
                }
            },
        ]
    )


# --- invites --------------------------------------------------------------


def create_invite(org_id: str, email: str, role: str, invited_by_sub: str) -> dict:
    token = new_token()
    ts = now_iso()
    expires = now_dt() + dt.timedelta(days=INVITE_TTL_DAYS)
    record = {
        "id": new_id(),
        "orgId": org_id,
        "email": email.lower(),
        "role": role,
        "token": token,
        "invitedBySub": invited_by_sub,
        "expiresAt": expires.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "createdAt": ts,
    }
    _table.put_item(
        Item=_encode(
            {
                **record,
                "PK": _pk_org(org_id),
                "SK": f"INVITE#{token}",
                "entityType": "Invite",
                "GSI3PK": f"INVITE#{token}",
                "GSI3SK": _pk_org(org_id),
                "ttl": int(expires.timestamp()),
            }
        )
    )
    return record


def resolve_invite(token: str) -> dict | None:
    items = _query_all(
        IndexName="GSI3",
        KeyConditionExpression=Key("GSI3PK").eq(f"INVITE#{token}"),
        Limit=1,
    )
    return _public(items[0]) if items else None


def delete_invite(org_id: str, token: str) -> None:
    _table.delete_item(Key={"PK": _pk_org(org_id), "SK": f"INVITE#{token}"})


def list_invites(org_id: str) -> list[dict]:
    items = _query_all(
        KeyConditionExpression=Key("PK").eq(_pk_org(org_id)) & Key("SK").begins_with("INVITE#")
    )
    return [_public(i) for i in items]


# --- channels & chat ------------------------------------------------------


def list_channels(org_id: str) -> list[dict]:
    items = _query_all(
        KeyConditionExpression=Key("PK").eq(_pk_org(org_id))
        & Key("SK").begins_with("CHANNEL#"),
        FilterExpression=Attr("entityType").eq("Channel"),
    )
    return [_public(i) for i in items]


def get_channel(org_id: str, channel_id: str) -> dict | None:
    item = _table.get_item(Key={"PK": _pk_org(org_id), "SK": f"CHANNEL#{channel_id}"}).get("Item")
    return _public(item) if item else None


def create_channel(org_id: str, data: dict, creator_sub: str) -> dict:
    channel_id = new_id()
    ts = now_iso()
    record = {
        "id": channel_id,
        "orgId": org_id,
        "name": data["name"],
        "description": data.get("description"),
        "minRole": data.get("minRole"),
        "messageCount": 0,
        "createdAt": ts,
        "createdBySub": creator_sub,
    }
    _table.put_item(
        Item=_encode(
            {
                **record,
                "PK": _pk_org(org_id),
                "SK": f"CHANNEL#{channel_id}",
                "entityType": "Channel",
            }
        )
    )
    return record


def list_messages(
    org_id: str, channel_id: str, limit: int = 50, before: str | None = None
) -> list[dict]:
    """Last ``limit`` messages newest-first, optionally before an SK cursor."""
    key_cond = Key("PK").eq(_pk_org(org_id)) & Key("SK").begins_with(
        f"CHANNEL#{channel_id}#MSG#"
    )
    kwargs: dict[str, Any] = {
        "KeyConditionExpression": key_cond,
        "ScanIndexForward": False,
        "Limit": limit,
    }
    if before:
        kwargs["ExclusiveStartKey"] = {
            "PK": _pk_org(org_id),
            "SK": before,
        }
    resp = _table.query(**kwargs)
    return [_public(i) for i in resp.get("Items", [])]


def post_message(
    org_id: str,
    channel_id: str,
    author_sub: str,
    author_name: str,
    body: str,
    retention_days: int,
) -> dict:
    msg_id = new_id()
    ts = now_iso()
    expires_at = _ttl_from(retention_days)
    record = {
        "id": msg_id,
        "orgId": org_id,
        "channelId": channel_id,
        "authorSub": author_sub,
        "authorName": author_name,
        "body": body,
        "createdAt": ts,
        "expiresAt": expires_at,
    }
    _table.put_item(
        Item=_encode(
            {
                **record,
                "PK": _pk_org(org_id),
                "SK": f"CHANNEL#{channel_id}#MSG#{ts}#{msg_id}",
                "entityType": "ChatMessage",
                # GSI4 powers WS fan-out and the per-channel scroll.
                "GSI4PK": f"CHANNEL#{channel_id}",
                "GSI4SK": f"{ts}#{msg_id}",
                "ttl": expires_at,
            }
        )
    )
    return record


def react_to_message(
    org_id: str, channel_id: str, msg_sk: str, user_sub: str, emoji: str
) -> dict | None:
    raw = _table.get_item(Key={"PK": _pk_org(org_id), "SK": msg_sk}).get("Item")
    if not raw:
        return None
    reactions = raw.get("reactions") or {}
    reactors = list(reactions.get(emoji) or [])
    if user_sub in reactors:
        reactors.remove(user_sub)
    else:
        reactors.append(user_sub)
    if reactors:
        reactions[emoji] = reactors
    else:
        reactions.pop(emoji, None)
    _table.update_item(
        Key={"PK": _pk_org(org_id), "SK": msg_sk},
        UpdateExpression="SET reactions = :r",
        ExpressionAttributeValues=_encode({":r": reactions}),
    )
    raw["reactions"] = reactions
    return _public(raw)


def pin_message(org_id: str, channel_id: str, msg_sk: str, pinned: bool) -> None:
    _table.update_item(
        Key={"PK": _pk_org(org_id), "SK": msg_sk},
        UpdateExpression="SET pinned = :p",
        ExpressionAttributeValues=_encode({":p": pinned}),
    )


# --- clock sessions -------------------------------------------------------


def open_clock_session(
    org_id: str,
    user_sub: str,
    user_name: str,
    activity_type: str,
    notes: str | None,
    event_id: str | None,
    profile_id: str | None,
) -> dict:
    """Create a new session in ``open`` state. Idempotent on (orgId, user, open)."""
    existing = get_open_clock_session(org_id, user_sub)
    if existing:
        return existing  # one open session per (user, org) at a time
    ts = now_iso()
    session_id = new_id()
    record = {
        "id": session_id,
        "orgId": org_id,
        "userSub": user_sub,
        "userName": user_name,
        "activityType": activity_type,
        "startedAt": ts,
        "status": "open",
        "notes": notes,
        "eventId": event_id,
        "profileId": profile_id,
    }
    _table.put_item(
        Item=_encode(
            {
                **record,
                "PK": _pk_org(org_id),
                "SK": f"CLOCK#{user_sub}#{ts}#{session_id}",
                "entityType": "ClockSession",
                # Org-wide time index for manager views and snapshot job.
                "GSI4PK": f"ORG#{org_id}#CLOCK",
                "GSI4SK": f"{ts}#{session_id}",
                "ttl": _ttl_from(CLOCK_SESSION_RETENTION_DAYS),
            }
        )
    )
    return record


def get_open_clock_session(org_id: str, user_sub: str) -> dict | None:
    """Latest session for the user that's still in ``open`` state."""
    items = _query_all(
        KeyConditionExpression=Key("PK").eq(_pk_org(org_id))
        & Key("SK").begins_with(f"CLOCK#{user_sub}#"),
        FilterExpression=Attr("status").eq("open"),
    )
    return _public(items[-1]) if items else None


def get_clock_session(org_id: str, sk: str) -> dict | None:
    item = _table.get_item(Key={"PK": _pk_org(org_id), "SK": sk}).get("Item")
    return _public(item) if item else None


def close_clock_session(
    org_id: str, sk: str, notes: str | None
) -> dict | None:
    raw = _table.get_item(Key={"PK": _pk_org(org_id), "SK": sk}).get("Item")
    if not raw or raw.get("status") != "open":
        return None
    ended_at = now_dt()
    started = raw.get("startedAt")
    try:
        started_dt = dt.datetime.strptime(started, "%Y-%m-%dT%H:%M:%SZ").replace(
            tzinfo=dt.timezone.utc
        )
        hours = max(0.0, (ended_at - started_dt).total_seconds() / 3600.0)
    except Exception:
        hours = 0.0
    patch = {
        "status": "pending",
        "endedAt": ended_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "hours": Decimal(str(round(hours, 4))),
    }
    if notes:
        patch["notes"] = (raw.get("notes") + "\n" if raw.get("notes") else "") + notes
    merged = {**raw, **patch}
    _table.put_item(Item=_encode(merged))
    return _public(merged)


def decide_clock_session(
    org_id: str, sk: str, decided_by: str, decision: str, note: str | None
) -> dict | None:
    raw = _table.get_item(Key={"PK": _pk_org(org_id), "SK": sk}).get("Item")
    if not raw or raw.get("status") not in {"pending", "open"}:
        return None
    merged = {
        **raw,
        "status": "approved" if decision == "approve" else "rejected",
        "decidedBySub": decided_by,
        "decidedAt": now_iso(),
        "decisionNote": note,
    }
    _table.put_item(Item=_encode(merged))
    return _public(merged)


def list_clock_sessions_for_user(
    org_id: str, user_sub: str, limit: int = 100
) -> list[dict]:
    items = _query_all(
        KeyConditionExpression=Key("PK").eq(_pk_org(org_id))
        & Key("SK").begins_with(f"CLOCK#{user_sub}#"),
    )
    items.sort(key=lambda i: i.get("SK", ""), reverse=True)
    return [_public(i) for i in items[:limit]]


def list_clock_sessions_org_window(
    org_id: str, start_iso: str, end_iso: str
) -> list[dict]:
    """All clock sessions org-wide between ``start_iso`` and ``end_iso``.

    Uses GSI4 (``ORG#<id>#CLOCK`` → ``<iso>#<id>``) — no scans.
    """
    items = _query_all(
        IndexName="GSI4",
        KeyConditionExpression=Key("GSI4PK").eq(f"ORG#{org_id}#CLOCK")
        & Key("GSI4SK").between(start_iso, end_iso + "￿"),
    )
    return [_public(i) for i in items]


# --- aggregate snapshots --------------------------------------------------


def put_org_daily_stats(stats: dict) -> None:
    org_id = stats["orgId"]
    date = stats["date"]
    _table.put_item(
        Item=_encode(
            {
                **stats,
                "PK": _pk_org(org_id),
                "SK": f"STATS#DAY#{date}",
                "entityType": "OrgDailyStats",
                "ttl": _ttl_from(SNAPSHOT_RETENTION_DAYS),
            }
        )
    )


def put_member_daily_stats(stats: dict) -> None:
    org_id = stats["orgId"]
    sub = stats["userSub"]
    date = stats["date"]
    _table.put_item(
        Item=_encode(
            {
                **stats,
                "PK": _pk_org(org_id),
                "SK": f"MEMBER_STATS#{sub}#{date}",
                "entityType": "MemberDailyStats",
                "ttl": _ttl_from(SNAPSHOT_RETENTION_DAYS),
            }
        )
    )


def put_org_monthly_stats(stats: dict) -> None:
    org_id = stats["orgId"]
    year_month = stats["yearMonth"]
    _table.put_item(
        Item=_encode(
            {
                **stats,
                "PK": _pk_org(org_id),
                "SK": f"STATS#MONTH#{year_month}",
                "entityType": "OrgMonthlyStats",
            }
        )
    )


def get_org_daily_stats(org_id: str, date: str) -> dict | None:
    item = _table.get_item(Key={"PK": _pk_org(org_id), "SK": f"STATS#DAY#{date}"}).get("Item")
    return _public(item) if item else None


def list_org_daily_stats(org_id: str, from_date: str, to_date: str) -> list[dict]:
    items = _query_all(
        KeyConditionExpression=Key("PK").eq(_pk_org(org_id))
        & Key("SK").between(f"STATS#DAY#{from_date}", f"STATS#DAY#{to_date}"),
    )
    return [_public(i) for i in items]


def list_org_monthly_stats(org_id: str) -> list[dict]:
    items = _query_all(
        KeyConditionExpression=Key("PK").eq(_pk_org(org_id))
        & Key("SK").begins_with("STATS#MONTH#"),
    )
    return [_public(i) for i in items]


def list_member_stats_window(
    org_id: str, from_date: str, to_date: str
) -> list[dict]:
    items = _query_all(
        KeyConditionExpression=Key("PK").eq(_pk_org(org_id))
        & Key("SK").begins_with("MEMBER_STATS#"),
        FilterExpression=Attr("date").between(from_date, to_date),
    )
    return [_public(i) for i in items]


def iter_org_ids() -> Iterable[str]:
    """Scan the entityType=Organization rows. Used by daily snapshot job only."""
    kwargs = {"FilterExpression": Attr("entityType").eq("Organization")}
    while True:
        resp = _table.scan(**kwargs)
        for item in resp.get("Items", []):
            org_id = item.get("id")
            if org_id:
                yield org_id
        start_key = resp.get("LastEvaluatedKey")
        if not start_key:
            return
        kwargs["ExclusiveStartKey"] = start_key


# --- notifications --------------------------------------------------------


def push_notification(user_sub: str, payload: dict) -> dict:
    ts = now_iso()
    notification_id = new_id()
    record = {
        "id": notification_id,
        "userSub": user_sub,
        "createdAt": ts,
        "read": False,
        **payload,
    }
    _table.put_item(
        Item=_encode(
            {
                **record,
                "PK": _pk_user(user_sub),
                "SK": f"INBOX#{ts}#{notification_id}",
                "entityType": "Notification",
                "GSI4PK": f"INBOX#{user_sub}",
                "GSI4SK": f"{ts}#{notification_id}",
                "ttl": _ttl_from(NOTIFICATION_RETENTION_DAYS),
            }
        )
    )
    return record


def list_notifications(user_sub: str, limit: int = 50) -> list[dict]:
    items = _query_all(
        IndexName="GSI4",
        KeyConditionExpression=Key("GSI4PK").eq(f"INBOX#{user_sub}"),
        ScanIndexForward=False,
        Limit=limit,
    )
    return [_public(i) for i in items]


def mark_notification_read(user_sub: str, notification_sk: str) -> None:
    _table.update_item(
        Key={"PK": _pk_user(user_sub), "SK": notification_sk},
        UpdateExpression="SET #r = :t",
        ExpressionAttributeNames={"#r": "read"},
        ExpressionAttributeValues={":t": True},
    )


# --- reports --------------------------------------------------------------


def create_report_job(org_id: str, requested_by: str, data: dict) -> dict:
    job_id = new_id()
    ts = now_iso()
    record = {
        "id": job_id,
        "orgId": org_id,
        "requestedBySub": requested_by,
        "status": "queued",
        "createdAt": ts,
        **data,
    }
    _table.put_item(
        Item=_encode(
            {
                **record,
                "PK": _pk_org(org_id),
                "SK": f"REPORT#{job_id}",
                "entityType": "ReportJob",
            }
        )
    )
    return record


def update_report_job(org_id: str, job_id: str, patch: dict) -> dict | None:
    raw = _table.get_item(Key={"PK": _pk_org(org_id), "SK": f"REPORT#{job_id}"}).get("Item")
    if not raw:
        return None
    merged = {**raw, **{k: v for k, v in patch.items() if v is not None}}
    _table.put_item(Item=_encode(merged))
    return _public(merged)


def get_report_job(org_id: str, job_id: str) -> dict | None:
    item = _table.get_item(Key={"PK": _pk_org(org_id), "SK": f"REPORT#{job_id}"}).get("Item")
    return _public(item) if item else None


def list_report_jobs(org_id: str, limit: int = 50) -> list[dict]:
    items = _query_all(
        KeyConditionExpression=Key("PK").eq(_pk_org(org_id))
        & Key("SK").begins_with("REPORT#"),
    )
    items.sort(key=lambda i: i.get("createdAt", ""), reverse=True)
    return [_public(i) for i in items[:limit]]


# --- org subscriptions ----------------------------------------------------


def get_org_subscription(org_id: str) -> dict:
    item = _table.get_item(Key={"PK": _pk_org(org_id), "SK": "SUBSCRIPTION#current"}).get("Item")
    return _public(item) if item else {}


def grant_org_paid_access(
    org_id: str, tier: str, storage_enabled: bool, days: int,
    stripe_customer_id: str | None = None,
    stripe_subscription_id: str | None = None,
) -> dict:
    now = now_dt()
    existing = get_org_subscription(org_id)
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
        "orgId": org_id,
        "tier": tier,
        "storageEnabled": storage_enabled,
        "paidUntil": paid_until.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "updatedAt": ts,
    }
    if stripe_customer_id:
        record["stripeCustomerId"] = stripe_customer_id
    if stripe_subscription_id:
        record["stripeSubscriptionId"] = stripe_subscription_id
    item = {
        **record,
        "PK": _pk_org(org_id),
        "SK": "SUBSCRIPTION#current",
        "entityType": "OrgSubscription",
    }
    if stripe_customer_id:
        item["GSI2PK"] = f"STRIPE#{stripe_customer_id}"
        item["GSI2SK"] = _pk_org(org_id)
    _table.put_item(Item=_encode(item))
    return record


def find_org_subscription_by_stripe_customer(customer_id: str) -> dict | None:
    items = _query_all(
        IndexName="GSI2",
        KeyConditionExpression=Key("GSI2PK").eq(f"STRIPE#{customer_id}")
        & Key("GSI2SK").begins_with("ORG#"),
        Limit=1,
    )
    return _public(items[0]) if items else None


# --- websocket connections ------------------------------------------------


def register_ws_connection(connection_id: str, user_sub: str) -> None:
    ts = now_iso()
    _table.put_item(
        Item=_encode(
            {
                "PK": f"WS#{connection_id}",
                "SK": f"WS#{connection_id}",
                "entityType": "WsConnection",
                "connectionId": connection_id,
                "userSub": user_sub,
                "connectedAt": ts,
                "GSI5PK": _pk_user(user_sub),
                "GSI5SK": f"WS#{connection_id}",
                "ttl": _ttl_hours_from(WS_CONNECTION_TTL_HOURS),
            }
        )
    )


def subscribe_ws_to_channel(connection_id: str, channel_id: str) -> None:
    """Add a secondary row linking the connection to a channel for fan-out."""
    ts = now_iso()
    _table.put_item(
        Item=_encode(
            {
                "PK": f"WS#{connection_id}",
                "SK": f"CHAN#{channel_id}",
                "entityType": "WsSubscription",
                "connectionId": connection_id,
                "channelId": channel_id,
                "createdAt": ts,
                "GSI5PK": f"CHANNEL#{channel_id}",
                "GSI5SK": f"WS#{connection_id}",
                "ttl": _ttl_hours_from(WS_CONNECTION_TTL_HOURS),
            }
        )
    )


def deregister_ws_connection(connection_id: str) -> None:
    # Delete the primary row + any channel subscription rows.
    pk = f"WS#{connection_id}"
    items = _query_all(KeyConditionExpression=Key("PK").eq(pk))
    with _table.batch_writer() as batch:
        for item in items:
            batch.delete_item(Key={"PK": item["PK"], "SK": item["SK"]})


def list_ws_connections_for_channel(channel_id: str) -> list[str]:
    items = _query_all(
        IndexName="GSI5",
        KeyConditionExpression=Key("GSI5PK").eq(f"CHANNEL#{channel_id}"),
    )
    return [i["connectionId"] for i in items if i.get("connectionId")]
