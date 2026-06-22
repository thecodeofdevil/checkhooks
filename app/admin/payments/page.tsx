import { CreditCard, ReceiptText } from "lucide-react";

import { AdminPanel, EmptyState, formatDate, MetricCard, StatusPill } from "../admin-ui";
import { getAdminActivities, getAdminOverview } from "@/lib/admin";

export default async function AdminPaymentsPage() {
  const [payments, overview] = await Promise.all([getAdminActivities("subscribe"), getAdminOverview()]);
  const total = payments.reduce((sum, payment) => sum + Number(payment.metadata.priceUsd ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Plan events" value={payments.length} detail="Recorded Pro activation events." tone="orange" />
        <MetricCard label="Tracked revenue" value={`$${total}`} detail="Revenue represented by payment history." tone="green" />
        <MetricCard label="MRR estimate" value={`$${overview.cards.planRevenue}`} detail="Current Pro users multiplied by plan price." tone="black" />
      </div>

      <AdminPanel title="Payment history" description="Plan activation trail for billing follow-up and customer success.">
        {payments.length ? (
          <div className="grid gap-4">
            {payments.map((payment, index) => (
              <article key={`${payment.email}-${payment.createdAt}-${index}`} className="admin-card grid gap-4 rounded-3xl border border-black/10 bg-[#fbfaf8] p-5 md:grid-cols-[auto_1fr_auto] md:items-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff0e2] text-[#c4510a]"><ReceiptText className="h-6 w-6" /></span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">{payment.email}</p>
                  <p className="mt-1 text-sm text-[#777067]">Activated Pro plan · {formatDate(payment.createdAt)}</p>
                  <p className="mt-3 inline-flex rounded-2xl bg-white px-3 py-2 text-xs font-bold text-[#6a645c]">Manual billing placeholder · connect Stripe later</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-3xl font-semibold tracking-[-0.05em]">${Number(payment.metadata.priceUsd ?? 0)}</p>
                  <div className="mt-2"><StatusPill tone="green">PAID</StatusPill></div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No payment events yet" text="When users activate Pro, their plan events will show here. Stripe invoices can be linked into this page later." />
        )}
      </AdminPanel>

      <AdminPanel title="Recommended billing pages" description="Useful CRM additions for the next iteration.">
        <div className="grid gap-4 md:grid-cols-3">
          {["Invoices and receipts", "Failed payment retries", "Coupons and plan overrides"].map((item) => (
            <div key={item} className="rounded-3xl bg-[#fbfaf8] p-5">
              <CreditCard className="h-5 w-5 text-[#f6821f]" />
              <p className="mt-4 font-bold">{item}</p>
              <p className="mt-2 text-sm leading-6 text-[#777067]">Good future admin menu item once a payment provider is connected.</p>
            </div>
          ))}
        </div>
      </AdminPanel>
    </div>
  );
}
