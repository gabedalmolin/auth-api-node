import type { Request, Response } from "express";
import prisma from "../config/prisma";
import { pingRedis } from "../config/redis";
import { authMetrics } from "../metrics/authMetrics";

export async function health(_req: Request, res: Response) {
  return res.status(200).json({
    status: "ok",
    service: "auth-api",
    timestamp: new Date().toISOString(),
  });
}

export async function ready(_req: Request, res: Response) {
  const timestamp = new Date().toISOString();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const redis = await pingRedis();
    const isReady = redis === "up" || redis === "disabled";

    if (!isReady) {
      authMetrics.recordReadinessFailure("redis");
    }

    return res.status(isReady ? 200 : 503).json({
      status: isReady ? "ready" : "not_ready",
      service: "auth-api",
      dependencies: {
        database: "up",
        redis,
      },
      timestamp,
    });
  } catch {
    authMetrics.recordReadinessFailure("database");

    return res.status(503).json({
      status: "not_ready",
      service: "auth-api",
      dependencies: {
        database: "down",
        redis: "unknown",
      },
      timestamp,
    });
  }
}
