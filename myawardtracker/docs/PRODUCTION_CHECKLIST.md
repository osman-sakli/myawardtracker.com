# Production launch checklist

Every box must be ticked before the multi-tenant build is announced.
Pair each item with the operator who signed off in the launch issue.

## Identity & auth

- [ ] Cognito User Pool MFA policy reviewed (currently optional; consider
      `required` for org-owner accounts once the tier 3+ orgs sign up).
- [ ] Cognito email verification verified end-to-end on the live SES
      domain identity (not in the SES sandbox).
- [ ] Password policy is at least 10 chars + mixed case + digit (already
      true in `infra/cognito.tf`).
- [ ] App client has no client secret (SPA flow only).

## DynamoDB

- [ ] All five GSIs (`GSI1` through `GSI5`) report `ACTIVE` in the
      console.
- [ ] Point-in-time recovery enabled (already true in `dynamodb.tf`).
- [ ] CloudWatch alarm on `UserErrors` and `SystemErrors` > 0 over 5 min.
- [ ] CloudWatch alarm on `ConsumedReadCapacityUnits` and
      `ConsumedWriteCapacityUnits` > 80% of the account on-demand
      throttle limit (`UserErrors` would also fire, but this one is
      earlier).
- [ ] DynamoDB Streams enabled (`NEW_AND_OLD_IMAGES`). Confirm the
      reports event-source-mapping is `Enabled` and showing iterator
      age near 0.

## Lambda

- [ ] All six functions are reachable from API Gateway (`api`, `webhook`,
      `ws`) and from the schedulers/streams (`snapshot`, `cleanup`,
      `reports`).
- [ ] Memory tuned: `api` 256 MB, `webhook` 256 MB, `ws` 256 MB,
      `snapshot` 512 MB, `cleanup` 256 MB, `reports` 1024 MB. Re-tune
      after 2 weeks of real traffic using Lambda Power Tuning.
- [ ] CloudWatch alarm on `Errors > 0` (1-minute period) for `api`,
      `webhook`, `snapshot`, `cleanup`, `reports`, `ws`.
- [ ] Cold-start budget: median `api` cold start under 800 ms at 256 MB
      arm64.

## API Gateway

- [ ] HTTP API throttle: 100 rps + 50 burst (already set in
      `apigateway.tf`). Raise once we see > 50 paying orgs.
- [ ] WebSocket throttle: same default. Per-connection messages are
      bounded by the chat composer's 4000-char limit.
- [ ] CORS origin pinned to `https://myawardtracker.com` +
      `https://www.myawardtracker.com` (already true).
- [ ] Access logs flowing to the named log group with 14-day retention.

## IAM

- [ ] Every Lambda role is single-purpose (one role per function or
      function family). Verified by `aws iam list-attached-role-policies`
      on each.
- [ ] No role has `*` on a sensitive action. `dynamodb:*` is split into
      named verbs.
- [ ] `ses:SendEmail` is gated by `ses:FromAddress` ==
      `reports@myawardtracker.com` (both `api` and `report` roles).
- [ ] No long-lived IAM users in the deploy path; CI assumes a deploy
      role via OIDC.

## Secrets

- [ ] Stripe live secret key + webhook secret written into the
      `myawardtracker/prod/stripe` secret out-of-band. Terraform's
      `ignore_changes` keeps them out of state.
- [ ] Secrets Manager rotation reminder set (yearly is fine for Stripe).

## Stripe

- [ ] Seven prices live: 1 individual + 6 org (3 tiers × base/storage).
- [ ] Webhook subscribed to: `checkout.session.completed`,
      `customer.subscription.updated`, `customer.subscription.deleted`.
- [ ] Webhook endpoint URL is `https://api.myawardtracker.com/webhooks/stripe`.
- [ ] Test mode end-to-end: a test checkout grants paid access; a test
      cancellation logs `subscription.canceled` in the org audit feed.

## Observability

- [ ] CloudWatch dashboard with: API 5xx, Lambda errors per function,
      DDB consumed capacity, WS active connections, SES bounce/complaint
      rates, Stripe webhook 5xx.
- [ ] Budget alarm at $30/mo (already in `budgets.tf` — set `alert_email`).
- [ ] CloudWatch metric filter on `stripe signature verification failed`
      (anything above 0/day means we're under attack or misconfigured).
- [ ] A `notifications` audit-row scan can produce a list of users with
      lapsed subscriptions for a weekly check.

## Email deliverability

- [ ] SES domain identity verified.
- [ ] DKIM CNAMEs resolved (3 records).
- [ ] Custom MAIL FROM (`mail.myawardtracker.com`) MX + SPF resolved.
- [ ] Apex SPF + DMARC TXT records resolved.
- [ ] Production-access request approved (out of SES sandbox).
- [ ] One real-recipient invite + one real-recipient bi-weekly report
      lands in the inbox, not spam. Check `Received-SPF`, `DKIM-Filter`,
      `Authentication-Results` headers.

## Data retention

- [ ] DDB TTL enabled on the `ttl` attribute (already true).
- [ ] Cleanup Lambda has executed at least once and reported
      `deleted_messages` > 0 for a test channel set up at retention 1d.
- [ ] Reports bucket lifecycle expires objects at 7 days (verified by
      reading the lifecycle config).
- [ ] CloudWatch log retention 14 days on every log group.

## Privacy & compliance

- [ ] Privacy policy mentions email storage, evidence uploads,
      DynamoDB region (US), and Stripe.
- [ ] Terms of service in place; references the chat retention window.
- [ ] Export-my-data endpoint exists or has a documented manual
      process.
- [ ] Account-deletion path: deleting the user partition removes their
      personal data; their membership rows in `ORG#` partitions are
      deleted via the existing `remove_member` flow.

## Frontend

- [ ] `npm run build` succeeds; no client-side console errors on the
      home page, login, dashboard overview.
- [ ] CloudFront cache TTL is 0 on `index.html`, long on hashed assets.
- [ ] SPA fallback still works for the dispatcher routes (verified by
      hitting `/dashboard/org/?id=…&tab=chat` in a fresh browser).
- [ ] Lighthouse: accessibility ≥ 95 on the dashboard.

## Runbooks

- [ ] `docs/MIGRATION.md` linked from the launch issue.
- [ ] Incident runbook covers: Stripe webhook outage, SES bounce spike,
      DDB throttling, WebSocket Lambda errors.
- [ ] On-call rotation defined (even if it's one person to start).
