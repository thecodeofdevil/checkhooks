"use client";

import Link from "next/link";
import { ArrowRight, Check, Gauge, Rocket, ShieldCheck, Sparkles, Webhook, X } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";

const proFeatures = [
  "1,000,000 accepted requests per receiver",
  "1,200 requests per minute",
  "Data Collection activity trail",
  "Cache Storage-backed receiver counters",
  "Realtime socket-powered inspector",
  "Higher-volume integration testing",
];

const comparisonRows = [
  { feature: "Receiver quota", free: "10K / receiver", pro: "1M / receiver" },
  { feature: "Rate limit", free: "120 / minute", pro: "1,200 / minute" },
  { feature: "Realtime inspector", free: true, pro: true },
  { feature: "Temporary receiver stats", free: true, pro: true },
  { feature: "Data Collection activity log", free: false, pro: true },
  { feature: "Account-linked receivers", free: false, pro: true },
  { feature: "Best fit", free: "Local testing", pro: "Growing integrations" },
];

function Included({ value }: { value: string | boolean }) {
  if (typeof value === "string") return <span>{value}</span>;
  return value
    ? <span className="inline-flex items-center gap-2 font-bold text-[#16845f]"><Check className="h-4 w-4" /> Included</span>
    : <span className="inline-flex items-center gap-2 text-[#9b9188]"><X className="h-4 w-4" /> Not included</span>;
}

export default function PlanPage() {
  return (
    <main className="theme-page min-h-screen bg-[#f7f5f2] text-[#191714]">
      <SiteHeader />

      <section className="relative overflow-hidden px-5 py-16 sm:px-8 lg:py-24">
        <div className="absolute left-[-160px] top-10 h-80 w-80 rounded-full bg-[#f6821f]/20 blur-[90px]" />
        <div className="absolute right-[-180px] top-24 h-96 w-96 rounded-full bg-[#16845f]/10 blur-[110px]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3.5 py-2 text-xs font-bold text-[#4d4943] shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-[#f6821f]" /> Simple pricing for checkhook testing
            </div>
            <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-[#c4510a]">Plan</p>
            <h1 className="mt-4 text-5xl font-semibold leading-none tracking-[-0.06em] sm:text-7xl">Scale receivers when your tests get serious.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#655f57]">Start with a generous free receiver. Upgrade to Pro for higher request volume, account-linked history, and a cleaner operational trail.</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <article className="rounded-[28px] border border-black/10 bg-white/75 p-6 shadow-[0_24px_70px_rgba(31,27,22,0.08)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#777067]">Free</p>
                  <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">$0</h2>
                </div>
                <span className="rounded-full bg-[#eef7f3] px-3 py-1 text-xs font-bold text-[#16845f]">Start here</span>
              </div>
              <p className="mt-5 text-sm leading-7 text-[#6a645c]">Best for quick debugging, local development, and temporary receiver inspection.</p>
              <div className="mt-6 grid gap-3">
                {["10,000 requests per receiver", "120 requests per minute", "Realtime request inspector", "No login required"].map((feature) => (
                  <div key={feature} className="flex items-center gap-3 rounded-xl border border-black/10 bg-[#fbfaf8] p-3 text-sm font-semibold"><Check className="h-4 w-4 text-[#16845f]" /> {feature}</div>
                ))}
              </div>
              <Link href="/app" className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#171717] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#f6821f]">Try Free <ArrowRight className="h-4 w-4" /></Link>
            </article>

            <article className="relative overflow-hidden rounded-[28px] border border-[#f6821f]/30 bg-[#191714] p-6 text-white shadow-[0_34px_100px_rgba(246,130,31,0.22)]">
              <div className="absolute right-[-90px] top-[-90px] h-56 w-56 rounded-full bg-[#f6821f]/35 blur-[70px]" />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ffb071]">Pro</p>
                    <h2 className="mt-3 text-5xl font-semibold tracking-[-0.06em]">$5 <span className="text-base font-medium text-white/50">/ month</span></h2>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#b84b08]">Popular</span>
                </div>
                <p className="mt-5 text-sm leading-7 text-white/68">For higher-volume receiver testing with account-level activity history and stronger operational visibility.</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {proFeatures.map((feature) => (
                    <div key={feature} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.055] p-3 text-sm leading-6 text-white/86"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#73e2b5]" /> {feature}</div>
                  ))}
                </div>
                <Link href="/signup" className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#f6821f] px-5 py-3 font-bold text-white transition hover:bg-[#db6512]">
                  Sign up to activate Pro <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="mt-4 text-center text-sm text-white/58">Create an account first, then complete payment from your Subscription page.</p>
              </div>
            </article>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-black/10 bg-white/75 p-5 backdrop-blur"><Gauge className="h-5 w-5 text-[#c4510a]" /><h3 className="mt-4 font-semibold">Fast counters</h3><p className="mt-2 text-sm leading-6 text-[#6a645c]">Cache Storage tracks quota and minute windows without slowing inspection.</p></div>
            <div className="rounded-2xl border border-black/10 bg-white/75 p-5 backdrop-blur"><Webhook className="h-5 w-5 text-[#c4510a]" /><h3 className="mt-4 font-semibold">Live stream</h3><p className="mt-2 text-sm leading-6 text-[#6a645c]">Socket-powered receiver events appear in the inspector instantly.</p></div>
            <div className="rounded-2xl border border-black/10 bg-white/75 p-5 backdrop-blur"><ShieldCheck className="h-5 w-5 text-[#c4510a]" /><h3 className="mt-4 font-semibold">Activity trail</h3><p className="mt-2 text-sm leading-6 text-[#6a645c]">Logged-in activity is saved to Data Collection for account history.</p></div>
          </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-white px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c4510a]">Compare</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">Free vs Pro</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-[#6a645c]">Cleaner numbers, clearer ownership, and a better path when temporary testing turns into daily integration work.</p>
          </div>
          <div className="hidden overflow-hidden rounded-[24px] border border-black/10 bg-[#fbfaf8] shadow-[0_22px_70px_rgba(31,27,22,0.07)] sm:block">
            <div className="grid grid-cols-[1.05fr_0.95fr_0.95fr] bg-[#191714] text-sm font-bold text-white">
              <div className="p-5">Capability</div>
              <div className="border-l border-white/10 p-5">Free</div>
              <div className="border-l border-white/10 bg-[#f6821f] p-5">Pro</div>
            </div>
            {comparisonRows.map((row) => (
              <div key={row.feature} className="grid grid-cols-[1.05fr_0.95fr_0.95fr] border-t border-black/10 text-sm">
                <div className="p-5 font-bold text-[#211e1a]">{row.feature}</div>
                <div className="border-l border-black/10 p-5 leading-6 text-[#6a645c]"><Included value={row.free} /></div>
                <div className="border-l border-black/10 bg-[#fffaf6] p-5 leading-6 font-semibold text-[#403a34]"><Included value={row.pro} /></div>
              </div>
            ))}
            <div className="grid grid-cols-[1.05fr_0.95fr_0.95fr] border-t border-black/10 text-sm">
              <div className="p-5 font-bold text-[#211e1a]"></div>
              <div className="border-l border-black/10 p-5">
                <Link href="/app" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#171717] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#f6821f]">Try Free <ArrowRight className="h-4 w-4" /></Link>
              </div>
              <div className="border-l border-black/10 bg-[#fffaf6] p-5">
                <Link href="/signup" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#f6821f] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#db6512]">Create account <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:hidden">
            {comparisonRows.map((row) => (
              <article key={row.feature} className="overflow-hidden rounded-2xl border border-black/10 bg-[#fbfaf8] shadow-[0_14px_44px_rgba(31,27,22,0.06)]">
                <div className="bg-[#191714] px-4 py-3 text-sm font-bold text-white">{row.feature}</div>
                <div className="grid grid-cols-2 text-sm">
                  <div className="border-r border-black/10 p-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#777067]">Free</p>
                    <div className="leading-6 text-[#6a645c]"><Included value={row.free} /></div>
                  </div>
                  <div className="bg-[#fff4eb] p-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#c4510a]">Pro</p>
                    <div className="font-semibold leading-6 text-[#403a34]"><Included value={row.pro} /></div>
                  </div>
                </div>
              </article>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/app" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#171717] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#f6821f]">Try Free <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f6821f] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#db6512]">Create account <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
