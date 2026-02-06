const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth");

// temporariamente armazenando usuários em memória
let users = []; // vai virar DB depois
let refreshTokens = []; // lista de refresh tokens válidos

class authService {
  // registrar usuario
  async register({ name, email, password }) {
    const normalizedEmail = email.toLowerCase();
    const userExists = users.find((u) => u.email === normalizedEmail);
    if (userExists) {
      throw new Error("user already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    const user = {
      id: users.length + 1,
      name,
      email: normalizedEmail,
      password: hashedPassword,
    };

    users.push(user);

    // retorna sem senha
    const { password: _, ...rest } = user;
    return rest;
  }

  // login de usuario
  async login({ email, password }) {
    const normalizedEmail = email.toLowerCase();
    const user = users.find((u) => u.email === normalizedEmail);
    if (!user) {
      throw new Error("user not found");
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new Error("invalid password");
    }

    const token = jwt.sign({ id: user.id }, authConfig.jwt.secret, {
      expiresIn: authConfig.jwt.expiresIn,
    });

    const refreshToken = jwt.sign({ id: user.id }, authConfig.jwt.secret, {
      expiresIn: "7d", // duração longa
    });

    // armazenar na lista temporária
    refreshTokens.push(refreshToken);

    return { token, refreshToken };
  }

  // refresh token
  async refreshToken(refreshToken) {
    if (!refreshToken || !refreshTokens.includes(refreshToken)) {
      throw new Error("invalid refresh token");
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, authConfig.jwt.secret);
    } catch (err) {
      throw new Error("invalid refresh token");
    }

    const newToken = jwt.sign({ id: decoded.id }, authConfig.jwt.secret, {
      expiresIn: authConfig.jwt.expiresIn,
    });

    return newToken;
  }

  logout(refreshToken) {
    if (!refreshToken || !refreshTokens.includes(refreshToken)) {
      throw new Error("invalid refresh token");
    }

    refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
  }
}

module.exports = new authService();
