# My Award Tracker — Backend

Python 3.12 AWS Lambda backend. Two functions share one code bundle:

| Function | Handler | Route |
| --- | --- | --- |
| API | `handlers.api.handler` | `ANY /v1/{proxy+}` (Cognito JWT required) |
| Stripe webhook | `handlers.stripe_webhook.handler` | `POST /webhooks/stripe` (public, signature-verified) |

## Layout

```
src/
  handlers/        Lambda entry points
    api.py             Powertools HTTP resolver, wires up every router
    stripe_webhook.py  Verifies + applies Stripe subscription events
  app/
    config.py        Env vars + lazily-loaded SSM secrets
    constants.py     Categories, statuses, award programs (mirror of shared/)
    auth.py          Reads the Cognito caller from the JWT authorizer claims
    models.py        Pydantic request validation (camelCase contract)
    db.py            DynamoDB single-table access, scoped per user partition
    storage.py       Presigned S3 URLs for the private evidence bucket
    stripe_client.py Stripe SDK wrapper
    routes/          One Powertools Router per resource
```

## API routes

All `/v1/*` routes require a valid Cognito access token.

| Method | Path | Purpose |
| --- | --- | --- |
| GET / PATCH | `/v1/me` | Current user + subscription |
| GET / POST | `/v1/profiles` | List / create profiles |
| GET / PATCH / DELETE | `/v1/profiles/{id}` | Single profile (delete cascades) |
| GET / POST | `/v1/activities` | List (`?profileId=`) / create |
| GET / PATCH / DELETE | `/v1/activities/{id}` | Single activity (+ its evidence) |
| GET | `/v1/evidence` | List evidence (`?activityId=`) |
| POST | `/v1/evidence/upload-url` | Presigned upload URL + metadata record |
| GET | `/v1/evidence/{id}/download-url` | Presigned download URL |
| DELETE | `/v1/evidence/{id}` | Delete evidence + S3 object |
| GET | `/v1/categories` | Built-in categories + award programs |
| GET | `/v1/summary` | Dashboard aggregates (`?profileId=`) |
| POST | `/v1/billing/checkout` | Start a Stripe Checkout session |
| POST | `/v1/billing/portal` | Open the Stripe billing portal |

## Build

```bash
./build.sh
```

Copies `src/handlers` and `src/app` into `build/`, installs dependencies for
`manylinux2014_aarch64` / cp312 (Lambda arm64), and strips bytecode. Terraform
(`infra/lambda.tf`) zips `build/` into `dist/backend.zip`.

## Local checks

```bash
python3 -m py_compile src/app/*.py src/app/routes/*.py src/handlers/*.py
```

## Configuration

Runtime config comes from environment variables (see `.env.example`) set by
Terraform. Stripe secrets are read at runtime from SSM Parameter Store under
`SSM_PREFIX` — they are never baked into the bundle.
