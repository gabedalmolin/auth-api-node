import express from "express";
import authRoutes from "./routes/authRoutes";
import docsRoutes from "./routes/docsRoutes";
import healthRoutes from "./routes/healthRoutes";
import metricsRoutes from "./routes/metricsRoutes";
import requestId from "./middlewares/requestId";
import requestLogger from "./middlewares/logger";
import errorHandler from "./middlewares/errorHandler";
import { env } from "./config/env";

const app = express();

app.set("trust proxy", env.TRUST_PROXY);
app.use(express.json({ limit: "1mb" }));
app.use(requestId);
app.use(requestLogger);
app.use("/", docsRoutes);
app.use("/", healthRoutes);
app.use("/", metricsRoutes);
app.use("/v1/auth", authRoutes);
app.use(errorHandler);

export default app;
