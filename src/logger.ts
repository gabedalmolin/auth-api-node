import pino, { type LoggerOptions } from "pino";
import { env } from "./config/env";

const loggerOptions: LoggerOptions = {
  level: env.LOG_LEVEL,
};

if (env.NODE_ENV === "development") {
  loggerOptions.transport = {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "SYS:standard" },
  };
}

const logger = pino(loggerOptions);

export default logger;
