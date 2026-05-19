# Cost model

Target: **under $5 / month** at MVP traffic. Linear-ish above that. Pulled apart from the
short cost note at the end of `DEPLOYMENT.md` so it's easier to keep current.

## At MVP traffic (≤ 1,000 MAU, ≤ 10k API requests / day)

| Service                     | Pricing knob                                                  | Estimated   |
|-----------------------------|---------------------------------------------------------------|-------------|
| Route 53 hosted zone        | $0.50 / zone / mo (already paid)                              | **$0.50**   |
| CloudFront                  | First 1 TB egress + 10M req free (12 mo). Then $0.085/GB.     | **~$0.00**  |
| S3 — frontend bucket        | < 1 GB stored                                                 | **~$0.05**  |
| S3 — evidence bucket        | ~0.5 GB at this scale; private uploads                        | **~$0.02**  |
| ACM certificates            | Free                                                          | **$0.00**   |
| API Gateway HTTP API        | $1.00 / million requests                                      | **~$0.30**  |
| Lambda (ARM64, 256 MB) × 2  | 1M req + 400k GB-s free / mo                                  | **~$0.00**  |
| DynamoDB on-demand          | $1.25/M writes, $0.25/M reads, $0.25/GB/mo; PITR enabled      | **~$0.50**  |
| Cognito                     | 50,000 MAU free                                               | **$0.00**   |
| CloudWatch logs (14-day)    | 5 GB ingest free                                              | **~$0.30**  |
| SSM Parameter Store         | Standard tier is free for first 10k params                    | **$0.00**   |
| **Total**                   |                                                               | **≈ $1.70** |

Year-2 (after CloudFront free tier ends) adds ~$0.50–$1.00 at this traffic.

## At growth (10k MAU, ~1M API requests / mo)

| Service                | Estimated   |
|------------------------|-------------|
| API Gateway            | ~$1         |
| Lambda                 | ~$1         |
| DynamoDB on-demand     | ~$5         |
| CloudFront / S3        | ~$3         |
| Cognito                | $0          |
| Logs                   | ~$2         |
| **Total**              | **~$12**    |

At this point the cost-tuning playbook is:
- DynamoDB on-demand → provisioned + autoscaling (saves ~30% with predictable traffic).
- Tune Lambda memory with `aws-lambda-power-tuning` — 256 MB is the floor; sometimes 512 MB is cheaper end-to-end on cold start.
- Keep CloudFront on `PriceClass_100` (US + Europe) unless international users appear.

## Guardrails in this repo

- **`aws_budgets_budget`** (`infra/budgets.tf`) — alerts at 80% (actual) and 100% (forecasted) of `var.budget_monthly_usd` (default $20). Set `alert_email` in `terraform.tfvars` to enable.
- **CloudWatch log retention:** 14 days on every Lambda log group (`var.log_retention_days`).
- **API Gateway throttling:** configured in `infra/apigateway.tf`. Keeps cost predictable during an unexpected spike.
- **Lambda timeout:** bounded — protects against runaway invocations.
- **DynamoDB PITR:** enabled. Has no per-request cost; storage cost is small at MVP scale.

## Knobs we explicitly avoided

- **No NAT Gateway** — Lambdas are not in a VPC. Saves ~$33/mo.
- **No Aurora / RDS** — DynamoDB handles MVP load at fractional cost.
- **No WAF** — API Gateway throttling + Cognito rate limits are enough at this scale.
- **No SES at MVP** — Cognito handles auth emails. Add SES when we send transactional or marketing email.
- **No Bedrock / OpenAI** at MVP — AI summaries are post-MVP.

## How to inspect actual spend

```bash
aws ce get-cost-and-usage \
  --time-period Start=$(date -u -v -30d +%Y-%m-%d),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```
