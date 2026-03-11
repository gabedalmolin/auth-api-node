import type { Request, Response } from "express";
import {
  metricsContentType,
  metricsEnabled,
  renderMetrics,
} from "../metrics/authMetrics";

export async function metrics(_req: Request, res: Response) {
  if (!metricsEnabled) {
    return res.status(404).json({ message: "metrics disabled" });
  }

  res.setHeader("Content-Type", metricsContentType);
  res.setHeader("Cache-Control", "no-store");

  return res.status(200).send(await renderMetrics());
}
