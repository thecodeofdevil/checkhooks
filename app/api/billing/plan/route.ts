import { NextResponse } from "next/server";

import { getCurrentSession } from "../../../../lib/auth";

export async function POST() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Login required before subscribing." }, { status: 401 });
  }

  return NextResponse.json({
    error: "Use Razorpay checkout from the Subscription page to activate Pro.",
  }, { status: 410 });
}
