# Security model

## Trust boundaries

```
Browser ─ HTTPS ─▶ CloudFront ─▶ S3 (frontend)
        ─ HTTPS ─▶ api.myawardtracker.com  ── JWT authorizer ──▶ Lambda(api) ──▶ DynamoDB / S3 / SES
        ─ WSS  ─▶ ws.myawardtracker.com  ── JWT-on-connect  ──▶ Lambda(ws)  ──▶ DynamoDB
        ─ HTTPS ─▶ /webhooks/stripe (public, signed)        ──▶ Lambda(webhook)
EventBridge Scheduler ─▶ Lambda(snapshot|cleanup) ──▶ DynamoDB
DynamoDB Streams       ─▶ Lambda(reports)        ──▶ DynamoDB / S3
```

Everything authenticated, every write validated, every secret in
Secrets Manager. No public buckets. No NAT, no VPC, no EC2.

## Authentication

- Cognito User Pool issues JWTs. The HTTP API JWT authorizer verifies
  every `/v1/*` request against the pool's JWKS; the Lambda never sees
  an unverified token.
- WebSocket: API Gateway WebSocket APIs don't support the JWT
  authorizer, so the `ws` Lambda verifies the Cognito JWT itself on
  `$connect` (full JWKS validation, JWKS cached for 24h via lru_cache).
  The connection record stores the verified `sub`; later frames trust
  that, never client-supplied identity.
- Stripe webhook is the only public route. Trust comes from
  `Stripe-Signature` verification before any DB write — a forged event
  is rejected with `400 invalid signature` and logged.

## Authorization (RBAC)

Six roles, hierarchical from `owner` down to `viewer`. The full grid
lives in `backend/src/app/rbac.py` and `shared/src/constants.ts` (kept
in sync; see `backend/tests/test_rbac.py`).

Every org-scoped route resolves the caller's role via
`tenancy.org_role(event, orgId, user)` and gates the action with
`rbac.require(perm, role)`. Tenant isolation is **structural**:

- All org reads/writes set the partition key from the path's `orgId`.
- Even if RBAC were bypassed, a request can't reach another tenant
  because nothing in the data layer dereferences user-supplied
  partition keys.

## Multi-tenant data isolation

- Personal data lives under `USER#<sub>`. Cognito's verified `sub`
  drives the partition key; the user can't address another user's
  partition.
- Org data lives under `ORG#<orgId>`. The user's membership row
  (`USER#<sub> / MEMBERSHIP#<orgId>`) must exist before any org route
  succeeds; `tenancy.org_role` loads it on every request.
- DynamoDB Streams used by the report worker only fire for `ReportJob`
  inserts and the worker scopes by `PK = ORG#<orgId>` from the row, so
  cross-tenant leakage via the stream isn't possible.

## Data at rest & in flight

- DynamoDB server-side encryption with AWS-managed keys, PITR on.
- S3 buckets (evidence + reports) are private with SSE-S3; access is
  presigned URLs only (max TTL 15 min upload, 24 h evidence download,
  7 d report download).
- TLS 1.2 minimum on all custom domains via ACM.
- Cognito refresh tokens are bound to the issuing client; the
  frontend stores them in browser local storage via the official
  amazon-cognito-identity-js SDK.

## Input validation

- Every request body goes through a Pydantic model in
  `backend/src/app/models.py`. Unknown fields are dropped (`extra='ignore'`).
- File uploads check `contentType` against an allowlist and `sizeBytes`
  against a 10 MB cap before minting a presigned PUT URL.
- The presigned PUT URL is single-use, content-type-pinned, and
  scoped to the caller's S3 key prefix.

## Rate limiting & abuse

- API Gateway HTTP API: 100 rps + 50 burst per route.
- WebSocket connection rate is bounded by the same limit on `$connect`.
- Chat messages are capped at 4000 chars in the composer and the
  backend Pydantic model.
- Reports are throttled implicitly: each `ReportJob` triggers exactly
  one Lambda invocation through the stream filter.

## Secrets

- Stripe keys + webhook secret live in AWS Secrets Manager
  (`myawardtracker/prod/stripe`). The IAM policy for `api` and
  `webhook` is `secretsmanager:GetSecretValue` on that ARN only.
- The Secrets Manager value is written **out-of-band** (see
  `infra/README.md`); Terraform creates the resource with placeholder
  values and `ignore_changes = [secret_string]`, so the live value is
  never in state.

## Audit

- Every write that matters generates an `Audit` row scoped to either
  `USER#<sub>` (personal) or `ORG#<orgId>` (org). Org audit is read by
  the `audit:view` permission, gated by `rbac.require`.
- Audit rows carry `ttl = createdAt + 365d`. Long-term forensics: ship
  the logs to S3 + Athena if you need indefinite retention.

## Browser security

- CloudFront distribution serves a security-headers function (see
  `infra/s3_frontend.tf`): `Strict-Transport-Security`,
  `X-Content-Type-Options: nosniff`, a Permissions-Policy that disables
  unused features, and a Content-Security-Policy that allows only
  `'self'`, the API host, the WebSocket host, and Stripe's checkout
  hosts. Update CSP when you add a new outbound dependency.
- The signup/login forms run client-side over HTTPS only. There are no
  cookies; auth is `Authorization: Bearer <jwt>`. CSRF is not a vector.

## Reporting a vulnerability

Email **security@myawardtracker.com** (alias forwarded to the founder).
We commit to a first response within 72 hours and to crediting
researchers in the changelog if they want it.

Out of scope: theoretical denial of service against API Gateway,
attacks requiring root access to the user's device, social engineering
of org owners.
