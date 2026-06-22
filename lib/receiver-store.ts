import { getRedisClient } from "./redis";

export type ReceivedEvent = {
  id: number;
  receiverId: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: string;
  when: string;
};

export type ReceiverResponseConfig = {
  status: number;
  contentType: string;
  headers: Record<string, string>;
  body: string;
  authEnabled?: boolean;
  authToken?: string;
  hookStatus?: "active" | "paused";
  ownerEmail?: string;
  hookId?: string;
  hookName?: string;
  workflow?: ReceiverWorkflowConfig;
  dataCenter?: ReceiverDataCenterConfig;
};

export type UserPlan = "free" | "pro";

export type WorkflowNodeType = "response" | "transform" | "condition" | "forward";

export type WorkflowNode = {
  id: string;
  type: WorkflowNodeType;
  label: string;
  enabled: boolean;
  config: {
    status?: number;
    contentType?: string;
    bodyTemplate?: string;
    headerName?: string;
    headerValue?: string;
    path?: string;
    operator?: "exists" | "equals" | "contains";
    value?: string;
    failStatus?: number;
    failBodyTemplate?: string;
    url?: string;
    method?: string;
  };
};

export type ReceiverWorkflowConfig = {
  enabled: boolean;
  nodes: WorkflowNode[];
};

export type DataCenterField = {
  id: string;
  label: string;
  path: string;
};

export type ReceiverDataCenterConfig = {
  enabled: boolean;
  fields: DataCenterField[];
};

export type ReceiverUsage = {
  receiverId: string;
  ownerEmail?: string;
  plan: UserPlan;
  totalAccepted: number;
  totalLimit: number;
  remaining: number;
  rateLimitPerMinute: number;
  customRateLimitPerMinute?: number;
  windowAccepted: number;
  windowStartedAt: string;
  dailyStartedAt: string;
};

type ReceiverState = {
  receiverStore: Map<string, ReceivedEvent[]>;
  receiverResponseStore: Map<string, ReceiverResponseConfig>;
  receiverSubscribers: Map<string, Set<(event: ReceivedEvent) => void>>;
  receiverUsageStore: Map<string, ReceiverUsage>;
};

const globalReceiverState = globalThis as typeof globalThis & {
  __checkhooksReceiverState?: ReceiverState;
};

const state = globalReceiverState.__checkhooksReceiverState ?? {
  receiverStore: new Map<string, ReceivedEvent[]>(),
  receiverResponseStore: new Map<string, ReceiverResponseConfig>(),
  receiverSubscribers: new Map<string, Set<(event: ReceivedEvent) => void>>(),
  receiverUsageStore: new Map<string, ReceiverUsage>(),
};

globalReceiverState.__checkhooksReceiverState = state;

const { receiverStore, receiverResponseStore, receiverSubscribers, receiverUsageStore } = state;

const TEMP_TOTAL_LIMIT = Number(process.env.TEMP_RECEIVER_REQUEST_LIMIT ?? process.env.FREE_RECEIVER_REQUEST_LIMIT ?? 10000);
const LOGGED_IN_TOTAL_LIMIT = Number(process.env.LOGGED_IN_RECEIVER_REQUEST_LIMIT ?? 50000);
const PRO_TOTAL_LIMIT = Number(process.env.PRO_RECEIVER_REQUEST_LIMIT ?? 1000000);
const TEMP_RATE_LIMIT_PER_MINUTE = Number(process.env.TEMP_RECEIVER_RATE_LIMIT_PER_MINUTE ?? 60);
const LOGGED_IN_RATE_LIMIT_PER_MINUTE = Number(process.env.LOGGED_IN_RECEIVER_RATE_LIMIT_PER_MINUTE ?? process.env.FREE_RECEIVER_RATE_LIMIT_PER_MINUTE ?? 120);
const PRO_RATE_LIMIT_PER_MINUTE = Number(process.env.PRO_RECEIVER_RATE_LIMIT_PER_MINUTE ?? 1200);

function getPlanLimits(plan: UserPlan, ownerEmail?: string) {
  if (plan !== "pro" && !ownerEmail) {
    return {
      totalLimit: TEMP_TOTAL_LIMIT,
      rateLimitPerMinute: TEMP_RATE_LIMIT_PER_MINUTE,
    };
  }

  return {
    totalLimit: plan === "pro" ? PRO_TOTAL_LIMIT : LOGGED_IN_TOTAL_LIMIT,
    rateLimitPerMinute: plan === "pro" ? PRO_RATE_LIMIT_PER_MINUTE : LOGGED_IN_RATE_LIMIT_PER_MINUTE,
  };
}

function getUsageKey(receiverId: string) {
  return `checkhooks:receiver:${receiverId}:usage`;
}

function getResponseConfigKey(receiverId: string) {
  return `checkhooks:receiver:${receiverId}:config`;
}

function getDefaultReceiverResponseConfig(): ReceiverResponseConfig {
  return {
    status: 200,
    contentType: "application/json",
    headers: {},
    body: JSON.stringify({ received: true, first_name: "{{body.first_name}}" }, null, 2),
    authEnabled: false,
    authToken: "",
    hookStatus: "active",
    workflow: { enabled: false, nodes: [] },
    dataCenter: { enabled: false, fields: [] },
  };
}

function serializeUsage(usage: ReceiverUsage) {
  return {
    receiverId: usage.receiverId,
    ownerEmail: usage.ownerEmail ?? "",
    plan: usage.plan,
    totalAccepted: String(usage.totalAccepted),
    totalLimit: String(usage.totalLimit),
    remaining: String(usage.remaining),
    rateLimitPerMinute: String(usage.rateLimitPerMinute),
    customRateLimitPerMinute: usage.customRateLimitPerMinute ? String(usage.customRateLimitPerMinute) : "",
    windowAccepted: String(usage.windowAccepted),
    windowStartedAt: usage.windowStartedAt,
    dailyStartedAt: usage.dailyStartedAt,
  };
}

function parseUsage(receiverId: string, value: Record<string, string>): ReceiverUsage | null {
  if (!value.receiverId && Object.keys(value).length === 0) return null;
  const plan = value.plan === "pro" ? "pro" : "free";
  const ownerEmail = value.ownerEmail || undefined;
  const limits = getPlanLimits(plan, ownerEmail);
  const customRateLimitPerMinute = Number(value.customRateLimitPerMinute || 0) || undefined;
  const totalAccepted = Number(value.totalAccepted ?? 0);
  return {
    receiverId: value.receiverId || receiverId,
    ownerEmail,
    plan,
    totalAccepted,
    totalLimit: Number(value.totalLimit ?? limits.totalLimit),
    remaining: Math.max(Number(value.totalLimit ?? limits.totalLimit) - totalAccepted, 0),
    rateLimitPerMinute: customRateLimitPerMinute
      ? Math.min(customRateLimitPerMinute, limits.rateLimitPerMinute)
      : Number(value.rateLimitPerMinute ?? limits.rateLimitPerMinute),
    customRateLimitPerMinute,
    windowAccepted: Number(value.windowAccepted ?? 0),
    windowStartedAt: value.windowStartedAt || new Date().toISOString(),
    dailyStartedAt: value.dailyStartedAt || new Date().toISOString(),
  };
}

async function saveReceiverUsage(usage: ReceiverUsage) {
  receiverUsageStore.set(usage.receiverId, usage);

  const redis = await getRedisClient();
  if (!redis) return;

  await redis.hSet(getUsageKey(usage.receiverId), serializeUsage(usage));
  await redis.expire(getUsageKey(usage.receiverId), 60 * 60 * 24 * 90);
}

async function getOrCreateReceiverUsage(receiverId: string): Promise<ReceiverUsage> {
  const redis = await getRedisClient();
  if (redis) {
    const redisUsage = parseUsage(receiverId, await redis.hGetAll(getUsageKey(receiverId)));
    if (redisUsage) {
      receiverUsageStore.set(receiverId, redisUsage);
      return redisUsage;
    }
  }

  const existing = receiverUsageStore.get(receiverId);
  if (existing) return existing;

  const limits = getPlanLimits("free");
  const now = new Date().toISOString();
  const usage: ReceiverUsage = {
    receiverId,
    plan: "free",
    totalAccepted: 0,
    totalLimit: limits.totalLimit,
    remaining: limits.totalLimit,
    rateLimitPerMinute: limits.rateLimitPerMinute,
    windowAccepted: 0,
    windowStartedAt: now,
    dailyStartedAt: now,
  };
  await saveReceiverUsage(usage);
  return usage;
}

async function refreshUsageWindows(usage: ReceiverUsage) {
  const now = Date.now();
  const windowStart = Date.parse(usage.windowStartedAt);
  const dailyStart = Date.parse(usage.dailyStartedAt);
  const isFreshWindow = Number.isNaN(windowStart) || now - windowStart >= 60_000;
  const isFreshDay = Number.isNaN(dailyStart) || now - dailyStart >= 86_400_000;

  if (!isFreshWindow && !isFreshDay) {
    return {
      ...usage,
      remaining: Math.max(usage.totalLimit - usage.totalAccepted, 0),
    };
  }

  const nextUsage: ReceiverUsage = {
    ...usage,
    totalAccepted: isFreshDay ? 0 : usage.totalAccepted,
    windowAccepted: isFreshWindow ? 0 : usage.windowAccepted,
    windowStartedAt: isFreshWindow ? new Date(now).toISOString() : usage.windowStartedAt,
    dailyStartedAt: isFreshDay ? new Date(now).toISOString() : usage.dailyStartedAt,
  };
  nextUsage.remaining = Math.max(nextUsage.totalLimit - nextUsage.totalAccepted, 0);
  await saveReceiverUsage(nextUsage);
  return nextUsage;
}

export async function registerReceiver(receiverId: string, owner?: { email?: string; plan?: UserPlan }) {
  const current = await refreshUsageWindows(await getOrCreateReceiverUsage(receiverId));
  const plan = owner?.plan ?? "free";
  const ownerEmail = owner?.email ?? current.ownerEmail;
  const limits = getPlanLimits(plan, ownerEmail);
  const rateLimitPerMinute = current.customRateLimitPerMinute
    ? Math.min(current.customRateLimitPerMinute, limits.rateLimitPerMinute)
    : limits.rateLimitPerMinute;
  const usage: ReceiverUsage = {
    ...current,
    ownerEmail,
    plan,
    totalLimit: limits.totalLimit,
    rateLimitPerMinute,
    remaining: Math.max(limits.totalLimit - current.totalAccepted, 0),
  };
  await saveReceiverUsage(usage);
  return usage;
}

export async function getReceiverUsage(receiverId: string) {
  return refreshUsageWindows(await getOrCreateReceiverUsage(receiverId));
}

export async function updateReceiverRateLimit(receiverId: string, rateLimitPerMinute?: number) {
  const current = await refreshUsageWindows(await getOrCreateReceiverUsage(receiverId));
  const limits = getPlanLimits(current.plan, current.ownerEmail);
  const cleanRateLimit = rateLimitPerMinute && Number.isFinite(rateLimitPerMinute)
    ? Math.max(1, Math.min(Math.floor(rateLimitPerMinute), limits.rateLimitPerMinute))
    : undefined;
  const usage: ReceiverUsage = {
    ...current,
    customRateLimitPerMinute: cleanRateLimit,
    rateLimitPerMinute: cleanRateLimit ?? limits.rateLimitPerMinute,
  };
  await saveReceiverUsage(usage);
  return usage;
}

export async function checkAndCountReceiverRequest(receiverId: string) {
  const usage = await refreshUsageWindows(await getOrCreateReceiverUsage(receiverId));
  const redis = await getRedisClient();

  if (redis) {
    try {
      const now = Date.now();
      const nowIso = new Date(now).toISOString();
      const result = await redis.eval(
        `
        local totalAccepted = tonumber(redis.call("HGET", KEYS[1], "totalAccepted") or "0")
        local totalLimit = tonumber(ARGV[1])
        local rateLimit = tonumber(ARGV[2])
        local windowAccepted = tonumber(redis.call("HGET", KEYS[1], "windowAccepted") or "0")
        local windowStartedAt = redis.call("HGET", KEYS[1], "windowStartedAt")
        local dailyStartedAt = redis.call("HGET", KEYS[1], "dailyStartedAt")
        local windowStart = tonumber(redis.call("HGET", KEYS[1], "windowStartedMs") or "0")
        local dailyStart = tonumber(redis.call("HGET", KEYS[1], "dailyStartedMs") or "0")
        local now = tonumber(ARGV[3])
        local nowIso = ARGV[4]
        local ttl = tonumber(ARGV[5])

        if windowStart == 0 then
          windowStart = now
          windowStartedAt = nowIso
        end
        if dailyStart == 0 then
          dailyStart = now
          dailyStartedAt = nowIso
        end
        if now - windowStart >= 60000 then
          windowAccepted = 0
          windowStart = now
          windowStartedAt = nowIso
        end
        if now - dailyStart >= 86400000 then
          totalAccepted = 0
          dailyStart = now
          dailyStartedAt = nowIso
        end

        local remaining = math.max(totalLimit - totalAccepted, 0)
        if totalAccepted >= totalLimit then
          redis.call("HSET", KEYS[1], "totalAccepted", totalAccepted, "totalLimit", totalLimit, "remaining", remaining, "rateLimitPerMinute", rateLimit, "windowAccepted", windowAccepted, "windowStartedAt", windowStartedAt, "dailyStartedAt", dailyStartedAt, "windowStartedMs", windowStart, "dailyStartedMs", dailyStart)
          redis.call("EXPIRE", KEYS[1], ttl)
          return {0, "quota", totalAccepted, remaining, windowAccepted, windowStartedAt, dailyStartedAt}
        end
        if windowAccepted >= rateLimit then
          redis.call("HSET", KEYS[1], "totalAccepted", totalAccepted, "totalLimit", totalLimit, "remaining", remaining, "rateLimitPerMinute", rateLimit, "windowAccepted", windowAccepted, "windowStartedAt", windowStartedAt, "dailyStartedAt", dailyStartedAt, "windowStartedMs", windowStart, "dailyStartedMs", dailyStart)
          redis.call("EXPIRE", KEYS[1], ttl)
          return {0, "rate", totalAccepted, remaining, windowAccepted, windowStartedAt, dailyStartedAt}
        end

        totalAccepted = totalAccepted + 1
        windowAccepted = windowAccepted + 1
        remaining = math.max(totalLimit - totalAccepted, 0)
        redis.call("HSET", KEYS[1], "totalAccepted", totalAccepted, "totalLimit", totalLimit, "remaining", remaining, "rateLimitPerMinute", rateLimit, "windowAccepted", windowAccepted, "windowStartedAt", windowStartedAt, "dailyStartedAt", dailyStartedAt, "windowStartedMs", windowStart, "dailyStartedMs", dailyStart)
        redis.call("EXPIRE", KEYS[1], ttl)
        return {1, "", totalAccepted, remaining, windowAccepted, windowStartedAt, dailyStartedAt}
        `,
        {
          keys: [getUsageKey(receiverId)],
          arguments: [
            String(usage.totalLimit),
            String(usage.rateLimitPerMinute),
            String(now),
            nowIso,
            String(60 * 60 * 24 * 90),
          ],
        }
      ) as unknown[];

      const nextUsage: ReceiverUsage = {
        ...usage,
        totalAccepted: Number(result[2] ?? usage.totalAccepted),
        remaining: Number(result[3] ?? usage.remaining),
        windowAccepted: Number(result[4] ?? usage.windowAccepted),
        windowStartedAt: String(result[5] ?? usage.windowStartedAt),
        dailyStartedAt: String(result[6] ?? usage.dailyStartedAt),
      };
      receiverUsageStore.set(receiverId, nextUsage);
      const allowed = Number(result[0]) === 1;
      return { allowed, reason: allowed ? null : String(result[1] || "quota") as "quota" | "rate", usage: nextUsage };
    } catch (error) {
      console.error("Redis quota check failed, falling back to memory counter", error);
    }
  }

  if (usage.totalAccepted >= usage.totalLimit) {
    await saveReceiverUsage(usage);
    return { allowed: false, reason: "quota" as const, usage };
  }

  if (usage.windowAccepted >= usage.rateLimitPerMinute) {
    await saveReceiverUsage(usage);
    return { allowed: false, reason: "rate" as const, usage };
  }

  const nextUsage: ReceiverUsage = {
    ...usage,
    totalAccepted: usage.totalAccepted + 1,
    windowAccepted: usage.windowAccepted + 1,
    remaining: Math.max(usage.totalLimit - usage.totalAccepted - 1, 0),
  };
  await saveReceiverUsage(nextUsage);
  return { allowed: true, reason: null, usage: nextUsage };
}

export function appendReceiverEvent(receiverId: string, event: Omit<ReceivedEvent, "id" | "when">, options?: { persist?: boolean }) {
  const existing = receiverStore.get(receiverId) ?? [];
  const nextEvent: ReceivedEvent = {
    id: Date.now() + Math.round(Math.random() * 1000),
    when: new Date().toISOString(),
    ...event,
  };

  if (options?.persist !== false) {
    receiverStore.set(receiverId, [nextEvent, ...existing].slice(0, 50));
  }
  const subscribers = receiverSubscribers.get(receiverId);
  if (subscribers) {
    subscribers.forEach((listener) => listener(nextEvent));
  }

  return nextEvent;
}

export function getReceiverEvents(receiverId: string) {
  return receiverStore.get(receiverId) ?? [];
}

export function subscribeReceiverEvents(receiverId: string, listener: (event: ReceivedEvent) => void) {
  const set = receiverSubscribers.get(receiverId) ?? new Set();
  set.add(listener);
  receiverSubscribers.set(receiverId, set);

  return () => {
    set.delete(listener);
    if (set.size === 0) {
      receiverSubscribers.delete(receiverId);
    }
  };
}

export function clearReceiverEvents(receiverId: string) {
  receiverStore.set(receiverId, []);
}

export function deleteReceiverEvent(receiverId: string, eventId: number) {
  const events = receiverStore.get(receiverId) ?? [];
  const nextEvents = events.filter((event) => event.id !== eventId);
  receiverStore.set(receiverId, nextEvents);
  return nextEvents;
}

export async function getReceiverResponseConfig(receiverId: string): Promise<ReceiverResponseConfig> {
  const cached = receiverResponseStore.get(receiverId);
  if (cached) return cached;

  const redis = await getRedisClient();
  if (redis) {
    const rawConfig = await redis.get(getResponseConfigKey(receiverId));
    if (rawConfig) {
      try {
        const parsedConfig = JSON.parse(rawConfig) as ReceiverResponseConfig;
        const config = { ...getDefaultReceiverResponseConfig(), ...parsedConfig };
        receiverResponseStore.set(receiverId, config);
        return config;
      } catch {}
    }
  }

  return getDefaultReceiverResponseConfig();
}

export async function setReceiverResponseConfig(receiverId: string, config: ReceiverResponseConfig) {
  receiverResponseStore.set(receiverId, config);
  const redis = await getRedisClient();
  if (redis) {
    await redis.set(getResponseConfigKey(receiverId), JSON.stringify(config), { EX: 60 * 60 * 24 * 90 });
  }
  return config;
}
