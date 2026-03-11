import { beforeEach, describe, expect, it, vi } from "vitest";

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
});
