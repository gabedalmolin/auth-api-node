import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import AppError from "../errors/AppError";

type ValidationTarget = "body" | "params";

export default function validate<TSchema extends ZodSchema>(
  schema: TSchema,
  target: ValidationTarget = "body",
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      next(
        new AppError({
          message: "invalid payload",
          code: "INVALID_PAYLOAD",
          statusCode: 400,
          details: result.error.issues.map((issue) => ({
            path: issue.path.join(".") || target,
            message: issue.message,
          })),
        }),
      );
      return;
    }

    req[target] = result.data;
    next();
  };
}
