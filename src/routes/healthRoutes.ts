import { Router } from "express";
import { health, ready } from "../controllers/healthController";

const router = Router();

router.get("/health", health);
router.get("/ready", ready);

export default router;
