import { Router } from "express";
import { metrics } from "../controllers/metricsController";

const router = Router();

router.get("/metrics", metrics);

export default router;
