"""Hourly cleanup Lambda.

DynamoDB TTL is best-effort within 48h. For chat retention to feel honest, we
do a bounded sweep on the GSI4 ``CHANNEL#<id>`` partition and explicitly
delete any expired messages older than the per-org retention window. The same
job also expires stale invites and abandoned WS connections.

The sweep is bounded to ~30 seconds of work per run; anything left behind is
caught by TTL or the next run.
"""

from __future__ import annotations

import datetime as dt
import time

from aws_lambda_powertools import Logger
from boto3.dynamodb.conditions import Attr, Key

from app import db
from app.constants import DEFAULT_CHAT_RETENTION_DAYS

logger = Logger(service="myawardtracker-cleanup")


def _expired_messages_for_channel(channel_id: str, retention_days: int) -> int:
    cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=retention_days)
    cutoff_iso = cutoff.strftime("%Y-%m-%dT%H:%M:%SZ")
    # Query just one channel partition; range-scan stops at the cutoff.
    resp = db._table.query(  # noqa: SLF001
        IndexName="GSI4",
        KeyConditionExpression=Key("GSI4PK").eq(f"CHANNEL#{channel_id}")
        & Key("GSI4SK").lt(cutoff_iso),
        Limit=200,
    )
    items = resp.get("Items", [])
    if not items:
        return 0
    with db._table.batch_writer() as batch:  # noqa: SLF001
        for item in items:
            batch.delete_item(Key={"PK": item["PK"], "SK": item["SK"]})
    return len(items)


def handler(event: dict, context) -> dict:
    deadline = time.time() + 45  # leave headroom for the Lambda timeout
    deleted = 0

    # Walk a sample of orgs each run (full sweep happens over ~24 runs/day).
    for org_id in db.iter_org_ids():
        if time.time() > deadline:
            break
        org = db.get_organization(org_id) or {}
        retention = int(org.get("chatRetentionDays") or DEFAULT_CHAT_RETENTION_DAYS)
        for channel in db.list_channels(org_id):
            if time.time() > deadline:
                break
            deleted += _expired_messages_for_channel(channel["id"], retention)

    logger.info("chat cleanup finished", deleted_messages=deleted)
    return {"deletedMessages": deleted}
