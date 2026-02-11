const express = require("express");
require("dotenv").config();

const app = express();
app.use(express.json());

const docsRoutes = require("./routes/docsRoutes.ts");
app.use("/", docsRoutes);

const requestId = require("./middlewares/requestId.ts");
const loggerMiddleware = require("./middlewares/logger.ts");
app.use(requestId);
app.use(loggerMiddleware);

const authRoutes = require("./routes/authRoutes.ts");
app.use("/auth", authRoutes);

const userRoutes = require("./routes/userRoutes.ts");
app.use("/users", userRoutes);

const healthRoutes = require("./routes/healthRoutes.ts");
app.use("/", healthRoutes);

const errorHandler = require("./middlewares/errorHandler.ts");
app.use(errorHandler);

module.exports = app;
