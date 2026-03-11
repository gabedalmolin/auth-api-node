process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://auth_user:auth_password@localhost:5432/auth_api";
process.env.ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET ??
  "test-access-secret-with-at-least-thirty-two-characters";
process.env.REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET ??
  "test-refresh-secret-with-at-least-thirty-two-characters";
process.env.ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN ?? "15m";
process.env.REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN ?? "7d";
process.env.JWT_ISSUER = process.env.JWT_ISSUER ?? "auth-api-test";
process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? "auth-api-test-clients";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
process.env.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS ?? "60000";
process.env.RATE_LIMIT_MAX_REQUESTS = process.env.RATE_LIMIT_MAX_REQUESTS ?? "100";
process.env.DOCS_ENABLED = process.env.DOCS_ENABLED ?? "true";
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS ?? "8";
