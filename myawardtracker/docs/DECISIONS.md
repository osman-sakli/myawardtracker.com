# ADRs

Short notes on the choices that shape this repo. Each one records what we picked
and the alternative we considered, so we can revisit when constraints change.

## ADR-001 — Static export to S3 + CloudFront over Amplify Hosting
**Decision:** Next.js `output: 'export'` synced to a private S3 bucket fronted by CloudFront.
**Why:** ~$0 at MVP traffic vs ~$15/mo Amplify Hosting base. Full control over cache rules and security headers. The cost is no SSR — acceptable because marketing pages are fully static and the app shell is rendered client-side from APIs.

## ADR-002 — REST over GraphQL
**Decision:** HTTP API on API Gateway with a small set of REST routes.
**Why:** Lower request cost ($1/M vs AppSync's $4/M), simpler caching, easier auth, smaller Lambda. The app's access patterns are narrow enough that query composability buys little.

## ADR-003 — DynamoDB single-table
**Decision:** One table (`myawardtracker_main_prod`), composite keys, GSIs only as needed.
**Why:** On-demand billing keeps cost ~$0 at MVP, and the hot-path queries are a single `Query` on `PK = USER#<sub>` with an `SK begins_with` prefix. Eliminates per-entity capacity tuning and avoids schema migrations as entities evolve.

## ADR-004 — Terraform over CDK
**Decision:** Terraform with flat `.tf` files in `infra/` (no module abstraction yet).
**Why:** Plays cleanly with the pre-existing Route 53 zone (data source), no bootstrap stack, and the team can read the layout without TypeScript context. Flat files beat over-abstraction at this size; promote to modules when a second environment shows up.

## ADR-005 — Custom auth screens over Cognito Hosted UI
**Decision:** `amazon-cognito-identity-js` in the browser; we render the signup / login / confirm / forgot / reset pages ourselves.
**Why:** The product promises a premium look; Hosted UI's styling is limited. The SDK is small (~30 KB gzipped) and we already serve it over CloudFront.

## ADR-006 — Python 3.12 + AWS Lambda Powertools, two Lambdas
**Decision:** One Lambda for `/v1/*` (`backend/src/handlers/api.py`) and a separate Lambda for the Stripe webhook (`backend/src/handlers/stripe_webhook.py`). Both share one deployment zip; only the handler entrypoint differs.
**Why:** The webhook has different IAM scope (signature secret) and different failure semantics (Stripe retries on 5xx). Splitting them keeps blast radius small without doubling deployment complexity, because the zip is shared.

## ADR-007 — ARM64 (Graviton) Lambda
**Decision:** `architectures = ["arm64"]` on both functions.
**Why:** ~20% cheaper per GB-sec with identical performance for Python workloads. Tradeoff: PIP wheels must support `manylinux2014_aarch64` — all our current deps do; new deps need a quick check before adding.

## ADR-008 — SSM Parameter Store for Stripe secrets, not Secrets Manager
**Decision:** Stripe API key + webhook secret live in SSM Parameter Store (`SecureString`).
**Why:** SSM standard tier is free for the first 10k parameters; Secrets Manager is $0.40/secret/mo. We don't need automatic rotation at this scale.

## ADR-009 — Prod-only deployment, no staging
**Decision:** No dev/staging Terraform workspace; we ship straight to `myawardtracker.com`.
**Why:** Cost minimization for a one-person ramp. Frontend has `npm run dev`; backend can be tested with `pytest`. Re-evaluate as soon as a second contributor joins or once the user base makes a regression noticeable.

## ADR-010 — Concurrency-1 GitHub Actions deploy
**Decision:** `concurrency: { group: deploy-prod, cancel-in-progress: false }` on the deploy workflow.
**Why:** Terraform state can't be safely modified by two simultaneous runs. Never cancel a deploy mid-apply because a partial apply leaves state inconsistent.
