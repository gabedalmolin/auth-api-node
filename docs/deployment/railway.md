# Railway Deployment Guide

This repository uses Railway as the default public hosting target for the production demo environment.

## What this setup provides

- container-based deployment using the existing `Dockerfile`
- a GitHub Actions deployment workflow triggered by published releases or manual dispatch
- a pre-deploy migration step through `npm run prisma:migrate:deploy`
- post-deploy smoke validation for `/health`, `/ready`, and `/docs.json`

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

## Repository secrets

Add the following repository secrets in GitHub:

- `RAILWAY_TOKEN`: Railway account or project token used by GitHub Actions
- `RAILWAY_PROJECT_ID`: target Railway project identifier
- `RAILWAY_SERVICE`: target Railway service name or identifier for the API
- `RAILWAY_ENVIRONMENT`: target Railway environment name or identifier, usually `production`
- `RAILWAY_PUBLIC_URL`: public HTTPS base URL used by the smoke checks, for example `https://auth-api-production.up.railway.app`

## Deployment workflow

The deployment workflow lives in `.github/workflows/deploy.yml`.

It supports two triggers:

- published GitHub releases
- manual dispatch with an optional ref override

The workflow:

1. validates the required Railway configuration
2. checks out the release tag or requested ref
3. deploys the application with `railway up`
4. runs `scripts/smoke-production.sh` against the public URL

The workflow clears the default GitHub Actions `CI=true` value for the deploy step so Railway waits for the deployment result instead of switching to build-only CI mode.

## Railway config as code

`railway.json` defines deployment behaviour that should stay versioned with the codebase:

- `/health` as the service healthcheck path
- `npm run prisma:migrate:deploy` as the pre-deploy migration command
- failure-based restart policy
- no application sleep in production

## Recommended release flow

1. merge the target branch into `main`
2. confirm the required `quality` and `integration` checks are green
3. publish a GitHub release
4. wait for the `Deploy` workflow to complete
5. verify the public `/docs` and `/docs.json` endpoints manually after smoke validation succeeds

## Current limitation

The repository automation is ready for deployment, but an actual public demo URL depends on the Railway project and repository secrets being configured in GitHub.
