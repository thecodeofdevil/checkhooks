import { Bell, KeyRound, ShieldCheck, SlidersHorizontal, UsersRound } from "lucide-react";

import { AdminPanel, MetricCard, StatusPill } from "../admin-ui";
import { getAdminOverview } from "@/lib/admin";

export default async function AdminSettingsPage() {
  const overview = await getAdminOverview();
  const settings = [
    { label: "Super admin access", value: "ADMIN_EMAILS", text: "Comma-separated list of allowed admin emails.", icon: ShieldCheck, status: overview.system.adminEmails ? "Configured" : "Missing" },
    { label: "Plan price", value: "PRO_PLAN_PRICE_USD", text: "Monthly Pro plan price shown across app and admin.", icon: SlidersHorizontal, status: "$5 default" },
    { label: "Mongo activity", value: "MONGODB_URI", text: "Stores user accounts and CRM activity trail.", icon: UsersRound, status: overview.system.mongo },
    { label: "Redis counters", value: "REDIS_URL", text: "Stores temporary receiver counters and quota windows.", icon: KeyRound, status: overview.system.redis },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Admin emails" value={overview.system.adminEmails} detail="Emails allowed into this dashboard." tone={overview.system.adminEmails ? "green" : "orange"} />
        <MetricCard label="Environment" value={overview.system.environment} detail="Current runtime environment." tone="black" />
        <MetricCard label="Plan price" value="$5" detail="Default Pro monthly price." tone="orange" />
      </div>

      <AdminPanel title="Admin settings" description="Configuration items that power the CRM panel and plan controls.">
        <div className="grid gap-4 md:grid-cols-2">
          {settings.map(({ label, value, text, icon: Icon, status }) => (
            <div key={value} className="rounded-3xl border border-black/10 bg-[#fbfaf8] p-5">
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff0e2] text-[#c4510a]"><Icon className="h-5 w-5" /></span>
                <StatusPill tone={status === "Missing" || status === "Not connected" || status === "Not configured" ? "red" : "green"}>{status}</StatusPill>
              </div>
              <h2 className="mt-5 text-xl font-semibold">{label}</h2>
              <p className="mt-2 font-mono text-xs font-bold text-[#c4510a]">{value}</p>
              <p className="mt-3 text-sm leading-6 text-[#6a645c]">{text}</p>
            </div>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel title="More CRM pages I recommend" description="Good next menu items for a production-grade super admin system.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            "Support inbox",
            "Receiver abuse review",
            "API key management",
            "Team roles and permissions",
            "Feature flags",
            "Email campaigns",
            "Invoices",
            "Audit log exports",
          ].map((item) => (
            <div key={item} className="rounded-3xl bg-[#fbfaf8] p-5">
              <Bell className="h-5 w-5 text-[#f6821f]" />
              <p className="mt-4 font-bold">{item}</p>
              <p className="mt-2 text-sm leading-6 text-[#777067]">Useful admin surface as Checkhooks grows.</p>
            </div>
          ))}
        </div>
      </AdminPanel>
    </div>
  );
}
