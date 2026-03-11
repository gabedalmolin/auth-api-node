import Redis from "ioredis";
import { env } from "./env";

export const redisEnabled = Boolean(env.REDIS_URL);

export const redisClient = redisEnabled
  ? new Redis(env.REDIS_URL as string, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: env.NODE_ENV === "test",
    })
  : null;

if (redisClient) {
  redisClient.on("error", (error) => {
    if (env.NODE_ENV !== "test") {
      console.error("[redis] connection error:", error.message);
    }
  });
}

export async function pingRedis(): Promise<"up" | "down" | "disabled"> {
  if (!redisClient) {
    return "disabled";
  }

  try {
    if (redisClient.status === "wait") {
      await redisClient.connect();
    }

    await redisClient.ping();
    return "up";
  } catch {
    return "down";
  }
}

export async function closeRedisConnection(): Promise<void> {
  if (!redisClient || redisClient.status === "end") {
    return;
  }

  const forceDisconnect = () => {
    redisClient.disconnect();

    if (env.NODE_ENV === "test") {
      const stream = (redisClient as unknown as { connector?: { stream?: { destroyed: boolean; destroy: () => void } } }).connector?.stream;
      if (stream && !stream.destroyed) {
        stream.destroy();
      }
    }
  };

  if (redisClient.status === "wait") {
    forceDisconnect();
    return;
  }

  try {
    await redisClient.quit();
  } catch {
    forceDisconnect();
  }
}
