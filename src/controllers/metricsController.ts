import type { Request, Response } from "express";
import {
  metricsContentType,
  metricsEnabled,
  renderMetrics,
} from "../metrics/authMetrics";
import { env } from "../config/env";
import { extractBearerToken } from "../utils/bearerToken";

export async function metrics(req: Request, res: Response) {
  if (!metricsEnabled) {
    return res.status(404).json({ message: "metrics disabled" });
  }

  if (
    env.METRICS_AUTH_TOKEN &&
    extractBearerToken(req.header("authorization")) !== env.METRICS_AUTH_TOKEN
  ) {
    return res.status(401).json({
      error: {
        code: "METRICS_AUTHORIZATION_REQUIRED",
        message: "metrics authorization is required",
        correlationId: req.correlationId,
      },
    });
  }

  res.setHeader("Content-Type", metricsContentType);
  res.setHeader("Cache-Control", "no-store");

  return res.status(200).send(await renderMetrics());
}
