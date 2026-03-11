import { type Prisma, SessionStatus } from "@prisma/client";
import prisma from "../config/prisma";

type CreateSessionInput = {
  userId: number;
  userAgent: string | null;
  ipAddress: string | null;
};

type TouchActivityInput = {
  sessionId: string;
  lastSeenAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
};

type SessionDbClient = Prisma.TransactionClient | typeof prisma;

class SessionRepository {
  async create({ userId, userAgent, ipAddress }: CreateSessionInput) {
    return prisma.session.create({
      data: {
        userId,
        userAgent,
        ipAddress,
        lastSeenAt: new Date(),
      },
      include: {
        user: true,
      },
    });
  }

  async findById(sessionId: string) {
    return prisma.session.findUnique({
      where: { id: sessionId },
    });
  }

  async findByIdWithUser(sessionId: string) {
    return prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: true,
      },
    });
  }

  async findByIdForUser(sessionId: string, userId: number) {
    return prisma.session.findFirst({
      where: { id: sessionId, userId },
    });
  }

  async listByUserId(userId: number) {
    return prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async touchActivity({
    sessionId,
    lastSeenAt,
    userAgent,
    ipAddress,
  }: TouchActivityInput, db: SessionDbClient = prisma) {
    return db.session.update({
      where: { id: sessionId },
      data: {
        lastSeenAt,
        userAgent,
        ipAddress,
      },
    });
  }

  async markRevoked(sessionId: string, revokedAt: Date, revokeReason: string) {
    return prisma.session.updateMany({
      where: { id: sessionId, status: SessionStatus.ACTIVE },
      data: {
        status: SessionStatus.REVOKED,
        revokedAt,
        revokeReason,
      },
    });
  }

  async markCompromised(sessionId: string, compromisedAt: Date) {
    return prisma.session.updateMany({
      where: { id: sessionId, status: SessionStatus.ACTIVE },
      data: {
        status: SessionStatus.COMPROMISED,
        compromisedAt,
      },
    });
  }

  async revokeAllByUserId(userId: number, revokedAt: Date, revokeReason: string) {
    return prisma.session.updateMany({
      where: {
        userId,
        status: SessionStatus.ACTIVE,
      },
      data: {
        status: SessionStatus.REVOKED,
        revokedAt,
        revokeReason,
      },
    });
  }
}

export default new SessionRepository();
