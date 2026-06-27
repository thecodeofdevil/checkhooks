import { CreditCard, ExternalLink, ReceiptText, Users } from "lucide-react";

import { AdminPanel, EmptyState, formatDate, MetricCard, StatusPill } from "../admin-ui";
import { getAdminOverview, getAdminPayments } from "@/lib/admin";

function money(value: number) {
  return `$${value.toLocaleString("en", { maximumFractionDigits: 2 })}`;
}

export default async function AdminPaymentsPage() {
  const [billing, overview] = await Promise.all([getAdminPayments(), getAdminOverview()]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active Pro users" value={overview.cards.proUsers} detail={`${overview.cards.currentMonthActiveProUsers} active this month.`} tone="orange" />
        <MetricCard label="This month" value={money(billing.totals.currentMonthRevenue)} detail={`${billing.totals.currentMonthPayments} payments received this month.`} tone="green" />
        <MetricCard label="Total received" value={money(billing.totals.totalRevenue)} detail={`${billing.totals.paymentCount} verified payment records.`} tone="blue" />
        <MetricCard label="MRR estimate" value={money(overview.cards.planRevenue)} detail="Current Pro users multiplied by plan price." tone="black" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <AdminPanel title="Client payment totals" description="See each client and how much they have paid till now.">
          {billing.clientTotals.length ? (
            <div className="space-y-3">
              {billing.clientTotals.map((client) => (
                <article key={client.email} className="grid gap-3 rounded-3xl bg-[#fbfaf8] p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff0e2] text-[#c4510a]"><Users className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <p className="truncate font-bold">{client.email}</p>
                    <p className="mt-1 text-sm text-[#777067]">{client.payments} payment{client.payments === 1 ? "" : "s"} · last paid {formatDate(client.lastPaidAt)}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-2xl font-semibold tracking-[-0.05em]">{money(client.totalPaid)}</p>
                    <StatusPill tone="green">{client.status.toUpperCase()}</StatusPill>
                  </div>
                </article>
              ))}
            </div>
          ) : <EmptyState title="No paid clients yet" text="Client payment totals appear after Pro activation." />}
        </AdminPanel>

        <AdminPanel title="Payment health" description="High-level revenue signals for the current month.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-[#151515] p-6 text-white"><p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">Current month active Pro</p><b className="mt-4 block text-5xl tracking-[-0.07em]">{overview.cards.currentMonthActiveProUsers}</b><p className="mt-3 text-sm text-white/55">Pro clients with activity this month.</p></div>
            <div className="rounded-3xl bg-[#fbfaf8] p-6"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#777067]">Lifetime paid clients</p><b className="mt-4 block text-5xl tracking-[-0.07em]">{billing.clientTotals.length}</b><p className="mt-3 text-sm text-[#777067]">Unique clients with verified payment records.</p></div>
          </div>
        </AdminPanel>
      </div>

      <AdminPanel title="Payment history" description="Verified Razorpay payment trail with invoice links when Razorpay returns one.">
        {billing.payments.length ? (
          <div className="grid gap-4">
            {billing.payments.map((payment, index) => (
              <article key={`${payment.email}-${payment.paymentId}-${payment.createdAt}-${index}`} className="admin-card grid gap-4 rounded-3xl border border-black/10 bg-[#fbfaf8] p-5 md:grid-cols-[auto_1fr_auto] md:items-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff0e2] text-[#c4510a]"><ReceiptText className="h-6 w-6" /></span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">{payment.email}</p>
                  <p className="mt-1 text-sm text-[#777067]">Activated Pro plan · {formatDate(payment.createdAt)}</p>
                  <p className="mt-3 break-all rounded-2xl bg-white px-3 py-2 text-xs font-bold text-[#6a645c]">{payment.provider} · Order {payment.orderId || "N/A"} · Payment {payment.paymentId || "N/A"}</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-3xl font-semibold tracking-[-0.05em]">{money(payment.amountUsd)}</p>
                  <div className="mt-2"><StatusPill tone="green">PAID</StatusPill></div>
                  {payment.invoiceUrl ? <a href={payment.invoiceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#c4510a]">Invoice <ExternalLink className="h-3.5 w-3.5" /></a> : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No payment events yet" text="When users activate Pro through Razorpay, their payment events and available invoice links will show here." />
        )}
      </AdminPanel>

      <AdminPanel title="Billing operations" description="Functional follow-up areas for production billing support.">
        <div className="grid gap-4 md:grid-cols-3">
          {["Invoice follow-up", "Failed payment review", "Manual plan overrides"].map((item) => (
            <div key={item} className="rounded-3xl bg-[#fbfaf8] p-5">
              <CreditCard className="h-5 w-5 text-[#f6821f]" />
              <p className="mt-4 font-bold">{item}</p>
              <p className="mt-2 text-sm leading-6 text-[#777067]">Use this page with Settings plan override to support real customer billing cases.</p>
            </div>
          ))}
        </div>
      </AdminPanel>
    </div>
  );
}
