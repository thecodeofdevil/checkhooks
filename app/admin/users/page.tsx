import { AdminPanel, EmptyState, formatDate, MetricCard, StatusPill } from "../admin-ui";
import { getAdminOverview, getAdminUsers } from "@/lib/admin";

export default async function AdminUsersPage() {
  const [users, overview] = await Promise.all([getAdminUsers(), getAdminOverview()]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="All users" value={overview.cards.totalUsers} detail="Total user records in MongoDB." tone="black" />
        <MetricCard label="Free users" value={overview.cards.freeUsers} detail="Accounts on the free plan." tone="blue" />
        <MetricCard label="Pro users" value={overview.cards.proUsers} detail="Accounts currently on Pro." tone="orange" />
      </div>

      <AdminPanel title="User management" description="CRM-style user table with plan, account age, and activity recency.">
        {users.length ? (
          <div className="overflow-hidden rounded-3xl border border-black/10">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead className="bg-[#151515] text-white">
                <tr>
                  <th className="px-5 py-4 font-bold">User</th>
                  <th className="px-5 py-4 font-bold">Plan</th>
                  <th className="px-5 py-4 font-bold">Price</th>
                  <th className="px-5 py-4 font-bold">Created</th>
                  <th className="px-5 py-4 font-bold">Last login</th>
                  <th className="px-5 py-4 font-bold">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 bg-white">
                {users.map((user) => (
                  <tr key={user.email} className="hover:bg-[#fbfaf8]">
                    <td className="px-5 py-4 font-bold">{user.email}</td>
                    <td className="px-5 py-4"><StatusPill tone={user.plan === "pro" ? "orange" : "neutral"}>{user.plan.toUpperCase()}</StatusPill></td>
                    <td className="px-5 py-4 text-[#6a645c]">${user.planPrice}/mo</td>
                    <td className="px-5 py-4 text-[#6a645c]">{formatDate(user.createdAt)}</td>
                    <td className="px-5 py-4 text-[#6a645c]">{formatDate(user.lastLoginAt)}</td>
                    <td className="px-5 py-4 text-[#6a645c]">{formatDate(user.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No users found" text="MongoDB has no users yet, or the database is not connected." />}
      </AdminPanel>
    </div>
  );
}
