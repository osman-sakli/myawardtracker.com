"""RBAC permission grid tests.

These pin down the exact role-to-permission relationship and act as a
regression net for shared/src/constants.ts (which mirrors the same matrix).
"""

from __future__ import annotations

import pytest

from app import rbac
from app.rbac import ALL_PERMISSIONS, ROLE_PERMISSIONS


def test_every_role_has_an_entry():
    expected_roles = {"owner", "admin", "manager", "moderator", "member", "viewer"}
    assert set(ROLE_PERMISSIONS) == expected_roles


def test_owner_can_do_everything():
    for perm in ALL_PERMISSIONS:
        assert rbac.role_has("owner", perm)


def test_admin_is_owner_minus_delete():
    diff = ROLE_PERMISSIONS["owner"] - ROLE_PERMISSIONS["admin"]
    assert diff == {"org:delete"}


def test_manager_cannot_remove_or_demote_members():
    assert not rbac.role_has("manager", "members:remove")
    assert not rbac.role_has("manager", "members:role")
    # …but can still invite, approve clock, and generate reports.
    assert rbac.role_has("manager", "members:invite")
    assert rbac.role_has("manager", "clock:approve")
    assert rbac.role_has("manager", "reports:generate")


def test_moderator_cannot_approve_clock_or_generate_reports():
    assert not rbac.role_has("moderator", "clock:approve")
    assert not rbac.role_has("moderator", "reports:generate")
    assert rbac.role_has("moderator", "channels:moderate")
    assert rbac.role_has("moderator", "messages:pin")


def test_member_baseline():
    assert rbac.ROLE_PERMISSIONS["member"] == frozenset(
        {"clock:self", "messages:post", "messages:read"}
    )


def test_viewer_is_read_only_for_chat_and_reports():
    role = ROLE_PERMISSIONS["viewer"]
    assert "messages:read" in role
    assert "messages:post" not in role
    assert "reports:view" in role
    assert "reports:generate" not in role
    assert "clock:self" not in role  # viewers don't accrue hours


def test_require_raises_when_role_missing():
    with pytest.raises(Exception) as exc:
        rbac.require("org:delete", None)
    assert "not a member" in str(exc.value).lower()


def test_require_raises_when_permission_missing():
    with pytest.raises(Exception) as exc:
        rbac.require("billing:manage", "member")
    assert "billing:manage" in str(exc.value)


def test_require_passes_when_permission_held():
    # Should not raise.
    rbac.require("messages:post", "member")
    rbac.require_any(("billing:manage", "org:delete"), "owner")


def test_require_any_raises_when_no_permission_matches():
    with pytest.raises(Exception):
        rbac.require_any(("billing:manage", "org:delete"), "member")
