const mockReq = (ip = "127.0.0.1") => ({ ip });
const mockRes = () => ({});
const mockNext = () => vi.fn();

const RATE_LIMITER_PATH = require.resolve("../../src/middlewares/rateLimiter");
const REDIS_CONFIG_PATH = require.resolve("../../src/config/redis");

const loadRateLimiter = ({ resetRedis = false } = {}) => {
  if (resetRedis) {
    delete require.cache[REDIS_CONFIG_PATH];
  }
  delete require.cache[RATE_LIMITER_PATH];
  return require("../../src/middlewares/rateLimiter");
};

const loadRedisConfig = () => require("../../src/config/redis");

const waitForRedisReady = async (redisClient) => {
  if (!redisClient) throw new Error("redisClient não inicializado");
  if (redisClient.status === "ready") return;

  await new Promise((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = (err) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      redisClient.off("ready", onReady);
      redisClient.off("error", onError);
    };

    redisClient.once("ready", onReady);
    redisClient.once("error", onError);
  });
};

describe("rateLimiter middleware", () => {
  const originalRedisUrl = process.env.REDIS_URL;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    process.env.RATE_LIMIT_WINDOW_MS = "60000";
    process.env.RATE_LIMIT_MAX_REQUESTS = "2";
  });

  afterEach(async () => {
    const redisModule = require.cache[REDIS_CONFIG_PATH]?.exports;
    if (redisModule?.closeRedisConnection) {
      await redisModule.closeRedisConnection();
    }
  });

  afterAll(() => {
    process.env.REDIS_URL = originalRedisUrl;
  });

  it("allows request with memory strategy when redis is disabled", async () => {
    process.env.REDIS_URL = "";
    const rateLimiter = loadRateLimiter({ resetRedis: true });
    const next = mockNext();

    await rateLimiter(mockReq("10.10.0.1"), mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it("blocks request when memory strategy exceeds limit", async () => {
    process.env.REDIS_URL = "";
    process.env.RATE_LIMIT_MAX_REQUESTS = "1";

    const rateLimiter = loadRateLimiter({ resetRedis: true });
    const req = mockReq("10.10.0.2");
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
    process.env.REDIS_URL = originalRedisUrl || "redis://localhost:6379";

    const rateLimiter = loadRateLimiter({ resetRedis: true });
    const { redisClient } = loadRedisConfig();

    const ip = `10.10.0.3-${Date.now()}`;
    const key = `rl:${ip}`;
    const next = mockNext();

    await waitForRedisReady(redisClient);
    await rateLimiter(mockReq(ip), mockRes(), next);

    const count = await redisClient.get(key);
    const ttl = await redisClient.pttl(key);

    expect(count).toBe("1");
    expect(ttl).toBeGreaterThan(0);
    expect(next).toHaveBeenCalledWith();
  });

  it("falls back to memory when redis throws and still allows within limit", async () => {
    process.env.REDIS_URL = originalRedisUrl || "redis://localhost:6379";

    const rateLimiter = loadRateLimiter({ resetRedis: true });
    const { redisClient } = loadRedisConfig();
    vi.spyOn(redisClient, "incr").mockRejectedValue(new Error("redis down"));
    const next = mockNext();

    await rateLimiter(mockReq("10.10.0.4"), mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });
});
