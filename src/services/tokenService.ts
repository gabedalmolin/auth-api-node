import { randomUUID, createHash, timingSafeEqual } from "node:crypto";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { z } from "zod";
import AppError from "../errors/AppError";
import { env } from "../config/env";
import { durationToMs } from "../utils/duration";

const accessPayloadSchema = z.object({
  sub: z.string().regex(/^\d+$/),
  sid: z.string().uuid(),
  typ: z.literal("access"),
  jti: z.string().uuid(),
});

const refreshPayloadSchema = z.object({
  sub: z.string().regex(/^\d+$/),
  sid: z.string().uuid(),
  typ: z.literal("refresh"),
  jti: z.string().uuid(),
});

export type TokenIdentity = {
  userId: number;
  sessionId: string;
  tokenJti: string;
};

type IssueTokenInput = {
  userId: number;
  sessionId: string;
};

const toTokenIdentity = (
  schema: typeof accessPayloadSchema | typeof refreshPayloadSchema,
  token: string,
  secret: string,
): TokenIdentity => {
  let decoded: JwtPayload | string;

  try {
    decoded = jwt.verify(token, secret, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    }) as JwtPayload;
  } catch {
    throw new AppError({
      message: "invalid token",
      code: "INVALID_TOKEN",
      statusCode: 401,
    });
  }

  const parsed = schema.safeParse(decoded);
  if (!parsed.success) {
    throw new AppError({
      message: "invalid token",
      code: "INVALID_TOKEN",
      statusCode: 401,
    });
  }

  return {
    userId: Number(parsed.data.sub),
    sessionId: parsed.data.sid,
    tokenJti: parsed.data.jti,
  };
};

const signToken = (
  payload: Record<string, string>,
  subject: string,
  secret: string,
  expiresIn: string,
): { token: string; tokenJti: string; expiresAt: Date } => {
  const tokenJti = randomUUID();
  const expiresInValue = expiresIn as NonNullable<SignOptions["expiresIn"]>;

  const options: SignOptions = {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    subject,
    jwtid: tokenJti,
    expiresIn: expiresInValue,
  };

  const token = jwt.sign(payload, secret, options);

  return {
    token,
    tokenJti,
    expiresAt: new Date(Date.now() + durationToMs(expiresIn)),
  };
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isSameHash(expectedHash: string, incomingHash: string): boolean {
  const expected = Buffer.from(expectedHash, "hex");
  const incoming = Buffer.from(incomingHash, "hex");

  if (expected.length !== incoming.length) {
    return false;
  }

  return timingSafeEqual(expected, incoming);
}

class TokenService {
  issueAccessToken({ userId, sessionId }: IssueTokenInput) {
    return signToken(
      {
        sid: sessionId,
        typ: "access",
      },
      String(userId),
      env.ACCESS_TOKEN_SECRET,
      env.ACCESS_TOKEN_EXPIRES_IN,
    );
  }

  issueRefreshToken({ userId, sessionId }: IssueTokenInput) {
    return signToken(
      {
        sid: sessionId,
        typ: "refresh",
      },
      String(userId),
      env.REFRESH_TOKEN_SECRET,
      env.REFRESH_TOKEN_EXPIRES_IN,
    );
  }

  verifyAccessToken(token: string): TokenIdentity {
    return toTokenIdentity(accessPayloadSchema, token, env.ACCESS_TOKEN_SECRET);
  }

  verifyRefreshToken(token: string): TokenIdentity {
    return toTokenIdentity(refreshPayloadSchema, token, env.REFRESH_TOKEN_SECRET);
  }
}

export default new TokenService();
