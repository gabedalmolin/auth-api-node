import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyAccessToken, findById } = vi.hoisted(() => ({
  verifyAccessToken: vi.fn(),
  findById: vi.fn(),
}));

vi.mock("../../src/services/tokenService", () => ({
  default: {
    verifyAccessToken,
  },
}));

vi.mock("../../src/repositories/sessionRepository", () => ({
  default: {
    findById,
  },
}));

import authMiddleware from "../../src/middlewares/authMiddleware";

const createRequest = (authorization?: string) =>
  ({
    header: vi.fn((name: string) =>
      name.toLowerCase() === "authorization" ? authorization : undefined,
    ),
    log: {
      child: vi.fn(() => ({ child: vi.fn() })),
    },
  }) as never;

describe("authMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects missing authorization header", async () => {
    const next = vi.fn();

    await authMiddleware(createRequest(), {} as never, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0]?.[0]?.code).toBe("AUTHORIZATION_REQUIRED");
  });

  it("rejects when session is not active", async () => {
    verifyAccessToken.mockReturnValue({
      userId: 1,
      sessionId: "71f0d278-4406-4530-b0e0-377fcb7061b6",
      tokenJti: "7fa8fb7c-d11e-4b31-a736-fb70b70c411d",
    });
    findById.mockResolvedValue({
      id: "71f0d278-4406-4530-b0e0-377fcb7061b6",
      userId: 1,
      status: "REVOKED",
    });

    const next = vi.fn();
    await authMiddleware(
      createRequest("Bearer valid-token"),
      {} as never,
      next,
    );

    expect(next.mock.calls[0]?.[0]?.code).toBe("SESSION_NOT_ACTIVE");
  });
});
