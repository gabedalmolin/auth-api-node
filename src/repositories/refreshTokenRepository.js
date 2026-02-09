const prisma = require("../config/prisma");

class RefreshTokenRepository {
  async create({ tokenHash, jti, userId, expiresAt }) {
    return prisma.refreshToken.create({
      data: { tokenHash, jti, userId, expiresAt },
    });
  }

  async findByJti(jti) {
    return prisma.refreshToken.findUnique({
      where: { jti },
    });
  }

  async revokeByJti(jti) {
    return prisma.refreshToken.updateMany({
      where: { jti },
      data: { revoked: true },
    });
  }

  async findActiveByUserId(userId) {
    return prisma.refreshToken.findMany({
      where: {
        userId,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      select: {
        jti: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async revokeByJtiAndUserId({ jti, userId }) {
    return prisma.refreshToken.updateMany({
      where: {
        jti,
        userId,
        revoked: false,
      },
      data: { revoked: true },
    });
  }

  async revokeAllByUserId(userId) {
    return prisma.refreshToken.updateMany({
      where: {
        userId,
        revoked: false,
      },
      data: { revoked: true },
    });
  }
}

module.exports = new RefreshTokenRepository();
