# Cost model

Target: **under $30 / month** through the first ~50 paying orgs
(≈10k MAU). The architecture is serverless and on-demand-priced, so
idle months cost cents; growth is linear, not stepped.

This file replaces the cost note at the end of `DEPLOYMENT.md` and
covers the multi-tenant build (orgs, chat, clock, snapshots,
WebSocket, reports). The pre-SaaS estimate is preserved at the bottom
for reference.

## At launch (≤ 5 orgs, ≤ 500 MAU)

| Service                            | Pricing knob                                                         | Estimated |
| ---------------------------------- | -------------------------------------------------------------------- | --------: |
| Route 53 hosted zone               | $0.50 / zone / mo (already paid)                                     | **$0.50** |
| ACM certificates                   | Free                                                                 | $0.00     |
| CloudFront                         | 1 TB egress + 10 M req free for 12 months; then $0.085/GB            | ~$0.00    |
| S3 — frontend                      | < 1 GB                                                               | ~$0.05    |
| S3 — evidence                      | ~1 GB at this scale (only orgs on storage add-on)                    | ~$0.05    |
| S3 — reports                       | 7-day lifecycle, < 100 MB at any time                                | ~$0.00    |
| API Gateway HTTP                   | $1.00 / M requests                                                   | ~$0.50    |
| API Gateway WebSocket              | $1.00/M conn-minutes + $1.00/M messages                              | ~$0.30    |
| Lambda (ARM64) — 6 functions       | 1 M req + 400k GB-s free; ARM64 is 20% cheaper than x86              | ~$0.00    |
| DynamoDB on-demand + 5 GSIs        | $1.25/M writes, $0.25/M reads, $0.25/GB/mo; PITR included free       | ~$1.00    |
| DynamoDB Streams                   | First 2.5 M reads/mo free                                            | $0.00     |
| EventBridge Scheduler              | 14M invocations free; ours fire ~750/mo                              | $0.00     |
| Cognito                            | 50,000 MAU free                                                      | $0.00     |
| SES                                | 62k emails/mo free; we send ~50 invites + 50 reports                 | $0.00     |
| Secrets Manager                    | $0.40 / secret / mo × 1                                              | **$0.40** |
| CloudWatch logs (14-day retention) | 5 GB ingest free                                                     | ~$0.50    |
| **Total**                          |                                                                      | **≈ $3**  |

## At growth (50 paying orgs, 10k MAU, 1M API req/mo)

| Service                  | Driver                                                       | Estimated |
| ------------------------ | ------------------------------------------------------------ | --------: |
| Route 53                 | flat                                                         | $0.50     |
| CloudFront / S3 frontend | year-2 (free tier expired); ~5 GB egress                     | ~$1       |
| S3 — evidence            | ~50 GB across orgs with storage add-on                       | ~$1.20    |
| S3 — reports             | 7-day lifecycle; ~5 GB peak                                  | ~$0.15    |
| API Gateway HTTP         | 1 M req                                                      | ~$1       |
| API Gateway WebSocket    | ~5,000 concurrent peak × ~6h/day × 30d + ~10 msg/MAU/day     | ~$3       |
| Lambda                   | 256–1024 MB across 6 functions; ~3 M invocations/mo total    | ~$2       |
| DynamoDB                 | ~10 M reads + ~5 M writes + ~5 GB storage + 5 GSIs           | ~$8       |
| DynamoDB Streams         | ~50k stream reads (one per ReportJob row)                    | ~$0.10    |
| EventBridge Scheduler    | ~750 invocations/mo                                          | $0.00     |
| Cognito                  | 10k MAU still under 50k free                                 | $0.00     |
| SES                      | ~5k transactional emails/mo                                  | ~$0.50    |
| Secrets Manager          | 1 secret                                                     | $0.40     |
| CloudWatch logs          | ~15 GB ingest; first 5 GB free                               | ~$5       |
| **Total**                |                                                              | **≈ $22** |

Comfortably under the $30 cap with headroom for spikes.

## Knobs to pull if cost creeps

1. **Chat retention.** Drop the per-org default from 30 → 14 days
   (config: `Organization.chatRetentionDays`). Cuts DDB storage for
   chat by ~half.
2. **Log retention.** 14 → 7 days on the high-volume `api` and `ws` log
   groups halves CloudWatch ingest cost.
3. **Snapshot retention.** 730 → 365 days on `OrgDailyStats` halves
   the snapshot footprint. Monthly rollups are tiny and stay forever.
4. **DDB on-demand → provisioned.** Once traffic is predictable, switch
   the base table to provisioned + autoscaling — saves ~30% at this
   scale.
5. **WebSocket fallback.** Set `NEXT_PUBLIC_WS_URL` to empty to force
   HTTP polling. Costs more in Lambda invocations but zero in
   per-minute WS charges; useful as a stopgap if WebSocket cost is
   misbehaving.

## Cost guardrails already in the repo

- `aws_budgets_budget` (`infra/budgets.tf`) — alerts at 80% actual and
  100% forecasted. Set `alert_email` in `terraform.tfvars` to enable.
- CloudWatch log retention is 14 days on every Lambda log group.
- API Gateway throttling: 100 rps + 50 burst (HTTP and WebSocket).
- Lambda timeouts: 15s (api/webhook), 10s (ws), 60s (cleanup),
  120s (reports), 900s (snapshot — biggest, but invoked once a day).
- DynamoDB PITR has no per-request cost; storage cost is tiny at our scale.
- Reports bucket lifecycle expires objects at 7 days.

## What we explicitly avoided

- **NAT Gateway** — Lambdas are not in a VPC. Saves ~$33/mo.
- **RDS / Aurora** — DynamoDB handles all of this at fractional cost.
- **ECS / EC2** for chat — WebSocket on Lambda is ~$3/mo vs. ~$30/mo
  for a small ECS Fargate task running idle.
- **WAF** — API Gateway throttling + Cognito rate limits are enough at
  this scale; revisit at 100k MAU.
- **Kinesis** for the stream — DynamoDB Streams + a single ESM consumer
  is cheaper and good enough below ~1 M write/sec.
- **OpenSearch / analytics warehouses** — daily aggregates in DDB cover
  every dashboard query without scans.

## How to inspect actual spend

```bash
aws ce get-cost-and-usage \
  --time-period Start=$(date -u -v -30d +%Y-%m-%d),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

## Pre-SaaS estimate (historical)

The original individual-only build sat at ~$1.70/mo and the growth
projection topped out at ~$12/mo. The multi-tenant numbers above
incorporate everything new: 3 extra GSIs (DDB storage + write cost),
4 extra Lambdas (mostly cold), WebSocket charges, S3 reports bucket,
SES invite sends. The single biggest jump is CloudWatch logs at growth
scale (the `api` and `ws` log groups are chatty).
