const express = require("express");
require("dotenv").config();

const app = express();
app.use(express.json());

const docsRoutes = require("./routes/docsRoutes");
app.use("/", docsRoutes);

const requestId = require("./middlewares/requestId");
const loggerMiddleware = require("./middlewares/logger");
app.use(requestId);
app.use(loggerMiddleware);

const authRoutes = require("./routes/authRoutes");
app.use("/auth", authRoutes);

const userRoutes = require("./routes/userRoutes");
app.use("/users", userRoutes);

const healthRoutes = require("./routes/healthRoutes");
app.use("/", healthRoutes);

const errorHandler = require("./middlewares/errorHandler");
app.use(errorHandler);

module.exports = app;
