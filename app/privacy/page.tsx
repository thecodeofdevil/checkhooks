import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ArrowLeft, Chrome, Clock3, Database, EyeOff, LockKeyhole, Route } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy & Data Boundaries",
  description: "How Checkhooks processes temporary requests, browser preferences, receiver events, and testing data.",
};

const sections = [
  {
    icon: Database,
    title: "Request data we process",
    text: "When a temporary receiver gets a request, Checkhooks processes its method, URL, query parameters, headers, and body so the app can display the event and render your configured response template.",
  },
  {
    icon: Clock3,
    title: "Temporary receiver storage",
    text: "Receiver events and response settings are held in server memory for the active receiver. They are not designed as permanent records and may disappear after a restart, deployment, expiration, or infrastructure change.",
  },
  {
    icon: Chrome,
    title: "Data in your browser",
    text: "The temporary app stores only interface preferences such as your light or dark theme. The archived v2 workspace may store saved endpoints, templates, and request history in your browser’s local storage.",
  },
  {
    icon: Route,
    title: "Outgoing destinations",
    text: "When you send a checkhook, the destination you enter receives the request data you provide. That destination operates under its own privacy and security practices, which Checkhooks does not control.",
  },
  {
    icon: EyeOff,
    title: "Sharing and tracking",
    text: "Checkhooks does not sell receiver payloads or use them for advertising. The current product does not require an account and does not intentionally build a profile from your test request content.",
  },
  {
    icon: LockKeyhole,
    title: "Secrets and security",
    text: "Do not submit passwords, private keys, access tokens, regulated personal data, or production secrets. Use synthetic test data, scoped credentials, and receiver URLs you are comfortable treating as temporary shared secrets.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="theme-page min-h-screen bg-[#f7f5f2] text-[#191714]">
      <SiteHeader />
      <section className="landing-grid relative border-b border-black/10 px-5 py-20 sm:px-8 lg:py-28"><div className="relative mx-auto max-w-[1120px]"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c4510a]">Legal · Privacy</p><h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.06em] sm:text-7xl lg:text-[86px]">Clear boundaries for temporary data.</h1><p className="mt-8 max-w-2xl text-lg leading-8 text-[#655f57]">This policy describes what Checkhooks processes, where temporary request data may exist, and how to test integrations without exposing sensitive information.</p></div></section>
      <section className="bg-white px-5 py-16 sm:px-8 lg:py-24"><div className="mx-auto max-w-[1120px]"><div className="mb-10 rounded-2xl border border-[#f3c7a7] bg-[#fff4eb] p-6 text-sm leading-7 text-[#70411f]"><strong>Privacy summary:</strong> use synthetic data, assume receiver URLs can be shared by anyone who has them, and do not rely on Checkhooks as permanent storage.</div><div className="grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 sm:grid-cols-2 lg:grid-cols-3">{sections.map(({ icon: Icon, title, text }) => <article key={title} className="bg-[#fbfaf8] p-8 sm:p-9"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ffede0] text-[#c4510a]"><Icon className="h-5 w-5" /></span><h2 className="mt-12 text-2xl font-semibold tracking-[-0.035em]">{title}</h2><p className="mt-4 leading-7 text-[#6a645c]">{text}</p></article>)}</div><div className="mt-10 flex flex-col gap-4 border-t border-black/10 pt-8 text-sm sm:flex-row sm:items-center sm:justify-between"><Link href="/" className="inline-flex items-center gap-2 font-bold text-[#b84b08]"><ArrowLeft className="h-4 w-4" /> Back to home</Link><span className="text-[#777067]">Effective date: June 2026</span></div></div></section>
      <SiteFooter />
    </main>
  );
}
