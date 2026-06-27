import Link from "next/link";
import { Activity, CreditCard, Server, TrendingUp } from "lucide-react";

import { AdminPanel, EmptyState, formatDate, MetricCard, MiniBarChart, StatusPill } from "./admin-ui";
import { getAdminOverview, getAdminPayments } from "@/lib/admin";

function money(value: number) {
  return `$${value.toLocaleString("en", { maximumFractionDigits: 2 })}`;
}

export default async function AdminDashboardPage() {
  const [overview, billing] = await Promise.all([getAdminOverview(), getAdminPayments()]);

  return (
    <div className="space-y-6">
      {!overview.connected ? <EmptyState title="Data Collection is not connected" text="Add Data Collection settings to load live CRM users, activity history, payment events, and receiver metrics." /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total users" value={overview.cards.totalUsers} detail="All accounts created in Data Collection." tone="black" />
        <MetricCard label="Active Pro users" value={overview.cards.currentMonthActiveProUsers} detail="Pro clients active in the current month." tone="green" />
        <MetricCard label="Month payments" value={money(overview.cards.currentMonthRevenue)} detail={`${billing.totals.currentMonthPayments} Pro payments received this month.`} tone="orange" />
        <MetricCard label="Total received" value={money(overview.cards.totalRevenue)} detail={`${overview.cards.paymentCount} verified payment events.`} tone="blue" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Current Pro users" value={overview.cards.proUsers} detail={`${overview.cards.freeUsers} free users remain.`} tone="orange" />
        <MetricCard label="MRR estimate" value={money(overview.cards.planRevenue)} detail="Current Pro users multiplied by plan price." tone="black" />
        <MetricCard label="Active users" value={overview.cards.activeUsers} detail="Users with a login in the last 7 days." tone="green" />
        <MetricCard label="Temp users" value={overview.cards.tempUsers} detail="Anonymous workspaces active in Cache Storage." tone="blue" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <AdminPanel title="User growth" description="New accounts created over the last 14 days." action={<Link href="/admin/users" className="rounded-xl bg-[#151515] px-4 py-2 text-sm font-bold text-white">View users</Link>}>
          <MiniBarChart rows={overview.userTrend} />
        </AdminPanel>
        <AdminPanel title="Receiver traffic" description="Receiver request volume from logged activity.">
          <MiniBarChart rows={overview.requestTrend} />
        </AdminPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <AdminPanel title="Client payment leaderboard" description="How much each client has paid till now." action={<Link href="/admin/payments" className="rounded-xl bg-[#151515] px-4 py-2 text-sm font-bold text-white">Open payments</Link>}>
          <div className="space-y-3">
            {billing.clientTotals.length ? billing.clientTotals.slice(0, 6).map((client) => (
              <div key={client.email} className="grid gap-3 rounded-2xl bg-[#fbfaf8] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate font-bold">{client.email}</p>
                  <p className="mt-1 text-xs text-[#777067]">{client.payments} payment{client.payments === 1 ? "" : "s"} · last paid {formatDate(client.lastPaidAt)}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-2xl font-semibold tracking-[-0.04em]">{money(client.totalPaid)}</p>
                  <StatusPill tone="green">{client.status.toUpperCase()}</StatusPill>
                </div>
              </div>
            )) : <EmptyState title="No paid clients yet" text="Paid clients appear here after Razorpay verification." />}
          </div>
        </AdminPanel>

        <AdminPanel title="Revenue snapshot" description="Current month revenue, lifetime payments, and Pro account health.">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-[#151515] p-5 text-white"><TrendingUp className="h-5 w-5 text-[#f6821f]" /><p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-white/45">This month</p><b className="mt-2 block text-4xl tracking-[-0.06em]">{money(billing.totals.currentMonthRevenue)}</b></div>
            <div className="rounded-3xl bg-[#fbfaf8] p-5"><CreditCard className="h-5 w-5 text-[#f6821f]" /><p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[#777067]">Lifetime</p><b className="mt-2 block text-4xl tracking-[-0.06em]">{money(billing.totals.totalRevenue)}</b></div>
            <div className="rounded-3xl bg-[#fbfaf8] p-5"><Activity className="h-5 w-5 text-[#16845f]" /><p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[#777067]">Active Pro</p><b className="mt-2 block text-4xl tracking-[-0.06em]">{overview.cards.currentMonthActiveProUsers}</b></div>
          </div>
        </AdminPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <AdminPanel title="Live temp users" description="Anonymous visitors stored in Cache Storage and removed on page leave or TTL expiry.">
          <div className="space-y-3">
            {overview.tempUsers.length ? overview.tempUsers.map((tempUser) => (
              <div key={tempUser.id} className="rounded-2xl bg-[#fbfaf8] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{tempUser.receiverId}</p>
                    <p className="mt-1 text-xs text-[#777067]">Last seen {formatDate(tempUser.lastSeenAt)}</p>
                  </div>
                  <StatusPill tone="green">LIVE</StatusPill>
                </div>
                <p className="mt-3 truncate rounded-xl bg-white px-3 py-2 text-xs text-[#777067]">{tempUser.userAgent}</p>
              </div>
            )) : <EmptyState title="No temp users live" text="Anonymous visitors appear here while the app page is open." />}
          </div>
        </AdminPanel>
        <AdminPanel title="Recent users" description="Latest accounts entering the CRM.">
          <div className="space-y-3">
            {overview.recentUsers.length ? overview.recentUsers.map((user) => (
              <div key={user.email} className="flex items-center justify-between gap-4 rounded-2xl bg-[#fbfaf8] p-4">
                <div className="min-w-0">
                  <p className="truncate font-bold">{user.email}</p>
                  <p className="mt-1 text-xs text-[#777067]">Joined {formatDate(user.createdAt)}</p>
                </div>
                <StatusPill tone={user.plan === "pro" ? "orange" : "neutral"}>{user.plan.toUpperCase()}</StatusPill>
              </div>
            )) : <EmptyState title="No users yet" text="Create accounts from the signup page to populate this table." />}
          </div>
        </AdminPanel>

        <AdminPanel title="Latest activity" description="Operational trail across login, receiver, and plan events.">
          <div className="space-y-3">
            {overview.recentActivities.length ? overview.recentActivities.map((activity, index) => (
              <div key={`${activity.email}-${activity.createdAt}-${index}`} className="grid gap-3 rounded-2xl bg-[#fbfaf8] p-4 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <p className="truncate font-bold">{activity.email}</p>
                  <p className="mt-1 text-xs text-[#777067]">{activity.type.replace(/_/g, " ")} · {formatDate(activity.createdAt)}</p>
                </div>
                <StatusPill tone={activity.type === "receiver_request" ? "green" : "orange"}>{activity.plan.toUpperCase()}</StatusPill>
              </div>
            )) : <EmptyState title="No activity yet" text="Logins, receiver registrations, and receiver requests will appear here." />}
          </div>
        </AdminPanel>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/active-users" className="admin-card rounded-[28px] border border-black/10 bg-white p-5 transition hover:-translate-y-1"><Activity className="h-5 w-5 text-[#f6821f]" /><h3 className="mt-5 text-xl font-semibold">Active user details</h3><p className="mt-2 text-sm text-[#6a645c]">Inspect current user engagement signals.</p></Link>
        <Link href="/admin/payments" className="admin-card rounded-[28px] border border-black/10 bg-white p-5 transition hover:-translate-y-1"><CreditCard className="h-5 w-5 text-[#f6821f]" /><h3 className="mt-5 text-xl font-semibold">Payment history</h3><p className="mt-2 text-sm text-[#6a645c]">Review Pro plan activation events.</p></Link>
        <Link href="/admin/server" className="admin-card rounded-[28px] border border-black/10 bg-white p-5 transition hover:-translate-y-1"><Server className="h-5 w-5 text-[#f6821f]" /><h3 className="mt-5 text-xl font-semibold">Server health</h3><p className="mt-2 text-sm text-[#6a645c]">Check Data Collection, Cache Storage, memory, and runtime.</p></Link>
      </div>
    </div>
  );
}
