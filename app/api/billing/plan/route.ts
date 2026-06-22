import { NextResponse } from "next/server";

import { logUserActivity } from "../../../../lib/activity-log";
import { getCurrentSession, PRO_PRICE_USD, setSessionCookie } from "../../../../lib/auth";
import { updateUserPlan } from "../../../../lib/users";

export async function POST() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Login required before subscribing." }, { status: 401 });
  }

  const updatedSession = {
    ...session,
    plan: "pro" as const,
    planPrice: PRO_PRICE_USD,
  };
  await setSessionCookie(updatedSession);
  await updateUserPlan(updatedSession.email, updatedSession.plan, updatedSession.planPrice);
  await logUserActivity({ email: updatedSession.email, type: "subscribe", plan: updatedSession.plan, metadata: { priceUsd: PRO_PRICE_USD } });

  return NextResponse.json({
    user: updatedSession,
    message: `Pro plan enabled at $${PRO_PRICE_USD}/month.`,
  });
}
