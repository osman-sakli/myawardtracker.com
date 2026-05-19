"""Pydantic request models — validate every write at the Lambda boundary.

Field names are camelCase to match the shared TypeScript contract and the
JSON the frontend sends.
"""

from __future__ import annotations

import datetime as dt

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .constants import (
    ACTIVITY_CATEGORIES,
    ACTIVITY_STATUSES,
    ALLOWED_EVIDENCE_TYPES,
    AWARD_PROGRAMS,
    MAX_EVIDENCE_BYTES,
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
    planId: str
    successUrl: str = Field(max_length=600)
    cancelUrl: str = Field(max_length=600)

    @field_validator("planId")
    @classmethod
    def _plan(cls, v: str) -> str:
        if v != "individual":
            raise ValueError(f"plan not purchasable online: {v}")
        return v
