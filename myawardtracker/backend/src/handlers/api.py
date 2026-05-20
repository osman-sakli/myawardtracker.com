"""API Lambda entry point.

A single function serves every authenticated ``/v1/*`` route. API Gateway's
JWT authorizer has already verified the Cognito token before we run, so route
handlers can trust ``requestContext.authorizer.jwt.claims``.
"""

from __future__ import annotations

import json

from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver, Response
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.utilities.typing import LambdaContext
from pydantic import ValidationError

from app.routes import (
    activities,
    audit,
    billing,
    categories,
    channels,
    clock,
    evidence,
    invites,
    me,
    members,
    notifications,
    org_billing,
    org_dashboard,
    org_reports,
    organizations,
    profiles,
    summary,
)

logger = Logger(service="myawardtracker-api")

app = APIGatewayHttpResolver()

# Individual / personal routes (unchanged from v1).
app.include_router(me.router)
app.include_router(profiles.router)
app.include_router(activities.router)
app.include_router(evidence.router)
app.include_router(categories.router)
app.include_router(summary.router)
app.include_router(billing.router)
app.include_router(audit.router)
app.include_router(notifications.router)

# Organization routes.
app.include_router(organizations.router)
app.include_router(members.router)
app.include_router(invites.router)
app.include_router(channels.router)
app.include_router(clock.router)
app.include_router(org_dashboard.router)
app.include_router(org_reports.router)
app.include_router(org_billing.router)


@app.exception_handler(ValidationError)
def handle_validation_error(exc: ValidationError) -> Response:
    """Turn a Pydantic failure into a 422 with field-level detail."""
    errors = [
        {"field": ".".join(str(p) for p in err["loc"]), "message": err["msg"]}
        for err in exc.errors()
    ]
    logger.warning("request validation failed", errors=errors)
    return Response(
        status_code=422,
        content_type="application/json",
        body=json.dumps({"message": "Validation failed", "errors": errors}),
    )


@logger.inject_lambda_context(
    correlation_id_path=correlation_paths.API_GATEWAY_HTTP, log_event=False
)
def handler(event: dict, context: LambdaContext) -> dict:
    return app.resolve(event, context)
