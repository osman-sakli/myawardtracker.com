# Deployment Runbook

How to provision and deploy **My Award Tracker** to AWS (`us-east-1`).

The full stack is serverless and described by Terraform. There is **no CI/CD** —
deploys are run by hand with [`scripts/deploy.sh`](../scripts/deploy.sh). On
locked-down laptops (Santa in lockdown mode kills the Terraform provider
plugins), run the script from **AWS CloudShell** instead of locally.

---

## 1. Prerequisites

- An AWS account; an identity (console user or IAM user) with permission to
  manage S3, CloudFront, DynamoDB, Cognito, Lambda, API Gateway, IAM, ACM,
  Route 53, Secrets Manager, SES, Budgets, and CloudWatch Logs.
- A registered domain (`myawardtracker.com`) with a **Route 53 hosted zone**
  that already exists. Terraform looks the zone up — it does not create it.
- Tools: AWS CLI, Terraform ≥ 1.10, Node 20+, Python 3.12. CloudShell has the
  CLI/Node/Python; `scripts/deploy.sh` installs Terraform if it is missing.
- A Stripe account (test mode is fine to start).

---

## 2. One-time bootstrap

Done once, by hand, before the first deploy.

### 2.1 Terraform state bucket

State lives in S3 with native locking (`use_lockfile=true`, no DynamoDB table).
Create a private, versioned, encrypted bucket:

```bash
aws s3api create-bucket --bucket myawardtracker-tfstate --region us-east-1
aws s3api put-bucket-versioning --bucket myawardtracker-tfstate \
  --versioning-configuration Status=Enabled
aws s3api put-public-access-block --bucket myawardtracker-tfstate \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-encryption --bucket myawardtracker-tfstate \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
```

### 2.2 Route 53 hosted zone

The hosted zone for the apex domain must exist before the first apply (Terraform
reads it via a `data` source). Confirm it:

```bash
aws route53 list-hosted-zones --query "HostedZones[].Name" --output text
```

---

## 3. Deploy

> **Locked-down laptop?** If `terraform` runs but provider plugins die on launch
> (exit 137 / SIGKILL — Santa lockdown), run everything below in **AWS
> CloudShell** (console → CloudShell icon). Sign in as an identity with the
> permissions from §1 and select region `us-east-1`.

```bash
# Private repo — clone with a token. /tmp avoids the 1 GB CloudShell home quota.
export GH_TOKEN=ghp_...
git clone "https://${GH_TOKEN}@github.com/osman-sakli/myawardtracker.com.git" /tmp/mat
cd /tmp/mat/myawardtracker

./scripts/deploy.sh
```

`scripts/deploy.sh`:

1. installs Terraform if absent, then builds the Lambda package
   (`backend/build.sh` — cross-targets python3.12 / arm64 from any host),
2. `terraform -chdir=infra init` against the state bucket and `apply`
   (review the plan, type `yes`),
3. reads the stack outputs, builds the frontend with the live `NEXT_PUBLIC_*`
   values injected, `aws s3 sync`s the static export, invalidates CloudFront,
4. prints the live URL and the one-time follow-ups below.

The **first** apply provisions an ACM certificate validated through Route 53 and
rolls out CloudFront — allow **~20–40 min**. Re-runs are much faster.

Overridable env vars: `TF_STATE_BUCKET`, `TF_STATE_KEY`, `AWS_REGION`.

---

## 4. One-time follow-ups (after the first apply)

Terraform creates the Stripe secret with `REPLACE_ME` placeholders and
`ignore_changes` on its value, so a later `apply` never clobbers the real
credentials. Set them out-of-band. The exact resource names are printed at the
end of the deploy (`stripe_secret_name`, `webhook_url`, `report_from_email`).

1. **Stripe secret** — write the live secret key and webhook signing secret into
   Secrets Manager (a single JSON blob; `config.py` reads `secret_key` and
   `webhook_secret` from it):

   ```bash
   aws secretsmanager put-secret-value \
     --secret-id myawardtracker/prod/stripe \
     --secret-string '{"secret_key":"sk_live_...","webhook_secret":"whsec_..."}'
   ```

   The **secret** key is `sk_live_…` — not the publishable `pk_live_…` key,
   which this codebase never uses (checkout is fully server-side).

2. **Stripe price** — create the **$9.99 one-time** product/price in Stripe, then
   set `stripe_price_individual = "price_..."` in `infra/terraform.tfvars` and
   re-run `scripts/deploy.sh`. (It is a plain Lambda env var, not a secret.)

3. **SES sender** — verify the `report_from_email` address in SES and request
   production access if the account is still in the SES sandbox; otherwise the
   bi-weekly report email cannot send.

4. **Stripe webhook** — in **Stripe Dashboard → Developers → Webhooks** add an
   endpoint at the printed `webhook_url`
   (`https://api.myawardtracker.com/webhooks/stripe`) subscribed to
   **`checkout.session.completed`** — the only event the one-time-purchase model
   handles. Copy the endpoint's signing secret into the `webhook_secret` field
   from step 1.

---

## 5. Routine deploys

Re-run `scripts/deploy.sh` after any change to app code, infrastructure, or
content. The state bucket's lockfile prevents two applies from overlapping.

---

## 6. Rollback

The frontend and infrastructure roll back independently:

- **Frontend / app code** — `git revert` the offending commit and re-run the
  deploy script; it rebuilds and re-syncs S3.
- **Infrastructure** — revert the Terraform change and re-run the deploy. The
  state bucket is versioned, so a prior `terraform.tfstate` can be restored if
  an apply leaves state inconsistent.
- **Backend** — Lambda is updated in place by the package hash; reverting the
  backend commit and redeploying restores the previous code.

---

## 7. Teardown

```bash
terraform -chdir=infra destroy
```

Empty the frontend and evidence S3 buckets first if they hold objects. The
Terraform **state bucket** is a bootstrap resource and is **not** managed by
`terraform destroy` — remove it by hand if decommissioning the project entirely.

---

## Cost

At low traffic the stack runs roughly **$2–10 / month**: DynamoDB on-demand,
Lambda + API Gateway request-priced, S3 + CloudFront minimal, Route 53 hosted
zone (~$0.50/mo), Secrets Manager (~$0.40/mo per secret). CloudWatch log
retention is capped at 14 days to bound cost. Set `alert_email` (and optionally
`budget_monthly_usd`) in `terraform.tfvars` to enable an AWS Budget alarm.
