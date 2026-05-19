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
USER_POOL_ID = os.environ.get("USER_POOL_ID", "")
USER_POOL_CLIENT_ID = os.environ.get("USER_POOL_CLIENT_ID", "")
CORS_ORIGIN = os.environ.get("CORS_ORIGIN", "*")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
SITE_URL = os.environ.get("SITE_URL", "https://myawardtracker.com")

# Name of the Secrets Manager secret holding the Stripe credentials JSON.
STRIPE_SECRET_NAME = os.environ.get("STRIPE_SECRET_NAME", "myawardtracker/prod/stripe")
# Stripe price id for the one-time Individual purchase (not a secret).
STRIPE_PRICE_INDIVIDUAL = os.environ.get("STRIPE_PRICE_INDIVIDUAL", "")
# Verified SES sender for the bi-weekly report email.
REPORT_FROM_EMAIL = os.environ.get("REPORT_FROM_EMAIL", "")

# Presigned URL lifetimes (seconds).
UPLOAD_URL_TTL = 900
DOWNLOAD_URL_TTL = 900

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
    """Map of planId -> Stripe price id."""
    return {"individual": STRIPE_PRICE_INDIVIDUAL} if STRIPE_PRICE_INDIVIDUAL else {}
