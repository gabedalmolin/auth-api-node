import { beforeEach, describe, expect, it, vi } from "vitest";

const { recordRateLimitHit } = vi.hoisted(() => ({
  recordRateLimitHit: vi.fn(),
}));

const loadRateLimiter = async (options: {
  redisEnabled: boolean;
  incr?: () => Promise<number>;
  pexpire?: () => Promise<number>;
  connect?: () => Promise<void>;
}) => {
  vi.resetModules();

  const redisClient =
    options.redisEnabled
      ? ({
          status: "ready",
          incr: vi.fn(options.incr ?? (() => Promise.resolve(1))),
          pexpire: vi.fn(options.pexpire ?? (() => Promise.resolve(1))),
          connect: vi.fn(options.connect ?? (() => Promise.resolve())),
        } as const)
      : null;

  vi.doMock("../../src/config/redis", () => ({
    redisEnabled: options.redisEnabled,
    redisClient,
  }));

  vi.doMock("../../src/metrics/authMetrics", () => ({
    authMetrics: {
      recordRateLimitHit,
    },
  }));

  return import("../../src/middlewares/rateLimiter");
};

describe("rateLimiter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks after exceeding the memory fallback limit", async () => {
    const { createRateLimiter } = await loadRateLimiter({ redisEnabled: false });
    const limiter = createRateLimiter({
      bucket: "test",
      maxRequests: 1,
      windowMs: 60_000,
      resolveKey: (req) => req.ip || "global",
    });

    const req = { ip: "10.10.0.1", log: { warn: vi.fn() } } as never;
    const nextOne = vi.fn();
    const nextTwo = vi.fn();

    await limiter(req, {} as never, nextOne);
    await limiter(req, {} as never, nextTwo);

    expect(nextOne).toHaveBeenCalledWith();
    expect(nextTwo.mock.calls[0]?.[0]?.code).toBe("TOO_MANY_REQUESTS");
    expect(recordRateLimitHit).toHaveBeenCalledWith("test", "memory");
  });

  it("falls back to memory when redis errors", async () => {
    const { createRateLimiter } = await loadRateLimiter({
      redisEnabled: true,
      incr: () => Promise.reject(new Error("redis down")),
    });
    const limiter = createRateLimiter({
      bucket: "test",
      maxRequests: 2,
      windowMs: 60_000,
      resolveKey: (req) => req.ip || "global",
    });

    const warn = vi.fn();
    const req = {
      ip: "10.10.0.2",
      log: { warn },
    } as unknown as Parameters<typeof limiter>[0];
    const next = vi.fn();

    await limiter(req, {} as never, next);

    expect(next).toHaveBeenCalledWith();
    expect(warn).toHaveBeenCalled();
  });

  it("records a rate-limit hit when redis-backed limiting blocks", async () => {
    const { createRateLimiter } = await loadRateLimiter({
      redisEnabled: true,
      incr: (() => {
        let count = 1;

        return () => Promise.resolve(count++);
      })(),
    });
    const limiter = createRateLimiter({
      bucket: "auth",
      maxRequests: 1,
      windowMs: 60_000,
      resolveKey: (req) => req.ip || "global",
    });

    const req = {
      ip: "10.10.0.3",
      log: { warn: vi.fn() },
    } as unknown as Parameters<typeof limiter>[0];

    await limiter(req, {} as never, vi.fn());
    const blocked = vi.fn();
    await limiter(req, {} as never, blocked);

    expect(blocked.mock.calls[0]?.[0]?.code).toBe("TOO_MANY_REQUESTS");
    expect(recordRateLimitHit).toHaveBeenCalledWith("auth", "redis");
  });
});
