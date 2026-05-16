# Infrastructure (Terraform)

Provisions the full AWS stack for My Award Tracker in `us-east-1`.

## Resources

| File | Resources |
|------|-----------|
| `dns.tf` | ACM certificate (apex + www + api), Route 53 records |
| `dynamodb.tf` | Single-table DynamoDB + GSI1, GSI2 |
| `cognito.tf` | User Pool + SPA app client |
| `s3_frontend.tf` | Private bucket, CloudFront, OAC, security headers |
| `s3_evidence.tf` | Private evidence bucket (presigned access) |
| `ssm.tf` | Stripe secrets (placeholders) |
| `lambda.tf` | API + webhook Lambdas, IAM roles, log groups |
| `apigateway.tf` | HTTP API, JWT authorizer, routes, custom domain |

## Prerequisites

1. AWS CLI configured with credentials.
2. Route 53 hosted zone for `myawardtracker.com` already exists.
3. Backend built first — Terraform zips `../backend/build`:
   ```bash
   cd ../backend && ./build.sh
   ```

## Usage

```bash
terraform init
terraform plan
terraform apply
```

`terraform apply` prints `frontend_env` — paste it into
`frontend/.env.local` before building the frontend.

## Updating Stripe secrets

The SSM parameters are created with `REPLACE_ME` placeholders and
`ignore_changes` on their value. Set the real values out-of-band:

```bash
aws ssm put-parameter --name /myawardtracker/prod/stripe/secret_key \
  --type SecureString --value 'sk_test_...' --overwrite
aws ssm put-parameter --name /myawardtracker/prod/stripe/webhook_secret \
  --type SecureString --value 'whsec_...' --overwrite
```
