"""Pydantic request models — validate every write at the Lambda boundary.

Field names are camelCase to match the shared TypeScript contract and the
JSON the frontend sends.
"""

from __future__ import annotations

import datetime as dt

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from .constants import (
    ACTIVITY_CATEGORIES,
    ACTIVITY_STATUSES,
    ALLOWED_EVIDENCE_TYPES,
    AWARD_PROGRAMS,
    MAX_EVIDENCE_BYTES,
    ORG_PLAN_IDS,
    ORG_ROLES,
    ORG_TYPES,
)


class _Base(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)


def _check_date(value: str) -> str:
    try:
        dt.date.fromisoformat(value)
    except ValueError as exc:  # noqa: TRY003
        raise ValueError("date must be ISO format YYYY-MM-DD") from exc
    return value


# --- Profiles --------------------------------------------------------------


class ProfileCreate(_Base):
    name: str = Field(min_length=1, max_length=120)
    gradeLevel: str | None = Field(default=None, max_length=40)
    schoolName: str | None = Field(default=None, max_length=160)
    graduationYear: int | None = Field(default=None, ge=1990, le=2100)
    awardPrograms: list[str] = Field(default_factory=list, max_length=20)


class ProfileUpdate(_Base):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    gradeLevel: str | None = Field(default=None, max_length=40)
    schoolName: str | None = Field(default=None, max_length=160)
    graduationYear: int | None = Field(default=None, ge=1990, le=2100)
    awardPrograms: list[str] | None = Field(default=None, max_length=20)


# --- Activities ------------------------------------------------------------


class ActivityCreate(_Base):
    profileId: str = Field(min_length=1)
    title: str = Field(min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=4000)
    categoryId: str
    status: str = "completed"
    date: str
    hours: float = Field(default=0, ge=0, le=100000)
    organization: str | None = Field(default=None, max_length=160)
    location: str | None = Field(default=None, max_length=160)
    notes: str | None = Field(default=None, max_length=4000)
    awardPrograms: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("categoryId")
    @classmethod
    def _category(cls, v: str) -> str:
        if v not in ACTIVITY_CATEGORIES:
            raise ValueError(f"unknown categoryId: {v}")
        return v

    @field_validator("status")
    @classmethod
    def _status(cls, v: str) -> str:
        if v not in ACTIVITY_STATUSES:
            raise ValueError(f"unknown status: {v}")
        return v

    @field_validator("date")
    @classmethod
    def _date(cls, v: str) -> str:
        return _check_date(v)


class ActivityUpdate(_Base):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=4000)
    categoryId: str | None = None
    status: str | None = None
    date: str | None = None
    hours: float | None = Field(default=None, ge=0, le=100000)
    organization: str | None = Field(default=None, max_length=160)
    location: str | None = Field(default=None, max_length=160)
    notes: str | None = Field(default=None, max_length=4000)
    awardPrograms: list[str] | None = Field(default=None, max_length=20)

    @field_validator("categoryId")
    @classmethod
    def _category(cls, v: str | None) -> str | None:
        if v is not None and v not in ACTIVITY_CATEGORIES:
            raise ValueError(f"unknown categoryId: {v}")
        return v

    @field_validator("status")
    @classmethod
    def _status(cls, v: str | None) -> str | None:
        if v is not None and v not in ACTIVITY_STATUSES:
            raise ValueError(f"unknown status: {v}")
        return v

    @field_validator("date")
    @classmethod
    def _date(cls, v: str | None) -> str | None:
        return _check_date(v) if v is not None else v


# --- Evidence --------------------------------------------------------------


class UploadUrlRequest(_Base):
    activityId: str = Field(min_length=1)
    fileName: str = Field(min_length=1, max_length=255)
    contentType: str
    sizeBytes: int = Field(gt=0, le=MAX_EVIDENCE_BYTES)
    caption: str | None = Field(default=None, max_length=400)

    @field_validator("contentType")
    @classmethod
    def _content_type(cls, v: str) -> str:
        if v not in ALLOWED_EVIDENCE_TYPES:
            raise ValueError(f"unsupported file type: {v}")
        return v


# --- Account / billing -----------------------------------------------------


class UserUpdate(_Base):
    fullName: str | None = Field(default=None, min_length=1, max_length=160)
    defaultProfileId: str | None = None


class CheckoutRequest(_Base):
    """Stripe Checkout for individual or organization plans."""

    planId: str
    orgId: str | None = Field(default=None, max_length=64)
    successUrl: str = Field(max_length=600)
    cancelUrl: str = Field(max_length=600)

    @field_validator("planId")
    @classmethod
    def _plan(cls, v: str) -> str:
        if v != "individual" and v not in ORG_PLAN_IDS:
            raise ValueError(f"plan not purchasable online: {v}")
        return v


# --- Organizations --------------------------------------------------------


class OrganizationCreate(_Base):
    name: str = Field(min_length=2, max_length=120)
    slug: str | None = Field(default=None, min_length=2, max_length=60)
    type: str
    description: str | None = Field(default=None, max_length=600)
    storageEnabled: bool = False

    @field_validator("type")
    @classmethod
    def _type(cls, v: str) -> str:
        if v not in ORG_TYPES:
            raise ValueError(f"unknown organization type: {v}")
        return v

    @field_validator("slug")
    @classmethod
    def _slug(cls, v: str | None) -> str | None:
        if v is None:
            return v
        import re
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]*[a-z0-9]", v):
            raise ValueError("slug must be lowercase letters/numbers and hyphens")
        return v


class OrganizationUpdate(_Base):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    type: str | None = None
    description: str | None = Field(default=None, max_length=600)
    storageEnabled: bool | None = None
    chatRetentionDays: int | None = Field(default=None, ge=1, le=365)

    @field_validator("type")
    @classmethod
    def _type(cls, v: str | None) -> str | None:
        if v is not None and v not in ORG_TYPES:
            raise ValueError(f"unknown organization type: {v}")
        return v


class InviteCreate(_Base):
    email: EmailStr
    role: str

    @field_validator("role")
    @classmethod
    def _role(cls, v: str) -> str:
        if v == "owner" or v not in ORG_ROLES:
            raise ValueError(f"invalid role: {v}")
        return v


class InviteAccept(_Base):
    token: str = Field(min_length=8, max_length=128)


class MemberRoleChange(_Base):
    role: str

    @field_validator("role")
    @classmethod
    def _role(cls, v: str) -> str:
        if v == "owner" or v not in ORG_ROLES:
            raise ValueError(f"invalid role: {v}")
        return v


# --- Channels & chat -------------------------------------------------------


class ChannelCreate(_Base):
    name: str = Field(min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=400)
    minRole: str | None = None

    @field_validator("minRole")
    @classmethod
    def _min_role(cls, v: str | None) -> str | None:
        if v is not None and v not in ORG_ROLES:
            raise ValueError(f"invalid minRole: {v}")
        return v


class MessagePost(_Base):
    body: str = Field(min_length=1, max_length=4000)


class MessageReact(_Base):
    emoji: str = Field(min_length=1, max_length=24)


class MessagePin(_Base):
    pinned: bool


# --- Clock in / out --------------------------------------------------------


class ClockIn(_Base):
    activityType: str = Field(min_length=1, max_length=80)
    notes: str | None = Field(default=None, max_length=1000)
    eventId: str | None = Field(default=None, max_length=64)
    profileId: str | None = Field(default=None, max_length=64)


class ClockOut(_Base):
    notes: str | None = Field(default=None, max_length=1000)


class ClockDecision(_Base):
    decision: str
    note: str | None = Field(default=None, max_length=400)

    @field_validator("decision")
    @classmethod
    def _decision(cls, v: str) -> str:
        if v not in {"approve", "reject"}:
            raise ValueError("decision must be approve or reject")
        return v


# --- Reports ---------------------------------------------------------------


_REPORT_KINDS = {
    "volunteer_summary",
    "leadership",
    "participation",
    "attendance",
    "org_contribution",
    "student_timeline",
}


class ReportCreate(_Base):
    kind: str
    format: str
    fromDate: str = Field(alias="from")
    toDate: str = Field(alias="to")

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    @field_validator("kind")
    @classmethod
    def _kind(cls, v: str) -> str:
        if v not in _REPORT_KINDS:
            raise ValueError(f"unknown report kind: {v}")
        return v

    @field_validator("format")
    @classmethod
    def _fmt(cls, v: str) -> str:
        if v not in {"csv", "pdf"}:
            raise ValueError("format must be csv or pdf")
        return v

    @field_validator("fromDate", "toDate")
    @classmethod
    def _date(cls, v: str) -> str:
        return _check_date(v)
