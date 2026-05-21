# Migration plan — v1 (individual) → multi-tenant SaaS

This is the live rollout plan for the changes that landed in PR #8
(`multi-tenant-saas`). Skim it once end-to-end before starting; the steps
are short but order-sensitive.

## Summary of what changes

1. **DynamoDB** — same single table; three new GSIs (`GSI3`, `GSI4`,
   `GSI5`) and DynamoDB Streams turned on. No existing rows are modified.
2. **Lambdas** — four new functions: `ws`, `snapshot`, `cleanup`, `reports`.
   The existing `api` Lambda gains org routes and an `ses:SendEmail`
   permission for invite mail. The `webhook` Lambda gains handling for
   `customer.subscription.{updated,deleted}` events.
3. **API Gateway** — a new WebSocket API at `wss://ws.myawardtracker.com`.
   The existing HTTP API gains the `/v1/orgs/*` route family transparently
   via the same `/v1/{proxy+}` wildcard.
4. **S3** — a new reports bucket with a 7-day lifecycle.
5. **Stripe** — the individual price is unchanged in shape, but **the plan
   moves from one-time payment to a yearly subscription at $4.99**. Six
   new prices are needed for the org tiers (3 tiers × base/with-storage).
6. **Frontend** — light-theme palette, organizations + chat + clock +
   reports pages.

Nothing is deleted. Old activities, profiles, evidence, and the
existing personal subscription path keep working with no migration.

## Order of operations

### 1. Create the six new Stripe prices

In the live Stripe dashboard, create six **recurring yearly** prices:

| Plan id (use as the env-var value)         | Price   |
| ------------------------------------------ | ------: |
| `STRIPE_PRICE_ORG_SMALL`                   | $39/yr  |
| `STRIPE_PRICE_ORG_MEDIUM`                  | $78/yr  |
| `STRIPE_PRICE_ORG_LARGE`                   | $117/yr |
| `STRIPE_PRICE_ORG_SMALL_STORAGE`           | $69/yr  |
| `STRIPE_PRICE_ORG_MEDIUM_STORAGE`          | $138/yr |
| `STRIPE_PRICE_ORG_LARGE_STORAGE`           | $207/yr |

If you also want to convert the individual plan to the new $4.99/yr
recurring shape, create a new `STRIPE_PRICE_INDIVIDUAL` and use it
instead of the one-time price. The Stripe webhook handles both shapes;
the old one-time price keeps working unchanged for legacy customers.

Add all seven price ids as **GitHub repository variables** (matching the
names above). The deploy workflow wires them into Terraform via
`TF_VAR_stripe_price_*` env vars.

### 2. Apply Terraform from AWS CloudShell

The provider plugins are blocked on lockdown laptops — use CloudShell.

```bash
git clone https://github.com/osman-sakli/myawardtracker.com.git
cd myawardtracker.com/myawardtracker
./backend/build.sh
cd infra
terraform init \
  -backend-config="bucket=myawardtracker-tfstate" \
  -backend-config="key=prod/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="use_lockfile=true"

# Plan against the new state — expect ~25 adds, 1 modify (DDB), 0 destroys.
TF_VAR_stripe_price_individual="$STRIPE_PRICE_INDIVIDUAL" \
TF_VAR_stripe_price_org_small="$STRIPE_PRICE_ORG_SMALL" \
TF_VAR_stripe_price_org_medium="$STRIPE_PRICE_ORG_MEDIUM" \
TF_VAR_stripe_price_org_large="$STRIPE_PRICE_ORG_LARGE" \
TF_VAR_stripe_price_org_small_storage="$STRIPE_PRICE_ORG_SMALL_STORAGE" \
TF_VAR_stripe_price_org_medium_storage="$STRIPE_PRICE_ORG_MEDIUM_STORAGE" \
TF_VAR_stripe_price_org_large_storage="$STRIPE_PRICE_ORG_LARGE_STORAGE" \
terraform plan -out=tfplan
terraform apply tfplan
```

The DDB modification is **non-destructive**: three new GSIs being added
in one transaction. DynamoDB builds these online; the table stays
available throughout. Expect 5–30 minutes for the index backfill on a
small table — it's effectively instant since we currently have only
v1's data and v1 never wrote to those keys.

### 3. Add the Stripe webhook endpoints (if not already set)

The webhook URL (`https://api.myawardtracker.com/webhooks/stripe`) is
unchanged. In the Stripe dashboard, make sure these events are subscribed:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### 4. Deploy the frontend

```bash
cd ../scripts && ./deploy.sh frontend-only   # if you've added that mode
# or just rerun the full one:
./deploy.sh
```

The frontend build pulls `NEXT_PUBLIC_WS_URL` from the Terraform output —
make sure step 2 ran first so the value is set.

### 5. Smoke test

In order, on the live site:

1. Sign in. `/v1/me` should return `memberships: []` for legacy users.
2. Go to `/dashboard/organizations`, create a test org. The owner row in
   the DDB console should show a top-level `email` attribute (the user's
   email is queryable through GSI3 now).
3. Invite yourself at a second email address. The invite email should
   land in the inbox (or in CloudWatch Logs if the second address is
   outside SES sandbox).
4. Accept the invite via the link. You should land in the org's
   dashboard.
5. Create a channel, post a message. Confirm `Wifi` icon in the chat
   header shows "Live" (WebSocket) or "Polling" (HTTP fallback) — both
   are acceptable.
6. Clock in, wait 30 seconds, clock out. The session goes to `pending`.
   As owner you should see and be able to approve it.
7. Generate a "Volunteer summary" PDF report — it should land in
   "running" then "done" with a working download link within ~5 seconds.
8. Subscribe via the billing tab in Stripe test mode and confirm the
   `OrgSubscription` row appears under `ORG#<id>` / `SUBSCRIPTION#current`.

### 6. Backfill the snapshot table (optional)

The daily snapshot job runs at 02:00 UTC and only computes "yesterday".
If you want past data populated, invoke the snapshot Lambda with custom
input from CloudShell:

```bash
for d in $(seq 30 -1 1); do
  date=$(date -u -d "$d days ago" +%Y-%m-%d)
  aws lambda invoke --function-name myawardtracker-prod-snapshot \
    --payload "{\"date\":\"$date\"}" /tmp/out.json
done
```

(The snapshot Lambda currently honors yesterday only; if you need this
form, add a `date` override branch in `snapshot_job.py` before running.)

## Rollback

If anything goes wrong after apply:

```bash
# Roll the api Lambda back to the previous deployed zip:
aws lambda update-function-code \
  --function-name myawardtracker-prod-api \
  --s3-bucket <ci-artifacts-bucket> \
  --s3-key <previous-build>.zip
```

The new GSIs and WebSocket API can stay in place safely — they cost ~$0
when idle. To fully undo, `terraform destroy -target` the additions in
this order: `aws_apigatewayv2_api.ws`, the `snapshot/cleanup/reports/ws`
Lambdas, `aws_s3_bucket.reports`, then `terraform plan` should show only
the GSI additions queued for removal. The DDB GSI removals are
non-disruptive too.

## Known follow-ups

- The snapshot Lambda's "process by shard" path is wired but the
  scheduler only schedules one shard. Add more EventBridge rules once
  the org count crosses a few thousand.
- Invite acceptance currently requires the recipient to sign up with the
  exact email the invite was addressed to. Adding "request a different
  address" UX is a nice-to-have.
- Personal activity rows are not yet replicated into `ORG#` partitions,
  so the `student_timeline` report is a placeholder. The data layer is
  ready; only the writer hook on `POST /v1/activities` is missing.
