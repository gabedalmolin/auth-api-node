const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "token not provided" });
  }

  const [, token] = authHeader.split(" ");

  try {
    const decoded = jwt.verify(token, authConfig.jwt.secret);
    req.userId = decoded.id;
    return next();
  } catch {
    return res.status(401).json({ error: "invalid token" });
  }
}

module.exports = authMiddleware;