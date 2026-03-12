# Railway Deployment Guide

This repository uses Railway as the default public hosting target for the production demo environment.

## What this setup provides

- container-based deployment using the existing `Dockerfile`
- a GitHub Actions deployment workflow with explicit verification, deployment, and post-deploy validation phases
- a pre-deploy migration step through `npm run prisma:migrate:deploy`
- post-deploy smoke validation for `/health`, `/ready`, and `/docs.json`

## Promotion model

The repository uses two different automation paths on purpose:

- `CI` in `.github/workflows/ci.yml` protects `main` and remains the branch-quality gate
- `Deploy` in `.github/workflows/deploy.yml` is the promotion workflow and always re-verifies the exact ref that will be deployed

Production promotion is intentionally stricter than non-production:

- production deploys happen only from published GitHub releases
- manual dispatch is reserved for staging or homolog-style environments
- manual dispatch rejects `production` to avoid ad-hoc promotion bypasses
- production smoke validation is mandatory and must have a public HTTPS base URL configured

This design keeps branch quality and environment promotion separate, which produces cleaner deployment history and a more auditable release trail.

## Railway project setup

Create a Railway project with three services:

- `auth-api` for the application
- PostgreSQL
- Redis

Generate a public domain for the application service and keep the final HTTPS base URL available for GitHub Actions smoke checks.

## Application variables

Use `.env.production.example` as the source of truth for the application variables.

At minimum, configure:

- `DATABASE_URL` from the Railway PostgreSQL service
- `REDIS_URL` from the Railway Redis service
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `DOCS_ENABLED=true`

On Railway, define `DATABASE_URL` and `REDIS_URL` on the `auth-api` service itself by referencing the backing services, rather than assuming those values are shared automatically across services.

`TRUST_PROXY=1` is recommended for Railway because the service sits behind a proxy.
`METRICS_ENABLED=false` is the safer production default unless the metrics route stays private or is protected with `METRICS_AUTH_TOKEN`.

## GitHub Environments and secrets

Create a dedicated GitHub Environment for each deploy target:

- `production` for release-driven deploys
- `staging`, `homolog`, or another non-production environment for manual deploys

Store deployment credentials as environment secrets on each GitHub Environment rather than as broad repository secrets whenever possible.

Each deploy environment needs:

- `RAILWAY_TOKEN`: Railway account or project token used by GitHub Actions
- `RAILWAY_PROJECT_ID`: target Railway project identifier
- `RAILWAY_SERVICE`: target Railway service name or identifier for the API
- `RAILWAY_ENVIRONMENT`: target Railway environment name or identifier
- `RAILWAY_PUBLIC_URL`: public HTTPS base URL used by smoke checks, for example `https://auth-api-production.up.railway.app`

Production expectations:

- `RAILWAY_PUBLIC_URL` is required
- the URL must belong to the same Railway service targeted by `RAILWAY_SERVICE`
- GitHub Environment protection rules should require deliberate approval before deploy

Non-production expectations:

- `RAILWAY_PUBLIC_URL` is strongly recommended if the environment is publicly reachable
- if the URL is omitted, the deploy may proceed but post-deploy smoke validation is skipped for that non-production environment only

`RAILWAY_PUBLIC_URL` must belong to the same Railway service targeted by `RAILWAY_SERVICE`. If the public URL points to a different service or stale domain, the smoke check will typically return `404` for `/health`.

## Deployment workflow

The deployment workflow lives in `.github/workflows/deploy.yml`.

It supports two triggers:

- published GitHub releases for production
- manual dispatch for non-production environments with an optional ref override

The workflow now has four explicit phases:

1. `resolve deployment context`
   - determines the exact ref, GitHub Environment, Railway environment, and smoke requirements for the trigger
2. `verify promotion candidate`
   - checks out the exact ref to be promoted
   - runs `npm ci`
   - runs `npm run prisma:generate`
   - runs `npm run lint`
   - runs `npm run typecheck`
   - runs `npm run build`
   - runs `npm run test:coverage`
   - runs `npm run prisma:migrate:deploy`
   - runs `npm run test:integration`
3. `deploy`
   - validates environment secrets and smoke prerequisites
   - deploys with `railway up`
4. `validate deployment`
   - runs `scripts/smoke-production.sh` when a public URL is available
   - always writes a deployment summary to the workflow run

The workflow clears the default GitHub Actions `CI=true` value for the deploy step so Railway waits for the deployment result instead of switching to build-only CI mode.

The Railway CLI version is pinned in the workflow on purpose. Update that version deliberately, in reviewable code, rather than pulling `latest` during a production promotion.

Concurrency is grouped by environment, not by a single hardcoded production bucket, so staging and production deploy queues remain isolated.

## Railway config as code

`railway.json` defines deployment behaviour that should stay versioned with the codebase:

- `/health` as the service healthcheck path
- `npm run prisma:migrate:deploy` as the pre-deploy migration command
- failure-based restart policy
- no application sleep in production

## Recommended release flow

1. merge the target branch into `main`
2. confirm `quality` and `integration` are green in CI
3. create and publish a GitHub release from the exact commit to promote
4. let `Deploy` re-verify that release ref and perform the production deployment
5. confirm the workflow summary reports successful smoke validation
6. optionally perform an additional manual product check against `/docs` and `/docs.json`

## Recommended non-production flow

1. open the `Deploy` workflow manually
2. choose a non-production GitHub Environment such as `staging` or `homolog`
3. provide the ref to verify and deploy
4. optionally provide `app_base_url` if the environment has a public URL and you want smoke validation in the same run
5. wait for the verification, deploy, and validation jobs to complete

## GitHub Environment protection rules

Recommended manual configuration in GitHub:

- `production`
  - required reviewers enabled
  - wait timer if you want an additional promotion pause
  - environment-scoped secrets configured
- `staging` or `homolog`
  - separate environment-scoped Railway credentials
  - lighter approval rules, or no approval, depending on team size and risk appetite

Branch protection should continue to require the `quality` and `integration` jobs from `.github/workflows/ci.yml` for `main`.

## Current production demo

The public demo is live at `https://auth-api-production-a97b.up.railway.app`.
