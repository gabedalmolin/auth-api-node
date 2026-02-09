const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomUUID, createHash, timingSafeEqual } = require("crypto");
const authConfig = require("../config/auth");
const userRepository = require("../repositories/userRepository");
const refreshTokenRepository = require("../repositories/refreshTokenRepository");
const AppError = require("../errors/AppError");

const HASH_ROUNDS = 8;
const ACCESS_TOKEN_EXPIRES_IN = authConfig.jwt.expiresIn;
const REFRESH_TOKEN_EXPIRES_IN = "7d";

/**
 * Service de autenticacao
 * - Normaliza email
 * - Gera access/refresh tokens
 * - Mantem refresh tokens versionados e revogaveis no banco
 */
const normalizeEmail = (email) => email.trim().toLowerCase();

const hashToken = (token) => createHash("sha256").update(token).digest("hex");

const isSameHash = (a, b) => {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");

  if (aBuf.length !== bBuf.length) {
    return false;
  }

  return timingSafeEqual(aBuf, bBuf);
};

class AuthService {
  async register({ name, email, password }) {
    const normalizedEmail = normalizeEmail(email);

    const existingUser = await userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new AppError("user already exists", 409, "USER_ALREADY_EXISTS");
    }

    const hashedPassword = await bcrypt.hash(password, HASH_ROUNDS);

    const user = await userRepository.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
    });

    const { password: _, ...rest } = user;
    return rest;
  }

  async login({ email, password }) {
    const normalizedEmail = normalizeEmail(email);

    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user) {
      throw new AppError("user not found", 401, "INVALID_CREDENTIALS");
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new AppError("invalid password", 401, "INVALID_CREDENTIALS");
    }

    const token = jwt.sign({ id: user.id }, authConfig.jwt.secret, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });

    const refreshJti = randomUUID();
    const refreshToken = jwt.sign({ id: user.id, jti: refreshJti }, authConfig.jwt.secret, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });

    await refreshTokenRepository.create({
      tokenHash: hashToken(refreshToken),
      jti: refreshJti,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return { token, refreshToken };
  }

  async refreshToken(token) {
    if (!token) {
      throw new AppError("invalid refresh token", 400, "INVALID_REFRESH_TOKEN");
    }

    let decoded;
    try {
      decoded = jwt.verify(token, authConfig.jwt.secret);
    } catch {
      throw new AppError("invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    if (!decoded.jti) {
      throw new AppError("invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    const storedToken = await refreshTokenRepository.findByJti(decoded.jti);
    if (!storedToken) {
      throw new AppError("invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    if (storedToken.userId !== decoded.id) {
      throw new AppError("invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    if (storedToken.revoked) {
      throw new AppError("invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    if (storedToken.expiresAt <= new Date()) {
      throw new AppError("invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    const incomingTokenHash = hashToken(token);
    if (!isSameHash(incomingTokenHash, storedToken.tokenHash)) {
      throw new AppError("invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    await refreshTokenRepository.revokeByJti(decoded.jti);

    const newAccessToken = jwt.sign({ id: decoded.id }, authConfig.jwt.secret, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });

    const newRefreshJti = randomUUID();
    const newRefreshToken = jwt.sign(
      { id: decoded.id, jti: newRefreshJti },
      authConfig.jwt.secret,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN },
    );

    await refreshTokenRepository.create({
      tokenHash: hashToken(newRefreshToken),
      jti: newRefreshJti,
      userId: decoded.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return { token: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(token) {
    if (!token) {
      throw new AppError("invalid refresh token", 400, "INVALID_REFRESH_TOKEN");
    }

    let decoded;
    try {
      decoded = jwt.verify(token, authConfig.jwt.secret);
    } catch {
      throw new AppError("invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    if (!decoded.jti) {
      throw new AppError("invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    const storedToken = await refreshTokenRepository.findByJti(decoded.jti);
    if (!storedToken) {
      throw new AppError("invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    const incomingTokenHash = hashToken(token);
    if (!isSameHash(incomingTokenHash, storedToken.tokenHash)) {
      throw new AppError("invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    await refreshTokenRepository.revokeByJti(decoded.jti);
  }

  async listSessions(userId) {
    if (!userId) {
      throw new AppError("unauthorized", 401, "UNAUTHORIZED");
    }

    const sessions = await refreshTokenRepository.findActiveByUserId(userId);
    return sessions;
  }

  async logoutSession({ userId, jti }) {
    if (!userId) {
      throw new AppError("unauthorized", 401, "UNAUTHORIZED");
    }

    if (!jti) {
      throw new AppError("jti is required", 400, "INVALID_PAYLOAD");
    }

    const result = await refreshTokenRepository.revokeByJtiAndUserId({ jti, userId });

    if (result.count === 0) {
      throw new AppError("session not found", 404, "SESSION_NOT_FOUND");
    }

    return { revokedSessions: result.count };
  }

  async logoutAll(userId) {
    if (!userId) {
      throw new AppError("unauthorized", 401, "UNAUTHORIZED");
    }

    const result = await refreshTokenRepository.revokeAllByUserId(userId);
    return { revokedSessions: result.count };
  }
}

module.exports = new AuthService();
