"""Shared pytest fixtures.

We use ``moto`` to fake DynamoDB and SES so the unit tests run hermetically.
Every test gets a fresh single-table instance that mirrors the production
schema (PK/SK + GSI1..5) plus a TTL attribute.
"""

from __future__ import annotations

import importlib
import os

import boto3
import pytest
from moto import mock_aws


_TABLE_NAME = "myawardtracker-test"


@pytest.fixture
def aws_env(monkeypatch):
    """Make the AWS SDK reach the moto-mocked region with deterministic creds."""
    monkeypatch.setenv("AWS_DEFAULT_REGION", "us-east-1")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_SESSION_TOKEN", "testing")
    monkeypatch.setenv("TABLE_NAME", _TABLE_NAME)
    monkeypatch.setenv("EVIDENCE_BUCKET", "test-evidence")
    monkeypatch.setenv("REPORTS_BUCKET", "test-reports")
    monkeypatch.setenv("REPORT_FROM_EMAIL", "reports@example.test")
    yield


@pytest.fixture
def ddb_table(aws_env):
    """Create the single table inside a moto session and yield the Table resource."""
    with mock_aws():
        client = boto3.client("dynamodb", region_name="us-east-1")
        client.create_table(
            TableName=_TABLE_NAME,
            BillingMode="PAY_PER_REQUEST",
            AttributeDefinitions=[
                {"AttributeName": n, "AttributeType": "S"}
                for n in (
                    "PK", "SK",
                    "GSI1PK", "GSI1SK",
                    "GSI2PK", "GSI2SK",
                    "GSI3PK", "GSI3SK",
                    "GSI4PK", "GSI4SK",
                    "GSI5PK", "GSI5SK",
                )
            ],
            KeySchema=[
                {"AttributeName": "PK", "KeyType": "HASH"},
                {"AttributeName": "SK", "KeyType": "RANGE"},
            ],
            GlobalSecondaryIndexes=[
                _gsi("GSI1"), _gsi("GSI2"), _gsi("GSI3"), _gsi("GSI4"), _gsi("GSI5"),
            ],
        )
        client.update_time_to_live(
            TableName=_TABLE_NAME,
            TimeToLiveSpecification={"Enabled": True, "AttributeName": "ttl"},
        )

        # Reload db so it picks up the env-var TABLE_NAME at import time.
        from app import db as db_module  # noqa: WPS433 - inside fixture

        importlib.reload(db_module)
        yield db_module._table  # type: ignore[attr-defined]


def _gsi(name: str) -> dict:
    return {
        "IndexName": name,
        "KeySchema": [
            {"AttributeName": f"{name}PK", "KeyType": "HASH"},
            {"AttributeName": f"{name}SK", "KeyType": "RANGE"},
        ],
        "Projection": {"ProjectionType": "ALL"},
    }
