import Link from "next/link";
import { CheckhookMark } from "@/components/checkhooks-logo";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getCurrentSession } from "@/lib/auth";
import {
  ArrowRight,
  Braces,
  Check,
  ChevronRight,
  Clock3,
  Code2,
  Copy,
  Database,
  Eye,
  Globe2,
  History,
  Inbox,
  Layers3,
  LockKeyhole,
  MousePointerClick,
  Radio,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Zap,
} from "lucide-react";

const featureGroups = [
  {
    label: "Send",
    title: "Shape every request.",
    description:
      "Choose any HTTP method, add custom headers, compose JSON payloads, and send through a safe server-side proxy.",
    icon: Send,
    accent: "bg-[#ffefe4] text-[#c2410c]",
  },
  {
    label: "Receive",
    title: "Catch events live.",
    description:
      "Get a temporary receiver automatically, stream incoming checkhooks in real time, and control the dynamic response returned to the sender.",
    icon: Radio,
    accent: "bg-[#e7f7f1] text-[#08785c]",
  },
  {
    label: "Inspect",
    title: "See the full answer.",
    description:
      "Read response status and payload details immediately, or open an incoming event to inspect exactly what arrived.",
    icon: Eye,
    accent: "bg-[#eaf1ff] text-[#3159b7]",
  },
];

const workflow = [
  {
    number: "01",
    title: "Create or paste an endpoint",
    text: "Send to an existing checkhook or generate a receiver URL in one click.",
    icon: MousePointerClick,
  },
  {
    number: "02",
    title: "Build the request",
    text: "Set the method, headers, query data, payload, and custom receiver response.",
    icon: Braces,
  },
  {
    number: "03",
    title: "Inspect every detail",
    text: "See status, headers, body, timing, and event history without changing tools.",
    icon: Eye,
  },
];

const capabilities = [
  { icon: TerminalSquare, title: "Every HTTP method", text: "GET, POST, PUT, PATCH, and DELETE are ready to use." },
  { icon: Settings2, title: "Custom responses", text: "Choose the status code and body your receiver returns." },
  { icon: History, title: "Live event inspector", text: "Open incoming requests and inspect their payload immediately." },
  { icon: Database, title: "Temporary by default", text: "Receiver access and results clear when your session ends." },
  { icon: RefreshCw, title: "Real-time streaming", text: "Incoming events appear immediately through a live event stream." },
  { icon: ShieldCheck, title: "Server-side sending", text: "Dispatch requests through the built-in API proxy." },
];

function ProductPreviewLegacy() {
  return (
    <div className="relative mx-auto mt-16 max-w-[1120px] lg:mt-20">
      <div className="absolute -left-10 top-16 hidden w-44 -rotate-6 rounded-2xl border border-[#d6d0c6] bg-white p-4 shadow-[0_18px_50px_rgba(31,24,18,0.14)] xl:block">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[#59544d]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#15a36d]" /> Live receiver
        </div>
        <p className="font-mono text-[11px] leading-5 text-[#817b72]">3 events captured</p>
      </div>

      <div className="absolute -right-8 bottom-20 z-10 hidden w-52 rotate-3 rounded-2xl bg-[#151515] p-4 text-white shadow-[0_18px_50px_rgba(31,24,18,0.2)] xl:block">
        <div className="flex items-center justify-between text-[11px] text-white/60">
          <span>Latest response</span>
          <span className="rounded-full bg-[#143c2e] px-2 py-0.5 font-bold text-[#73e2b5]">200 OK</span>
        </div>
        <p className="mt-3 font-mono text-[11px] text-white/80">{`{ "received": true }`}</p>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-black/15 bg-[#171717] shadow-[0_35px_100px_rgba(44,34,26,0.22)] sm:rounded-[30px]">
        <div className="flex h-12 items-center justify-between border-b border-white/10 px-4 sm:h-14 sm:px-6">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff655a]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#26c941]" />
          </div>
          <span className="font-mono text-[10px] text-white/40 sm:text-xs">app.checkhooks.dev</span>
          <div className="w-10" />
        </div>

        <div className="grid min-h-[440px] lg:grid-cols-[190px_1fr_290px]">
          <aside className="hidden border-r border-white/10 p-5 lg:block">
            <div className="mb-7 flex items-center gap-2 text-sm font-semibold text-white">
              <CheckhookMark className="h-7 w-8" />
              checkhooks
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2.5 font-semibold text-white"><Send className="h-3.5 w-3.5" /> Composer</div>
              <div className="flex items-center gap-2 px-3 py-2.5 text-white/45"><Inbox className="h-3.5 w-3.5" /> Receivers</div>
              <div className="flex items-center gap-2 px-3 py-2.5 text-white/45"><Clock3 className="h-3.5 w-3.5" /> History</div>
              <div className="flex items-center gap-2 px-3 py-2.5 text-white/45"><Layers3 className="h-3.5 w-3.5" /> Templates</div>
            </div>
          </aside>

          <div className="p-4 sm:p-7 lg:p-8">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#f6821f]">Request composer</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">Send a checkhook</h3>
              </div>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/45">Draft saved</span>
            </div>

            <div className="flex overflow-hidden rounded-xl border border-white/10 bg-[#0e0e0e]">
              <span className="flex items-center border-r border-white/10 bg-[#332116] px-3 text-xs font-bold text-[#ff9d4d] sm:px-4">POST</span>
              <span className="min-w-0 flex-1 truncate px-3 py-3.5 font-mono text-[10px] text-white/60 sm:px-4 sm:text-xs">https://api.example.com/events</span>
              <span className="m-1.5 flex items-center rounded-lg bg-[#f6821f] px-3 text-[10px] font-bold text-white sm:px-4 sm:text-xs">Send <ArrowRight className="ml-1.5 h-3 w-3" /></span>
            </div>

            <div className="mt-6 flex gap-5 border-b border-white/10 text-[11px] font-semibold text-white/40 sm:text-xs">
              <span className="border-b-2 border-[#f6821f] pb-3 text-white">Body</span>
              <span>Headers <b className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px]">2</b></span>
              <span>Settings</span>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-[#0e0e0e] p-4 font-mono text-[11px] leading-6 sm:p-5 sm:text-xs">
              <p><span className="text-[#b986ef]">{"{"}</span></p>
              <p className="pl-4"><span className="text-[#73b7ff]">&quot;event&quot;</span><span className="text-white/40">: </span><span className="text-[#e6b879]">&quot;order.completed&quot;</span><span className="text-white/40">,</span></p>
              <p className="pl-4"><span className="text-[#73b7ff]">&quot;order_id&quot;</span><span className="text-white/40">: </span><span className="text-[#91d29b]">&quot;ord_9821&quot;</span><span className="text-white/40">,</span></p>
              <p className="pl-4"><span className="text-[#73b7ff]">&quot;amount&quot;</span><span className="text-white/40">: </span><span className="text-[#d9a2e9]">149.00</span></p>
              <p><span className="text-[#b986ef]">{"}"}</span></p>
            </div>
          </div>

          <aside className="border-t border-white/10 bg-[#121212] p-4 sm:p-6 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Response</span>
              <span className="rounded-full bg-[#143c2e] px-2.5 py-1 text-[10px] font-bold text-[#73e2b5]">200 OK</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/10 p-3"><p className="text-[9px] uppercase text-white/30">Time</p><p className="mt-1 text-xs font-semibold text-white">184 ms</p></div>
              <div className="rounded-lg border border-white/10 p-3"><p className="text-[9px] uppercase text-white/30">Size</p><p className="mt-1 text-xs font-semibold text-white">42 B</p></div>
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-[#0b0b0b] p-4 font-mono text-[10px] leading-5 text-white/55">
              <p>{`{`}</p><p className="pl-3"><span className="text-[#73b7ff]">&quot;received&quot;</span>: <span className="text-[#d9a2e9]">true</span>,</p><p className="pl-3"><span className="text-[#73b7ff]">&quot;id&quot;</span>: <span className="text-[#e6b879]">&quot;evt_214&quot;</span></p><p>{`}`}</p>
            </div>
            <div className="mt-5 border-t border-white/10 pt-5">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">Recent</p>
              {["200  POST  /events", "200  POST  /events", "404  GET   /test"].map((item, index) => (
                <div key={item + index} className="mb-2 flex items-center gap-2 rounded-lg bg-white/[0.035] px-3 py-2.5 font-mono text-[9px] text-white/45">
                  <span className={`h-1.5 w-1.5 rounded-full ${index === 2 ? "bg-[#ff655a]" : "bg-[#39c98a]"}`} /> {item}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="landing-preview relative mx-auto mt-16 hidden max-w-[1120px] text-left md:block lg:mt-20">
      <div className="landing-preview-float absolute -left-10 top-28 z-10 hidden w-48 -rotate-6 rounded-2xl border border-black/10 bg-white p-4 shadow-[0_18px_50px_rgba(31,24,18,0.14)] xl:block">
        <div className="flex items-center gap-2 text-xs font-bold text-[#3f3a34]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#18a36f]" /> Temporary receiver</div>
        <p className="mt-2 text-[11px] leading-5 text-[#777067]">Listening for your next event.</p>
      </div>

      <div className="absolute -right-8 bottom-16 z-10 hidden w-52 rotate-3 rounded-2xl bg-[#191919] p-4 text-white shadow-[0_18px_50px_rgba(31,24,18,0.2)] xl:block">
        <div className="flex items-center justify-between text-[10px] text-white/55"><span>Response</span><span className="rounded-full bg-[#143c2e] px-2 py-1 font-bold text-[#73e2b5]">200 OK</span></div>
        <p className="mt-3 font-mono text-[10px] text-white/70">{`{ "received": true }`}</p>
      </div>

      <div className="landing-preview-shell overflow-hidden rounded-[22px] border border-black/15 bg-[#efebe5] shadow-[0_35px_100px_rgba(44,34,26,0.22)] sm:rounded-[28px]">
        <div className="landing-preview-toolbar flex h-12 items-center justify-between border-b border-black/10 bg-[#f7f5f2] px-4 sm:h-14 sm:px-6">
          <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#ff655a]" /><span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" /><span className="h-2.5 w-2.5 rounded-full bg-[#26c941]" /></div>
          <span className="font-mono text-[10px] text-black/35 sm:text-xs">app.checkhooks.dev</span>
          <div className="flex h-6 w-11 items-center rounded-full border border-black/10 bg-white px-1"><span className="h-4 w-4 rounded-full bg-[#f6821f]" /></div>
        </div>

        <div className="landing-preview-canvas p-4 sm:p-7 lg:p-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[#6a645c]"><span className="h-1.5 w-1.5 rounded-full bg-[#18a36f]" /> Temporary workspace</div>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#211e1a] sm:text-2xl">Test a checkhook. Get your answer.</h3>
            </div>
            <div className="flex w-fit gap-1 rounded-lg border border-black/10 bg-[#fbfaf8] p-1 text-[10px] font-bold">
              <span className="flex items-center gap-1.5 rounded-md bg-[#191919] px-3 py-2 text-white"><Radio className="h-3 w-3" /> Receive</span>
              <span className="flex items-center gap-1.5 px-3 py-2 text-[#777067]"><Send className="h-3 w-3" /> Send</span>
            </div>
          </div>

          <div className="landing-preview-panel grid overflow-hidden rounded-2xl border border-black/10 bg-[#fbfaf8] lg:grid-cols-[1fr_300px]">
            <div className="p-4 sm:p-6 lg:p-7">
              <div className="flex items-center justify-between">
                <div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#b84b08]">Quick receiver</p><h4 className="mt-1.5 text-lg font-semibold tracking-tight text-[#211e1a]">Catch the next event</h4></div>
                <span className="flex items-center gap-1 rounded-full bg-[#def4eb] px-2 py-1 text-[9px] font-bold text-[#08785c]"><span className="h-1.5 w-1.5 rounded-full bg-[#18a36f]" /> Live</span>
              </div>

              <div className="mt-5 flex overflow-hidden rounded-lg border border-black/10 bg-[#f3efe9]">
                <span className="flex items-center border-r border-black/10 px-3 text-[10px] font-bold text-[#c4510a]">URL</span>
                <span className="min-w-0 flex-1 truncate px-3 py-3 font-mono text-[9px] text-[#6a645c] sm:text-[10px]">checkhooks.dev/api/receive/temp-9821</span>
                <span className="m-1 flex items-center gap-1 rounded-md bg-[#f6821f] px-3 text-[9px] font-bold text-white"><Copy className="h-2.5 w-2.5" /> Copy</span>
              </div>

              <div className="mt-5 flex items-center justify-between text-[10px] font-bold text-[#48433d]"><span>Dynamic response body</span><span className="text-[#b84b08]">Update response</span></div>
              <div className="mt-2 rounded-lg border border-[#302e2b] bg-[#191919] p-4 font-mono text-[9px] leading-5 sm:text-[10px]">
                <p className="text-[#b986ef]">{`{`}</p>
                <p className="pl-3"><span className="text-[#73b7ff]">&quot;received&quot;</span><span className="text-white/40">: </span><span className="text-[#d9a2e9]">true</span><span className="text-white/40">,</span></p>
                <p className="pl-3"><span className="text-[#73b7ff]">&quot;first_name&quot;</span><span className="text-white/40">: </span><span className="text-[#91d29b]">&quot;{`{{body.first_name}}`}&quot;</span></p>
                <p className="text-[#b986ef]">{`}`}</p>
              </div>

              <div className="mt-5 flex items-center justify-between text-[10px] font-bold text-[#48433d]"><span>Status &amp; content type</span><span className="text-[#b84b08]">+ Add header</span></div>
              <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-lg border border-black/10 bg-[#f3efe9] font-mono text-[9px] text-[#6a645c]"><span className="border-r border-black/10 px-3 py-2.5">200</span><span className="px-3 py-2.5">application/json</span></div>
            </div>

            <aside className="landing-preview-side border-t border-black/10 bg-[#f3efe9] p-4 sm:p-6 lg:border-l lg:border-t-0">
              <div className="flex items-center justify-between"><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#b84b08]">Live event</p><span className="rounded-full bg-[#def4eb] px-2 py-1 text-[9px] font-bold text-[#08785c]">Received</span></div>
              <div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded-lg border border-black/10 bg-[#fbfaf8] p-3"><p className="text-[8px] text-[#777067]">METHOD</p><p className="mt-1 text-xs font-bold text-[#211e1a]">POST</p></div><div className="rounded-lg border border-black/10 bg-[#fbfaf8] p-3"><p className="text-[8px] text-[#777067]">EVENTS</p><p className="mt-1 text-xs font-bold text-[#211e1a]">1</p></div></div>
              <div className="mt-3 min-h-[148px] rounded-lg border border-[#302e2b] bg-[#191919] p-4 font-mono text-[9px] leading-5 text-white/55"><p>{`{`}</p><p className="pl-3"><span className="text-[#73b7ff]">&quot;first_name&quot;</span>: <span className="text-[#e6b879]">&quot;Avery&quot;</span></p><p>{`}`}</p></div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const session = await getCurrentSession();

  return (
    <main className="theme-page overflow-hidden bg-[#f7f5f2] text-[#151515]">
      <SiteHeader showSignup isLoggedIn={Boolean(session)} />

      <section className="relative px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:pb-28 lg:pt-28">
        <div className="landing-grid absolute inset-0 opacity-55" />
        <div className="absolute left-[-100px] top-16 h-72 w-72 rounded-full bg-[#ffbd8c]/35 blur-[90px]" />
        <div className="relative mx-auto max-w-[1240px] text-center">
          <div className="landing-hero-badge mb-7 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3.5 py-2 text-xs font-bold text-[#4d4943] shadow-sm">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f6821f] text-white"><Sparkles className="h-3 w-3" /></span>
            No signup. No setup. Just send.
          </div>
          <h1 className="mx-auto max-w-[1000px] text-[48px] font-semibold leading-[0.98] tracking-[-0.065em] sm:text-[70px] lg:text-[92px]">
            Checkhooks, without the <span className="relative whitespace-nowrap text-[#e45f0a]">guesswork.<svg className="absolute -bottom-3 left-0 w-full" viewBox="0 0 400 12" fill="none" aria-hidden="true"><path d="M3 8C105 1.5 283 1 397 7" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg></span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-[#625d55] sm:text-xl">
            Send, receive, and inspect checkhooks from one temporary workspace built for fast integration testing.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/app" className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#f6821f] px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(246,130,31,0.28)] transition-all hover:-translate-y-0.5 hover:bg-[#db6512] sm:w-auto">
              Test a checkhook free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a href="#product" className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-black/15 bg-white/60 px-6 py-3.5 text-sm font-bold transition-colors hover:bg-white sm:w-auto">
              See how it works <ChevronRight className="h-4 w-4" />
            </a>
            <Link href="/plan" className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#f6821f]/40 bg-[#fff4eb] px-6 py-3.5 text-sm font-bold text-[#b84b08] transition-colors hover:bg-[#ffe6d3] sm:w-auto">
              Compare plans <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-[#746e65]">
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#16845f]" /> Free to use</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#16845f]" /> No credit card</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#16845f]" /> No saved receiver data</span>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section id="product" className="border-y border-black/10 bg-white px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-[1240px]">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#cf590d]">One checkhook workspace</p>
              <h2 className="max-w-lg text-4xl font-semibold leading-[1.05] tracking-[-0.05em] sm:text-5xl lg:text-[62px]">From first request to final fix.</h2>
            </div>
            <div className="flex items-end">
              <p className="max-w-2xl text-lg leading-8 text-[#655f57] sm:text-xl">Checkhooks brings the essential testing loop together. Build outgoing requests, create a quick temporary receiver, and inspect the result without account setup or saved receiver clutter.</p>
            </div>
          </div>

          <div className="mt-14 grid overflow-hidden rounded-2xl border border-black/10 lg:grid-cols-3">
            {featureGroups.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <article key={feature.label} className={`group bg-[#fbfaf8] p-7 transition-colors hover:bg-white sm:p-9 ${index > 0 ? "border-t border-black/10 lg:border-l lg:border-t-0" : ""}`}>
                  <div className={`mb-16 flex h-12 w-12 items-center justify-center rounded-xl ${feature.accent}`}><Icon className="h-5 w-5" /></div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#7a746c]">{feature.label}</p>
                  <h3 className="text-2xl font-semibold tracking-[-0.035em]">{feature.title}</h3>
                  <p className="mt-4 leading-7 text-[#6a645c]">{feature.description}</p>
                  <Link href="/app" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#bd4d08]">Try Free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-[#171717] px-5 py-20 text-white sm:px-8 lg:py-28">
        <div className="mx-auto max-w-[1240px]">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#ff9340]">A faster feedback loop</p>
              <h2 className="max-w-xl text-4xl font-semibold leading-[1.05] tracking-[-0.05em] sm:text-5xl lg:text-[62px]">Three steps. Every detail.</h2>
            </div>
            <p className="max-w-lg self-end text-lg leading-8 text-white/55">Move from “did it fire?” to a clear answer in seconds, with the request and response side by side.</p>
          </div>
          <div className="mt-16 grid gap-px overflow-hidden rounded-2xl bg-white/10 lg:grid-cols-3">
            {workflow.map((step) => {
              const Icon = step.icon;
              return (
                <article key={step.number} className="bg-[#1e1e1e] p-7 sm:p-9">
                  <div className="flex items-center justify-between"><span className="font-mono text-xs text-white/35">{step.number}</span><Icon className="h-5 w-5 text-[#ff9340]" /></div>
                  <h3 className="mt-24 text-2xl font-semibold tracking-[-0.03em]">{step.title}</h3>
                  <p className="mt-4 leading-7 text-white/50">{step.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="features" className="bg-[#efebe5] px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-[1240px]">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#cf590d]">Everything in reach</p>
            <h2 className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl lg:text-[62px]">Built for the messy middle of integration work.</h2>
          </div>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((capability) => {
              const Icon = capability.icon;
              return (
                <article key={capability.title} className="rounded-2xl border border-black/10 bg-[#f8f6f2] p-7 transition-all hover:-translate-y-1 hover:bg-white hover:shadow-[0_18px_50px_rgba(49,40,31,0.08)]">
                  <Icon className="h-5 w-5 text-[#dd620f]" />
                  <h3 className="mt-10 text-xl font-semibold tracking-[-0.025em]">{capability.title}</h3>
                  <p className="mt-3 leading-7 text-[#6a645c]">{capability.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="security" className="border-y border-black/10 bg-white px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-[1240px] items-center gap-14 lg:grid-cols-2 lg:gap-24">
          <div className="relative min-h-[420px] overflow-hidden rounded-[28px] bg-[#181818] p-7 text-white sm:p-10">
            <div className="landing-orbit absolute inset-0 opacity-70" />
            <div className="relative z-10 flex h-full min-h-[340px] flex-col justify-between">
              <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Request flow</span><LockKeyhole className="h-5 w-5 text-[#ff9340]" /></div>
              <div className="flex items-center justify-center gap-4 sm:gap-7">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5"><Code2 className="h-6 w-6 text-white/70" /></span>
                <span className="h-px w-10 bg-gradient-to-r from-white/10 to-[#f6821f] sm:w-20" />
                <CheckhookMark className="h-20 w-[90px] drop-shadow-[0_0_24px_rgba(246,130,31,0.28)]" />
                <span className="h-px w-10 bg-gradient-to-r from-[#f6821f] to-white/10 sm:w-20" />
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5"><Globe2 className="h-6 w-6 text-white/70" /></span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/45"><span className="h-2 w-2 rounded-full bg-[#42c991]" /> Server-side proxy active</div>
            </div>
          </div>
          <div>
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#cf590d]">Safe by design</p>
            <h2 className="text-4xl font-semibold leading-[1.05] tracking-[-0.05em] sm:text-5xl">Test freely. Keep control.</h2>
            <p className="mt-6 text-lg leading-8 text-[#655f57]">Outgoing checkhooks are dispatched through the application’s server route, while reusable workspace data stays in your browser. You get a practical testing flow without an account or cloud dashboard.</p>
            <div className="mt-8 space-y-4 text-sm font-semibold text-[#3d3934]">
              <div className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e7f7f1]"><Check className="h-4 w-4 text-[#08785c]" /></span> No signup or account required</div>
              <div className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e7f7f1]"><Check className="h-4 w-4 text-[#08785c]" /></span> Saved resources stay in local storage</div>
              <div className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e7f7f1]"><Check className="h-4 w-4 text-[#08785c]" /></span> Inspect before you retry</div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f6821f] px-5 py-20 text-white sm:px-8 lg:py-28">
        <div className="mx-auto max-w-[1000px] text-center">
          <Zap className="mx-auto h-9 w-9" fill="currentColor" />
          <h2 className="mt-8 text-4xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-6xl lg:text-[76px]">Your next checkhook test starts here.</h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-white/80">Open the workspace and send your first request. No setup, no account, no credit card.</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/app" className="group inline-flex items-center gap-2 rounded-lg bg-[#151515] px-7 py-4 text-sm font-bold text-white transition-transform hover:-translate-y-0.5">Try Free Workspace <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
            <Link href="/plan" className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-7 py-4 text-sm font-bold text-white transition hover:bg-white/10">See $5 plan <ChevronRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
