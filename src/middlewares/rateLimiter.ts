import type { NextFunction, Request, Response } from "express";
import AppError from "../errors/AppError";
import { env } from "../config/env";
import { redisClient, redisEnabled } from "../config/redis";
import { authMetrics } from "../metrics/authMetrics";

type RateLimiterOptions = {
  bucket: string;
  maxRequests?: number;
  windowMs?: number;
  resolveKey: (req: Request) => string;
  memoryMaxKeys?: number;
};

type MemoryBucket = {
  count: number;
  expiresAt: number;
  updatedAt: number;
};

const memoryBuckets = new Map<string, MemoryBucket>();
const DEFAULT_MEMORY_MAX_KEYS = 10_000;

const pruneExpiredMemoryBuckets = (now: number): void => {
  for (const [key, bucket] of memoryBuckets.entries()) {
    if (now > bucket.expiresAt) {
      memoryBuckets.delete(key);
    }
  }
};

const evictOldestMemoryBucket = (): void => {
  let oldestKey: string | null = null;
  let oldestUpdatedAt = Number.POSITIVE_INFINITY;

  for (const [key, bucket] of memoryBuckets.entries()) {
    if (bucket.updatedAt < oldestUpdatedAt) {
      oldestUpdatedAt = bucket.updatedAt;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    memoryBuckets.delete(oldestKey);
  }
};

const consumeMemory = (
  key: string,
  windowMs: number,
  now: number,
  memoryMaxKeys: number,
): number => {
  if (!memoryBuckets.has(key) && memoryBuckets.size >= memoryMaxKeys) {
    pruneExpiredMemoryBuckets(now);

    if (!memoryBuckets.has(key) && memoryBuckets.size >= memoryMaxKeys) {
      evictOldestMemoryBucket();
    }
  }

  const current = memoryBuckets.get(key) ?? {
    count: 0,
    expiresAt: now + windowMs,
    updatedAt: now,
  };

  if (now > current.expiresAt) {
    current.count = 0;
    current.expiresAt = now + windowMs;
  }

  current.count += 1;
  current.updatedAt = now;
  memoryBuckets.set(key, current);

  return current.count;
};

const consumeRedis = async (key: string, windowMs: number): Promise<number> => {
  if (!redisClient) {
    throw new Error("redis unavailable");
  }

  if (redisClient.status === "wait") {
    await redisClient.connect();
  }

  const count = await redisClient.incr(key);

  if (count === 1) {
    await redisClient.pexpire(key, windowMs);
  }

  return count;
};

export function createRateLimiter({
  bucket,
  maxRequests = env.RATE_LIMIT_MAX_REQUESTS,
  windowMs = env.RATE_LIMIT_WINDOW_MS,
  resolveKey,
  memoryMaxKeys = DEFAULT_MEMORY_MAX_KEYS,
}: RateLimiterOptions) {
  return async function rateLimiter(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    const identity = resolveKey(req) || "global";
    const key = `rl:${bucket}:${identity}`;
    const now = Date.now();

    try {
      const count = redisEnabled
        ? await consumeRedis(key, windowMs)
        : consumeMemory(key, windowMs, now, memoryMaxKeys);

      if (count > maxRequests) {
        authMetrics.recordRateLimitHit(bucket, redisEnabled ? "redis" : "memory");
        throw new AppError({
          message: "too many requests",
          code: "TOO_MANY_REQUESTS",
          statusCode: 429,
        });
      }

      return next();
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }

      req.log.warn({ key, error }, "rate_limiter_fallback");

      const count = consumeMemory(key, windowMs, now, memoryMaxKeys);
      if (count > maxRequests) {
        authMetrics.recordRateLimitHit(bucket, "memory");
        return next(
          new AppError({
            message: "too many requests",
            code: "TOO_MANY_REQUESTS",
            statusCode: 429,
          }),
        );
      }

      return next();
    }
  };
}

export const authMutationRateLimiter = createRateLimiter({
  bucket: "auth",
  resolveKey: (req) => req.ip || "global",
});

// Test hooks for the in-memory fail-soft store.
export const __rateLimiterInternals = {
  clearMemoryBuckets(): void {
    memoryBuckets.clear();
  },
  getMemoryBucketCount(): number {
    return memoryBuckets.size;
  },
};
