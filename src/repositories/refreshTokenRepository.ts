import { type Prisma, RefreshTokenStatus } from "@prisma/client";
import prisma from "../config/prisma";

type CreateRefreshTokenInput = {
  sessionId: string;
  tokenHash: string;
  jti: string;
  expiresAt: Date;
  parentTokenId?: string;
};

type RefreshTokenDbClient = Prisma.TransactionClient | typeof prisma;

class RefreshTokenRepository {
  async create(data: CreateRefreshTokenInput, db: RefreshTokenDbClient = prisma) {
    return db.refreshToken.create({
      data,
    });
  }

  async findByJti(jti: string) {
    return prisma.refreshToken.findUnique({
      where: { jti },
    });
  }

  async markUsedIfActive(
    tokenId: string,
    usedAt: Date,
    replacedByTokenId: string,
    db: RefreshTokenDbClient = prisma,
  ) {
    const result = await db.refreshToken.updateMany({
      where: {
        id: tokenId,
        status: RefreshTokenStatus.ACTIVE,
        replacedByTokenId: null,
      },
      data: {
        status: RefreshTokenStatus.USED,
        usedAt,
        replacedByTokenId,
      },
    });

    return result.count === 1;
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
