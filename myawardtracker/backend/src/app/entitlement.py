"""Access state derived from a user record and their purchase record.

Every account gets a 15-day free trial counted from ``createdAt``. A one-time
purchase then grants ``PAID_ACCESS_DAYS`` of access (see :mod:`constants`).
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


def describe(user: dict, subscription: dict) -> dict:
    """Build the subscription block returned by ``/v1/me``."""
    now = dt.datetime.now(dt.timezone.utc)

    created = _parse(user.get("createdAt")) or now
    trial_ends = created + dt.timedelta(days=FREE_TRIAL_DAYS)
    paid_until = _parse(subscription.get("paidUntil"))

    if paid_until and paid_until > now:
        status = "active"
        days_remaining = _days_until(paid_until, now)
    elif now < trial_ends:
        status = "trialing"
        days_remaining = _days_until(trial_ends, now)
    else:
        status = "expired"
        days_remaining = 0

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
            "Your free trial has ended. Purchase access to keep adding records."
        )
