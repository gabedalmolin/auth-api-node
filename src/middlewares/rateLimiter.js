const AppError = require("../errors/AppError");
const { redisClient, redisEnabled } = require("../config/redis.ts");

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100);

// Fallback local para quando Redis não estiver configurado/disponível
const memoryBuckets = new Map();

const consumeMemory = (key, now) => {
  const bucket = memoryBuckets.get(key) || {
    count: 0,
    expiresAt: now + windowMs,
  };

  if (now > bucket.expiresAt) {
    bucket.count = 0;
    bucket.expiresAt = now + windowMs;
  }

  bucket.count += 1;
  memoryBuckets.set(key, bucket);

  return bucket.count;
};

const consumeRedis = async (key) => {
  const count = await redisClient.incr(key);

  if (count === 1) {
    await redisClient.pexpire(key, windowMs);
  }

  return count;
};

module.exports = async (req, _res, next) => {
  const key = `rl:${req.ip || "global"}`;
  const now = Date.now();

  try {
    const count = redisEnabled
      ? await consumeRedis(key)
      : consumeMemory(key, now);

    if (count > maxRequests) {
      return next(new AppError("too many requests", 429, "TOO_MANY_REQUESTS"));
    }

    return next();
  } catch {
    // Fail-soft: se Redis falhar, usa memória para não derrubar a API
    const count = consumeMemory(key, now);

    if (count > maxRequests) {
      return next(new AppError("too many requests", 429, "TOO_MANY_REQUESTS"));
    }

    return next();
  }
};
