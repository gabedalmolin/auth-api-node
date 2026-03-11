# Auth API

![CI](https://github.com/gabedalmolin/auth-api-node/actions/workflows/ci.yml/badge.svg)
[![Release](https://img.shields.io/github/v/release/gabedalmolin/auth-api-node?display_name=tag)](https://github.com/gabedalmolin/auth-api-node/releases/latest)

Production-grade authentication API built with **Express 5**, **TypeScript**, **Prisma/PostgreSQL**, and **Redis**.

This project models what a **production-grade core auth service** looks like when session lifecycle, replay resistance, operational safety, and change discipline are treated as first-class concerns.

It is intentionally focused on **authentication depth**, not identity-platform breadth. The goal is to show how a serious backend service should be designed when correctness, observability, and maintainability matter more than feature count.

## Proof snapshot

![Auth API delivery proof overview](./docs/assets/auth-api-proof-overview.svg)

## Why this project matters

Many portfolio auth APIs stop at registration, login, and a basic JWT flow. This one goes further by modelling the production concerns that usually decide whether an auth service is trustworthy in practice:

- first-class server-side sessions
- refresh-token rotation with replay detection
- explicit session revocation and compromise handling
- contract-driven API documentation
- split quality and integration gates in CI

## Engineering highlights

- First-class `Session` records with public `sessionId` identifiers instead of exposing token internals.
- Chain-aware refresh-token rotation that detects replay and marks compromised sessions inactive.
- Strict JWT validation with separate access and refresh secrets, enforced issuer, audience, and token type.
- Contract-driven OpenAPI output, typed environment validation, and infrastructure-backed integration tests in GitHub Actions.
- Redis-backed rate limiting with in-memory fail-soft behaviour and structured request correlation.
- Prometheus-compatible operational metrics with local Prometheus/Grafana assets.
- Reproducible `k6` load scenarios with a published benchmark baseline for the auth lifecycle.

## Architecture and security notes

- [`docs/adr/0001-session-lifecycle.md`](./docs/adr/0001-session-lifecycle.md)
- [`docs/adr/0002-refresh-token-rotation.md`](./docs/adr/0002-refresh-token-rotation.md)
- [`docs/adr/0003-rate-limit-fail-soft.md`](./docs/adr/0003-rate-limit-fail-soft.md)
- [`docs/threat-model.md`](./docs/threat-model.md)

## Operational proof

- Proof snapshot: [`docs/assets/auth-api-proof-overview.svg`](./docs/assets/auth-api-proof-overview.svg)
- Architecture decisions: [`docs/adr/`](./docs/adr)
- Threat model: [`docs/threat-model.md`](./docs/threat-model.md)
- Benchmark report: [`docs/benchmarks/auth-benchmark.md`](./docs/benchmarks/auth-benchmark.md)
- Observability guide: [`docs/observability.md`](./docs/observability.md)
- Grafana dashboard: [`deploy/observability/grafana/dashboards/auth-api-dashboard.json`](./deploy/observability/grafana/dashboards/auth-api-dashboard.json)

Latest benchmark baseline:

- `25.01 req/s` aggregate request throughput
- `684.36ms` p95 request latency
- `900.44ms` p99 request latency
- `100%` scenario check pass rate across session and replay flows

## Repository security posture

- protected `main` branch with required `quality` and `integration` checks
- GitHub secret scanning and push protection enabled
- Dependabot security updates enabled
- CodeQL analysis on pull requests and `main`
- dependency review on pull requests
- coordinated disclosure guidance in [`SECURITY.md`](./SECURITY.md)

## Auth lifecycle at a glance

```mermaid
flowchart LR
    A["POST /v1/auth/sessions"] --> B["Create session record"]
    B --> C["Issue access token + refresh token"]
    C --> D["GET /v1/auth/me"]
    C --> E["POST /v1/auth/tokens/refresh"]
    E --> F["Rotate refresh token"]
    F --> G["Invalidate previous token in chain"]
    G --> H{"Refresh token replayed?"}
    H -- "No" --> C
    H -- "Yes" --> I["Mark session compromised"]
    I --> J["Reject protected requests"]
```

## Overview

The service ships:

- first-class `Session` records
- refresh-token rotation with replay detection
- explicit JWT claims for access and refresh tokens
- typed environment validation with fail-fast startup
- contract-driven OpenAPI output
- structured audit logging and request correlation
- Redis-backed rate limiting with in-memory fail-soft fallback
- Prometheus-compatible metrics gated by configuration

## API surface

Base contract:

- `POST /v1/auth/register`
- `POST /v1/auth/sessions`
- `POST /v1/auth/tokens/refresh`
- `POST /v1/auth/sessions/current/revoke`
- `GET /v1/auth/me`
- `GET /v1/auth/sessions`
- `DELETE /v1/auth/sessions/:sessionId`
- `DELETE /v1/auth/sessions`
- `GET /health`
- `GET /ready`
- `GET /metrics`
- `GET /docs`
- `GET /docs.json`

Core response patterns:

- login and refresh return `{ accessToken, refreshToken, user, session }`
- register returns `{ user }`
- revoke endpoints return `204 No Content`
- errors return `{ error: { code, message, details?, correlationId } }`

## Security model

- Access and refresh tokens use **different secrets**.
- JWT validation enforces **issuer**, **audience**, and **token type**.
- Refresh tokens are stored as **SHA-256 hashes**, never as plaintext.
- Refresh rotation is **chain-aware**.
- Reusing an already-consumed refresh token marks the session as compromised and revokes its active tokens.
- Protected routes validate both the access token and the current server-side session state.

## Architecture

Main layers:

- `src/routes`: HTTP composition
- `src/controllers`: request orchestration
- `src/services`: auth and session business rules
- `src/repositories`: persistence
- `src/contracts`: request/response schemas and OpenAPI source of truth
- `src/config`: validated environment and infrastructure clients

Important runtime pieces:

- `requestId` middleware for correlation IDs
- request logger with structured logs
- auth middleware with strict bearer parsing
- Redis-first rate limiting with observable fallback
- graceful shutdown for HTTP server, Prisma, and Redis

## Environment

Copy `.env.example` to `.env` and provide real secrets:

```env
DATABASE_URL="postgresql://auth_user:auth_password@localhost:5432/auth_api"
ACCESS_TOKEN_SECRET="replace-this-with-a-strong-access-secret-123456"
REFRESH_TOKEN_SECRET="replace-this-with-a-strong-refresh-secret-12345"
ACCESS_TOKEN_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"
JWT_ISSUER="auth-api"
JWT_AUDIENCE="auth-api-clients"
PORT=3000
REDIS_URL="redis://localhost:6379"
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL="info"
TRUST_PROXY=0
DOCS_ENABLED=true
METRICS_ENABLED=false
BCRYPT_ROUNDS=10
```

## Local development

Start infrastructure:

```bash
docker compose up -d postgres redis
```

Install dependencies, generate Prisma Client, and run the API:

```bash
npm ci
npm run prisma:generate
npm run prisma:migrate:deploy
npm run dev
```

The same migration command is used in CI, so local and remote validation stay aligned.

## Production deployment

The default public hosting target for this project is **Railway**.

Deployment automation is implemented through [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) and supports:

- published GitHub releases
- manual dispatch with a custom ref
- smoke validation for `/health`, `/ready`, and `/docs.json`

Deployment setup material:

- [`docs/deployment/railway.md`](./docs/deployment/railway.md)
- [`.env.production.example`](./.env.production.example)
- [`railway.json`](./railway.json)

The repository is ready for a public demo deployment, but the live URL depends on Railway project configuration plus the required GitHub repository secrets.

## Observability

Enable metrics locally with `METRICS_ENABLED=true` and expose:

- `GET /metrics`

Local observability assets:

- [`docs/observability.md`](./docs/observability.md)
- [`deploy/observability/docker-compose.yml`](./deploy/observability/docker-compose.yml)
- [`deploy/observability/grafana/dashboards/auth-api-dashboard.json`](./deploy/observability/grafana/dashboards/auth-api-dashboard.json)

Bring up Prometheus and Grafana locally with:

```bash
docker compose -f deploy/observability/docker-compose.yml up -d
```

## Benchmarks

The repository includes a reproducible `k6` benchmark for the session lifecycle and refresh replay path:

- scenario: [`tests/load/auth-lifecycle.k6.mjs`](./tests/load/auth-lifecycle.k6.mjs)
- report: [`docs/benchmarks/auth-benchmark.md`](./docs/benchmarks/auth-benchmark.md)

Run it with:

```bash
npm run prisma:migrate:deploy
docker compose -f docker-compose.yml -f docker-compose.benchmark.yml up --build --abort-on-container-exit --exit-code-from k6 k6
```

## Scripts

- `npm run dev`: run the API with `tsx` watch mode
- `npm run build`: compile TypeScript to `dist/`
- `npm run start`: run the compiled server
- `npm run lint`: lint with Biome
- `npm run typecheck`: strict TypeScript check
- `npm test`: fast unit and contract suite
- `npm run test:integration`: integration suite against real Postgres and Redis
- `npm run test:coverage`: Vitest coverage run
- `npm run prisma:generate`: regenerate Prisma Client
- `npm run prisma:migrate:deploy`: apply committed migrations safely

## Testing strategy

The default `npm test` command is infrastructure-free and covers:

- environment parsing
- token issuance and verification
- auth middleware behaviour
- rate limiter fallback behaviour
- health and readiness semantics
- OpenAPI contract generation
- refresh replay compromise logic

The integration suite runs in GitHub Actions as the `integration` job and can be executed locally with the same script:

```bash
npm run test:integration
```

That suite expects local PostgreSQL and Redis to be available and uses the same Prisma deploy migration step as CI.

## Docker

The repository includes:

- a production-oriented `Dockerfile`
- a `docker-compose.yml` with `app`, `postgres`, and `redis`
- a Railway deployment workflow and smoke validation path

To run the full stack with Compose:

```bash
docker compose up --build
```

## Out of scope

This iteration intentionally does **not** implement:

- MFA / TOTP
- password reset
- email verification
- OAuth / social login

The goal is a strong **core auth service**, not a full identity platform yet.

## Acknowledgements

Special thanks to [Marcos Pont](https://github.com/marcospont) for the technical support, thoughtful feedback, and engineering conversations that helped sharpen the quality of this project.
