import { ArrowUpRight } from "lucide-react";

export function MetricCard({ label, value, detail, tone = "orange" }: { label: string; value: string | number; detail: string; tone?: "orange" | "green" | "black" | "blue" }) {
  const tones = {
    orange: "bg-[#fff0e2] text-[#c4510a]",
    green: "bg-[#e9f8f1] text-[#16845f]",
    black: "bg-[#191714] text-white",
    blue: "bg-[#eaf3ff] text-[#2267a8]",
  };

  return (
    <article className="admin-card rounded-[28px] border border-black/10 bg-white p-5 shadow-[0_20px_60px_rgba(31,27,22,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#777067]">{label}</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.06em]">{value}</h2>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>
          <ArrowUpRight className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#6a645c]">{detail}</p>
    </article>
  );
}

export function AdminPanel({ title, description, children, action }: { title: string; description?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="admin-card rounded-[30px] border border-black/10 bg-white p-5 shadow-[0_20px_60px_rgba(31,27,22,0.06)] sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.04em]">{title}</h2>
          {description ? <p className="mt-2 text-sm leading-6 text-[#6a645c]">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function MiniBarChart({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#151515] p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(246,130,31,0.22),transparent_28%)]" />
      <div className="relative mb-4 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/42">14 day trend</p>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/70">Peak {max}</span>
      </div>
      <div className="relative flex h-60 items-end gap-2">
      {rows.map((row) => (
        <div key={row.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div className="group flex h-44 w-full items-end rounded-full bg-white/[0.07] p-1">
            <div className="relative w-full rounded-full bg-gradient-to-t from-[#f6821f] via-[#ff9d4d] to-[#73e2b5] shadow-[0_0_28px_rgba(246,130,31,0.35)] transition-all group-hover:brightness-125" style={{ height: `${Math.max((row.value / max) * 100, row.value ? 8 : 3)}%` }}>
              <span className="absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded-lg bg-white px-2 py-1 text-[10px] font-black text-[#151515] group-hover:block">{row.value}</span>
            </div>
          </div>
          <span className="max-w-full truncate text-[10px] font-bold text-white/42">{row.label}</span>
        </div>
      ))}
      </div>
    </div>
  );
}

export function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "orange" | "red" }) {
  const tones = {
    neutral: "bg-[#f3efe9] text-[#6a645c]",
    green: "bg-[#e9f8f1] text-[#16845f]",
    orange: "bg-[#fff0e2] text-[#c4510a]",
    red: "bg-[#fff3f1] text-[#b7352b]",
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-black/15 bg-[#fbfaf8] p-8 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#777067]">{text}</p>
    </div>
  );
}

export function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
