"use client";

import { useState } from "react";
import { Check, Loader2, ShieldCheck } from "lucide-react";

export function PlanOverrideControl({ email, currentPlan, compact = false }: { email?: string; currentPlan?: "free" | "pro"; compact?: boolean }) {
  const [targetEmail, setTargetEmail] = useState(email ?? "");
  const [plan, setPlan] = useState<"free" | "pro">(currentPlan ?? "pro");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const updatePlan = async () => {
    setLoading(true);
    setMessage("Updating plan...");
    try {
      const response = await fetch("/api/admin/users/plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, plan }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(String(data.error ?? "Unable to update plan."));
      setMessage(`${data.email} is now ${String(data.plan).toUpperCase()}. Refresh to see updated totals.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update plan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={compact ? "flex flex-wrap items-center gap-2" : "rounded-3xl border border-black/10 bg-[#fbfaf8] p-5"}>
      {!compact ? (
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff0e2] text-[#c4510a]"><ShieldCheck className="h-5 w-5" /></span>
          <div>
            <h3 className="font-bold">Plan override</h3>
            <p className="text-sm text-[#777067]">Promote or downgrade a user manually.</p>
          </div>
        </div>
      ) : null}
      <input value={targetEmail} onChange={(event) => setTargetEmail(event.target.value)} disabled={Boolean(email)} placeholder="client@email.com" className="min-w-0 rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#f6821f]" />
      <select value={plan} onChange={(event) => setPlan(event.target.value === "pro" ? "pro" : "free")} className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#f6821f]">
        <option value="pro">Pro</option>
        <option value="free">Free</option>
      </select>
      <button type="button" onClick={updatePlan} disabled={loading || !targetEmail.trim()} className="inline-flex items-center gap-2 rounded-2xl bg-[#151515] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Update
      </button>
      {message ? <p className={compact ? "w-full text-xs text-[#777067]" : "mt-3 text-sm text-[#777067]"}>{message}</p> : null}
    </div>
  );
}
