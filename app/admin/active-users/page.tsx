import { Activity, Clock, Radio } from "lucide-react";

import { AdminPanel, EmptyState, formatDate, MetricCard, StatusPill } from "../admin-ui";
import { getAdminActivities, getAdminOverview, getAdminUsers } from "@/lib/admin";

function isActive(lastLoginAt: string | null) {
  if (!lastLoginAt) return false;
  return Date.now() - new Date(lastLoginAt).getTime() <= 7 * 24 * 60 * 60 * 1000;
}

export default async function AdminActiveUsersPage() {
  const [users, activities, overview] = await Promise.all([getAdminUsers(), getAdminActivities(), getAdminOverview()]);
  const activeUsers = users.filter((user) => isActive(user.lastLoginAt));
  const requestActivities = activities.filter((activity) => activity.type === "receiver_request").slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Active users" value={activeUsers.length} detail="Logged in during the last 7 days." tone="green" />
        <MetricCard label="Temp users" value={overview.cards.tempUsers} detail="Anonymous Redis presence right now." tone="blue" />
        <MetricCard label="Receiver events" value={overview.cards.receiverEvents} detail="Total receiver activity records." tone="orange" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <AdminPanel title="Active user's details" description="Users with recent login sessions, sorted by last login.">
          <div className="space-y-3">
            {activeUsers.length ? activeUsers.map((user) => (
              <div key={user.email} className="grid gap-3 rounded-3xl bg-[#fbfaf8] p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e9f8f1] text-[#16845f]"><Radio className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <p className="truncate font-bold">{user.email}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-[#777067]"><Clock className="h-3.5 w-3.5" /> Last login {formatDate(user.lastLoginAt)}</p>
                </div>
                <StatusPill tone={user.plan === "pro" ? "orange" : "green"}>{user.plan.toUpperCase()}</StatusPill>
              </div>
            )) : <EmptyState title="No active users" text="Users appear here after logging in during the last 7 days." />}
          </div>
        </AdminPanel>

        <AdminPanel title="Recent receiver activity" description="Latest receiver request records from active workflows.">
          <div className="space-y-3">
            {requestActivities.length ? requestActivities.map((activity, index) => (
              <div key={`${activity.email}-${activity.createdAt}-${index}`} className="rounded-3xl bg-[#fbfaf8] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{activity.email}</p>
                    <p className="mt-1 text-xs text-[#777067]">{formatDate(activity.createdAt)}</p>
                  </div>
                  <Activity className="h-5 w-5 text-[#f6821f]" />
                </div>
                <p className="mt-3 truncate rounded-2xl bg-white px-3 py-2 font-mono text-xs text-[#6a645c]">{activity.receiverId ?? "No receiver id"}</p>
              </div>
            )) : <EmptyState title="No receiver activity" text="Receiver request activity logs will appear once account-linked receivers receive requests." />}
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}
