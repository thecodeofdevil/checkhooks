import { getRedisClient } from "./redis";

export type TempUserPresence = {
  id: string;
  receiverId: string;
  page: string;
  userAgent: string;
  createdAt: string;
  lastSeenAt: string;
};

const TEMP_USER_TTL_SECONDS = Number(process.env.TEMP_USER_TTL_SECONDS ?? 90);
const TEMP_USER_PREFIX = "checkhooks:temp-user:";

function getTempUserKey(id: string) {
  return `${TEMP_USER_PREFIX}${id}`;
}

function parsePresence(value: Record<string, string>): TempUserPresence | null {
  if (!value.id) return null;
  return {
    id: value.id,
    receiverId: value.receiverId || "unknown",
    page: value.page || "/app",
    userAgent: value.userAgent || "Unknown",
    createdAt: value.createdAt || new Date().toISOString(),
    lastSeenAt: value.lastSeenAt || new Date().toISOString(),
  };
}

export async function upsertTempUserPresence(input: {
  id: string;
  receiverId: string;
  page?: string;
  userAgent?: string;
}) {
  const redis = await getRedisClient();
  const now = new Date().toISOString();
  const presence: TempUserPresence = {
    id: input.id,
    receiverId: input.receiverId,
    page: input.page || "/app",
    userAgent: input.userAgent || "Unknown",
    createdAt: now,
    lastSeenAt: now,
  };

  if (!redis) return presence;

  const key = getTempUserKey(input.id);
  const existing = parsePresence(await redis.hGetAll(key));
  presence.createdAt = existing?.createdAt ?? now;

  await redis.hSet(key, {
    id: presence.id,
    receiverId: presence.receiverId,
    page: presence.page,
    userAgent: presence.userAgent,
    createdAt: presence.createdAt,
    lastSeenAt: presence.lastSeenAt,
  });
  await redis.expire(key, TEMP_USER_TTL_SECONDS);
  return presence;
}

export async function deleteTempUserPresence(id: string) {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.del(getTempUserKey(id));
}

export async function listTempUserPresence() {
  const redis = await getRedisClient();
  if (!redis) return [];

  const keys = await redis.keys(`${TEMP_USER_PREFIX}*`);
  if (!keys.length) return [];

  const presences = await Promise.all(keys.map(async (key) => parsePresence(await redis.hGetAll(key))));
  return presences
    .filter((presence): presence is TempUserPresence => Boolean(presence))
    .sort((left, right) => Date.parse(right.lastSeenAt) - Date.parse(left.lastSeenAt));
}
