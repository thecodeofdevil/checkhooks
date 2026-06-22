import { Cpu, Database, HardDrive, Server, Wifi } from "lucide-react";

import { AdminPanel, MetricCard, MiniBarChart, StatusPill } from "../admin-ui";
import { getAdminOverview } from "@/lib/admin";

function formatUptime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export default async function AdminServerPage() {
  const overview = await getAdminOverview();
  const system = overview.system;
  const resourceRows = [
    { label: "Mongo", value: system.mongo === "Connected" ? 90 : 15 },
    { label: "Redis", value: system.redis === "Configured" ? 85 : 20 },
    { label: "Memory", value: Math.min(system.memoryMb, 100) },
    { label: "Runtime", value: Math.min(Math.round(system.uptime / 60), 100) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="MongoDB" value={system.mongo} detail="Primary CRM and activity store." tone={system.mongo === "Connected" ? "green" : "orange"} />
        <MetricCard label="Redis" value={system.redis} detail="Usage counters and quota cache." tone={system.redis === "Configured" ? "green" : "orange"} />
        <MetricCard label="Memory" value={`${system.memoryMb} MB`} detail="Current Node RSS memory." tone="blue" />
        <MetricCard label="Uptime" value={formatUptime(system.uptime)} detail={`Node ${system.node}`} tone="black" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <AdminPanel title="Server things" description="Lightweight operational view for services, runtime, and resource shape.">
          <MiniBarChart rows={resourceRows} />
        </AdminPanel>

        <AdminPanel title="Runtime checklist" description="Useful checks before production traffic.">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-3xl bg-[#fbfaf8] p-4"><span className="flex items-center gap-3 font-bold"><Database className="h-5 w-5 text-[#f6821f]" /> MongoDB URI</span><StatusPill tone={system.mongo === "Connected" ? "green" : "red"}>{system.mongo}</StatusPill></div>
            <div className="flex items-center justify-between rounded-3xl bg-[#fbfaf8] p-4"><span className="flex items-center gap-3 font-bold"><Wifi className="h-5 w-5 text-[#f6821f]" /> Redis URL</span><StatusPill tone={system.redis === "Configured" ? "green" : "red"}>{system.redis}</StatusPill></div>
            <div className="flex items-center justify-between rounded-3xl bg-[#fbfaf8] p-4"><span className="flex items-center gap-3 font-bold"><Server className="h-5 w-5 text-[#f6821f]" /> Environment</span><StatusPill>{system.environment}</StatusPill></div>
            <div className="flex items-center justify-between rounded-3xl bg-[#fbfaf8] p-4"><span className="flex items-center gap-3 font-bold"><Cpu className="h-5 w-5 text-[#f6821f]" /> Admin emails</span><StatusPill tone={system.adminEmails ? "green" : "red"}>{system.adminEmails}</StatusPill></div>
          </div>
        </AdminPanel>
      </div>

      <AdminPanel title="Suggested server pages" description="Extra admin menu ideas I would add next.">
        <div className="grid gap-4 md:grid-cols-3">
          {["Webhook abuse queue", "Redis quota browser", "Background job monitor"].map((item) => (
            <div key={item} className="rounded-3xl bg-[#fbfaf8] p-5">
              <HardDrive className="h-5 w-5 text-[#f6821f]" />
              <p className="mt-4 font-bold">{item}</p>
              <p className="mt-2 text-sm leading-6 text-[#777067]">Useful once receiver traffic grows and support workflows need deeper tooling.</p>
            </div>
          ))}
        </div>
      </AdminPanel>
    </div>
  );
}
