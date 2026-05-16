# My Award Tracker — Project Plan

> Cloud-based SaaS for tracking activities, hours, awards, and evidence for
> U.S. high school students, families, and organizations.
>
> Domain: **myawardtracker.com** · AWS account: `339712706640` · Region: `us-east-1`

---

## 1. Product Requirements

### 1.1 Vision
A centralized, trustworthy place where students (and the people who support
them) record the activities that matter for college applications, scholarships,
and award programs — volunteer service, personal development, fitness,
expeditions, internships, leadership, certifications, and more.

Inspired by the structure of programs like the Congressional Award and the
President's Volunteer Service Award, but **program-agnostic**: a student can
track raw activity and map it to any award program.

### 1.2 Goals
- Make logging an activity take < 30 seconds.
- Never lose evidence — files, notes, and history are permanent and exportable.
- Produce a clean, submission-ready summary for any award program.
- Be affordable to run (low fixed AWS cost) and affordable to buy.

### 1.3 Non-goals (for MVP)
- Native mobile apps (responsive web only).
- AI-generated narratives.
- Approval workflows / coordinator sign-off.
- Real-time collaboration.

---

## 2. User Roles

| Role | Description | MVP? |
|------|-------------|------|
| **Individual student** | Owns one profile, logs own activities. | ✅ |
| **Parent / family** | Owns a family account with multiple child profiles. | Data model ready; UI post-MVP |
| **Organization admin** | Manages an org, its members, and award programs. | Data model ready; UI post-MVP |
| **Volunteer coordinator** | Reviews/approves member activities. | Post-MVP |
| **Enterprise / school admin** | Org admin with billing + multi-group. | Post-MVP |

The MVP ships the **individual student** experience end-to-end. The data model,
auth groups, and API are designed so family/org layers slot in without
migration.

---

## 3. MVP Scope

1. Marketing site (Home, Pricing, Features, How it works, For students/parents/
   organizations, Contact, Login, Signup).
2. Secure authentication (Amazon Cognito: sign-up, email verification, sign-in,
   password reset).
3. User dashboard with overview metrics.
4. Activity CRUD — create, edit, delete.
5. Hours tracked per category.
6. Activity history with filters (date, category, status).
7. Built-in activity categories.
8. DynamoDB persistence.
9. Mobile-responsive, dark-mode-first UI.
10. Stripe subscription (test-mode checkout + webhook; plans seeded).
11. AWS deployment behind myawardtracker.com.

---

## 4. Future Scope (post-MVP)

- Organization & enterprise accounts, member management, seat-based billing.
- Parent/family multi-child management UI.
- Award program templates (Congressional Award, PVSA, Girl Scouts, etc.) with
  progress tracking against thresholds.
- PDF / CSV export and shareable submission links.
- AI-generated college-application summaries (Amazon Bedrock).
- Coordinator approval workflow + audit trail UI.
- Email reminders / digests (SES + EventBridge).
- Native mobile app.

---

## 5. AWS Architecture

```
                          Route 53 (myawardtracker.com)
                                     │
                  ┌──────────────────┴───────────────────┐
                  │                                      │
        app + marketing (CloudFront)            api.myawardtracker.com
                  │                                      │
          ┌───────┴────────┐                   ┌─────────┴──────────┐
          │  S3 (static    │                   │  API Gateway       │
          │  Next.js       │                   │  HTTP API          │
          │  export)       │                   │  + Cognito JWT     │
          └────────────────┘                   │    authorizer      │
                                                └─────────┬──────────┘
                                                          │
                                              ┌───────────┴───────────┐
                                              │   AWS Lambda (Node)    │
                                              │   - activities         │
                                              │   - profiles           │
                                              │   - evidence (presign) │
                                              │   - billing / stripe   │
                                              │   - stripe webhook     │
                                              └───────────┬───────────┘
                                                          │
                       ┌──────────────────────────────────┼───────────────────┐
                       │                                  │                   │
              DynamoDB (single table)            S3 (evidence,            Cognito
              + GSIs                              private, presigned)     User Pool
                       │
                  CloudWatch Logs / Metrics / Alarms
```

### 5.1 Components
- **Frontend hosting**: Next.js 15 static export → S3 (private) → CloudFront with
  Origin Access Control. Single distribution serves marketing + app shell.
- **DNS / TLS**: Route 53 alias records; ACM certificate (us-east-1) covering
  `myawardtracker.com`, `www`, and `api`.
- **API**: API Gateway **HTTP API** (cheaper than REST) at
  `api.myawardtracker.com`, protected by a Cognito JWT authorizer.
- **Compute**: Python 3.12 Lambda functions (ARM/Graviton) using AWS Lambda
  Powertools — one `api` function for all authorized routes plus a separate
  `stripe-webhook` function.
- **Database**: DynamoDB single-table, on-demand billing.
- **Auth**: Cognito User Pool + Hosted-UI-free SDK auth (`aws-amplify/auth`).
- **File storage**: Private S3 bucket; uploads/downloads via presigned URLs.
- **Payments**: Stripe Checkout + Billing; webhook handled by a Lambda.
- **Observability**: CloudWatch Logs, metrics, a few alarms; X-Ray optional.

---

## 6. Database Schema (DynamoDB single-table)

Table: **`myawardtracker`** — keys `PK` (partition) / `SK` (sort).

| Entity | PK | SK | Notes |
|--------|----|----|-------|
| User | `USER#<sub>` | `USER#<sub>` | Cognito sub, email, plan, role |
| Profile | `USER#<sub>` | `PROFILE#<profileId>` | Student/member profile |
| Activity | `USER#<sub>` | `ACTIVITY#<activityId>` | Has `profileId`, `categoryId` |
| Evidence | `USER#<sub>` | `EVIDENCE#<evidenceId>` | S3 key, linked to activity |
| Subscription | `USER#<sub>` | `SUBSCRIPTION#current` | Stripe customer + status |
| Custom category | `USER#<sub>` | `CATEGORY#<categoryId>` | User-defined categories |
| AuditHistory | `USER#<sub>` | `AUDIT#<ts>#<id>` | Append-only change log |
| Family | `FAMILY#<familyId>` | `FAMILY#<familyId>` | Post-MVP |
| Organization | `ORG#<orgId>` | `ORG#<orgId>` | Post-MVP |
| Membership | `ORG#<orgId>` | `MEMBER#<userId>` | Post-MVP |
| AwardProgram | `PROGRAM#<programId>` | `PROGRAM#<programId>` | Catalog, post-MVP |

**Global Secondary Indexes**
- **GSI1 — activities by profile, time-sorted**
  `GSI1PK = PROFILE#<profileId>`, `GSI1SK = ACTIVITY#<date>#<activityId>`.
  Powers the activity list, history, calendar, and date-range filters.
- **GSI2 — entities by Stripe customer** (webhook lookups)
  `GSI2PK = STRIPE#<customerId>`, `GSI2SK = USER#<sub>`.

Built-in `ActivityCategory` values are application constants (shared package),
not table rows; only user-defined categories are persisted.

---

## 7. API Endpoints

Base: `https://api.myawardtracker.com` · all `/v1/*` routes require a valid
Cognito JWT (except the Stripe webhook, which is signature-verified).

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/me` | Current user + subscription |
| PATCH | `/v1/me` | Update user profile/settings |
| GET | `/v1/profiles` | List profiles |
| POST | `/v1/profiles` | Create profile |
| GET/PATCH/DELETE | `/v1/profiles/{id}` | Profile detail ops |
| GET | `/v1/activities` | List/filter (query: profileId, category, from, to, status) |
| POST | `/v1/activities` | Create activity |
| GET/PATCH/DELETE | `/v1/activities/{id}` | Activity detail ops |
| GET | `/v1/summary` | Aggregated hours by category / award progress |
| POST | `/v1/evidence/upload-url` | Presigned S3 upload URL |
| GET | `/v1/evidence/{id}/download-url` | Presigned S3 download URL |
| DELETE | `/v1/evidence/{id}` | Remove evidence |
| GET | `/v1/categories` | Built-in + custom categories |
| POST | `/v1/billing/checkout` | Create Stripe Checkout session |
| POST | `/v1/billing/portal` | Stripe customer portal link |
| POST | `/webhooks/stripe` | Stripe webhook (no JWT; signed) |

---

## 8. Frontend Routes

**Marketing** (`(marketing)` group): `/`, `/pricing`, `/features`,
`/how-it-works`, `/for-students`, `/for-parents`, `/for-organizations`,
`/contact`.

**Auth** (`(auth)` group): `/login`, `/signup`, `/confirm`, `/forgot-password`.

**App** (`(app)` group, guarded): `/dashboard`, `/dashboard/activities`,
`/dashboard/activities/new`, `/dashboard/activities/[id]`,
`/dashboard/calendar`, `/dashboard/hours`, `/dashboard/awards`,
`/dashboard/evidence`, `/dashboard/settings`, `/dashboard/billing`,
`/dashboard/org` (post-MVP), `/dashboard/reports`.

---

## 9. Folder Structure

```
myawardtracker/
├── docs/                 PROJECT_PLAN.md, DEPLOYMENT.md
├── shared/               Cross-cutting TypeScript types + constants
├── frontend/             Next.js 15 app (static export)
│   └── src/
│       ├── app/          App Router route groups
│       ├── components/   UI + feature components
│       ├── lib/          api client, auth, config
│       └── hooks/
├── backend/              Lambda functions (Python 3.12 / Powertools)
│   └── src/
│       ├── handlers/     Lambda entrypoints (api, stripe-webhook)
│       └── app/          config, models, db, routes, helpers
├── infra/                Terraform
│   └── modules/          dynamodb, cognito, frontend, api, lambda, dns
└── .github/workflows/    CI/CD
```

---

## 10. Security Considerations

- **AuthN**: Cognito User Pool, email + password, mandatory verification,
  strong password policy, refresh-token rotation.
- **AuthZ**: API Gateway JWT authorizer validates Cognito tokens; every handler
  scopes all DynamoDB access to the caller's `sub` — no cross-tenant reads.
- **Secrets**: Stripe keys and webhook secret in SSM Parameter Store
  (SecureString); never in source. Frontend gets only public/publishable values
  via build-time env.
- **File storage**: Evidence bucket is fully private; all access via short-lived
  presigned URLs. Upload keys are namespaced by user `sub`.
- **Transport**: HTTPS everywhere; HSTS; CloudFront min TLS 1.2.
- **Input validation**: Pydantic models validate every request body/query.
- **Least privilege**: per-function IAM roles scoped to specific table/bucket
  ARNs and SSM paths.
- **Headers**: CloudFront response-headers policy (CSP, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy).
- **Logging**: CloudWatch retention set (14–30 days) to bound cost; no PII in
  logs.
- **Webhooks**: Stripe signature verification before any processing.

---

## 11. Cost Optimization Plan

| Service | Strategy | Est. low-traffic cost |
|---------|----------|-----------------------|
| S3 + CloudFront | Static export, free-tier-friendly, cache aggressively | ~$0.50–3/mo |
| DynamoDB | On-demand (pay-per-request), single table | ~$0–2/mo |
| Lambda | Right-sized memory, ARM (Graviton) | ~$0 (free tier) |
| API Gateway | HTTP API (cheaper than REST) | ~$0–1/mo |
| Cognito | Free tier 50k MAU | $0 |
| Route 53 | Existing hosted zone | $0.50/mo |
| ACM | Free | $0 |
| CloudWatch | Short log retention, minimal alarms | ~$0–1/mo |
| **Total** | | **≈ $2–10 / month** |

Principles: serverless-only (no idle compute), on-demand billing, ARM Lambdas,
aggressive CDN caching, short log retention, single CloudFront distribution,
single DynamoDB table.

---

## 12. Implementation Roadmap

1. **Scaffold** — repo structure, shared types, tooling. ✅
2. **Infrastructure** — Terraform for DynamoDB, Cognito, S3/CloudFront, ACM,
   Route 53, API Gateway, Lambda, IAM.
3. **Backend** — data layer + Lambda handlers + Stripe.
4. **Frontend foundation** — design system, layout, components.
5. **Marketing site** — all public pages.
6. **Auth** — Cognito-wired login/signup/reset + route guards.
7. **Dashboard** — overview, activity CRUD, hours, history, evidence, billing.
8. **CI/CD** — GitHub Actions for frontend/backend/infra.
9. **Provision & deploy** — `terraform apply`, build + upload, DNS cutover.
10. **Verify** — smoke-test auth, CRUD, payments, responsive UI.

---

## 13. Pricing

| Plan | Price | Seats |
|------|-------|-------|
| Individual | $4.99/mo | 1 |
| Family | $9.99/mo | up to 5 profiles |
| Small Group | $19.99/mo | 8–20 users |
| Medium Group | $29.99/mo | 20–40 users |
| Enterprise | Custom | Schools, nonprofits, universities, corporations |
