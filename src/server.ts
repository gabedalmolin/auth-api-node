import app from "./app";
import logger from "./logger";
import { env } from "./config/env";
import { closePrismaConnection } from "./config/prisma";
import { closeRedisConnection } from "./config/redis";

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "server_started");
});

let isShuttingDown = false;

const shutdown = async (signal: string) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, "server_shutdown_started");

  server.close(async () => {
    await closeRedisConnection();
    await closePrismaConnection();
    logger.info({ signal }, "server_shutdown_completed");
    process.exit(0);
  });
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
