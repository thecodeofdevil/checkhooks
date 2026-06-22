"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Login to connect receiver activity with your account.");
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

  const login = async () => {
    setLoading(true);
    setMessage("Logging in...");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(String(data.error ?? "Login failed"));
      setMessage("Logged in. Redirecting to your workspace...");
      window.location.href = "/app";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="theme-page min-h-screen bg-[#f7f5f2] text-[#191714]">
      <SiteHeader />
      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_430px] lg:py-24">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c4510a]">Account access</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-none tracking-[-0.055em] sm:text-7xl">Login and keep your receiver work connected.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#655f57]">Signed-in users can attach receivers to a plan, unlock higher limits, and record activity in MongoDB for audit and usage history.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-black/10 bg-white p-5"><LockKeyhole className="h-5 w-5 text-[#c4510a]" /><h2 className="mt-4 font-semibold">Signed session</h2><p className="mt-2 text-sm leading-6 text-[#6a645c]">Uses a secure HTTP-only cookie with a signed session token.</p></div>
            <div className="rounded-2xl border border-black/10 bg-white p-5"><Mail className="h-5 w-5 text-[#c4510a]" /><h2 className="mt-4 font-semibold">User account</h2><p className="mt-2 text-sm leading-6 text-[#6a645c]">Login with email and password from the MongoDB users table.</p></div>
          </div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_24px_70px_rgba(31,27,22,0.08)]">
          <h2 className="text-2xl font-semibold tracking-[-0.035em]">Login</h2>
          <p className="mt-2 text-sm leading-6 text-[#6a645c]">{message}</p>
          <label className="mt-6 block text-sm font-semibold">
            Email address
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#f6821f] focus:ring-2 focus:ring-[#f6821f]/20" />
          </label>
          <label className="mt-4 block text-sm font-semibold">
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#f6821f] focus:ring-2 focus:ring-[#f6821f]/20" />
          </label>
          <button type="button" onClick={login} disabled={loading} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#f6821f] px-5 py-3 font-bold text-white transition hover:bg-[#db6512] disabled:opacity-60">
            {loading ? "Logging in" : "Login"} <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-5 text-center text-sm text-[#6a645c]">New here? <Link href="/signup" className="font-bold text-[#b84b08]">Create an account</Link></p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
