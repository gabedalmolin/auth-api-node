import type { NextFunction, Request, Response } from "express";
import authService from "../services/authService";

const requestContext = (req: Request) => ({
  correlationId: req.correlationId,
  ipAddress: req.ip ?? null,
  userAgent: req.header("user-agent") ?? null,
});

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.register(req.body);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function createSession(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await authService.createSession({
      ...req.body,
      context: requestContext(req),
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function refreshSession(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await authService.refreshSession({
      ...req.body,
      context: requestContext(req),
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function revokeCurrentSession(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await authService.revokeCurrentSession({
      ...req.body,
      context: requestContext(req),
    });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.getMe(req.auth.userId, req.auth.sessionId);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function listSessions(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await authService.listSessions(
      req.auth.userId,
      req.auth.sessionId,
    );
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function revokeSession(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const sessionId = req.params.sessionId as string;
    await authService.revokeSession(
      req.auth.userId,
      sessionId,
      requestContext(req),
    );
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

export async function revokeAllSessions(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await authService.revokeAllSessions(req.auth.userId, requestContext(req));
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}
