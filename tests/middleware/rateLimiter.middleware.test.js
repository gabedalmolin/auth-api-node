const mockReq = (ip = "127.0.0.1") => ({ ip });
const mockRes = () => ({});
const mockNext = () => jest.fn();

describe("rateLimiter middleware", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.RATE_LIMIT_WINDOW_MS = "60000";
    process.env.RATE_LIMIT_MAX_REQUESTS = "2";
  });

  it("allows request with memory strategy when redis is disabled", async () => {
    jest.doMock("../../src/config/redis", () => ({
      redisEnabled: false,
      redisClient: null,
    }));

    const rateLimiter = require("../../src/middlewares/rateLimiter");
    const next = mockNext();

    await rateLimiter(mockReq(), mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it("blocks request when memory strategy exceeds limit", async () => {
    process.env.RATE_LIMIT_MAX_REQUESTS = "1";

    jest.doMock("../../src/config/redis", () => ({
      redisEnabled: false,
      redisClient: null,
    }));

    const rateLimiter = require("../../src/middlewares/rateLimiter");
    const req = mockReq("10.0.0.1");
    const next1 = mockNext();
    const next2 = mockNext();

    await rateLimiter(req, mockRes(), next1);
    await rateLimiter(req, mockRes(), next2);

    expect(next2).toHaveBeenCalledTimes(1);
    const err = next2.mock.calls[0][0];
    expect(err).toBeTruthy();
    expect(err.message).toBe("too many requests");
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe("TOO_MANY_REQUESTS");
  });

  it("uses redis strategy and sets expiration on first hit", async () => {
    const incr = jest.fn().mockResolvedValue(1);
    const pexpire = jest.fn().mockResolvedValue(1);

    jest.doMock("../../src/config/redis", () => ({
      redisEnabled: true,
      redisClient: { incr, pexpire },
    }));

    const rateLimiter = require("../../src/middlewares/rateLimiter");
    const next = mockNext();

    await rateLimiter(mockReq("10.0.0.2"), mockRes(), next);

    expect(incr).toHaveBeenCalled();
    expect(pexpire).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it("falls back to memory when redis throws and still allows within limit", async () => {
    const incr = jest.fn().mockRejectedValue(new Error("redis down"));

    jest.doMock("../../src/config/redis", () => ({
      redisEnabled: true,
      redisClient: { incr, pexpire: jest.fn() },
    }));

    const rateLimiter = require("../../src/middlewares/rateLimiter");
    const next = mockNext();

    await rateLimiter(mockReq("10.0.0.3"), mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });
});
