import { RefreshTokenStatus } from "@prisma/client";
import prisma from "../config/prisma";

type CreateRefreshTokenInput = {
  sessionId: string;
  tokenHash: string;
  jti: string;
  expiresAt: Date;
  parentTokenId?: string;
};

class RefreshTokenRepository {
  async create(data: CreateRefreshTokenInput) {
    return prisma.refreshToken.create({
      data,
    });
  }

  async findByJti(jti: string) {
    return prisma.refreshToken.findUnique({
      where: { jti },
    });
  }

  async markUsed(tokenId: string, usedAt: Date, replacedByTokenId: string) {
    return prisma.refreshToken.update({
      where: { id: tokenId },
      data: {
        status: RefreshTokenStatus.USED,
        usedAt,
        replacedByTokenId,
      },
    });
  }

  async markReused(tokenId: string, revokedAt: Date) {
    return prisma.refreshToken.updateMany({
      where: {
        id: tokenId,
        status: {
          in: [RefreshTokenStatus.ACTIVE, RefreshTokenStatus.USED],
        },
      },
      data: {
        status: RefreshTokenStatus.REUSED,
        revokedAt,
      },
    });
  }

  async revokeActiveBySessionId(sessionId: string, revokedAt: Date) {
    return prisma.refreshToken.updateMany({
      where: {
        sessionId,
        status: RefreshTokenStatus.ACTIVE,
      },
      data: {
        status: RefreshTokenStatus.REVOKED,
        revokedAt,
      },
    });
  }
}

export default new RefreshTokenRepository();
