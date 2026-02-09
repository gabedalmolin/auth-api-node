const express = require("express");
const {
  register,
  login,
  refresh,
  logout,
  sessions,
  logoutSession,
  logoutAll,
} = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");
const validate = require("../middlewares/validate");
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  logoutSessionSchema,
} = require("../validators/authSchemas");
const rateLimiter = require("../middlewares/rateLimiter");

const router = express.Router();

router.post("/register", rateLimiter, validate(registerSchema), register);
router.post("/login", rateLimiter, validate(loginSchema), login);
router.post("/refresh", rateLimiter, validate(refreshSchema), refresh);
router.post("/logout", rateLimiter, validate(logoutSchema), logout);

router.get("/profile", authMiddleware, (req, res) => {
  req.log.info({ userId: req.userId }, "profile fetched");
  return res.json({ message: `User ${req.userId} authenticated` });
});

router.get("/sessions", authMiddleware, sessions);
router.post("/logout-session", authMiddleware, validate(logoutSessionSchema), logoutSession);
router.post("/logout-all", authMiddleware, logoutAll);

module.exports = router;
