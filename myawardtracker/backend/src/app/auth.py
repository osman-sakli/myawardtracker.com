"""Extracts the authenticated caller from the API Gateway JWT authorizer."""

from __future__ import annotations

from dataclasses import dataclass

from aws_lambda_powertools.event_handler.exceptions import UnauthorizedError


@dataclass(frozen=True)
class AuthUser:
    sub: str
    email: str
    name: str


def current_user(event) -> AuthUser:
    """Read Cognito claims injected by the HTTP API JWT authorizer.

    Claims live at requestContext.authorizer.jwt.claims for HTTP APIs.
    """
    request_context = event.get("requestContext", {}) or {}
    authorizer = request_context.get("authorizer", {}) or {}
    claims = (authorizer.get("jwt", {}) or {}).get("claims", {}) or {}

    sub = claims.get("sub")
    if not sub:
        raise UnauthorizedError("Authentication required")

    return AuthUser(
        sub=sub,
        email=claims.get("email", ""),
        name=claims.get("name") or claims.get("cognito:username") or "",
    )
