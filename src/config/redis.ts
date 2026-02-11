const Redis = require("ioredis");

const redisUrl = process.env.REDIS_URL;
const redisEnabled = Boolean(redisUrl);

let redisClient = null;

if (redisEnabled) {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });

  redisClient.on("error", (err) => {
    if (process.env.NODE_ENV !== "test") {
      console.error("[redis] connection error:", err.message);
    }
  });
}

async function closeRedisConnection() {
  if (!redisClient) return;
  if (redisClient.status === "end") return;

  const forceDisconnect = () => {
    redisClient.disconnect();

    // Em testes, força fechamento do stream para evitar timer pendente do ioredis
    if (process.env.NODE_ENV === "test") {
      const stream = redisClient.connector?.stream;
      if (stream && !stream.destroyed) {
        stream.destroy();
      }
    }
  };

  if (redisClient.status !== "ready") {
    forceDisconnect();
    return;
  }

  try {
    await redisClient.quit();
  } catch (_error) {
    forceDisconnect();
  }
}

module.exports = {
  redisClient,
  redisEnabled,
  closeRedisConnection,
};
