const { createHash } = require("node:crypto");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userRepository = require("../../src/repositories/userRepository");
const refreshTokenRepository = require("../../src/repositories/refreshTokenRepository");
const authService = require("../../src/services/authService");

const hashToken = (token) => createHash("sha256").update(token).digest("hex");

bcrypt.hash = vi.fn();
bcrypt.compare = vi.fn();

jwt.sign = vi.fn();
jwt.verify = vi.fn();

userRepository.findByEmail = vi.fn();
userRepository.create = vi.fn();

refreshTokenRepository.create = vi.fn();
refreshTokenRepository.findByJti = vi.fn();
refreshTokenRepository.revokeByJti = vi.fn();
refreshTokenRepository.findActiveByUserId = vi.fn();
refreshTokenRepository.revokeByJtiAndUserId = vi.fn();
refreshTokenRepository.revokeAllByUserId = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AuthService (unit)", () => {
  describe("register", () => {
    it("throws USER_ALREADY_EXISTS when email already exists", async () => {
      userRepository.findByEmail.mockResolvedValue({ id: 1 });

      await expect(
        authService.register({
          name: "John",
          email: "john@test.com",
          password: "123456",
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        code: "USER_ALREADY_EXISTS",
      });
    });

    it("creates user with normalized email and hashed password", async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue("hashed-pass");
      userRepository.create.mockResolvedValue({
        id: 1,
        name: "John",
        email: "john@test.com",
        password: "hashed-pass",
      });

      const result = await authService.register({
        name: "John",
        email: "  John@Test.com  ",
        password: "123456",
      });

      expect(userRepository.findByEmail).toHaveBeenCalledWith("john@test.com");
      expect(bcrypt.hash).toHaveBeenCalledWith("123456", 8);
      expect(userRepository.create).toHaveBeenCalledWith({
        name: "John",
        email: "john@test.com",
        password: "hashed-pass",
      });
      expect(result).toEqual({
        id: 1,
        name: "John",
        email: "john@test.com",
      });
    });
  });

  describe("login", () => {
    it("throws INVALID_CREDENTIALS when user does not exist", async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: "john@test.com", password: "123456" }),
      ).rejects.toMatchObject({
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
      });
    });

    it("throws INVALID_CREDENTIALS when password is invalid", async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: 1,
        email: "john@test.com",
        password: "hashed",
      });
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        authService.login({ email: "john@test.com", password: "wrong" }),
      ).rejects.toMatchObject({
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
      });
    });

    it("returns access and refresh tokens and persists refresh token hash", async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: 1,
        email: "john@test.com",
        password: "hashed",
      });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign
        .mockReturnValueOnce("access-token")
        .mockReturnValueOnce("refresh-token");
      refreshTokenRepository.create.mockResolvedValue({ id: "rt-1" });

      const result = await authService.login({
        email: "john@test.com",
        password: "123456",
      });

      expect(result).toEqual({
        token: "access-token",
        refreshToken: "refresh-token",
      });

      expect(refreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenHash: hashToken("refresh-token"),
          jti: expect.any(String),
          userId: 1,
          expiresAt: expect.any(Date),
        }),
      );
    });
  });

  describe("refreshToken", () => {
    it("throws INVALID_REFRESH_TOKEN when token is missing", async () => {
      await expect(authService.refreshToken("")).rejects.toMatchObject({
        statusCode: 400,
        code: "INVALID_REFRESH_TOKEN",
      });
    });

    it("throws INVALID_REFRESH_TOKEN when token does not exist in DB", async () => {
      jwt.verify.mockReturnValue({ id: 1, jti: "jti-1" });
      refreshTokenRepository.findByJti.mockResolvedValue(null);

      await expect(authService.refreshToken("rt")).rejects.toMatchObject({
        statusCode: 401,
        code: "INVALID_REFRESH_TOKEN",
      });
    });

    it("throws INVALID_REFRESH_TOKEN when token is revoked", async () => {
      jwt.verify.mockReturnValue({ id: 1, jti: "jti-1" });
      refreshTokenRepository.findByJti.mockResolvedValue({
        jti: "jti-1",
        userId: 1,
        revoked: true,
        expiresAt: new Date(Date.now() + 60_000),
        tokenHash: hashToken("rt"),
      });

      await expect(authService.refreshToken("rt")).rejects.toMatchObject({
        statusCode: 401,
        code: "INVALID_REFRESH_TOKEN",
      });
    });

    it("throws INVALID_REFRESH_TOKEN when token hash does not match", async () => {
      jwt.verify.mockReturnValue({ id: 1, jti: "jti-1" });
      refreshTokenRepository.findByJti.mockResolvedValue({
        jti: "jti-1",
        userId: 1,
        revoked: false,
        expiresAt: new Date(Date.now() + 60_000),
        tokenHash: hashToken("different-token"),
      });

      await expect(authService.refreshToken("rt")).rejects.toMatchObject({
        statusCode: 401,
        code: "INVALID_REFRESH_TOKEN",
      });
    });

    it("rotates refresh token and returns new token pair", async () => {
      jwt.verify.mockReturnValue({ id: 1, jti: "jti-1" });
      refreshTokenRepository.findByJti.mockResolvedValue({
        jti: "jti-1",
        userId: 1,
        revoked: false,
        expiresAt: new Date(Date.now() + 60_000),
        tokenHash: hashToken("old-rt"),
      });
      jwt.sign
        .mockReturnValueOnce("new-access")
        .mockReturnValueOnce("new-refresh");

      const result = await authService.refreshToken("old-rt");

      expect(refreshTokenRepository.revokeByJti).toHaveBeenCalledWith("jti-1");
      expect(refreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenHash: hashToken("new-refresh"),
          jti: expect.any(String),
          userId: 1,
          expiresAt: expect.any(Date),
        }),
      );
      expect(result).toEqual({
        token: "new-access",
        refreshToken: "new-refresh",
      });
    });
    it("throws INVALID_REFRESH_TOKEN when jwt.verify throws", async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error("invalid token");
      });

      await expect(authService.refreshToken("rt")).rejects.toMatchObject({
        statusCode: 401,
        code: "INVALID_REFRESH_TOKEN",
      });
    });

    it("throws INVALID_REFRESH_TOKEN when decoded jti is missing", async () => {
      jwt.verify.mockReturnValue({ id: 1 });

      await expect(authService.refreshToken("rt")).rejects.toMatchObject({
        statusCode: 401,
        code: "INVALID_REFRESH_TOKEN",
      });
    });

    it("throws INVALID_REFRESH_TOKEN when stored token userId differs", async () => {
      jwt.verify.mockReturnValue({ id: 1, jti: "jti-1" });
      refreshTokenRepository.findByJti.mockResolvedValue({
        jti: "jti-1",
        userId: 999,
        revoked: false,
        expiresAt: new Date(Date.now() + 60_000),
        tokenHash: hashToken("rt"),
      });

      await expect(authService.refreshToken("rt")).rejects.toMatchObject({
        statusCode: 401,
        code: "INVALID_REFRESH_TOKEN",
      });
    });

    it("throws INVALID_REFRESH_TOKEN when stored token is expired", async () => {
      jwt.verify.mockReturnValue({ id: 1, jti: "jti-1" });
      refreshTokenRepository.findByJti.mockResolvedValue({
        jti: "jti-1",
        userId: 1,
        revoked: false,
        expiresAt: new Date(Date.now() - 60_000),
        tokenHash: hashToken("rt"),
      });

      await expect(authService.refreshToken("rt")).rejects.toMatchObject({
        statusCode: 401,
        code: "INVALID_REFRESH_TOKEN",
      });
    });
  });

  describe("logout", () => {
    it("throws INVALID_REFRESH_TOKEN when token is missing", async () => {
      await expect(authService.logout("")).rejects.toMatchObject({
        statusCode: 400,
        code: "INVALID_REFRESH_TOKEN",
      });
    });

    it("throws INVALID_REFRESH_TOKEN when token does not exist", async () => {
      jwt.verify.mockReturnValue({ id: 1, jti: "jti-1" });
      refreshTokenRepository.findByJti.mockResolvedValue(null);

      await expect(authService.logout("rt")).rejects.toMatchObject({
        statusCode: 401,
        code: "INVALID_REFRESH_TOKEN",
      });
    });

    it("revokes token when token exists", async () => {
      jwt.verify.mockReturnValue({ id: 1, jti: "jti-1" });
      refreshTokenRepository.findByJti.mockResolvedValue({
        jti: "jti-1",
        userId: 1,
        revoked: false,
        expiresAt: new Date(Date.now() + 60_000),
        tokenHash: hashToken("rt"),
      });
      refreshTokenRepository.revokeByJti.mockResolvedValue({ count: 1 });

      await authService.logout("rt");

      expect(refreshTokenRepository.revokeByJti).toHaveBeenCalledWith("jti-1");
    });
    it("throws INVALID_REFRESH_TOKEN when jwt.verify throws", async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error("invalid token");
      });

      await expect(authService.logout("rt")).rejects.toMatchObject({
        statusCode: 401,
        code: "INVALID_REFRESH_TOKEN",
      });
    });

    it("throws INVALID_REFRESH_TOKEN when decoded jti is missing", async () => {
      jwt.verify.mockReturnValue({ id: 1 });

      await expect(authService.logout("rt")).rejects.toMatchObject({
        statusCode: 401,
        code: "INVALID_REFRESH_TOKEN",
      });
    });

    it("throws INVALID_REFRESH_TOKEN when token hash does not match", async () => {
      jwt.verify.mockReturnValue({ id: 1, jti: "jti-1" });
      refreshTokenRepository.findByJti.mockResolvedValue({
        jti: "jti-1",
        userId: 1,
        revoked: false,
        expiresAt: new Date(Date.now() + 60_000),
        tokenHash: hashToken("another-token"),
      });

      await expect(authService.logout("rt")).rejects.toMatchObject({
        statusCode: 401,
        code: "INVALID_REFRESH_TOKEN",
      });
    });
  });
});

describe("sessions", () => {
  it("listSessions throws UNAUTHORIZED when userId is missing", async () => {
    await expect(authService.listSessions()).rejects.toMatchObject({
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
  });

  it("logoutSession throws UNAUTHORIZED when userId is missing", async () => {
    await expect(
      authService.logoutSession({ jti: "jti-1" }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
  });

  it("logoutSession throws INVALID_PAYLOAD when jti is missing", async () => {
    await expect(
      authService.logoutSession({ userId: 1 }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_PAYLOAD",
    });
  });

  it("logoutSession throws SESSION_NOT_FOUND when repository returns count 0", async () => {
    refreshTokenRepository.revokeByJtiAndUserId.mockResolvedValue({ count: 0 });

    await expect(
      authService.logoutSession({ userId: 1, jti: "jti-1" }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "SESSION_NOT_FOUND",
    });
  });

  it("logoutAll throws UNAUTHORIZED when userId is missing", async () => {
    await expect(authService.logoutAll()).rejects.toMatchObject({
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
  });
});
