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
};

type MemoryBucket = {
  count: number;
  expiresAt: number;
};

const memoryBuckets = new Map<string, MemoryBucket>();

const consumeMemory = (key: string, windowMs: number, now: number): number => {
  const current = memoryBuckets.get(key) ?? {
    count: 0,
    expiresAt: now + windowMs,
  };

  if (now > current.expiresAt) {
    current.count = 0;
    current.expiresAt = now + windowMs;
  }

  current.count += 1;
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
        : consumeMemory(key, windowMs, now);

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

      const count = consumeMemory(key, windowMs, now);
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
