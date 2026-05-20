"""Access state derived from a user record and their purchase record.

Every account gets a 30-day free trial counted from ``createdAt``. A yearly
subscription then grants ``PAID_ACCESS_DAYS`` of access (see :mod:`constants`).

Organizations follow the same shape: a 30-day trial from creation, then yearly
billing keyed to ``OrgSubscription.paidUntil``.
"""

from __future__ import annotations

import datetime as dt

from aws_lambda_powertools.event_handler.exceptions import ForbiddenError

from .constants import FREE_TRIAL_DAYS

_FMT = "%Y-%m-%dT%H:%M:%SZ"


def _parse(ts: str | None) -> dt.datetime | None:
    if not ts:
        return None
    try:
        return dt.datetime.strptime(ts, _FMT).replace(tzinfo=dt.timezone.utc)
    except ValueError:
        return None


def _fmt(value: dt.datetime) -> str:
    return value.strftime(_FMT)


def _days_until(target: dt.datetime, now: dt.datetime) -> int:
    """Whole days remaining, rounded up so the final partial day still counts."""
    seconds = int((target - now).total_seconds())
    if seconds <= 0:
        return 0
    return -(-seconds // 86400)


def _resolve(created_iso: str | None, paid_iso: str | None) -> tuple[str, int, dt.datetime]:
    now = dt.datetime.now(dt.timezone.utc)
    created = _parse(created_iso) or now
    trial_ends = created + dt.timedelta(days=FREE_TRIAL_DAYS)
    paid_until = _parse(paid_iso)

    if paid_until and paid_until > now:
        return "active", _days_until(paid_until, now), trial_ends
    if now < trial_ends:
        return "trialing", _days_until(trial_ends, now), trial_ends
    return "expired", 0, trial_ends


def describe(user: dict, subscription: dict) -> dict:
    """Build the subscription block returned by ``/v1/me``."""
    status, days_remaining, trial_ends = _resolve(
        user.get("createdAt"), subscription.get("paidUntil")
    )
    now = dt.datetime.now(dt.timezone.utc)
    return {
        "userId": user.get("id", ""),
        "planId": "individual",
        "status": status,
        "trialEndsAt": _fmt(trial_ends),
        "paidUntil": subscription.get("paidUntil"),
        "daysRemaining": days_remaining,
        "stripeCustomerId": subscription.get("stripeCustomerId"),
        "updatedAt": subscription.get("updatedAt") or _fmt(now),
    }


def has_access(user: dict, subscription: dict) -> bool:
    return describe(user, subscription)["status"] in ("trialing", "active")


def require_access(user: dict, subscription: dict) -> None:
    """Raise 403 when the trial has lapsed and no purchase is active."""
    if not has_access(user, subscription):
        raise ForbiddenError(
            "Your free trial has ended. Subscribe to keep adding records."
        )


def describe_org(org: dict, subscription: dict) -> dict:
    """Subscription block returned by ``/v1/orgs/{id}``."""
    status, days_remaining, trial_ends = _resolve(
        org.get("createdAt"), subscription.get("paidUntil")
    )
    now = dt.datetime.now(dt.timezone.utc)
    return {
        "orgId": org.get("id", ""),
        "tier": subscription.get("tier") or org.get("tier", "small"),
        "storageEnabled": bool(
            subscription.get("storageEnabled") or org.get("storageEnabled", False)
        ),
        "status": status,
        "trialEndsAt": _fmt(trial_ends),
        "paidUntil": subscription.get("paidUntil"),
        "daysRemaining": days_remaining,
        "stripeCustomerId": subscription.get("stripeCustomerId"),
        "stripeSubscriptionId": subscription.get("stripeSubscriptionId"),
        "updatedAt": subscription.get("updatedAt") or _fmt(now),
    }


def org_has_access(org: dict, subscription: dict) -> bool:
    return describe_org(org, subscription)["status"] in ("trialing", "active")


def require_org_access(org: dict, subscription: dict) -> None:
    """Raise 403 on writes when the org subscription has lapsed."""
    if not org_has_access(org, subscription):
        raise ForbiddenError(
            "This organization's subscription has lapsed. Renew to keep adding records."
        )
