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
| `secrets.tf` | Stripe credentials in Secrets Manager (placeholder) |
| `lambda.tf` | API + webhook Lambdas, IAM roles, log groups |
| `report.tf` | Bi-weekly report Lambda + EventBridge schedule |
| `ses.tf` | SES domain identity + DKIM for report email |
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

The `myawardtracker/prod/stripe` secret is created with `REPLACE_ME`
placeholders and `ignore_changes` on `secret_string`. Write the real live
values out-of-band so they never enter Terraform state:

```bash
aws secretsmanager put-secret-value \
  --secret-id myawardtracker/prod/stripe \
  --secret-string '{"secret_key":"sk_live_...","webhook_secret":"whsec_..."}'
```

## SES production access

`ses.tf` verifies the domain and DKIM, but a new account starts in the SES
sandbox. Request production access once in the SES console so the bi-weekly
report email can reach unverified recipients.
