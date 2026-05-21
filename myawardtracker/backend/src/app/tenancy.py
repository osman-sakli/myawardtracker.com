"""Resolve the org context for a request.

Org routes accept ``orgId`` as a path parameter. This module loads the caller's
``Membership`` row exactly once per request and caches it on the event object,
so downstream RBAC checks are free.
"""

from __future__ import annotations

from aws_lambda_powertools.event_handler.exceptions import ForbiddenError, NotFoundError

from . import db
from .auth import AuthUser

_CACHE_KEY = "_org_role_cache"


def org_role(event, org_id: str, user: AuthUser) -> str:
    """Return the caller's role in ``org_id``, or raise 403."""
    cache: dict[str, str] = getattr(event, _CACHE_KEY, None) or {}
    if org_id in cache:
        return cache[org_id]

    membership = db.get_membership(user.sub, org_id)
    if not membership:
        raise ForbiddenError("You are not a member of this organization.")

    role = membership.get("role", "member")
    cache[org_id] = role
    try:
        setattr(event, _CACHE_KEY, cache)
    except Exception:
        # event objects from Powertools are plain dicts wrapped in proxies — if
        # an attribute can't be set, we just skip the cache; cost is one extra
        # GetItem per request.
        pass
    return role


def require_org(event, org_id: str, user: AuthUser) -> dict:
    """Load the organization or raise 404. Also asserts caller membership."""
    org = db.get_organization(org_id)
    if not org:
        raise NotFoundError("organization not found")
    org_role(event, org_id, user)  # asserts membership exists
    return org
