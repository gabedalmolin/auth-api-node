import { Router } from "express";
import {
  createSession,
  listSessions,
  me,
  refreshSession,
  register,
  revokeAllSessions,
  revokeCurrentSession,
  revokeSession,
} from "../controllers/authController";
import authMiddleware from "../middlewares/authMiddleware";
import { authMutationRateLimiter } from "../middlewares/rateLimiter";
import validate from "../middlewares/validate";
import {
  createSessionInputSchema,
  refreshTokenInputSchema,
  registerInputSchema,
  revokeCurrentSessionInputSchema,
  sessionParamsSchema,
} from "../contracts/authContract";

const router = Router();

router.post("/register", authMutationRateLimiter, validate(registerInputSchema), register);
router.post("/sessions", authMutationRateLimiter, validate(createSessionInputSchema), createSession);
router.post(
  "/tokens/refresh",
  authMutationRateLimiter,
  validate(refreshTokenInputSchema),
  refreshSession,
);
router.post(
  "/sessions/current/revoke",
  authMutationRateLimiter,
  validate(revokeCurrentSessionInputSchema),
  revokeCurrentSession,
);

router.get("/me", authMiddleware, me);
router.get("/sessions", authMiddleware, listSessions);
router.delete("/sessions/:sessionId", authMiddleware, validate(sessionParamsSchema, "params"), revokeSession);
router.delete("/sessions", authMiddleware, revokeAllSessions);

export default router;
