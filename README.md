# Auth API

![CI](https://github.com/gabedalmolin/auth-api-node/actions/workflows/ci.yml/badge.svg)

Production-grade authentication API built with **Express 5**, **TypeScript**, **Prisma/PostgreSQL**, and **Redis**.

This codebase is intentionally focused on **core authentication and session integrity**, not on identity-platform breadth. The goal is to model how a real backend auth service should be structured when correctness, operability, and change safety matter.

## Overview

The service ships:

- first-class `Session` records
- refresh-token rotation with replay detection
- explicit JWT claims for access and refresh tokens
- typed environment validation with fail-fast startup
- contract-driven OpenAPI output
- structured audit logging and request correlation
- Redis-backed rate limiting with in-memory fail-soft fallback

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
