# ADR 0002: Use chain-aware refresh-token rotation with replay compromise handling

- Status: accepted
- Date: 2026-03-11

## Context

The service issues bearer access tokens plus refresh tokens submitted in the request body. A simple long-lived refresh token would make token theft harder to detect and would weaken server-side revocation semantics.

The current implementation in `src/services/authService.ts` and `src/services/tokenService.ts` already uses:

- separate access and refresh secrets
- explicit `typ`, `sid`, `sub`, and `jti` claims
- SHA-256 hashing for stored refresh tokens
- refresh-token status transitions in `RefreshTokenStatus`

## Decision

Use one-time refresh tokens with chain-aware rotation.

On every successful refresh:

1. verify the JWT claims with issuer, audience, token type, and secret checks
2. load the stored token by `jti`
3. verify that the token belongs to the expected session and matches the stored hash
4. issue a new refresh token linked through `parentTokenId`
5. mark the previous token as `USED` and store `replacedByTokenId`

If a refresh token is presented after it is no longer `ACTIVE`, or its hash no longer matches the stored record, treat the event as replay and compromise the whole session.

## Consequences

### Positive

- Replay attempts can be detected instead of silently accepted.
- A compromised refresh token invalidates the entire session boundary, reducing attacker dwell time.
- Token persistence keeps an audit-friendly lineage of replacements.

### Negative

- Refresh flows become stateful and require persistence.
- Operational bugs in token state transitions would affect sign-in continuity.
- Incident handling must clearly distinguish expired, revoked, reused, and compromised states.

## Evidence

- `src/services/authService.ts`
- `src/services/tokenService.ts`
- `src/repositories/refreshTokenRepository.ts`
- `prisma/schema.prisma`
