import { NextResponse } from "next/server";

import { logUserActivity } from "@/lib/activity-log";
import { getAdminSession } from "@/lib/admin";
import { PRO_PRICE_USD } from "@/lib/auth";
import { updateUserPlan } from "@/lib/users";
import type { UserPlan } from "@/lib/receiver-store";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Super admin access required." }, { status: 403 });

  const payload = await request.json().catch(() => null);
  const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";
  const plan = payload?.plan === "pro" ? "pro" : payload?.plan === "free" ? "free" : null;
  const planPrice = plan === "pro" ? Number(payload?.planPrice ?? PRO_PRICE_USD) || PRO_PRICE_USD : 0;

  if (!email || !plan) {
    return NextResponse.json({ error: "Email and plan are required." }, { status: 400 });
  }

  await updateUserPlan(email, plan as UserPlan, planPrice);
  await logUserActivity({
    email,
    type: "admin_plan_update",
    plan: plan as UserPlan,
    metadata: {
      adminEmail: admin.email,
      planPrice,
    },
  });

  return NextResponse.json({ success: true, email, plan, planPrice });
}
