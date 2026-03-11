import type { NextFunction, Request, Response } from "express";
import baseLogger from "../logger";

export default function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  req.log = baseLogger.child({ correlationId: req.correlationId });

  const startedAt = Date.now();
  res.on("finish", () => {
    req.log.info(
      {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      },
      "http_request",
    );
  });

  next();
}
