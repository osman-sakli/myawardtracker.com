"""Role-based access control for organization-scoped routes.

The permission matrix mirrors ``shared/src/constants.ts``. The two definitions
must stay in sync — there is a smoke test in ``backend/tests/test_rbac.py``.

Tenant isolation is structural: every org route binds the partition key to the
``orgId`` from the URL. RBAC adds *role* enforcement on top of that — even an
org member can't approve clock sessions if their role lacks ``clock:approve``.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from aws_lambda_powertools.event_handler.exceptions import ForbiddenError

if TYPE_CHECKING:
    from .auth import AuthUser

Permission = str  # alias for readability — see the constant below

ALL_PERMISSIONS: tuple[Permission, ...] = (
    "org:update",
    "org:delete",
    "billing:manage",
    "members:invite",
    "members:remove",
    "members:role",
    "channels:create",
    "channels:moderate",
    "messages:post",
    "messages:read",
    "messages:pin",
    "clock:self",
    "clock:approve",
    "clock:view_all",
    "reports:generate",
    "reports:view",
    "audit:view",
)


# Permission grid. Keep alphabetized inside each role for fast review.
ROLE_PERMISSIONS: dict[str, frozenset[Permission]] = {
    "owner": frozenset(ALL_PERMISSIONS),
    "admin": frozenset(p for p in ALL_PERMISSIONS if p != "org:delete"),
    "manager": frozenset(
        {
            "channels:create",
            "channels:moderate",
            "clock:approve",
            "clock:self",
            "clock:view_all",
            "members:invite",
            "messages:pin",
            "messages:post",
            "messages:read",
            "reports:generate",
            "reports:view",
        }
    ),
    "moderator": frozenset(
        {
            "channels:moderate",
            "clock:self",
            "clock:view_all",
            "messages:pin",
            "messages:post",
            "messages:read",
            "reports:view",
        }
    ),
    "member": frozenset({"clock:self", "messages:post", "messages:read"}),
    "viewer": frozenset({"clock:view_all", "messages:read", "reports:view"}),
}


def role_has(role: str, perm: Permission) -> bool:
    return perm in ROLE_PERMISSIONS.get(role, frozenset())


def require(perm: Permission, role: str | None) -> None:
    """Raise ``ForbiddenError`` unless ``role`` carries ``perm``.

    Callers typically resolve ``role`` via :func:`app.tenancy.org_role`.
    """
    if not role:
        raise ForbiddenError("You are not a member of this organization.")
    if not role_has(role, perm):
        raise ForbiddenError(
            f"Your role '{role}' does not allow '{perm}'."
        )


def require_any(perms: tuple[Permission, ...], role: str | None) -> None:
    if not role:
        raise ForbiddenError("You are not a member of this organization.")
    if not any(role_has(role, p) for p in perms):
        raise ForbiddenError(
            f"Your role '{role}' does not allow any of: {', '.join(perms)}."
        )
