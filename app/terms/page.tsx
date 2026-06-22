import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { AlertTriangle, ArrowLeft, FileCheck2, Gauge, RefreshCw, Scale, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms & Responsible Use",
  description: "Acceptable use, data responsibilities, and service boundaries for Checkhooks.",
};

const sections = [
  {
    icon: FileCheck2,
    title: "Permitted use",
    text: "Use Checkhooks for development, debugging, education, and integration testing. You remain responsible for every destination, request, template, header, and payload you configure or transmit.",
  },
  {
    icon: ShieldCheck,
    title: "Authorization",
    text: "Only send requests to systems you own or are authorized to test. Do not probe third-party infrastructure, bypass access controls, impersonate users, or interfere with another service’s availability.",
  },
  {
    icon: AlertTriangle,
    title: "Prohibited data and activity",
    text: "Do not use Checkhooks for malware, spam, fraud, credential theft, unlawful tracking, or transmission of secrets and regulated personal data. Abuse may result in immediate restriction of access.",
  },
  {
    icon: Scale,
    title: "Data responsibility",
    text: "Temporary receiver data may remain in memory while the service is running, and v2 data may remain in your browser. You are responsible for clearing local data and ensuring test content is lawful and appropriately minimized.",
  },
  {
    icon: Gauge,
    title: "Availability and results",
    text: "The service is provided as available for testing, without a promise of uninterrupted operation, permanent retention, delivery success, or suitability for production monitoring and mission-critical workflows.",
  },
  {
    icon: RefreshCw,
    title: "Product and term changes",
    text: "Features, limits, routes, and these terms may change as Checkhooks evolves. Continued use after an updated effective date means you accept the revised terms.",
  },
];

export default function TermsPage() {
  return (
    <main className="theme-page min-h-screen bg-[#f7f5f2] text-[#191714]">
      <SiteHeader />
      <section className="landing-grid relative border-b border-black/10 px-5 py-20 sm:px-8 lg:py-28"><div className="relative mx-auto max-w-[1120px]"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c4510a]">Legal · Terms</p><h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.06em] sm:text-7xl lg:text-[86px]">Test freely. Act responsibly.</h1><p className="mt-8 max-w-2xl text-lg leading-8 text-[#655f57]">These terms define acceptable use, your responsibilities for request data and destinations, and the limits of a temporary developer testing service.</p></div></section>
      <section className="bg-white px-5 py-16 sm:px-8 lg:py-24"><div className="mx-auto max-w-[1120px]"><div className="mb-10 rounded-2xl border border-[#f3c7a7] bg-[#fff4eb] p-6 text-sm leading-7 text-[#70411f]"><strong>Core rule:</strong> test only systems you are allowed to access, and never place production secrets or sensitive personal data in a temporary receiver.</div><div className="grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 sm:grid-cols-2 lg:grid-cols-3">{sections.map(({ icon: Icon, title, text }) => <article key={title} className="bg-[#fbfaf8] p-8 sm:p-9"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ffede0] text-[#c4510a]"><Icon className="h-5 w-5" /></span><h2 className="mt-12 text-2xl font-semibold tracking-[-0.035em]">{title}</h2><p className="mt-4 leading-7 text-[#6a645c]">{text}</p></article>)}</div><div className="mt-10 flex flex-col gap-4 border-t border-black/10 pt-8 text-sm sm:flex-row sm:items-center sm:justify-between"><Link href="/" className="inline-flex items-center gap-2 font-bold text-[#b84b08]"><ArrowLeft className="h-4 w-4" /> Back to home</Link><span className="text-[#777067]">Last updated: June 2026</span></div></div></section>
      <SiteFooter />
    </main>
  );
}
