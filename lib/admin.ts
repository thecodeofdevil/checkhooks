import { unstable_noStore as noStore } from "next/cache";

import { getCurrentSession, PRO_PRICE_USD } from "./auth";
import { getCheckhooksDb } from "./mongodb";
import type { UserPlan } from "./receiver-store";
import { listTempUserPresence } from "./temp-users";

type AdminUserRow = {
  email: string;
  plan: UserPlan;
  planPrice?: number;
  createdAt?: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
};

type AdminActivityRow = {
  email: string;
  type: string;
  plan?: UserPlan;
  receiverId?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
};

export type AdminSession = {
  email: string;
  plan: UserPlan;
};

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdmin(email?: string | null) {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await getCurrentSession();
  if (!session || !isSuperAdmin(session.email)) return null;
  return { email: session.email, plan: session.plan };
}

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function shortDate(date: Date) {
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}

function toIsoDate(value?: Date) {
  return value ? value.toISOString() : null;
}

export async function getAdminOverview() {
  noStore();

  const db = await getCheckhooksDb();
  const tempUsers = await listTempUserPresence();
  if (!db) {
    return {
      connected: false,
      cards: { totalUsers: 0, activeUsers: 0, tempUsers: tempUsers.length, proUsers: 0, freeUsers: 0, planRevenue: 0, receiverEvents: 0 },
      userTrend: [],
      requestTrend: [],
      tempUsers: tempUsers.slice(0, 8),
      recentUsers: [],
      recentActivities: [],
      system: getSystemSnapshot(false),
    };
  }

  const users = db.collection<AdminUserRow>("users");
  const activities = db.collection<AdminActivityRow>("user_activities");
  const activeSince = dateDaysAgo(7);
  const trendSince = dateDaysAgo(13);

  const [totalUsers, activeUsers, proUsers, receiverEvents, recentUsers, recentActivities, userTrendRows, requestTrendRows] = await Promise.all([
    users.countDocuments(),
    users.countDocuments({ lastLoginAt: { $gte: activeSince } }),
    users.countDocuments({ plan: "pro" }),
    activities.countDocuments({ type: "receiver_request" }),
    users.find({}, { projection: { passwordHash: 0 } }).sort({ createdAt: -1 }).limit(5).toArray(),
    activities.find({}).sort({ createdAt: -1 }).limit(8).toArray(),
    users
      .aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: trendSince } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    activities
      .aggregate<{ _id: string; count: number }>([
        { $match: { type: "receiver_request", createdAt: { $gte: trendSince } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
  ]);

  const trendDays = Array.from({ length: 14 }, (_, index) => {
    const date = dateDaysAgo(13 - index);
    const key = date.toISOString().slice(0, 10);
    return { key, label: shortDate(date) };
  });

  const userTrendMap = new Map(userTrendRows.map((row) => [row._id, row.count]));
  const requestTrendMap = new Map(requestTrendRows.map((row) => [row._id, row.count]));

  return {
    connected: true,
    cards: {
      totalUsers,
      activeUsers,
      tempUsers: tempUsers.length,
      proUsers,
      freeUsers: Math.max(totalUsers - proUsers, 0),
      planRevenue: proUsers * PRO_PRICE_USD,
      receiverEvents,
    },
    userTrend: trendDays.map((day) => ({ label: day.label, value: userTrendMap.get(day.key) ?? 0 })),
    requestTrend: trendDays.map((day) => ({ label: day.label, value: requestTrendMap.get(day.key) ?? 0 })),
    tempUsers: tempUsers.slice(0, 8),
    recentUsers: recentUsers.map((user) => ({
      email: user.email,
      plan: user.plan,
      createdAt: toIsoDate(user.createdAt),
      lastLoginAt: toIsoDate(user.lastLoginAt),
    })),
    recentActivities: recentActivities.map((activity) => ({
      email: activity.email,
      type: activity.type,
      plan: activity.plan ?? "free",
      receiverId: activity.receiverId ?? null,
      createdAt: toIsoDate(activity.createdAt),
    })),
    system: getSystemSnapshot(true),
  };
}

export async function getAdminUsers() {
  noStore();
  const db = await getCheckhooksDb();
  if (!db) return [];

  const users = await db
    .collection<AdminUserRow>("users")
    .find({}, { projection: { passwordHash: 0 } })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  return users.map((user) => ({
    email: user.email,
    plan: user.plan,
    planPrice: user.planPrice ?? PRO_PRICE_USD,
    createdAt: toIsoDate(user.createdAt),
    updatedAt: toIsoDate(user.updatedAt),
    lastLoginAt: toIsoDate(user.lastLoginAt),
  }));
}

export async function getAdminActivities(type?: string) {
  noStore();
  const db = await getCheckhooksDb();
  if (!db) return [];

  const filter = type ? { type } : {};
  const rows = await db.collection<AdminActivityRow>("user_activities").find(filter).sort({ createdAt: -1 }).limit(100).toArray();
  return rows.map((activity) => ({
    email: activity.email,
    type: activity.type,
    plan: activity.plan ?? "free",
    receiverId: activity.receiverId ?? null,
    metadata: activity.metadata ?? {},
    createdAt: toIsoDate(activity.createdAt),
  }));
}

function getSystemSnapshot(connected: boolean) {
  return {
    mongo: connected ? "Connected" : "Not connected",
    redis: process.env.REDIS_URL ? "Configured" : "Not configured",
    node: process.version,
    environment: process.env.NODE_ENV || "development",
    uptime: Math.round(process.uptime()),
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    adminEmails: getAdminEmails().length,
  };
}
