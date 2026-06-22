"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  Bell,
  ChevronDown,
  CreditCard,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorCog,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
  Zap,
} from "lucide-react";

import { CheckhooksLogo } from "@/components/checkhooks-logo";
import { ThemeToggle } from "@/components/theme-toggle";

type AdminShellProps = {
  adminEmail: string;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
};

const navigation = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, hint: "Overview" },
  { href: "/admin/users", label: "Users", icon: Users, hint: "Accounts" },
  { href: "/admin/active-users", label: "Active users", icon: Activity, hint: "Live signals" },
  { href: "/admin/payments", label: "Payment history", icon: CreditCard, hint: "Plan events" },
  { href: "/admin/server", label: "Server health", icon: MonitorCog, hint: "Runtime" },
  { href: "/admin/settings", label: "Settings", icon: Settings, hint: "Admin config" },
];

const notifications = [
  { title: "Quota watch", text: "Review receivers approaching free-plan limits.", icon: Gauge },
  { title: "Plan movement", text: "Track upgrades and revenue events daily.", icon: CreditCard },
  { title: "Security", text: "Keep ADMIN_EMAILS restricted to trusted operators.", icon: ShieldCheck },
];

export function AdminShell({ adminEmail, title, eyebrow = "Super admin", children }: AdminShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const activeItem = navigation.find((item) => item.href === pathname);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="admin-shell min-h-screen bg-[#f7f5f2] text-[#191714]">
      <aside className={`admin-sidebar fixed inset-y-0 left-0 z-50 flex w-[286px] flex-col border-r border-black/10 bg-[#151515] px-4 py-5 text-white transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2">
          <Link href="/admin" aria-label="Admin dashboard">
            <CheckhooksLogo inverse />
          </Link>
          <button type="button" onClick={() => setSidebarOpen(false)} className="rounded-xl p-2 text-white/60 hover:bg-white/10 lg:hidden" aria-label="Close sidebar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.055] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f6821f] text-sm font-black">SA</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">Super admin</p>
              <p className="truncate text-xs text-white/45">{adminEmail}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <span className="rounded-2xl bg-[#143c2e] px-3 py-2 font-bold text-[#73e2b5]">Mongo CRM</span>
            <span className="rounded-2xl bg-[#332116] px-3 py-2 font-bold text-[#ffb071]">Realtime ops</span>
          </div>
        </div>

        <nav className="mt-6 flex-1 space-y-1.5">
          {navigation.map(({ href, label, icon: Icon, hint }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} onClick={() => setSidebarOpen(false)} className={`group flex items-center gap-3 rounded-2xl px-3 py-3 transition ${active ? "bg-[#f6821f] text-white shadow-[0_16px_40px_rgba(246,130,31,0.28)]" : "text-white/62 hover:bg-white/[0.075] hover:text-white"}`}>
                <Icon className="h-5 w-5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{label}</span>
                  <span className={`block text-xs ${active ? "text-white/70" : "text-white/35"}`}>{hint}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-4">
          <p className="flex items-center gap-2 text-sm font-bold"><Zap className="h-4 w-4 text-[#f6821f]" /> Admin ideas</p>
          <p className="mt-2 text-xs leading-5 text-white/45">Next useful pages: receiver abuse queue, API key management, and plan invoices.</p>
        </div>
      </aside>

      {sidebarOpen ? <button type="button" aria-label="Close sidebar overlay" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/40 lg:hidden" /> : null}

      <div className="min-h-screen lg:pl-[286px]">
        <header className="admin-topbar sticky top-0 z-30 border-b border-black/10 bg-[#f7f5f2]/86 backdrop-blur-2xl">
          <div className="flex h-20 items-center gap-4 px-4 sm:px-6 lg:px-8">
            <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-2xl border border-black/10 bg-white p-3 lg:hidden" aria-label="Open sidebar">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#c4510a]">{eyebrow}</p>
              <h1 className="truncate text-2xl font-semibold tracking-[-0.045em] sm:text-3xl">{activeItem?.label ?? title}</h1>
            </div>
            <div className="hidden h-11 min-w-[260px] items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 text-sm text-[#777067] xl:flex">
              <Search className="h-4 w-4" />
              <span>Search users, payments, activity...</span>
            </div>
            <ThemeToggle />

            <div className="relative">
              <button type="button" onClick={() => setNotificationsOpen((open) => !open)} className="relative rounded-2xl border border-black/10 bg-white p-3 transition hover:border-[#f6821f]/40" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#f6821f]" />
              </button>
              {notificationsOpen ? (
                <div className="absolute right-0 mt-3 w-[320px] rounded-3xl border border-black/10 bg-white p-3 shadow-[0_24px_70px_rgba(31,27,22,0.16)]">
                  <p className="px-2 pb-2 text-xs font-black uppercase tracking-[0.18em] text-[#777067]">Notifications</p>
                  <div className="space-y-2">
                    {notifications.map(({ title: itemTitle, text, icon: Icon }) => (
                      <div key={itemTitle} className="flex gap-3 rounded-2xl bg-[#fbfaf8] p-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0e2] text-[#c4510a]"><Icon className="h-4 w-4" /></span>
                        <span><span className="block text-sm font-bold">{itemTitle}</span><span className="text-xs leading-5 text-[#777067]">{text}</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button type="button" onClick={() => setProfileOpen((open) => !open)} className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white p-2 pr-3 transition hover:border-[#f6821f]/40">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#151515] text-xs font-black text-white">SA</span>
                <ChevronDown className="h-4 w-4 text-[#777067]" />
              </button>
              {profileOpen ? (
                <div className="absolute right-0 mt-3 w-[260px] rounded-3xl border border-black/10 bg-white p-3 shadow-[0_24px_70px_rgba(31,27,22,0.16)]">
                  <div className="rounded-2xl bg-[#fbfaf8] p-3">
                    <p className="text-sm font-bold">{adminEmail}</p>
                    <p className="mt-1 text-xs text-[#777067]">Super admin access</p>
                  </div>
                  <Link href="/admin/settings" className="mt-2 flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold hover:bg-[#fbfaf8]"><Settings className="h-4 w-4" /> Settings</Link>
                  <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm font-semibold text-[#b7352b] hover:bg-[#fff3f1]"><LogOut className="h-4 w-4" /> Logout</button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
