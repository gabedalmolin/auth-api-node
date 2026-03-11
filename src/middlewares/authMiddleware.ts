import type { NextFunction, Request, Response } from "express";
import { SessionStatus } from "@prisma/client";
import AppError from "../errors/AppError";
import tokenService from "../services/tokenService";
import sessionRepository from "../repositories/sessionRepository";

export default async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const authorization = req.header("authorization");

  if (!authorization) {
    return next(
      new AppError({
        message: "authorization header is required",
        code: "AUTHORIZATION_REQUIRED",
        statusCode: 401,
      }),
    );
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];
  if (!token) {
    return next(
      new AppError({
        message: "authorization header must use Bearer token",
        code: "INVALID_AUTHORIZATION_HEADER",
        statusCode: 401,
      }),
    );
  }

  try {
    const identity = tokenService.verifyAccessToken(token);
    const session = await sessionRepository.findById(identity.sessionId);

    if (!session || session.userId !== identity.userId) {
      throw new AppError({
        message: "session not found",
        code: "SESSION_NOT_FOUND",
        statusCode: 401,
      });
    }

    if (session.status !== SessionStatus.ACTIVE) {
      throw new AppError({
        message: "session is not active",
        code: "SESSION_NOT_ACTIVE",
        statusCode: 401,
      });
    }

    req.auth = identity;
    req.log = req.log.child({
      userId: identity.userId,
      sessionId: identity.sessionId,
    });

    return next();
  } catch (error) {
    return next(error);
  }
}
