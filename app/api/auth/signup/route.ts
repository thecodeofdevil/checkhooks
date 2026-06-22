import { NextResponse } from "next/server";

import { logUserActivity } from "../../../../lib/activity-log";
import { normalizeEmail, PRO_PRICE_USD, setSessionCookie } from "../../../../lib/auth";
import { createUser, validatePassword } from "../../../../lib/users";

export async function POST(request: Request) {
  let payload: { email?: string; password?: string } = {};

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const email = normalizeEmail(payload.email);
  if (!email) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const password = typeof payload.password === "string" ? payload.password : "";
  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  try {
    const user = await createUser(email, password, PRO_PRICE_USD);
    const session = { email, firstName: user.firstName, lastName: user.lastName, plan: "free" as const, planPrice: PRO_PRICE_USD };
    setSessionCookie(session);
    await logUserActivity({ email, type: "signup", plan: session.plan });
    return NextResponse.json({ user: session });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create account." }, { status: 400 });
  }
}
