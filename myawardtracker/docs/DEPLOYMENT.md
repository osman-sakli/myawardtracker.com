# Deployment Runbook

How to provision and deploy **My Award Tracker** to AWS (`us-east-1`).

The full stack is serverless and deployed by Terraform. CI/CD runs in GitHub
Actions:

- **`.github/workflows/ci.yml`** — on every pull request: typecheck + build the
  frontend, compile-check the backend, `terraform fmt`/`validate`.
- **`.github/workflows/deploy.yml`** — on push to `main` (or manual run):
  builds the Lambda package, `terraform apply`, builds the frontend, syncs it
  to S3, and invalidates CloudFront.

---

## 1. Prerequisites

- An AWS account with admin access for the one-time bootstrap.
- A registered domain (`myawardtracker.com`) with a **Route 53 hosted zone**
  that already exists. Terraform looks the zone up — it does not create it.
- Local tools for manual/bootstrap work: AWS CLI, Terraform ≥ 1.10, Node 20+,
  Python 3.12.
- A Stripe account (test mode is fine to start).

---

## 2. One-time bootstrap

These steps are done once, by hand, before the first automated deploy.

### 2.1 Terraform state bucket

Terraform state lives in S3 with native locking (`use_lockfile=true`, no
DynamoDB table needed). Create a private, versioned bucket:

```bash
aws s3api create-bucket --bucket myawardtracker-tfstate --region us-east-1
aws s3api put-bucket-versioning --bucket myawardtracker-tfstate \
  --versioning-configuration Status=Enabled
aws s3api put-public-access-block --bucket myawardtracker-tfstate \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

### 2.2 GitHub OIDC role

The deploy workflow authenticates to AWS with short-lived OIDC credentials —
**no access keys are stored in GitHub**.

1. Add GitHub as an OIDC identity provider in IAM (once per account):
   - Provider URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`
2. Create an IAM role (e.g. `myawardtracker-deploy`) with a trust policy that
   permits **only** this repository and the `production` environment, e.g.
   `repo:<org>/<repo>:environment:production`.
3. Attach a permissions policy covering the resources Terraform manages
   (S3, CloudFront, DynamoDB, Cognito, Lambda, API Gateway, IAM, ACM, Route 53,
   SSM, CloudWatch Logs) plus read/write on the state bucket.

> Scope the trust policy to the exact repo + environment. Start from a broad
> managed policy if needed, then tighten once a deploy succeeds.

### 2.3 GitHub repository configuration

Under **Settings → Secrets and variables → Actions**:

| Kind     | Name              | Value                                            |
|----------|-------------------|--------------------------------------------------|
| Secret   | `AWS_ROLE_ARN`    | ARN of the role from 2.2                          |
| Secret   | `TF_STATE_BUCKET` | `myawardtracker-tfstate`                          |
| Variable | `AWS_REGION`      | `us-east-1`                                       |

Create a **`production`** environment (Settings → Environments). Add required
reviewers if you want a manual approval gate before each deploy.

---

## 3. First deployment

The first deploy provisions an ACM certificate validated through Route 53;
allow extra time for DNS validation and CloudFront rollout.

1. Push to `main`, or trigger **Actions → Deploy → Run workflow**.
2. The workflow will:
   - build the backend Lambda package (`backend/build.sh`),
   - `terraform init` against the state bucket and `terraform apply`,
   - build the frontend with the live API/Cognito values injected as
     `NEXT_PUBLIC_*` env vars,
   - `aws s3 sync` the static export and invalidate CloudFront.
3. When it finishes, the site is live at `https://myawardtracker.com`.

### Local bootstrap alternative

If you prefer to run the first apply locally:

```bash
cd backend && ./build.sh && cd ..
cd infra
terraform init \
  -backend-config="bucket=myawardtracker-tfstate" \
  -backend-config="key=prod/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="use_lockfile=true"
terraform apply
```

`terraform apply` prints the `frontend_env` output — paste it into
`frontend/.env.local` if you want to build the frontend locally.

---

## 4. Stripe configuration

The SSM parameters are created by Terraform with `REPLACE_ME` placeholders and
`ignore_changes` on their values, so Terraform never overwrites real secrets.
Set the real values out-of-band after the first apply:

```bash
aws ssm put-parameter --name /myawardtracker/prod/stripe/secret_key \
  --type SecureString --value 'sk_live_...' --overwrite

aws ssm put-parameter --name /myawardtracker/prod/stripe/webhook_secret \
  --type SecureString --value 'whsec_...' --overwrite

aws ssm put-parameter --name /myawardtracker/prod/stripe/prices \
  --type String --overwrite \
  --value '{"individual":"price_...","family":"price_...","small_group":"price_...","medium_group":"price_..."}'
```

In the **Stripe Dashboard → Developers → Webhooks**, add an endpoint:

- URL: `https://api.myawardtracker.com/webhooks/stripe`
- Events: `checkout.session.completed`,
  `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`

Copy the endpoint's signing secret into the `webhook_secret` parameter above.

---

## 5. Routine deploys

After the bootstrap, every push to `main` deploys automatically:

- App code, infrastructure, or content changes → just merge to `main`.
- Infrastructure-only review → open a PR; CI runs `terraform validate`.
- Manual redeploy → **Actions → Deploy → Run workflow**.

The `deploy-prod` concurrency group ensures deploys never overlap.

---

## 6. Rollback

The frontend and infrastructure roll back independently:

- **Frontend / app code** — revert the offending commit (or `git revert`) and
  push to `main`. The deploy workflow rebuilds and re-syncs S3.
- **Infrastructure** — revert the Terraform change and re-run the deploy; the
  S3 state bucket is versioned, so a prior `terraform.tfstate` can be restored
  if an apply leaves state inconsistent.
- **Backend** — Lambda is updated in place by the package hash; reverting the
  backend commit and redeploying restores the previous code.

---

## 7. Teardown

To destroy all provisioned resources:

```bash
cd infra
terraform destroy
```

The S3 buckets (frontend, evidence) must be emptied first if they contain
objects. The Terraform state bucket and the GitHub OIDC role are bootstrap
resources and are **not** managed by `terraform destroy` — remove them by hand
if decommissioning the project entirely.

---

## Cost

At low traffic the stack runs roughly **$2–10 / month**: DynamoDB on-demand,
Lambda + API Gateway request-priced, S3 + CloudFront minimal, Route 53 hosted
zone (~$0.50/mo). CloudWatch log retention is capped at 14 days to bound cost.
