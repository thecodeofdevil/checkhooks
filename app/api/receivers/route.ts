import { NextResponse } from "next/server";

import { logUserActivity } from "../../../lib/activity-log";
import { getCurrentSession } from "../../../lib/auth";
import { registerReceiver } from "../../../lib/receiver-store";

export async function POST(request: Request) {
  let payload: { receiverId?: string } = {};

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!payload.receiverId || typeof payload.receiverId !== "string") {
    return NextResponse.json({ error: "Receiver ID required." }, { status: 400 });
  }

  const session = getCurrentSession();
  const usage = await registerReceiver(payload.receiverId, session ? { email: session.email, plan: session.plan } : undefined);
  if (session) {
    await logUserActivity({ email: session.email, type: "receiver_registered", plan: session.plan, receiverId: payload.receiverId });
  }
  return NextResponse.json({ usage });
}
