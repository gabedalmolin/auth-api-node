import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

describe("env config", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("parses valid env and applies defaults", async () => {
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = "postgresql://auth_user:auth_password@localhost:5432/auth_api";
    process.env.ACCESS_TOKEN_SECRET = "test-access-secret-with-at-least-thirty-two-characters";
    process.env.REFRESH_TOKEN_SECRET =
      "test-refresh-secret-with-at-least-thirty-two-characters";
    delete process.env.LOG_LEVEL;

    const { env } = await import("../../src/config/env");

    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe("silent");
    expect(env.DOCS_ENABLED).toBe(true);
    expect(env.METRICS_ENABLED).toBe(false);
    expect(env.METRICS_AUTH_TOKEN).toBeUndefined();
  });

  it("fails fast when secrets are invalid", async () => {
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = "postgresql://auth_user:auth_password@localhost:5432/auth_api";
    process.env.ACCESS_TOKEN_SECRET = "short";
    process.env.REFRESH_TOKEN_SECRET = "also-short";

    await expect(import("../../src/config/env")).rejects.toThrow(
      /ACCESS_TOKEN_SECRET|REFRESH_TOKEN_SECRET/,
    );
  });

  it("fails fast when token durations use an unsupported format", async () => {
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = "postgresql://auth_user:auth_password@localhost:5432/auth_api";
    process.env.ACCESS_TOKEN_SECRET = "test-access-secret-with-at-least-thirty-two-characters";
    process.env.REFRESH_TOKEN_SECRET =
      "test-refresh-secret-with-at-least-thirty-two-characters";
    process.env.ACCESS_TOKEN_EXPIRES_IN = "15 minutes";

    await expect(import("../../src/config/env")).rejects.toThrow(
      /ACCESS_TOKEN_EXPIRES_IN/,
    );
  });
});
