import { createClient, type RedisClientType } from "redis";

const globalRedis = globalThis as typeof globalThis & {
  __checkhooksRedisClient?: RedisClientType;
  __checkhooksRedisPromise?: Promise<RedisClientType | null>;
};

export function getRedisUrl() {
  return process.env.REDIS_URL || process.env.KV_URL || "";
}

export async function getRedisClient() {
  const url = getRedisUrl();
  if (!url) return null;
  if (globalRedis.__checkhooksRedisClient?.isOpen) return globalRedis.__checkhooksRedisClient;
  if (globalRedis.__checkhooksRedisPromise) return globalRedis.__checkhooksRedisPromise;

  globalRedis.__checkhooksRedisPromise = (async () => {
    try {
      const client = createClient({ url });
      client.on("error", (error) => {
        console.error("Cache Storage client error", error);
      });
      await client.connect();
      globalRedis.__checkhooksRedisClient = client as RedisClientType;
      return globalRedis.__checkhooksRedisClient;
    } catch (error) {
      console.error("Unable to connect to Cache Storage", error);
      globalRedis.__checkhooksRedisPromise = undefined;
      return null;
    }
  })();

  return globalRedis.__checkhooksRedisPromise;
}
