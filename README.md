# Auth API (Node.js + Express + Prisma)

![CI](https://github.com/gabedalmolin/auth-api-node/actions/workflows/ci.yml/badge.svg)

Production-oriented authentication and session management API engineered with a backend-first mindset: clear architectural boundaries, rotating token lifecycle, Redis-backed rate limiting, structured observability, OpenAPI documentation, and CI-enforced quality gates.

## Overview

This project was built as an applied software engineering exercise with a deliberate focus on production-grade backend concerns: correctness, maintainability, operational clarity, and defensive design.

It is not intended to be a minimal auth demo or a framework-driven CRUD sample. The goal is to reflect how a real backend service should be structured and evolved when session integrity, reliability, and change confidence matter.

Core capabilities include:

- authentication with rotating `accessToken` and `refreshToken`
- session revocation by token and by user
- schema-based input validation and consistent error semantics
- baseline observability for runtime diagnostics
- continuous quality controls through linting, coverage, and CI

## Quality Snapshot (Feb 2026)

- `16/16` test suites passing
- `104/104` tests passing
- global coverage: `99.2%` (branches `99.2%`)
- `src/config` and `src/middlewares` at `100%` branch coverage
- GitHub Actions CI stable on `main`

## Stack

- Node.js 20 LTS
- Express 5
- TypeScript 5.9
- Prisma 7 + PostgreSQL
- Redis (`ioredis`)
- JWT (`jsonwebtoken`) + `bcryptjs`
- Zod for request validation
- Pino for structured logging
- Vitest + Jest + Supertest
- Biome for linting and formatting
- Swagger UI + swagger-jsdoc

## Architectural Direction

The codebase follows a layered architecture with explicit separation of concerns:

- `routes`: HTTP contract definition and middleware composition
- `controllers`: request/response orchestration
- `services`: business logic and application rules
- `repositories`: persistence and database access

This structure was chosen to keep the service predictable, testable, and maintainable as complexity grows, while avoiding unnecessary coupling between transport, business rules, and persistence concerns.

Critical middleware responsibilities include:

- `requestId`: per-request correlation
- `logger`: structured logging with contextual metadata
- `validate`: schema-driven validation with Zod
- `authMiddleware`: JWT-based route protection
- `rateLimiter`: abuse protection with Redis and in-memory fallback
- `errorHandler`: standardised error response handling

## Authentication and Session Lifecycle

1. `POST /auth/register`: creates a user with a hashed password.
2. `POST /auth/login`: validates credentials and issues `accessToken` and `refreshToken`.
3. `POST /auth/refresh`: validates the refresh token, revokes the previous token, and issues a new token pair.
4. `POST /auth/logout`: revokes the current session.
5. `POST /auth/logout-session` and `POST /auth/logout-all`: terminate a specific session or all active sessions.

## Security and Reliability Posture

The implementation includes several deliberate engineering decisions to strengthen safety and operational behaviour:

- refresh tokens are stored as hashed values (`tokenHash`) in the database
- token rotation is enforced through `jti` with explicit revocation
- `JWT_SECRET` is validated at startup to fail fast on invalid configuration
- application errors are centralised through `AppError`
- rate limiting is applied to sensitive endpoints
- test logging noise is reduced to preserve readable feedback loops
- test resources are properly torn down to prevent open handles and unstable runs

These choices prioritise explicit control and lifecycle correctness over a thin happy-path implementation.

## Local Setup

Prerequisites:

- Docker + Docker Compose
- Node.js 20 LTS
- npm

Start infrastructure and run the application:

```bash
docker-compose up -d postgres redis
npm install
npx prisma migrate deploy
npx prisma generate
npm run dev
```

`.env` file:

```env
DATABASE_URL="postgresql://auth_user:auth_password@localhost:5432/auth_api"
JWT_SECRET="<generate-a-strong-secret-with-at-least-32-characters>"
PORT=3000
REDIS_URL="redis://localhost:6379"
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

For tests, use `tests/.env.test`.

## Main Scripts

- `npm run dev`: development with watch mode
- `npm run start`: run the API
- `npm run lint`: lint with Biome
- `npm run format`: validate formatting
- `npm test`: main test suite with Vitest
- `npm run test:coverage:jest`: coverage run with Jest
- `npm run test:coverage:vitest`: coverage run with Vitest
- `npm run typecheck`: static type checking

## Quick Validation

```bash
npm run lint
npm run test:coverage:jest
npx jest --config jest.config.cjs --runInBand --detectOpenHandles --openHandlesTimeout=5000
```

## Main Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/profile`
- `GET /users/me`
- `GET /auth/sessions`
- `POST /auth/logout-session`
- `POST /auth/logout-all`
- `GET /health`
- `GET /ready`
- `GET /docs`
- `GET /docs.json`

## Recent Engineering Milestones

Latest relevant deliveries on `main`:

- [#14](https://github.com/gabedalmolin/auth-api-node/pull/14) improved test runtime stability through Prisma teardown hardening
- [#15](https://github.com/gabedalmolin/auth-api-node/pull/15) increased branch coverage across authentication and rate limiter flows
- [#16](https://github.com/gabedalmolin/auth-api-node/pull/16) reduced log noise during automated test execution
- [#18](https://github.com/gabedalmolin/auth-api-node/pull/18) achieved full branch coverage for `src/config/prisma.ts`
- [#19](https://github.com/gabedalmolin/auth-api-node/pull/19) achieved full branch coverage for `src/logger.ts`
- [#20](https://github.com/gabedalmolin/auth-api-node/pull/20) achieved full branch coverage for `validate.ts` and `errorHandler.ts`
- [#21](https://github.com/gabedalmolin/auth-api-node/pull/21) achieved full branch coverage for the rate limiter and Redis configuration

## Technical Roadmap

Planned next steps:

- formalise the long-term coverage strategy decision (`Jest` vs `Vitest` vs a documented hybrid model)
- expand resilience scenarios for Redis and database unavailability
- evolve session management towards richer device-level metadata
- document session and token rotation decisions through an ADR
- strengthen the security checklist around dependencies, secrets, and token expiry policies

Detailed backlog: `to-do.txt`.

## Acknowledgements

Special thanks to [Marcos Pont](https://github.com/marcospont), for his support, technical guidance, and consistent feedback throughout this project. His mentorship, engineering judgement, and practical perspective were instrumental in challenging assumptions, sharpening architectural decisions, and raising the overall technical standard of this implementation.

## Folder Structure

```txt
src/
- app.ts
- server.ts
- logger.ts
- config/
- controllers/
- docs/
- errors/
- middlewares/
- repositories/
- routes/
- services/
- validators/

prisma/
- schema.prisma
- migrations/

tests/
- auth.e2e.test.ts
- health.e2e.test.ts
- middleware/
- config/
- repositories/
- services/
- setup.js
- jest.env.js
- jest.globals.js
- vitest.setup.mjs
```
