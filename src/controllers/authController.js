const authService = require("../services/authService");

// register
async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "missing required fields" });
    }
    const user = await authService.register(req.body);
    return res.status(201).json(user);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

// login
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "missing required fields" });
    }
    const token = await authService.login(req.body);
    return res.json(token);
  } catch (err) {
    const status =
      err.message === "invalid password" || err.message === "user not found"
        ? 401
        : 400;
    return res.status(status).json({ error: err.message });
  }
}

// refresh
async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "refresh token required" });
    }
    const newToken = await authService.refreshToken(refreshToken);
    return res.status(200).json({ token: newToken });
  } catch (err) {
    if (err.message === "invalid refresh token") {
      return res.status(401).json({ error: err.message });
    } else {
      return res.status(400).json({ error: err.message });
    }
  }
}

// logout
async function logout(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "refresh token required" });
    }
    await authService.logout(refreshToken);
    return res.status(200).json({ message: "logged out successfully" });
  } catch (err) {
    if (err.message === "invalid refresh token") {
      return res.status(401).json({ error: err.message });
    } else {
      return res.status(400).json({ error: err.message });
    }
  }
}

module.exports = { register, login, refresh, logout };
