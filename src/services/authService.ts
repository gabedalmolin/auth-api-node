import { SessionStatus, RefreshTokenStatus } from "@prisma/client";
import prisma from "../config/prisma";
import logger from "../logger";
import AppError from "../errors/AppError";
import passwordHasher from "./passwordHasher";
import tokenService, { hashToken, isSameHash } from "./tokenService";
import userRepository from "../repositories/userRepository";
import sessionRepository from "../repositories/sessionRepository";
import refreshTokenRepository from "../repositories/refreshTokenRepository";

type RequestContext = {
  correlationId: string;
  ipAddress: string | null;
  userAgent: string | null;
};

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

type CreateSessionInput = {
  email: string;
  password: string;
  context: RequestContext;
};

type RefreshSessionInput = {
  refreshToken: string;
  context: RequestContext;
};

type RevokeCurrentSessionInput = {
  refreshToken: string;
  context: RequestContext;
};

class RefreshRotationConflictError extends Error {}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isUniqueConstraintError = (error: unknown, field: string): boolean => {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  if (error.code !== "P2002" || !("meta" in error)) {
    return false;
  }

  const meta = error.meta;
  if (!meta || typeof meta !== "object" || !("target" in meta)) {
    return false;
  }

  return Array.isArray(meta.target) && meta.target.includes(field);
};

const serializeUser = (user: {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt.toISOString(),
});

const serializeSession = (session: {
  id: string;
  status: SessionStatus;
  createdAt: Date;
  lastSeenAt: Date | null;
  userAgent: string | null;
  ipAddress: string | null;
}, current: boolean) => ({
  sessionId: session.id,
  status: session.status,
  createdAt: session.createdAt.toISOString(),
  lastSeenAt: session.lastSeenAt ? session.lastSeenAt.toISOString() : null,
  userAgent: session.userAgent ?? null,
  ipAddress: session.ipAddress ?? null,
  current,
});

class AuthService {
  private audit(event: string, context: RequestContext, data: Record<string, unknown>) {
    logger.info(
      {
        event,
        correlationId: context.correlationId,
        ...data,
      },
      "auth_audit",
    );
  }

  private async createTokenPair(userId: number, sessionId: string, parentTokenId?: string) {
    const accessToken = tokenService.issueAccessToken({ userId, sessionId });
    const refreshToken = tokenService.issueRefreshToken({ userId, sessionId });

    const storedRefreshToken = await refreshTokenRepository.create({
      sessionId,
      tokenHash: hashToken(refreshToken.token),
      jti: refreshToken.tokenJti,
      expiresAt: refreshToken.expiresAt,
      ...(parentTokenId ? { parentTokenId } : {}),
    });

    return {
      accessToken: accessToken.token,
      refreshToken: refreshToken.token,
      storedRefreshToken,
    };
  }

  private issueTokenPair(userId: number, sessionId: string) {
    const accessToken = tokenService.issueAccessToken({ userId, sessionId });
    const refreshToken = tokenService.issueRefreshToken({ userId, sessionId });

    return {
      accessToken: accessToken.token,
      refreshToken: refreshToken.token,
      refreshTokenJti: refreshToken.tokenJti,
      refreshTokenExpiresAt: refreshToken.expiresAt,
    };
  }

  private async compromiseSession(
    sessionId: string,
    tokenId: string,
    context: RequestContext,
  ): Promise<never> {
    const compromisedAt = new Date();

    await sessionRepository.markCompromised(sessionId, compromisedAt);
    await refreshTokenRepository.markReused(tokenId, compromisedAt);
    await refreshTokenRepository.revokeActiveBySessionId(sessionId, compromisedAt);

    this.audit("auth.refresh.reuse_detected", context, { sessionId, tokenId });

    throw new AppError({
      message: "refresh token reuse detected",
      code: "REFRESH_TOKEN_REUSED",
      statusCode: 401,
    });
  }

  async register({ name, email, password }: RegisterInput) {
    const normalizedEmail = normalizeEmail(email);
    const existingUser = await userRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new AppError({
        message: "user already exists",
        code: "USER_ALREADY_EXISTS",
        statusCode: 409,
      });
    }

    const passwordHash = await passwordHasher.hash(password);
    const user = await userRepository.create({
      name,
      email: normalizedEmail,
      passwordHash,
    }).catch((error: unknown) => {
      if (isUniqueConstraintError(error, "email")) {
        throw new AppError({
          message: "user already exists",
          code: "USER_ALREADY_EXISTS",
          statusCode: 409,
        });
      }

      throw error;
    });

    return {
      user: serializeUser(user),
    };
  }

  async createSession({ email, password, context }: CreateSessionInput) {
    const normalizedEmail = normalizeEmail(email);
    const user = await userRepository.findByEmail(normalizedEmail);

    if (!user) {
      this.audit("auth.login.failed", context, { email: normalizedEmail });
      throw new AppError({
        message: "invalid credentials",
        code: "INVALID_CREDENTIALS",
        statusCode: 401,
      });
    }

    const passwordMatches = await passwordHasher.verify(password, user.passwordHash);
    if (!passwordMatches) {
      this.audit("auth.login.failed", context, { email: normalizedEmail, userId: user.id });
      throw new AppError({
        message: "invalid credentials",
        code: "INVALID_CREDENTIALS",
        statusCode: 401,
      });
    }

    const session = await sessionRepository.create({
      userId: user.id,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
    });

    const tokens = await this.createTokenPair(user.id, session.id);

    this.audit("auth.login.succeeded", context, {
      userId: user.id,
      sessionId: session.id,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: serializeUser(session.user),
      session: serializeSession(session, true),
    };
  }

  async refreshSession({ refreshToken, context }: RefreshSessionInput) {
    const identity = tokenService.verifyRefreshToken(refreshToken);
    const storedToken = await refreshTokenRepository.findByJti(identity.tokenJti);

    if (!storedToken || storedToken.sessionId !== identity.sessionId) {
      throw new AppError({
        message: "invalid refresh token",
        code: "INVALID_REFRESH_TOKEN",
        statusCode: 401,
      });
    }

    const session = await sessionRepository.findByIdWithUser(identity.sessionId);
    if (!session || session.userId !== identity.userId) {
      throw new AppError({
        message: "invalid refresh token",
        code: "INVALID_REFRESH_TOKEN",
        statusCode: 401,
      });
    }

    if (session.status === SessionStatus.COMPROMISED) {
      throw new AppError({
        message: "session compromised",
        code: "SESSION_COMPROMISED",
        statusCode: 401,
      });
    }

    if (session.status !== SessionStatus.ACTIVE) {
      throw new AppError({
        message: "session revoked",
        code: "SESSION_REVOKED",
        statusCode: 401,
      });
    }

    if (storedToken.status !== RefreshTokenStatus.ACTIVE) {
      return this.compromiseSession(session.id, storedToken.id, context);
    }

    if (storedToken.expiresAt <= new Date()) {
      throw new AppError({
        message: "refresh token expired",
        code: "REFRESH_TOKEN_EXPIRED",
        statusCode: 401,
      });
    }

    const incomingHash = hashToken(refreshToken);
    if (!isSameHash(storedToken.tokenHash, incomingHash)) {
      return this.compromiseSession(session.id, storedToken.id, context);
    }

    const now = new Date();
    const tokens = this.issueTokenPair(identity.userId, session.id);

    const updatedSession = await prisma.$transaction(async (tx) => {
      const storedRefreshToken = await refreshTokenRepository.create(
        {
          sessionId: session.id,
          tokenHash: hashToken(tokens.refreshToken),
          jti: tokens.refreshTokenJti,
          expiresAt: tokens.refreshTokenExpiresAt,
          parentTokenId: storedToken.id,
        },
        tx,
      );

      const wasConsumed = await refreshTokenRepository.markUsedIfActive(
        storedToken.id,
        now,
        storedRefreshToken.id,
        tx,
      );

      if (!wasConsumed) {
        throw new RefreshRotationConflictError();
      }

      return sessionRepository.touchActivity(
        {
          sessionId: session.id,
          lastSeenAt: now,
          userAgent: context.userAgent,
          ipAddress: context.ipAddress,
        },
        tx,
      );
    }).catch((error: unknown) => {
      if (error instanceof RefreshRotationConflictError) {
        return this.compromiseSession(session.id, storedToken.id, context);
      }

      throw error;
    });

    this.audit("auth.refresh.succeeded", context, {
      userId: identity.userId,
      sessionId: session.id,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: serializeUser(session.user),
      session: serializeSession(updatedSession, true),
    };
  }

  async revokeCurrentSession({
    refreshToken,
    context,
  }: RevokeCurrentSessionInput): Promise<void> {
    const identity = tokenService.verifyRefreshToken(refreshToken);
    const storedToken = await refreshTokenRepository.findByJti(identity.tokenJti);

    if (!storedToken || storedToken.sessionId !== identity.sessionId) {
      throw new AppError({
        message: "invalid refresh token",
        code: "INVALID_REFRESH_TOKEN",
        statusCode: 401,
      });
    }

    if (storedToken.status !== RefreshTokenStatus.ACTIVE) {
      return this.compromiseSession(identity.sessionId, storedToken.id, context);
    }

    if (!isSameHash(storedToken.tokenHash, hashToken(refreshToken))) {
      return this.compromiseSession(identity.sessionId, storedToken.id, context);
    }

    const now = new Date();
    await sessionRepository.markRevoked(identity.sessionId, now, "USER_REVOKED_CURRENT_SESSION");
    await refreshTokenRepository.revokeActiveBySessionId(identity.sessionId, now);

    this.audit("auth.session.revoked_current", context, {
      userId: identity.userId,
      sessionId: identity.sessionId,
    });
  }

  async getMe(userId: number, currentSessionId: string) {
    const user = await userRepository.findById(userId);
    const session = await sessionRepository.findById(currentSessionId);

    if (!user || !session) {
      throw new AppError({
        message: "authenticated context not found",
        code: "AUTH_CONTEXT_NOT_FOUND",
        statusCode: 404,
      });
    }

    return {
      user: serializeUser(user),
      session: serializeSession(session, true),
    };
  }

  async listSessions(userId: number, currentSessionId: string) {
    const sessions = await sessionRepository.listByUserId(userId);
    return {
      sessions: sessions.map((session) =>
        serializeSession(session, session.id === currentSessionId),
      ),
    };
  }

  async revokeSession(userId: number, sessionId: string, context: RequestContext) {
    const session = await sessionRepository.findByIdForUser(sessionId, userId);
    if (!session) {
      throw new AppError({
        message: "session not found",
        code: "SESSION_NOT_FOUND",
        statusCode: 404,
      });
    }

    const now = new Date();
    await sessionRepository.markRevoked(sessionId, now, "USER_REVOKED_SESSION");
    await refreshTokenRepository.revokeActiveBySessionId(sessionId, now);

    this.audit("auth.session.revoked", context, {
      userId,
      sessionId,
    });
  }

  async revokeAllSessions(userId: number, context: RequestContext) {
    const now = new Date();
    const sessions = await sessionRepository.listByUserId(userId);

    await sessionRepository.revokeAllByUserId(userId, now, "USER_REVOKED_ALL_SESSIONS");
    await Promise.all(
      sessions.map((session) =>
        refreshTokenRepository.revokeActiveBySessionId(session.id, now),
      ),
    );

    this.audit("auth.session.revoked_all", context, {
      userId,
      affectedSessions: sessions.length,
    });
  }
}

export default new AuthService();
