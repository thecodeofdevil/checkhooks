import { NextResponse } from "next/server";

import { logUserActivity } from "../../../../lib/activity-log";
import { normalizeEmail, PRO_PRICE_USD, setSessionCookie } from "../../../../lib/auth";
import { findUserByEmail, markUserLoggedIn, validatePassword, verifyPassword } from "../../../../lib/users";

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

  const user = await findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const session = { email, firstName: user.firstName, lastName: user.lastName, plan: user.plan, planPrice: user.planPrice || PRO_PRICE_USD };
  setSessionCookie(session);
  await markUserLoggedIn(email);
  await logUserActivity({ email, type: "login", plan: session.plan });
  return NextResponse.json({ user: session });
}
