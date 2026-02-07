const express = require("express");
const {
  register,
  login,
  refresh,
  logout,
} = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");
const validate = require("../middlewares/validate");
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} = require("../validators/authSchemas");

const router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", validate(refreshSchema), refresh);
router.post("/logout", validate(logoutSchema), logout);

router.get("/profile", authMiddleware, (req, res) => {
  return res.json({ message: `User ${req.userId} authenticated` });
});

module.exports = router;
