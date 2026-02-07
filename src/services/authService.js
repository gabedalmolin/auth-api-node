const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth");
const userRepository = require("../repositories/userRepository");
const refreshTokenRepository = require("../repositories/refreshTokenRepository");
const AppError = require("../errors/AppError");

const HASH_ROUNDS = 8;
const ACCESS_TOKEN_EXPIRES_IN = authConfig.jwt.expiresIn;
const REFRESH_TOKEN_EXPIRES_IN = "7d";

// Normalização evita duplicidade por caixa (John@test.com vs john@test.com)
const normalizeEmail = (email) => email.trim().toLowerCase();

class AuthService {
  /**
   * Registro de usuário
   * - Email normalizado
   * - Senha sempre hasheada
   * - Nunca retorna senha
   */
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

  /**
   * Login
   * - Valida credenciais
   * - Gera access token + refresh token
   * - Persiste refresh token no banco
   */
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

    const refreshToken = jwt.sign({ id: user.id }, authConfig.jwt.secret, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });

    // Salva refresh token (regra crítica para os testes)
    await refreshTokenRepository.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return { token, refreshToken };
  }

  /**
   * Refresh token
   * - Token precisa existir no banco
   * - Token precisa ser válido
   * - Token expirado é inválido
   */
  async refreshToken(token) {
    if (!token) {
      throw new AppError("invalid refresh token", 400, "INVALID_REFRESH_TOKEN");
    }

    const storedToken = await refreshTokenRepository.findByToken(token);
    if (!storedToken) {
      throw new AppError("invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    try {
      const decoded = jwt.verify(token, authConfig.jwt.secret);

      return jwt.sign({ id: decoded.id }, authConfig.jwt.secret, {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      });
    } catch {
      throw new AppError("invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }
  }

  /**
   * Logout
   * - Invalida refresh token
   * - Token inexistente ou já invalidado → erro
   */
  async logout(token) {
    if (!token) {
      throw new AppError("invalid refresh token", 400, "INVALID_REFRESH_TOKEN");
    }

    const storedToken = await refreshTokenRepository.findByToken(token);

    // Se o token nunca existiu → erro
    if (!storedToken) {
      throw new AppError("invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    // Se existiu, pode deletar (mesmo que já esteja inválido depois)
    await refreshTokenRepository.delete(token);
  }
}

module.exports = new AuthService();
