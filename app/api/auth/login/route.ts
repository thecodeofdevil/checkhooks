import { NextResponse } from "next/server";

import { logUserActivity } from "../../../../lib/activity-log";
import { normalizeEmail, PRO_PRICE_USD, setSessionCookie } from "../../../../lib/auth";
import { findUserByEmail, markUserLoggedIn, validatePassword, verifyPassword } from "../../../../lib/users";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

  let user;
  try {
    user = await findUserByEmail(email);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to access user database." }, { status: 503 });
  }
  if (!user || !verifyPassword(password, user.passwordHash)) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

  const session = { email, firstName: user.firstName, lastName: user.lastName, plan: user.plan, planPrice: user.planPrice || PRO_PRICE_USD };
  await setSessionCookie(session);
  await markUserLoggedIn(email);
  await logUserActivity({ email, type: "login", plan: session.plan });
  return NextResponse.json({ user: session });
}
