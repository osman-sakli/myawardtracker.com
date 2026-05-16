"""Environment configuration and lazily-loaded SSM secrets."""

from __future__ import annotations

import functools
import json
import os

import boto3

TABLE_NAME = os.environ.get("TABLE_NAME", "myawardtracker-prod-data")
EVIDENCE_BUCKET = os.environ.get("EVIDENCE_BUCKET", "")
USER_POOL_ID = os.environ.get("USER_POOL_ID", "")
USER_POOL_CLIENT_ID = os.environ.get("USER_POOL_CLIENT_ID", "")
SSM_PREFIX = os.environ.get("SSM_PREFIX", "/myawardtracker/prod")
CORS_ORIGIN = os.environ.get("CORS_ORIGIN", "*")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")

# Presigned URL lifetimes (seconds).
UPLOAD_URL_TTL = 900
DOWNLOAD_URL_TTL = 900

_ssm = boto3.client("ssm", region_name=AWS_REGION)


@functools.lru_cache(maxsize=16)
def _ssm_param(name: str, decrypt: bool) -> str:
    """Fetch (and cache for the life of the warm container) an SSM parameter."""
    resp = _ssm.get_parameter(Name=f"{SSM_PREFIX}/{name}", WithDecryption=decrypt)
    return resp["Parameter"]["Value"]


def stripe_secret_key() -> str:
    return _ssm_param("stripe/secret_key", True)


def stripe_webhook_secret() -> str:
    return _ssm_param("stripe/webhook_secret", True)


def stripe_prices() -> dict[str, str]:
    """Map of planId -> Stripe price id."""
    try:
        return json.loads(_ssm_param("stripe/prices", False))
    except Exception:  # noqa: BLE001 - missing/invalid param is non-fatal
        return {}
