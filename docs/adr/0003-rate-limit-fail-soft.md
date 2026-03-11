# ADR 0003: Prefer Redis-backed rate limiting with in-memory fail-soft fallback

- Status: accepted
- Date: 2026-03-11

## Context

Auth mutation endpoints are exposed to the public internet and include registration, login, refresh, and current-session revocation. These flows need throttling to reduce brute force and refresh abuse pressure.

The runtime can operate with or without Redis. `src/config/redis.ts` treats Redis as optional infrastructure, while `src/middlewares/rateLimiter.ts` falls back to an in-memory bucket map when Redis is unavailable.

## Decision

Use Redis as the primary rate-limit store and fall back to a local in-memory limiter when Redis is down or unreachable.

The current policy uses an IP-based bucket for auth mutation endpoints through `authMutationRateLimiter` in `src/routes/authRoutes.ts`.

The fallback is intentionally fail-soft:

- requests are still limited
- the process stays available
- a warning is logged through the request logger

## Consequences

### Positive

- The API retains basic abuse resistance even when Redis is unavailable.
- Rate limiting remains deployable in environments where Redis is temporarily degraded.
- The fallback path is observable through warning logs and covered by tests.

### Negative

- In-memory fallback is process-local and weaker in horizontally scaled deployments.
- Rate-limit state is lost on restart.
- This is an availability-oriented compromise, not a full security-equivalent replacement for Redis.

## Evidence

- `src/middlewares/rateLimiter.ts`
- `src/config/redis.ts`
- `src/routes/authRoutes.ts`
- `tests/middlewares/rateLimiter.middleware.test.ts`
