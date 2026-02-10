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

  // Se não estiver pronto para comando, encerra direto sem quit()
  if (redisClient.status !== "ready") {
    redisClient.disconnect();
    return;
  }

  try {
    await redisClient.quit();
  } catch (_error) {
    // Em teardown paralelo/intermitente, garante encerramento sem quebrar a suíte
    redisClient.disconnect();
  }
}

module.exports = {
  redisClient,
  redisEnabled,
  closeRedisConnection,
};
