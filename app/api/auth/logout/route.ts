import { NextResponse } from "next/server";

import { logUserActivity } from "../../../../lib/activity-log";
import { clearSessionCookie, getCurrentSession } from "../../../../lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const session = await getCurrentSession();
  await clearSessionCookie();
  if (session) {
    await logUserActivity({ email: session.email, type: "logout", plan: session.plan });
  }
  return NextResponse.json({ user: null });
}
