"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, Database, Zap } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Create a free account, then upgrade when you need more receiver capacity.");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const redirectIfLoggedIn = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (data.user) router.replace("/app");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Session check failed", error);
        }
      }
    };

    redirectIfLoggedIn();

    return () => controller.abort();
  }, [router]);

  const signup = async () => {
    setLoading(true);
    setMessage("Creating account...");
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(String(data.error ?? "Signup failed"));
      setMessage("Account created. Redirecting to your workspace...");
      window.location.href = "/app";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="theme-page min-h-screen bg-[#f7f5f2] text-[#191714]">
      <SiteHeader />
      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_430px] lg:py-24">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c4510a]">Start free</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-none tracking-[-0.055em] sm:text-7xl">Create an account for higher-control receiver testing.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#655f57]">Free users get 10,000 accepted requests per receiver. Sign up to attach receivers to your account and record activities in Data Collection.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-black/10 bg-white p-5"><Zap className="h-5 w-5 text-[#c4510a]" /><h2 className="mt-4 font-semibold">Fast setup</h2><p className="mt-2 text-sm leading-6 text-[#6a645c]">Create a receiver and start testing immediately.</p></div>
            <div className="rounded-2xl border border-black/10 bg-white p-5"><BarChart3 className="h-5 w-5 text-[#c4510a]" /><h2 className="mt-4 font-semibold">Usage stats</h2><p className="mt-2 text-sm leading-6 text-[#6a645c]">Receiver usage is counted through Cache Storage.</p></div>
            <div className="rounded-2xl border border-black/10 bg-white p-5"><Database className="h-5 w-5 text-[#c4510a]" /><h2 className="mt-4 font-semibold">Activity log</h2><p className="mt-2 text-sm leading-6 text-[#6a645c]">Account events are saved to Data Collection.</p></div>
          </div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_24px_70px_rgba(31,27,22,0.08)]">
          <h2 className="text-2xl font-semibold tracking-[-0.035em]">Sign up</h2>
          <p className="mt-2 text-sm leading-6 text-[#6a645c]">{message}</p>
          <label className="mt-6 block text-sm font-semibold">
            Email address
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#f6821f] focus:ring-2 focus:ring-[#f6821f]/20" />
          </label>
          <label className="mt-4 block text-sm font-semibold">
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete="new-password" className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#f6821f] focus:ring-2 focus:ring-[#f6821f]/20" />
          </label>
          <button type="button" onClick={signup} disabled={loading} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#f6821f] px-5 py-3 font-bold text-white transition hover:bg-[#db6512] disabled:opacity-60">
            {loading ? "Creating" : "Create account"} <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-5 text-center text-sm text-[#6a645c]">Already registered? <Link href="/login" className="font-bold text-[#b84b08]">Login</Link></p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
