# My Award Tracker

Cloud-based SaaS for tracking activities, hours, awards, and evidence for U.S.
high school students, families, and organizations — built to produce clean,
submission-ready summaries for college applications and award programs.

**Domain:** myawardtracker.com · **Cloud:** AWS (`us-east-1`) · serverless

## Repository layout

```
myawardtracker/
├── docs/        Project plan & deployment runbook
├── shared/      Cross-cutting TypeScript types + constants
├── frontend/    Next.js 15 app (static export → S3 + CloudFront)
├── backend/     AWS Lambda functions (Python 3.12 + Lambda Powertools)
├── infra/       Terraform (DynamoDB, Cognito, S3/CloudFront, API GW, ...)
└── .github/     CI/CD workflows
```

## Architecture (low-cost serverless)

- **Frontend** — Next.js static export on S3, served by CloudFront + Route 53.
- **API** — API Gateway HTTP API + Lambda, Cognito JWT authorizer.
- **Data** — DynamoDB single table (on-demand billing).
- **Auth** — Amazon Cognito User Pool.
- **Files** — Private S3 bucket, presigned URLs.
- **Payments** — Stripe Checkout + Billing.
- **IaC** — Terraform. **CI/CD** — GitHub Actions.

Estimated cost at low traffic: **≈ $2–10 / month**.

See [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) for the full plan and
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for deployment steps.

## Local development

Prerequisites: Node 20+, npm 10+, Python 3.12+, Terraform 1.6+, AWS CLI.

```bash
# 1. frontend — install + run the dev server
npm install                 # root — installs frontend + shared workspaces
npm run dev -w frontend      # http://localhost:3000

# 2. backend — build the Lambda deployment bundles
cd backend && ./build.sh     # produces backend/dist/*.zip
```

Copy `frontend/.env.example` → `frontend/.env.local` and
`backend/.env.example` → `backend/.env` and fill in values (most are produced
by `terraform apply`).

## Deployment

```bash
cd infra
terraform init
terraform apply          # provisions all AWS resources

# then build + upload the frontend and deploy Lambdas — see docs/DEPLOYMENT.md
```
