# ADR 0001: Model auth state as first-class sessions

- Status: accepted
- Date: 2026-03-11

## Context

The service needs server-side control over session state, not only token validation. The runtime already exposes session-aware endpoints such as `GET /v1/auth/me`, `GET /v1/auth/sessions`, `DELETE /v1/auth/sessions/:sessionId`, and `DELETE /v1/auth/sessions`, while protected routes reject non-active sessions in `src/middlewares/authMiddleware.ts`.

The persistence model in `prisma/schema.prisma` stores `Session` separately from `RefreshToken`, with lifecycle fields such as `status`, `lastSeenAt`, `revokedAt`, `revokeReason`, and `compromisedAt`.

## Decision

Represent authenticated device/login state as a first-class `Session` aggregate with a stable public `sessionId`.

Each session:

- belongs to one user
- carries lifecycle state (`ACTIVE`, `REVOKED`, `COMPROMISED`)
- stores activity metadata (`lastSeenAt`, `userAgent`, `ipAddress`)
- acts as the parent boundary for refresh-token rotation and revocation

Access tokens carry the internal session identifier through the `sid` claim, but external APIs expose `sessionId`, not token internals.

## Consequences

### Positive

- Protected routes can enforce server-side session revocation even when an access token is still cryptographically valid.
- Session inventory and selective revocation become part of the public contract without leaking refresh-token implementation details.
- Security events such as replay detection can invalidate an entire session, not only a single token record.

### Negative

- Every protected request depends on a database lookup for session state.
- Session storage becomes integrity-critical infrastructure.
- The model is more complex than a purely stateless JWT design.

## Evidence

- `prisma/schema.prisma`
- `src/middlewares/authMiddleware.ts`
- `src/repositories/sessionRepository.ts`
- `src/services/authService.ts`
