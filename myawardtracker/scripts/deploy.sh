#!/usr/bin/env bash
# Provision + deploy My Award Tracker to AWS from a clone of this repo.
#
# Built to run in AWS CloudShell (or any Linux box with AWS creds), because the
# Terraform provider plugins cannot execute on Santa-locked-down laptops. Run it
# from anywhere — it cd's to the repo root itself:
#
#   git clone https://<token>@github.com/osman-sakli/myawardtracker.com.git
#   cd myawardtracker.com/myawardtracker && ./scripts/deploy.sh
#
# Override defaults with env vars: TF_STATE_BUCKET, TF_STATE_KEY, AWS_REGION.
set -euo pipefail

TF_STATE_BUCKET="${TF_STATE_BUCKET:-myawardtracker-tfstate}"
TF_STATE_KEY="${TF_STATE_KEY:-prod/terraform.tfstate}"
AWS_REGION="${AWS_REGION:-us-east-1}"

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

echo "==> Checking prerequisites"
command -v aws >/dev/null  || { echo "aws CLI not found"; exit 1; }
command -v node >/dev/null || { echo "node not found"; exit 1; }
if ! command -v terraform >/dev/null; then
  echo "==> Terraform not found — installing via the HashiCorp yum repo"
  sudo yum install -y yum-utils
  sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/AmazonLinux/hashicorp.repo
  sudo yum -y install terraform
fi
terraform version

echo "==> Building backend Lambda package"
./backend/build.sh

echo "==> terraform init"
terraform -chdir=infra init -input=false \
  -backend-config="bucket=${TF_STATE_BUCKET}" \
  -backend-config="key=${TF_STATE_KEY}" \
  -backend-config="region=${AWS_REGION}" \
  -backend-config="use_lockfile=true"

echo "==> terraform apply"
terraform -chdir=infra apply -input=false

echo "==> Reading stack outputs"
out() { terraform -chdir=infra output -raw "$1"; }
export NEXT_PUBLIC_API_URL="$(out api_url)"
export NEXT_PUBLIC_AWS_REGION="${AWS_REGION}"
export NEXT_PUBLIC_COGNITO_USER_POOL_ID="$(out cognito_user_pool_id)"
export NEXT_PUBLIC_COGNITO_CLIENT_ID="$(out cognito_client_id)"
export NEXT_PUBLIC_SITE_URL="$(out site_url)"
BUCKET="$(out frontend_bucket)"
DIST="$(out cloudfront_distribution_id)"

echo "==> Building frontend with live API/Cognito values"
npm ci
npm run build

echo "==> Publishing static site to s3://${BUCKET}"
aws s3 sync frontend/out "s3://${BUCKET}" --delete --no-progress

echo "==> Invalidating CloudFront ${DIST}"
aws cloudfront create-invalidation --distribution-id "${DIST}" --paths "/*" >/dev/null

echo
echo "Deployed → $(out site_url)"
echo
echo "One-time follow-ups (the stack applies with placeholders):"
echo "  1. Stripe secret → aws secretsmanager put-secret-value --secret-id $(out stripe_secret_name) \\"
echo "       --secret-string '{\"secret_key\":\"sk_live_...\",\"webhook_secret\":\"whsec_...\"}'"
echo "  2. Stripe price  → set stripe_price_individual in infra/terraform.tfvars, re-run this script"
echo "  3. SES sender    → verify $(out report_from_email) in SES (and leave the SES sandbox)"
echo "  4. Stripe webhook→ add endpoint $(out webhook_url) for checkout.session.completed,"
echo "       then store its signing secret as webhook_secret in step 1"
