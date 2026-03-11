import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  loggerInfo,
  prismaTransaction,
  findByEmail,
  createUser,
  hashPassword,
  findByJti,
  createRefreshToken,
  markUsedIfActive,
  markCompromised,
  markReused,
  revokeActiveBySessionId,
  findByIdWithUser,
  touchActivity,
  verifyRefreshToken,
  issueAccessToken,
  issueRefreshToken,
} = vi.hoisted(() => ({
  loggerInfo: vi.fn(),
  prismaTransaction: vi.fn(),
  findByEmail: vi.fn(),
  createUser: vi.fn(),
  hashPassword: vi.fn(),
  findByJti: vi.fn(),
  createRefreshToken: vi.fn(),
  markUsedIfActive: vi.fn(),
  markCompromised: vi.fn(),
  markReused: vi.fn(),
  revokeActiveBySessionId: vi.fn(),
  findByIdWithUser: vi.fn(),
  touchActivity: vi.fn(),
  verifyRefreshToken: vi.fn(),
  issueAccessToken: vi.fn(),
  issueRefreshToken: vi.fn(),
}));

vi.mock("../../src/logger", () => ({
  default: {
    info: loggerInfo,
  },
}));

vi.mock("../../src/config/prisma", () => ({
  default: {
    $transaction: prismaTransaction,
  },
}));

vi.mock("../../src/repositories/refreshTokenRepository", () => ({
  default: {
    create: createRefreshToken,
    findByJti,
    markUsedIfActive,
    markReused,
    revokeActiveBySessionId,
  },
}));

vi.mock("../../src/repositories/sessionRepository", () => ({
  default: {
    findByIdWithUser,
    markCompromised,
    touchActivity,
  },
}));

vi.mock("../../src/repositories/userRepository", () => ({
  default: {
    create: createUser,
    findByEmail,
  },
}));

vi.mock("../../src/services/passwordHasher", () => ({
  default: {
    hash: hashPassword,
  },
}));

vi.mock("../../src/services/tokenService", () => ({
  default: {
    issueAccessToken,
    issueRefreshToken,
    verifyRefreshToken,
  },
  hashToken: vi.fn(() => "incoming-hash"),
  isSameHash: vi.fn(() => true),
}));

import authService from "../../src/services/authService";

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaTransaction.mockImplementation(async (callback) => callback({}));
  });

  it("marks the session as compromised on refresh-token reuse", async () => {
    verifyRefreshToken.mockReturnValue({
      userId: 5,
      sessionId: "5ad5e0a8-9f9e-4fdf-abcd-f3c22c627a1a",
      tokenJti: "38ba5c52-c765-4fdb-8f8d-95ddce3e0f78",
    });
    findByJti.mockResolvedValue({
      id: "token-id",
      sessionId: "5ad5e0a8-9f9e-4fdf-abcd-f3c22c627a1a",
      status: "USED",
      tokenHash: "incoming-hash",
      expiresAt: new Date(Date.now() + 60_000),
    });
    findByIdWithUser.mockResolvedValue({
      id: "5ad5e0a8-9f9e-4fdf-abcd-f3c22c627a1a",
      userId: 5,
      status: "ACTIVE",
      user: {
        id: 5,
        name: "Gabri",
        email: "gabri@test.dev",
        createdAt: new Date(),
      },
    });

    await expect(
      authService.refreshSession({
        refreshToken: "reused-token",
        context: {
          correlationId: "corr-1",
          ipAddress: "127.0.0.1",
          userAgent: "vitest",
        },
      }),
    ).rejects.toMatchObject({
      code: "REFRESH_TOKEN_REUSED",
    });

    expect(markCompromised).toHaveBeenCalled();
    expect(markReused).toHaveBeenCalled();
    expect(revokeActiveBySessionId).toHaveBeenCalled();
  });

  it("compromises the session when refresh rotation loses a concurrent consume race", async () => {
    verifyRefreshToken.mockReturnValue({
      userId: 5,
      sessionId: "5ad5e0a8-9f9e-4fdf-abcd-f3c22c627a1a",
      tokenJti: "38ba5c52-c765-4fdb-8f8d-95ddce3e0f78",
    });
    findByJti.mockResolvedValue({
      id: "token-id",
      sessionId: "5ad5e0a8-9f9e-4fdf-abcd-f3c22c627a1a",
      status: "ACTIVE",
      tokenHash: "incoming-hash",
      expiresAt: new Date(Date.now() + 60_000),
    });
    findByIdWithUser.mockResolvedValue({
      id: "5ad5e0a8-9f9e-4fdf-abcd-f3c22c627a1a",
      userId: 5,
      status: "ACTIVE",
      user: {
        id: 5,
        name: "Gabri",
        email: "gabri@test.dev",
        createdAt: new Date(),
      },
    });
    issueAccessToken.mockReturnValue({
      token: "access-token",
      tokenJti: "4d1de2ba-239f-4cf5-8608-d065c3ee12cd",
      expiresAt: new Date(Date.now() + 60_000),
    });
    issueRefreshToken.mockReturnValue({
      token: "refresh-token-next",
      tokenJti: "8d17554c-f225-41ca-9376-c324f56ff4bf",
      expiresAt: new Date(Date.now() + 120_000),
    });
    createRefreshToken.mockResolvedValue({
      id: "token-next",
    });
    markUsedIfActive.mockResolvedValue(false);

    await expect(
      authService.refreshSession({
        refreshToken: "current-refresh-token",
        context: {
          correlationId: "corr-2",
          ipAddress: "127.0.0.1",
          userAgent: "vitest",
        },
      }),
    ).rejects.toMatchObject({
      code: "REFRESH_TOKEN_REUSED",
    });

    expect(prismaTransaction).toHaveBeenCalled();
    expect(createRefreshToken).toHaveBeenCalled();
    expect(markUsedIfActive).toHaveBeenCalledWith(
      "token-id",
      expect.any(Date),
      "token-next",
      expect.any(Object),
    );
    expect(touchActivity).not.toHaveBeenCalled();
    expect(markCompromised).toHaveBeenCalled();
    expect(markReused).toHaveBeenCalledWith("token-id", expect.any(Date));
    expect(revokeActiveBySessionId).toHaveBeenCalledWith(
      "5ad5e0a8-9f9e-4fdf-abcd-f3c22c627a1a",
      expect.any(Date),
    );
  });

  it("maps a concurrent duplicate registration to a conflict error", async () => {
    findByEmail.mockResolvedValue(null);
    hashPassword.mockResolvedValue("hashed-password");
    createUser.mockRejectedValue({
      code: "P2002",
      meta: {
        target: ["email"],
      },
    });

    await expect(
      authService.register({
        name: "Gabri",
        email: "gabri@test.dev",
        password: "strong-pass-123",
      }),
    ).rejects.toMatchObject({
      code: "USER_ALREADY_EXISTS",
      statusCode: 409,
    });
  });
});
