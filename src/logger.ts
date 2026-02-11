const pino = require("pino");

const isTestEnv = process.env.NODE_ENV === "test";
// Logger base: JSON, nível info por padrão
const logger = pino({
  level: process.env.LOG_LEVEL || (isTestEnv ? "silent" : "info"),
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        }
      : undefined,
});

module.exports = logger;
