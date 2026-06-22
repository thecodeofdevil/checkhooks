"use client";

import Link from "next/link";
import { ArrowRight, GitBranch, Menu, X } from "lucide-react";
import { useState } from "react";

import { CheckhooksLogo } from "@/components/checkhooks-logo";
import { ThemeToggle } from "@/components/theme-toggle";

const productLinks = [
  { href: "/#product", label: "Product" },
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#security", label: "Security" },
  { href: "/plan", label: "Plan" },
];

type SiteHeaderProps = {
  showSignup?: boolean;
  isLoggedIn?: boolean;
};

export function SiteHeader({ showSignup = false, isLoggedIn = false }: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="site-header relative z-50 border-b border-black/10 bg-[#f7f5f2]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between gap-3 px-3 sm:px-8">
        <Link href="/" className="group inline-flex items-center gap-2.5" aria-label="Checkhooks home">
          <CheckhooksLogo className="transition-transform group-hover:-rotate-2" />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-[#514c46] md:flex">
          {productLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-black">{link.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2.5">
          {isLoggedIn ? (
            <Link href="/app" className="hidden text-sm font-semibold text-[#39352f] transition-colors hover:text-black sm:block">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm font-semibold text-[#39352f] transition-colors hover:text-black sm:block">Login</Link>
              {showSignup ? <Link href="/signup" className="hidden text-sm font-semibold text-[#39352f] transition-colors hover:text-black lg:block">Sign up</Link> : null}
            </>
          )}
          <ThemeToggle className="hidden sm:inline-flex" />
          <Link href="/app" className="inline-flex items-center gap-2 rounded-lg bg-[#151515] px-3 py-2 text-xs font-bold text-white transition-all hover:bg-[#f6821f] sm:px-5 sm:py-2.5 sm:text-sm">
            Try Free <ArrowRight className="h-4 w-4" />
          </Link>
          <button type="button" onClick={() => setIsMenuOpen(true)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 bg-white/75 text-[#211e1a] shadow-sm md:hidden" aria-label="Open navigation menu">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className={`fixed inset-0 z-[80] md:hidden ${isMenuOpen ? "" : "pointer-events-none"}`} aria-hidden={!isMenuOpen}>
        <button type="button" onClick={() => setIsMenuOpen(false)} className={`absolute inset-0 bg-black/45 transition-opacity ${isMenuOpen ? "opacity-100" : "opacity-0"}`} aria-label="Close navigation menu" />
        <aside className={`absolute left-0 top-0 flex h-dvh w-[82vw] max-w-[320px] flex-col border-r border-black/10 bg-[#f7f5f2] p-5 shadow-[24px_0_80px_rgba(31,27,22,0.22)] transition-transform duration-300 ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center justify-between gap-4">
            <CheckhooksLogo />
            <button type="button" onClick={() => setIsMenuOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 bg-white text-[#211e1a]" aria-label="Close navigation menu">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="mt-8 grid gap-2 text-sm font-bold text-[#39352f]">
            {productLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)} className="rounded-xl border border-black/10 bg-white/70 px-4 py-3 transition hover:border-[#f6821f]/40 hover:text-[#b84b08]">{link.label}</Link>
            ))}
          </nav>
          <div className="mt-auto grid gap-3 border-t border-black/10 pt-5">
            {isLoggedIn ? (
              <Link href="/app" onClick={() => setIsMenuOpen(false)} className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-bold text-[#211e1a]">Dashboard</Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setIsMenuOpen(false)} className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-bold text-[#211e1a]">Login</Link>
                {showSignup ? <Link href="/signup" onClick={() => setIsMenuOpen(false)} className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-bold text-[#211e1a]">Sign up</Link> : null}
              </>
            )}
            <Link href="/app" onClick={() => setIsMenuOpen(false)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f6821f] px-4 py-3 text-sm font-bold text-white">Try Free <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </aside>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer bg-[#151515] px-5 py-14 text-white sm:px-8">
      <div className="mx-auto max-w-[1240px]">
        <div className="grid gap-10 border-b border-white/10 pb-12 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <CheckhooksLogo inverse />
            <p className="mt-5 max-w-xs text-sm leading-6 text-white/45">A focused workspace for sending, receiving, and debugging checkhooks.</p>
          </div>
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white/35">Product</p>
            <div className="space-y-3 text-sm text-white/65">
              {productLinks.map((link) => (
                <p key={link.href}><Link href={link.href} className="hover:text-white">{link.label}</Link></p>
              ))}
              <p><Link href="/app" className="hover:text-white">Try Free</Link></p>
              <p><Link href="/signup" className="hover:text-white">Sign up</Link></p>
              <p><Link href="/login" className="hover:text-white">Login</Link></p>
            </div>
          </div>
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white/35">Use cases</p>
            <div className="space-y-3 text-sm text-white/65"><p>API testing</p><p>Local development</p><p>Event debugging</p></div>
          </div>
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white/35">Legal</p>
            <div className="space-y-3 text-sm text-white/65"><p><Link href="/privacy" className="hover:text-white">Privacy</Link></p><p><Link href="/terms" className="hover:text-white">Terms</Link></p></div>
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-7 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Checkhooks. Built for better debugging.</p>
          <div className="flex items-center gap-3"><ThemeToggle /><p className="flex items-center gap-2"><GitBranch className="h-3.5 w-3.5" /> Developer-first checkhook tooling</p></div>
        </div>
      </div>
    </footer>
  );
}
