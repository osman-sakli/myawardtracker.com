# MyAwardTracker — Multi-Tenant SaaS Architecture

> Status: design + implementation in this repo. See [MIGRATION.md](./MIGRATION.md)
> for the rollout plan and [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)
> for the launch gate.

This document is the single source of truth for the multi-tenant version of
MyAwardTracker. Earlier individual-only design lives in
[ARCHITECTURE.md](./ARCHITECTURE.md); anywhere those documents disagree, this
one wins.

## 1. Product surface

One platform with two coexisting modes:

- **Individual mode** — what the v1 product already does: personal profiles,
  activities, evidence, Congressional-Award-style progress.
- **Organization mode** — clubs, schools, scout troops, nonprofits,
  universities, leadership programs. Adds members, roles, chat, clock-in/out,
  reports, dashboards backed by precomputed aggregates.

Individual users can join organizations without losing their personal data.
Members never pay; only the organization Owner/Admin does.

## 2. AWS topology

```
            Route53 (myawardtracker.com hosted zone)
                │
        ┌───────┴────────────────────────────────────────────┐
        │                                                    │
   CloudFront (frontend)                              api.myawardtracker.com
        │                                                    │
   S3 (static Next.js out/)                          API Gateway HTTP API ── Cognito JWT authorizer
        │                                                    │
        ▼                                                    │
  ws.myawardtracker.com                                      │
        │                                                    │
   API Gateway WebSocket API ──── ws Lambda (connect/disconnect/sendmessage)
        │                                                    │
        ▼                                                    ▼
                       ┌─────────────────────────────┐
                       │   DynamoDB single table      │
                       │   myawardtracker-prod-data   │
                       └────────┬───────────┬─────────┘
                                │           │
                          S3 (evidence)  S3 (reports/exports)
                                │
                       Lifecycle rules → IA → Glacier → expire

  EventBridge Scheduler
    ├── daily 02:00 UTC → snapshot Lambda (per-org aggregates)
    ├── hourly         → cleanup Lambda  (TTL-driven chat sweep, orphan files)
    └── on-demand      → report Lambda   (PDF/CSV generation)

  Secrets Manager: Stripe, SES suppression list
  SES: transactional + report email
```

Everything is serverless and on-demand-priced. There is no NAT gateway, no
always-running EC2/ECS, no RDS. Lambda concurrency is unreserved; cold-start
budget is held by ARM64 + 256 MB memory + a small import surface.

## 3. Tenant model

A **tenant** is an organization (`ORG#<orgId>`) or an individual user
(`USER#<sub>`). Every authenticated request resolves to:

1. The caller's user (`USER#<sub>` from Cognito `sub`).
2. An optional active org context (`x-org-id` header or `orgId` path/query).
3. The caller's role inside that org, loaded once per request.

Every write goes through one of:

- `db.user_*` — partitioned by `USER#<sub>` (personal data, never reachable
  from another tenant).
- `db.org_*` — partitioned by `ORG#<orgId>` (org data; access gated by the
  caller's membership record).

Cross-tenant queries (e.g. "all organizations this user belongs to") run on
**GSI3** keyed by the user's sub, which lists their memberships.

There are no "all users" or "all orgs" scans on hot paths. The only
scan-the-table caller is the bi-weekly report job (already in this repo); it
runs once on a schedule and is rate-bounded.

## 4. DynamoDB single-table schema

Base table: `myawardtracker-prod-data`. On-demand billing.

| PK                    | SK                                  | entityType         | Notes                              |
| --------------------- | ----------------------------------- | ------------------ | ---------------------------------- |
| `USER#<sub>`          | `USER#<sub>`                        | `User`             | email, fullName, role, createdAt   |
| `USER#<sub>`          | `PROFILE#<id>`                      | `Profile`          | personal profile                   |
| `USER#<sub>`          | `ACTIVITY#<id>`                     | `Activity`         | personal activity                  |
| `USER#<sub>`          | `EVIDENCE#<id>`                     | `Evidence`         | file metadata                      |
| `USER#<sub>`          | `SUBSCRIPTION#current`              | `Subscription`     | individual purchase                |
| `USER#<sub>`          | `AUDIT#<ts>#<id>`                   | `Audit`            | personal audit trail               |
| `USER#<sub>`          | `MEMBERSHIP#<orgId>`                | `Membership`       | this user's role in an org         |
| `USER#<sub>`          | `INBOX#<ts>#<id>`                   | `Notification`     | bell-icon stream, TTL 30d          |
| `ORG#<orgId>`         | `ORG#<orgId>`                       | `Organization`     | name, tier, ownerSub, memberCount  |
| `ORG#<orgId>`         | `MEMBER#<sub>`                      | `Member`           | mirror of Membership, org-side     |
| `ORG#<orgId>`         | `INVITE#<token>`                    | `Invite`           | email, role, expiresAt (TTL)       |
| `ORG#<orgId>`         | `CHANNEL#<id>`                      | `Channel`          | chat room                          |
| `ORG#<orgId>`         | `CHANNEL#<id>#MSG#<ts>#<id>`        | `ChatMessage`      | TTL = createdAt + 30d              |
| `ORG#<orgId>`         | `CLOCK#<sub>#<ts>#<id>`             | `ClockSession`     | clock-in/out session, TTL 90d      |
| `ORG#<orgId>`         | `STATS#DAY#<yyyy-mm-dd>`            | `OrgDailyStats`    | aggregate, retained 730d           |
| `ORG#<orgId>`         | `STATS#MONTH#<yyyy-mm>`             | `OrgMonthlyStats`  | aggregate, no TTL                  |
| `ORG#<orgId>`         | `MEMBER_STATS#<sub>#<yyyy-mm-dd>`   | `MemberDailyStats` | aggregate, retained 730d           |
| `ORG#<orgId>`         | `SUBSCRIPTION#current`              | `OrgSubscription`  | tier, storageAddon, paidUntil      |
| `ORG#<orgId>`         | `AUDIT#<ts>#<id>`                   | `OrgAudit`         | org-scope audit trail              |
| `ORG#<orgId>`         | `REPORT#<id>`                       | `ReportJob`        | async export job + S3 key          |
| `ORG#<orgId>`         | `PIN#<channelId>#<msgTs>`           | `PinnedAnnouncement` | references a chat msg            |
| `WS#<connectionId>`   | `WS#<connectionId>`                 | `WsConnection`     | TTL 2h                             |

### Global secondary indexes

| Index | Hash key            | Range key             | Used for                                          |
| ----- | ------------------- | --------------------- | ------------------------------------------------- |
| GSI1  | `GSI1PK`            | `GSI1SK`              | Activities by profile, time-sorted (existing).    |
| GSI2  | `GSI2PK`            | `GSI2SK`              | Subscription lookup by Stripe customer (existing).|
| **GSI3** | `GSI3PK`         | `GSI3SK`              | User lookup by **email** (`EMAIL#<lowercased>`); membership listings per user (`USER#<sub>` → `ORG#<orgId>`); invite lookup by token. |
| **GSI4** | `GSI4PK`         | `GSI4SK`              | Org-wide time-sorted streams: chat messages by channel (`CHANNEL#<id>` → `<isoTs>#<msgId>`), clock sessions org-wide (`ORG#<orgId>#CLOCK` → `<isoTs>#<sessionId>`), notifications by user (`INBOX#<sub>` → `<isoTs>#<id>`). |
| **GSI5** | `GSI5PK`         | `GSI5SK`              | WebSocket fan-out: connection lookup by user (`USER#<sub>`) and by channel subscription (`CHANNEL#<id>`). |

### TTL strategy (single `ttl` attribute, DynamoDB-native)

| Item                       | TTL                                 |
| -------------------------- | ----------------------------------- |
| Chat message               | `createdAt + 30d` (config: `chatRetentionDays`) |
| Notification (inbox)       | `createdAt + 30d`                   |
| Clock session (raw)        | `createdAt + 90d` — aggregates retain the math |
| Org invite                 | `createdAt + 14d`                   |
| WS connection record       | `createdAt + 2h`                    |
| Org daily stats            | `createdAt + 730d`                  |
| Org monthly stats          | none (kept indefinitely)            |

DynamoDB TTL is best-effort within 48h. The hourly cleanup Lambda
(`handlers/cleanup_job.py`) does a bounded sweep on GSI4 to expire anything
TTL hasn't reaped yet — keeps cost cheap and the chat window honest.

### User email is queryable

The `User` item carries `email` as a top-level attribute (already true today).
With GSI3 in place, looking a user up by email is a single `Query` on
`GSI3PK = EMAIL#<lowercased>` — no scans. The `email` attribute is shown
in the DynamoDB console on the User row because we store it un-projected on
the base table, not just in the index.

## 5. RBAC

Six roles, ordered from most-privileged to least:

```
owner > admin > manager > moderator > member > viewer
```

Permissions are declared in `backend/src/app/rbac.py`:

| Permission              | owner | admin | manager | moderator | member | viewer |
| ----------------------- | :---: | :---: | :-----: | :-------: | :----: | :----: |
| org:update              |   ✓   |   ✓   |         |           |        |        |
| org:delete              |   ✓   |       |         |           |        |        |
| billing:manage          |   ✓   |   ✓   |         |           |        |        |
| members:invite          |   ✓   |   ✓   |    ✓    |           |        |        |
| members:remove          |   ✓   |   ✓   |         |           |        |        |
| members:role            |   ✓   |   ✓   |         |           |        |        |
| channels:create         |   ✓   |   ✓   |    ✓    |           |        |        |
| channels:moderate       |   ✓   |   ✓   |    ✓    |     ✓     |        |        |
| messages:post           |   ✓   |   ✓   |    ✓    |     ✓     |   ✓    |        |
| messages:read           |   ✓   |   ✓   |    ✓    |     ✓     |   ✓    |   ✓    |
| messages:pin            |   ✓   |   ✓   |    ✓    |     ✓     |        |        |
| clock:self              |   ✓   |   ✓   |    ✓    |     ✓     |   ✓    |        |
| clock:approve           |   ✓   |   ✓   |    ✓    |           |        |        |
| clock:view_all          |   ✓   |   ✓   |    ✓    |     ✓     |        |   ✓    |
| reports:generate        |   ✓   |   ✓   |    ✓    |           |        |        |
| reports:view            |   ✓   |   ✓   |    ✓    |     ✓     |        |   ✓    |
| audit:view              |   ✓   |   ✓   |         |           |        |        |

Every route that accepts an `orgId` calls `rbac.require(perm, orgId, user)`
which loads the caller's `Membership` and raises `ForbiddenError` if the role
lacks the permission. Roles are never trusted from the JWT — Cognito only
provides identity.

## 6. Access patterns (the only ones supported)

Each is O(1) or O(log N) on the partition, never a Scan.

| # | Pattern                                       | How                                                                 |
|---|-----------------------------------------------|---------------------------------------------------------------------|
| 1 | "Who am I, my profiles, my orgs"              | `Query PK=USER#<sub>` + `Query GSI3 user→org`                       |
| 2 | "Org page: members"                           | `Query PK=ORG#<id> AND SK begins_with MEMBER#`                      |
| 3 | "Org page: channels"                          | `Query PK=ORG#<id> AND SK begins_with CHANNEL#` (no `#MSG#`)        |
| 4 | "Channel: last 50 messages"                   | `Query PK=ORG#<id> AND SK begins_with CHANNEL#<c>#MSG#` desc, limit 50 |
| 5 | "Channel: messages since cursor"              | same as 4 with `ExclusiveStartKey`                                  |
| 6 | "My clock sessions in org last 30 days"       | `Query PK=ORG#<id> AND SK between CLOCK#<sub>#<from> and CLOCK#<sub>#<to>` |
| 7 | "Org's clock sessions today (manager view)"   | `Query GSI4PK=ORG#<id>#CLOCK AND GSI4SK between <fromIso> and <toIso>` |
| 8 | "Dashboard: org last 30 days"                 | 30 × `GetItem` on `STATS#DAY#<date>` (or one `BatchGet`)            |
| 9 | "Dashboard: org all time"                     | `Query PK=ORG#<id> AND SK begins_with STATS#MONTH#`                 |
|10 | "Member stats: leaderboard this month"        | `Query PK=ORG#<id> AND SK begins_with MEMBER_STATS#` filter by `<month>` *(precomputed once a day)* |
|11 | "Notifications for me"                        | `Query GSI4PK=INBOX#<sub>` desc, limit 50                           |
|12 | "WS fan-out: connections subscribed to channel" | `Query GSI5PK=CHANNEL#<id>`                                       |
|13 | "Login by email" (admin lookup, invite resolve) | `Query GSI3PK=EMAIL#<lowercased>`                                 |
|14 | "Resolve invite token"                        | `Query GSI3PK=INVITE#<token>`                                       |

## 7. WebSocket architecture

API Gateway **WebSocket** API + a single Lambda (`handlers/ws.py`) with three
routes (`$connect`, `$disconnect`, `sendmessage`). Authentication is a
Cognito JWT passed as `?token=...` on connect; the Lambda verifies it once and
caches the user sub on the connection record. Connections are written to the
table with TTL = 2h so abandoned sockets disappear automatically.

Channel subscriptions are first-class items:

- `WS#<connId>` row stores `userSub`, `connectedAt`.
- `WS#<connId>` also writes one secondary item per joined channel keyed under
  GSI5 (`CHANNEL#<id>` → `<connId>`).
- Posting a message: `Query GSI5PK=CHANNEL#<id>`, then for each connection
  call `apigatewaymanagementapi.post_to_connection`. Stale connections
  (`GoneException`) are deleted on the spot.

Cost shape: WebSocket is billed at $0.25 per million messages plus
$0.25 per million minutes of connection. At 1000 active members and ~30
messages/day each, monthly WebSocket cost is well under a dollar.

If WebSocket is unavailable or disabled per-org, the frontend falls back to
HTTP polling at 15s on the active channel (only). The same `messages:read`
API powers both modes.

## 8. Aggregate snapshot system

Why: dashboards must answer "this month", "this year", "since founding" in
under 100 ms without scanning anything.

How:

1. **Raw events** (`ClockSession`, `Activity`) are written normally as users
   act. Each carries `orgId` (or `null` for personal) and `date`.
2. A **daily snapshot Lambda** runs at 02:00 UTC via EventBridge:
   - For each org with activity in the last 36h (discovered via GSI4 on the
     `ORG#<id>#CLOCK` partition and via the activity stream): compute the day's
     `OrgDailyStats` and per-member `MemberDailyStats`.
     Uses a single `Query` per org over yesterday's window, no scans.
   - Roll month-to-date and year-to-date into `OrgMonthlyStats` and
     `OrgYearlyStats` items idempotently.
3. **Backfill / repair**: the job is idempotent on `(orgId, date)` — re-runs
   for any date produce the same item. A small admin API can request a
   targeted backfill window.

Snapshot items carry `ttl = createdAt + 730d`. Monthly/yearly rollups carry
no TTL.

If the platform grows past the point where one Lambda invocation can do all
orgs in 15 minutes, the snapshot job fans out by splitting orgs into chunks
keyed on `crc32(orgId) % N` — each chunk is its own scheduled invocation.

## 9. Reports

Report generation is **asynchronous** for anything over 200 rows:

- `POST /v1/orgs/{id}/reports` enqueues a `ReportJob` row with `status=queued`.
- The Lambda is invoked **directly** by `EventBridge` rule that watches the
  table's DynamoDB Stream for new `ReportJob` rows. (Cheap; no SQS needed.)
- Worker reads the precomputed aggregates (never raw events for ranges over
  90 days), generates CSV/PDF via `reportlab` (already in `requirements.txt`),
  uploads to `s3://reports-bucket/<orgId>/<jobId>.pdf`, updates the row with
  a presigned download URL good for 7 days.
- The frontend polls `GET /v1/orgs/{id}/reports/{jobId}` until `status=done`.

CSV exports under 200 rows skip the worker and stream synchronously from the
API Lambda.

## 10. Subscription model

### Individual plan (existing, repriced)

- 30-day free trial (was 15).
- $4.99/year (was one-time $9.99).
- Free users keep limited tracking and can join orgs.

### Organization plans (yearly, paid by Owner/Admin only)

| Tier        | Member cap   | Base plan | Storage add-on |
| ----------- | ------------ | --------: | -------------: |
| Small       | ≤ 50         |    $39/yr |        $69/yr  |
| Medium      | 51–300       |    $78/yr |       $138/yr  |
| Large       | 301–500      |   $117/yr |       $207/yr  |

- Tier is **derived** from current `memberCount` on every billing read; the
  invoice is the tier in effect at renewal time.
- Hitting the member cap raises a 402 on `members:invite` with a structured
  `requiredTier` so the frontend can show the upgrade prompt.
- The storage add-on is a separate Stripe price (six prices total: 3 tiers ×
  base/with-storage). Wire them via Terraform variables
  (`stripe_price_org_*`).
- Member growth past the next tier triggers a `BillingProrationDue` audit
  event; renewal at the higher tier is automatic.

### Enforcement

- `billing:manage` permission gates checkout.
- The Stripe webhook handles `checkout.session.completed` and
  `customer.subscription.updated` for org subscriptions, writing into
  `ORG#<orgId>` partition.
- Org features (chat post, invite, evidence upload) gate on
  `entitlement.org_has_access(orgId)`. Read APIs stay available so churned
  orgs can still export their data — they just can't write.

## 11. Data retention

| Class                       | Retention            | Storage path                       |
| --------------------------- | -------------------- | ---------------------------------- |
| Raw clock session           | 90 days              | DDB `ttl`                          |
| Activity (personal/org)     | indefinite           | DDB (cheap, small rows)            |
| Evidence file               | 1 year STANDARD → 4 years STANDARD_IA → expire | S3 lifecycle |
| Report export               | 7 days               | S3 lifecycle (`reports/`)          |
| Chat message                | 30 days (config)     | DDB `ttl`                          |
| Notification                | 30 days              | DDB `ttl`                          |
| Daily aggregates            | 730 days             | DDB `ttl`                          |
| Monthly/yearly aggregates   | indefinite           | DDB                                |
| Audit log                   | 1 year               | DDB `ttl` (set on write)           |

## 12. Security

- All API access flows through **API Gateway JWT authorizer** (Cognito User
  Pool). The Lambda never validates the token itself.
- All writes go through Pydantic models (`backend/src/app/models.py`).
- All org-scoped reads/writes call `rbac.require(perm, orgId, user)` before
  touching the partition. Tenant isolation is **structural**: a request that
  somehow bypasses RBAC still can't read another org because the partition
  key is bound to the org id from the URL.
- S3 buckets are private; presigned URLs only, max TTL 15 min for upload, 24h
  for evidence download, 7d for report download.
- DynamoDB encryption at rest, PITR enabled. CloudWatch log retention 14d.
- CORS is locked to the apex + www domains. Rate limit is 100 rps + 50
  burst per route.
- CSRF: API tokens are sent via `Authorization: Bearer`, not cookies. No
  CSRF surface.
- WebSocket connect verifies the JWT (full Cognito JWKS validation, cached
  for 24h). `sendmessage` re-checks the connection record's stored sub
  against the message author — never trusts client-supplied identity.
- Org subscription billing endpoint requires `billing:manage` AND the
  Stripe `client_reference_id` is set to `ORG#<orgId>:<callerSub>` so a
  refund/chargeback always traces back to a specific human.
- Stripe webhook signature is verified before any state change (existing).
- Secrets in AWS Secrets Manager; rotated annually.
- IAM follows least privilege; each Lambda role gets exactly the actions in
  `infra/lambda.tf` it needs.

## 13. Cost model

See [COST.md](./COST.md) for the current estimate. Target: **< $30/month**
covering the first ~50 paying orgs (≈10k MAU) at expected usage.

The two cost levers we can pull anytime:
- Lower chat retention from 30d → 14d (per-org config).
- Drop log retention from 14d → 7d.

## 14. Folder map (this PR)

```
backend/
  src/
    app/
      auth.py               # unchanged
      config.py             # +org/storage price ids, ws endpoint
      constants.py          # +org constants, retention values
      db.py                 # +org/member/chat/clock/snapshot/notification
      entitlement.py        # +org_has_access(orgId)
      models.py             # +org/member/chat/clock/report/invite models
      rbac.py               # NEW — role permission matrix + require()
      tenancy.py            # NEW — resolves orgId from event, loads role
      ws.py                 # NEW — websocket connection registry helpers
      reports/              # NEW — pdf/csv builders
      routes/
        organizations.py    # NEW
        members.py          # NEW
        invites.py          # NEW
        channels.py         # NEW
        messages.py         # NEW (HTTP fallback + read)
        clock.py            # NEW
        org_reports.py      # NEW
        org_dashboard.py    # NEW
        org_billing.py      # NEW
        ...(existing routes unchanged)
    handlers/
      api.py                # +new routers wired in
      stripe_webhook.py     # +org subscription paths
      ws.py                 # NEW — websocket entry
      snapshot_job.py       # NEW — daily aggregate Lambda
      cleanup_job.py        # NEW — hourly retention sweep
      report_job.py         # NEW — async report worker
infra/
  dynamodb.tf               # +GSI3, GSI4, GSI5
  apigateway.tf             # unchanged (HTTP API)
  websocket.tf              # NEW — WS API
  schedulers.tf             # NEW — EventBridge schedules
  lambda.tf                 # +new functions and roles
  variables.tf              # +org/storage price ids, retention knobs
frontend/
  tailwind.config.ts        # repalette: light default
  src/app/globals.css       # tone down contrast, light tokens
  src/app/(dashboard)/
    org/[orgId]/...         # NEW pages: members, chat, clock, reports
shared/
  src/types.ts              # +Org/Member/Channel/Message/ClockSession/...
docs/
  SAAS_ARCHITECTURE.md      # this file
  MIGRATION.md
  PRODUCTION_CHECKLIST.md
  COST.md                   # rewritten
  SECURITY.md
```
