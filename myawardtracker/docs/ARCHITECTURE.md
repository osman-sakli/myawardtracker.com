# Architecture

```
              Route 53 (myawardtracker.com — pre-existing zone)
                                │
       ┌────────────────────────┼─────────────────────────┐
       ▼                        ▼                         ▼
  apex / www              api.myawardtracker.com     (future: status.*)
       │                        │
       ▼                        ▼
  CloudFront            API Gateway HTTP API
       │                        │            ┌── JWT authorizer ─→ Cognito
       ▼                        │            │
  S3 (frontend, private,        ▼            ▼
  OAC-restricted)         Lambda: api (Python 3.12, ARM64, 256 MB)
                                 │
                                 ├──→ DynamoDB single-table (PITR, SSE)
                                 ├──→ S3 evidence bucket (presigned PUT/GET)
                                 └──→ SSM Parameter Store (Stripe secrets)

  Stripe webhook ──→ API Gateway ──→ Lambda: stripe_webhook
                                                │
                                                └──→ DynamoDB (subscription updates)

  Observability: CloudWatch Logs (14-day retention) + Powertools structured logs
  Guardrails:    aws_budgets_budget alarm (80% actual / 100% forecasted)
```

## Why this shape

- **Static frontend on CloudFront** — marketing pages and the SPA app shell are pre-rendered at build time, served from edge with cache + security headers. No SSR Lambda on the hot path.
- **One Lambda per concern, shared zip** — the `api` Lambda handles every JWT-authenticated `/v1/*` route; the `stripe_webhook` Lambda handles the public, signature-verified webhook. Splitting them keeps blast radius small without doubling deployment work.
- **DynamoDB single-table** — every user-scoped read is a `Query` on `PK = USER#<sub>` with an `SK begins_with` prefix. Hot path is one round-trip. GSIs cover the lookups that can't be served from the primary key.
- **Cognito for auth + APIGW JWT authorizer** — token verification happens at the gateway, so Lambda never has to validate. Saves both code and CPU per request.
- **Stripe outside our perimeter** — the webhook is the only public Lambda route; its signature is verified using a secret held in SSM Parameter Store.

## Multi-tenancy boundary

Every authenticated request resolves `principal.sub` from the verified JWT and uses `USER#<sub>` as the PK on all writes/queries. Org admin paths (post-MVP) will go through a GSI with explicit role checks. The data layout already supports this; the access checks just aren't written yet.

## Failure modes

| Failure                                | Behavior                                                                              |
|----------------------------------------|---------------------------------------------------------------------------------------|
| Lambda cold start                      | First request 200–400 ms at 256 MB; subsequent <50 ms.                                |
| DynamoDB throttling                    | On-demand auto-scales. Alarms recommended above sustained 10k WCU.                    |
| Cognito unavailable                    | APIGW returns 401 (token can't be verified). Frontend prompts re-auth.                |
| S3 evidence upload fails               | Frontend reports error; retry. Files stream direct from browser to S3 via presign — Lambda is not on the hot path. |
| Stripe webhook signature mismatch      | Returns 400; Stripe retries automatically with backoff.                               |
| CloudFront origin error                | Serves `/404.html` from the bucket.                                                   |
| Terraform partial apply                | `concurrency-1` prevents overlap; the deploy workflow refuses to cancel mid-apply.    |

## Observability

- **Powertools Logger** emits structured JSON; CloudWatch Logs collects with 14-day retention.
- **APIGW access logs** are off by default to save log ingest cost — turn on for one route at a time when investigating.
- **CloudWatch metrics to watch:** Lambda `Errors`, `Duration` p95, `Throttles`; APIGW `5XX` rate; DynamoDB `ThrottledRequests`.
- **Audit log:** every write emits an `AUDIT#<ts>#<id>` row scoped to the user — keeps the trail close to the data.

## Things to add when growth justifies it

- CloudWatch Alarms → SNS → email (when traffic is non-trivial enough that an alarm carries signal).
- WAF managed-rule set in front of CloudFront (when abuse appears, not before).
- A second Terraform workspace for staging (when a second contributor joins or release cadence slows).
- DynamoDB provisioned capacity (once traffic is predictable enough to forecast WCU/RCU).
