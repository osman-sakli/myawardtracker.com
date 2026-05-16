"""Presigned S3 URLs for evidence uploads and downloads.

Evidence objects live under ``<sub>/<activityId>/<evidenceId>`` so the key
itself carries the tenant prefix — a user can never sign a URL outside their
own namespace.
"""

from __future__ import annotations

import boto3
from botocore.config import Config

from . import config

_s3 = boto3.client(
    "s3",
    region_name=config.AWS_REGION,
    config=Config(signature_version="s3v4"),
)


def evidence_key(sub: str, activity_id: str, evidence_id: str) -> str:
    return f"{sub}/{activity_id}/{evidence_id}"


def presign_upload(key: str, content_type: str) -> str:
    return _s3.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": config.EVIDENCE_BUCKET,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=config.UPLOAD_URL_TTL,
    )


def presign_download(key: str, file_name: str | None = None) -> str:
    params: dict = {"Bucket": config.EVIDENCE_BUCKET, "Key": key}
    if file_name:
        params["ResponseContentDisposition"] = f'attachment; filename="{file_name}"'
    return _s3.generate_presigned_url(
        "get_object",
        Params=params,
        ExpiresIn=config.DOWNLOAD_URL_TTL,
    )


def delete_object(key: str) -> None:
    _s3.delete_object(Bucket=config.EVIDENCE_BUCKET, Key=key)
