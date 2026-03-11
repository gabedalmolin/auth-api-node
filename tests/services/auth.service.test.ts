import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  loggerInfo,
  findByJti,
  markCompromised,
  markReused,
  revokeActiveBySessionId,
  findByIdWithUser,
  verifyRefreshToken,
} = vi.hoisted(() => ({
  loggerInfo: vi.fn(),
  findByJti: vi.fn(),
  markCompromised: vi.fn(),
  markReused: vi.fn(),
  revokeActiveBySessionId: vi.fn(),
  findByIdWithUser: vi.fn(),
  verifyRefreshToken: vi.fn(),
}));

vi.mock("../../src/logger", () => ({
  default: {
    info: loggerInfo,
  },
}));

vi.mock("../../src/repositories/refreshTokenRepository", () => ({
  default: {
    findByJti,
    markReused,
    revokeActiveBySessionId,
  },
}));

vi.mock("../../src/repositories/sessionRepository", () => ({
  default: {
    findByIdWithUser,
    markCompromised,
  },
}));

vi.mock("../../src/repositories/userRepository", () => ({
  default: {},
}));

vi.mock("../../src/services/passwordHasher", () => ({
  default: {},
}));

vi.mock("../../src/services/tokenService", () => ({
  default: {
    verifyRefreshToken,
  },
  hashToken: vi.fn(() => "incoming-hash"),
  isSameHash: vi.fn(() => true),
}));

import authService from "../../src/services/authService";

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
