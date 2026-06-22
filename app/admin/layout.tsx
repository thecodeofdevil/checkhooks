import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { AdminShell } from "@/components/admin-shell";
import { getAdminSession } from "@/lib/admin";
import { CheckhooksLogo } from "@/components/checkhooks-logo";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminSession();

  if (!admin) {
    return (
      <main className="theme-page flex min-h-screen items-center justify-center bg-[#f7f5f2] px-5 text-[#191714]">
        <section className="w-full max-w-lg rounded-[32px] border border-black/10 bg-white p-8 text-center shadow-[0_30px_90px_rgba(31,27,22,0.12)]">
          <div className="flex justify-center"><CheckhooksLogo /></div>
          <div className="mx-auto mt-8 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#fff0e2] text-[#c4510a]">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-[#c4510a]">Super admin only</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.055em]">Admin access required.</h1>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/login" className="inline-flex items-center justify-center rounded-xl bg-[#f6821f] px-5 py-3 text-sm font-bold text-white">Login</Link>
            <Link href="/" className="inline-flex items-center justify-center rounded-xl border border-black/10 px-5 py-3 text-sm font-bold">Back home</Link>
          </div>
        </section>
      </main>
    );
  }

  return <AdminShell adminEmail={admin.email} title="Admin CRM">{children}</AdminShell>;
}
