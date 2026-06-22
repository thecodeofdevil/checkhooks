import { NextResponse } from "next/server";

import { logUserActivity } from "../../../../lib/activity-log";
import { clearSessionCookie, getCurrentSession } from "../../../../lib/auth";

export async function POST() {
  const session = getCurrentSession();
  clearSessionCookie();
  if (session) {
    await logUserActivity({ email: session.email, type: "logout", plan: session.plan });
  }
  return NextResponse.json({ user: null });
}
