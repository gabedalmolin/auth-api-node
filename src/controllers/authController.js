const authService = require("../services/authService");

/**
 * Controller responsável APENAS por:
 * - validar payload
 * - mapear erros para status HTTP
 * Regra: erro de auth = 401 | erro de input = 400
 */

// REGISTER
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "missing required fields" });
    }

    const user = await authService.register(req.body);
    return res.status(201).json(user);
  } catch (err) {
    return next(err);
  }
}

// LOGIN
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "missing required fields" });
    }

    const tokens = await authService.login(req.body);
    return res.status(200).json(tokens);
  } catch (err) {
    return next(err);
  }
}

// REFRESH TOKEN
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "refresh token required" });
    }

    const newToken = await authService.refreshToken(refreshToken);
    return res.status(200).json({ token: newToken });
  } catch (err) {
    return next(err);
  }
}

// LOGOUT
async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "refresh token required" });
    }

    await authService.logout(refreshToken);
    return res.status(200).json({ message: "logged out successfully" });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login, refresh, logout };
