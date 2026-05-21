"""Environment configuration and lazily-loaded secrets.

Stripe credentials live in AWS Secrets Manager — never in the repo, never in
Lambda environment variables. They are fetched on first use and cached for the
life of the warm container.
"""

from __future__ import annotations

import functools
import json
import os

import boto3

TABLE_NAME = os.environ.get("TABLE_NAME", "myawardtracker-prod-data")
EVIDENCE_BUCKET = os.environ.get("EVIDENCE_BUCKET", "")
REPORTS_BUCKET = os.environ.get("REPORTS_BUCKET", "")
USER_POOL_ID = os.environ.get("USER_POOL_ID", "")
USER_POOL_CLIENT_ID = os.environ.get("USER_POOL_CLIENT_ID", "")
CORS_ORIGIN = os.environ.get("CORS_ORIGIN", "*")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
SITE_URL = os.environ.get("SITE_URL", "https://myawardtracker.com")

# WebSocket API endpoint (e.g. https://abc.execute-api.us-east-1.amazonaws.com/prod).
# Used by Lambdas that need to post messages back to connected clients.
WS_API_ENDPOINT = os.environ.get("WS_API_ENDPOINT", "")

# Name of the Secrets Manager secret holding the Stripe credentials JSON.
STRIPE_SECRET_NAME = os.environ.get("STRIPE_SECRET_NAME", "myawardtracker/prod/stripe")

# Stripe price ids — not secrets, configured via Terraform variables.
STRIPE_PRICE_INDIVIDUAL = os.environ.get("STRIPE_PRICE_INDIVIDUAL", "")
STRIPE_PRICE_ORG_SMALL = os.environ.get("STRIPE_PRICE_ORG_SMALL", "")
STRIPE_PRICE_ORG_MEDIUM = os.environ.get("STRIPE_PRICE_ORG_MEDIUM", "")
STRIPE_PRICE_ORG_LARGE = os.environ.get("STRIPE_PRICE_ORG_LARGE", "")
STRIPE_PRICE_ORG_SMALL_STORAGE = os.environ.get("STRIPE_PRICE_ORG_SMALL_STORAGE", "")
STRIPE_PRICE_ORG_MEDIUM_STORAGE = os.environ.get("STRIPE_PRICE_ORG_MEDIUM_STORAGE", "")
STRIPE_PRICE_ORG_LARGE_STORAGE = os.environ.get("STRIPE_PRICE_ORG_LARGE_STORAGE", "")

# Verified SES sender for the bi-weekly report email.
REPORT_FROM_EMAIL = os.environ.get("REPORT_FROM_EMAIL", "")

# Presigned URL lifetimes (seconds).
UPLOAD_URL_TTL = 900            # evidence upload window
DOWNLOAD_URL_TTL = 900          # evidence download default
REPORT_DOWNLOAD_URL_TTL = 7 * 24 * 3600  # report exports live 7 days

_secrets = boto3.client("secretsmanager", region_name=AWS_REGION)


@functools.lru_cache(maxsize=1)
def _stripe_secret() -> dict:
    """Fetch and cache the Stripe credentials JSON from Secrets Manager."""
    resp = _secrets.get_secret_value(SecretId=STRIPE_SECRET_NAME)
    return json.loads(resp["SecretString"])


def stripe_secret_key() -> str:
    return _stripe_secret()["secret_key"]


def stripe_webhook_secret() -> str:
    return _stripe_secret()["webhook_secret"]


def stripe_prices() -> dict[str, str]:
    """Map of planId -> Stripe price id. Empty values are filtered out so the
    frontend gets a clean 4xx on an unconfigured plan instead of a Stripe error."""
    raw = {
        "individual": STRIPE_PRICE_INDIVIDUAL,
        "org_small": STRIPE_PRICE_ORG_SMALL,
        "org_medium": STRIPE_PRICE_ORG_MEDIUM,
        "org_large": STRIPE_PRICE_ORG_LARGE,
        "org_small_storage": STRIPE_PRICE_ORG_SMALL_STORAGE,
        "org_medium_storage": STRIPE_PRICE_ORG_MEDIUM_STORAGE,
        "org_large_storage": STRIPE_PRICE_ORG_LARGE_STORAGE,
    }
    return {plan: price for plan, price in raw.items() if price}
