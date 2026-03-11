import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export default function requestId(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incoming = req.header("x-correlation-id");
  const correlationId = incoming || randomUUID();

  req.correlationId = correlationId;
  res.setHeader("x-correlation-id", correlationId);

  next();
}
