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

type AdminPaymentRow = {
  email: string;
  paymentId: string;
  orderId: string;
  provider: string;
  amount: number;
  amountUsd: number;
  currency: string;
  status: string;
  method: string;
  invoiceId: string;
  invoiceUrl: string;
  createdAt: string | null;
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

function monthStart() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function numberValue(value: unknown, fallback = 0) {
  const nextValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function paymentAmountUsd(metadata: Record<string, unknown>) {
  const priceUsd = numberValue(metadata.priceUsd, NaN);
  if (Number.isFinite(priceUsd) && priceUsd > 0) return priceUsd;
  const amount = numberValue(metadata.amount, 0);
  const currency = stringValue(metadata.currency).toUpperCase() || "USD";
  return currency === "USD" ? amount / 100 : PRO_PRICE_USD;
}

function toPaymentRow(activity: AdminActivityRow): AdminPaymentRow {
  const metadata = activity.metadata ?? {};
  return {
    email: activity.email,
    paymentId: stringValue(metadata.paymentId),
    orderId: stringValue(metadata.orderId),
    provider: stringValue(metadata.provider) || "razorpay",
    amount: numberValue(metadata.amount, PRO_PRICE_USD * 100),
    amountUsd: paymentAmountUsd(metadata),
    currency: stringValue(metadata.currency) || "USD",
    status: stringValue(metadata.status) || "captured",
    method: stringValue(metadata.method) || "checkout",
    invoiceId: stringValue(metadata.invoiceId),
    invoiceUrl: stringValue(metadata.invoiceUrl),
    createdAt: toIsoDate(activity.createdAt),
  };
}

export async function getAdminOverview() {
  noStore();

  const db = await getCheckhooksDb();
  const tempUsers = await listTempUserPresence();
  if (!db) {
    return {
      connected: false,
      cards: { totalUsers: 0, activeUsers: 0, tempUsers: tempUsers.length, proUsers: 0, freeUsers: 0, planRevenue: 0, receiverEvents: 0, currentMonthActiveProUsers: 0, currentMonthRevenue: 0, totalRevenue: 0, paymentCount: 0 },
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
  const currentMonthStart = monthStart();

  const [totalUsers, activeUsers, proUsers, currentMonthActiveProUsers, receiverEvents, paymentActivities, recentUsers, recentActivities, userTrendRows, requestTrendRows] = await Promise.all([
    users.countDocuments(),
    users.countDocuments({ lastLoginAt: { $gte: activeSince } }),
    users.countDocuments({ plan: "pro" }),
    users.countDocuments({ plan: "pro", lastLoginAt: { $gte: currentMonthStart } }),
    activities.countDocuments({ type: "receiver_request" }),
    activities.find({ type: "subscribe" }).sort({ createdAt: -1 }).limit(500).toArray(),
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
  const payments = paymentActivities.map(toPaymentRow);
  const totalRevenue = payments.reduce((sum, payment) => sum + payment.amountUsd, 0);
  const currentMonthRevenue = payments
    .filter((payment) => payment.createdAt && new Date(payment.createdAt) >= currentMonthStart)
    .reduce((sum, payment) => sum + payment.amountUsd, 0);

  return {
    connected: true,
    cards: {
      totalUsers,
      activeUsers,
      tempUsers: tempUsers.length,
      proUsers,
      freeUsers: Math.max(totalUsers - proUsers, 0),
      planRevenue: proUsers * PRO_PRICE_USD,
      currentMonthActiveProUsers,
      currentMonthRevenue,
      totalRevenue,
      paymentCount: payments.length,
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

export async function getAdminPayments() {
  noStore();
  const db = await getCheckhooksDb();
  if (!db) {
    return {
      payments: [] as AdminPaymentRow[],
      clientTotals: [] as Array<{ email: string; totalPaid: number; payments: number; lastPaidAt: string | null; status: string }>,
      totals: { totalRevenue: 0, currentMonthRevenue: 0, currentMonthPayments: 0, paymentCount: 0 },
    };
  }

  const currentMonthStart = monthStart();
  const activities = await db.collection<AdminActivityRow>("user_activities")
    .find({ type: "subscribe" })
    .sort({ createdAt: -1 })
    .limit(500)
    .toArray();
  const payments = activities.map(toPaymentRow);
  const clientMap = new Map<string, { email: string; totalPaid: number; payments: number; lastPaidAt: string | null; status: string }>();

  for (const payment of payments) {
    const existing = clientMap.get(payment.email) ?? { email: payment.email, totalPaid: 0, payments: 0, lastPaidAt: null, status: payment.status };
    existing.totalPaid += payment.amountUsd;
    existing.payments += 1;
    existing.status = payment.status;
    if (!existing.lastPaidAt || (payment.createdAt && new Date(payment.createdAt) > new Date(existing.lastPaidAt))) {
      existing.lastPaidAt = payment.createdAt;
    }
    clientMap.set(payment.email, existing);
  }

  return {
    payments,
    clientTotals: Array.from(clientMap.values()).sort((left, right) => right.totalPaid - left.totalPaid),
    totals: {
      totalRevenue: payments.reduce((sum, payment) => sum + payment.amountUsd, 0),
      currentMonthRevenue: payments.filter((payment) => payment.createdAt && new Date(payment.createdAt) >= currentMonthStart).reduce((sum, payment) => sum + payment.amountUsd, 0),
      currentMonthPayments: payments.filter((payment) => payment.createdAt && new Date(payment.createdAt) >= currentMonthStart).length,
      paymentCount: payments.length,
    },
  };
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
