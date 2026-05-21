"""Transactional email via Amazon SES.

The verified sender domain is set up in ``infra/ses.tf``. We only ship two
flavors of mail right now: the bi-weekly report (existing) and the org invite
(this module). Every send goes through ``send_html`` so the From header,
encoding, and SES client are managed in one place.

Failures are logged but never raised — a request that creates a row should
not fail because mail delivery hiccupped. The mail server will retry on its
own; if we couldn't reach SES, the user just sees a slightly slower invite.
"""

from __future__ import annotations

import boto3
from aws_lambda_powertools import Logger

from . import config

logger = Logger(service="myawardtracker-mailer")

_ses = boto3.client("ses", region_name=config.AWS_REGION)


def _from_address() -> str | None:
    """The verified sender. Empty means SES isn't configured yet — skip send."""
    addr = config.REPORT_FROM_EMAIL or ""
    return addr or None


def send_html(*, to: str, subject: str, html: str, text: str) -> bool:
    """Send a single multipart email. Returns ``True`` on accept by SES."""
    sender = _from_address()
    if not sender:
        logger.info("ses sender not configured, skipping send", to=to, subject=subject)
        return False
    try:
        _ses.send_email(
            Source=sender,
            Destination={"ToAddresses": [to]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {
                    "Text": {"Data": text, "Charset": "UTF-8"},
                    "Html": {"Data": html, "Charset": "UTF-8"},
                },
            },
        )
        return True
    except Exception as exc:  # noqa: BLE001
        # Most common: address still in SES sandbox and unverified. Don't fail
        # the originating request — surface it in logs and move on.
        logger.warning(
            "ses send failed", to=to, subject=subject, error=str(exc)
        )
        return False


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------


def _link(token: str) -> str:
    return f"{config.SITE_URL}/signup/?invite={token}"


def send_invite(
    *,
    to: str,
    org_name: str,
    role: str,
    inviter_name: str,
    token: str,
) -> bool:
    """Email an invite link to ``to``.

    The recipient signs up (or logs in) and the frontend's invite handler
    posts the token back to ``POST /v1/invites/accept``.
    """
    join_url = _link(token)
    subject = f"You're invited to join {org_name} on MyAwardTracker"
    text = (
        f"{inviter_name} invited you to join {org_name} on MyAwardTracker as a {role}.\n\n"
        f"Open this link to accept:\n{join_url}\n\n"
        "If you weren't expecting this, you can ignore the email — the link expires in 14 days."
    )
    html = f"""\
<!doctype html>
<html lang="en">
<body style="margin:0;padding:24px;background:#f7f8fb;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1b2230;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e3e8f0;border-radius:14px;overflow:hidden;">
    <tr><td style="padding:28px 28px 8px;font-size:18px;font-weight:600;">MyAwardTracker</td></tr>
    <tr><td style="padding:8px 28px 24px;">
      <p style="margin:0 0 16px;font-size:16px;">You're invited to join <strong>{org_name}</strong> as a <strong>{role}</strong>.</p>
      <p style="margin:0 0 24px;font-size:14px;color:#5b6478;">
        {inviter_name} sent this invite. Click below to create or log into your account, then
        accept the invite.
      </p>
      <a href="{join_url}"
         style="display:inline-block;background:#3b6df0;color:#fff;text-decoration:none;
                padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px;">
        Accept invite
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#8a93a6;">
        Or paste this link into your browser:<br>
        <a href="{join_url}" style="color:#3b6df0;word-break:break-all;">{join_url}</a>
      </p>
    </td></tr>
    <tr><td style="padding:16px 28px;border-top:1px solid #e3e8f0;font-size:11px;color:#8a93a6;">
      Link expires in 14 days. If you didn't expect this email, you can ignore it.
    </td></tr>
  </table>
</body>
</html>
"""
    return send_html(to=to, subject=subject, html=html, text=text)
