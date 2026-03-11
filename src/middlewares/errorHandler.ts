import type { NextFunction, Request, Response } from "express";
import AppError from "../errors/AppError";

export default function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): Response {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        correlationId: req.correlationId,
      },
    });
  }

  req.log.error({ error }, "unhandled_error");

  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "internal server error",
      correlationId: req.correlationId,
    },
  });
}
