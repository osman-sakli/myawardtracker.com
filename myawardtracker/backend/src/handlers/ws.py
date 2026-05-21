"""WebSocket Lambda — one handler, three routes (``$connect``, ``$disconnect``,
``sendmessage``).

Identity comes from a Cognito JWT passed as ``?token=<jwt>`` on the connect
URL. The Lambda verifies it once using the User Pool's JWKS, then stores the
user sub on the connection record so subsequent ``sendmessage`` frames don't
re-do that work.

A `$connect` frame can also carry ``orgId`` and ``channelId`` query params; if
both are present and the user has membership, the Lambda subscribes the
connection to that channel for fan-out. Clients can also send
``{"action":"subscribe","orgId":"...","channelId":"..."}`` over an open
socket to add more channels.

Outgoing fan-out uses ``apigatewaymanagementapi.post_to_connection``; stale
connections are deleted on ``GoneException``.
"""

from __future__ import annotations

import json
import urllib.request
from functools import lru_cache

import boto3
from aws_lambda_powertools import Logger
from jose import jwt  # provided by aws-lambda-powertools[parser] transitively

from app import config, db
from app.constants import DEFAULT_CHAT_RETENTION_DAYS

logger = Logger(service="myawardtracker-ws")

_apigw: object | None = None


def _apigw_client(domain: str, stage: str):
    """Lazy-construct the management client; endpoint differs per stage."""
    global _apigw
    if _apigw is None:
        endpoint_url = f"https://{domain}/{stage}"
        _apigw = boto3.client(
            "apigatewaymanagementapi",
            region_name=config.AWS_REGION,
            endpoint_url=endpoint_url,
        )
    return _apigw


# --- JWT verification -----------------------------------------------------


@lru_cache(maxsize=1)
def _jwks() -> dict:
    if not config.USER_POOL_ID:
        return {}
    url = (
        f"https://cognito-idp.{config.AWS_REGION}.amazonaws.com/"
        f"{config.USER_POOL_ID}/.well-known/jwks.json"
    )
    # Defense in depth: the URL is built from Terraform-provided env vars, but
    # we still pin the scheme so a misconfigured pool id can never coerce a
    # different scheme (file://, http://). Bandit B310 is suppressed because
    # the URL is fully constant per deploy and HTTPS-only.
    if not url.startswith("https://"):
        raise RuntimeError("jwks URL must be https")
    with urllib.request.urlopen(url, timeout=3) as resp:  # nosec B310
        return json.loads(resp.read())


def _verify_token(token: str) -> str | None:
    """Return the Cognito ``sub`` if the token is valid, else None."""
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        keys = _jwks().get("keys", [])
        key = next((k for k in keys if k.get("kid") == kid), None)
        if not key:
            return None
        claims = jwt.decode(
            token,
            key,
            algorithms=[header.get("alg", "RS256")],
            audience=config.USER_POOL_CLIENT_ID or None,
            options={"verify_aud": bool(config.USER_POOL_CLIENT_ID)},
        )
        return claims.get("sub")
    except Exception as exc:  # noqa: BLE001
        logger.warning("ws jwt verification failed", error=str(exc))
        return None


# --- route handlers -------------------------------------------------------


def _connect(event: dict) -> dict:
    qs = event.get("queryStringParameters") or {}
    token = qs.get("token") or ""
    sub = _verify_token(token)
    if not sub:
        return {"statusCode": 401, "body": "unauthorized"}

    connection_id = event["requestContext"]["connectionId"]
    db.register_ws_connection(connection_id, sub)

    org_id = qs.get("orgId")
    channel_id = qs.get("channelId")
    if org_id and channel_id and db.get_membership(sub, org_id):
        db.subscribe_ws_to_channel(connection_id, channel_id)
    return {"statusCode": 200, "body": "ok"}


def _disconnect(event: dict) -> dict:
    connection_id = event["requestContext"]["connectionId"]
    db.deregister_ws_connection(connection_id)
    return {"statusCode": 200, "body": "ok"}


def _send(event: dict) -> dict:
    connection_id = event["requestContext"]["connectionId"]
    domain = event["requestContext"]["domainName"]
    stage = event["requestContext"]["stage"]

    raw = event.get("body") or "{}"
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return {"statusCode": 400, "body": "invalid json"}

    action = payload.get("action") or "message"
    sub = _connection_sub(connection_id)
    if not sub:
        return {"statusCode": 401, "body": "unknown connection"}

    if action == "subscribe":
        org_id = payload.get("orgId")
        channel_id = payload.get("channelId")
        if org_id and channel_id and db.get_membership(sub, org_id):
            db.subscribe_ws_to_channel(connection_id, channel_id)
        return {"statusCode": 200, "body": "ok"}

    # action == "message"
    org_id = payload.get("orgId")
    channel_id = payload.get("channelId")
    body = (payload.get("body") or "").strip()
    if not (org_id and channel_id and body):
        return {"statusCode": 400, "body": "missing orgId/channelId/body"}

    membership = db.get_membership(sub, org_id)
    if not membership:
        return {"statusCode": 403, "body": "not a member"}

    org = db.get_organization(org_id) or {}
    retention = int(org.get("chatRetentionDays") or DEFAULT_CHAT_RETENTION_DAYS)
    msg = db.post_message(
        org_id, channel_id, sub, membership.get("fullName") or "Member", body[:4000],
        retention,
    )

    # Fan-out.
    client = _apigw_client(domain, stage)
    for conn_id in db.list_ws_connections_for_channel(channel_id):
        try:
            client.post_to_connection(
                ConnectionId=conn_id,
                Data=json.dumps({"type": "message", "message": msg}).encode(),
            )
        except client.exceptions.GoneException:
            db.deregister_ws_connection(conn_id)
        except Exception as exc:  # noqa: BLE001
            logger.warning("ws post failed", connection=conn_id, error=str(exc))
    return {"statusCode": 200, "body": "ok"}


def _connection_sub(connection_id: str) -> str | None:
    item = db._table.get_item(  # noqa: SLF001
        Key={"PK": f"WS#{connection_id}", "SK": f"WS#{connection_id}"}
    ).get("Item")
    return item.get("userSub") if item else None


_ROUTES = {
    "$connect": _connect,
    "$disconnect": _disconnect,
    "sendmessage": _send,
}


def handler(event: dict, context) -> dict:
    route_key = (event.get("requestContext") or {}).get("routeKey", "")
    fn = _ROUTES.get(route_key)
    if not fn:
        return {"statusCode": 404, "body": f"unknown route {route_key}"}
    return fn(event)
