import { NextResponse } from "next/server";

import { getCurrentSession, setSessionCookie } from "../../../../lib/auth";
import { updateUserProfile } from "../../../../lib/users";

export async function POST(request: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Login required." }, { status: 401 });

  let payload: { firstName?: string; lastName?: string } = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const firstName = typeof payload.firstName === "string" ? payload.firstName.trim() : "";
  const lastName = typeof payload.lastName === "string" ? payload.lastName.trim() : "";
  if (!firstName || !lastName) {
    return NextResponse.json({ error: "First name and last name are required." }, { status: 400 });
  }

  await updateUserProfile(session.email, { firstName, lastName });
  const user = { ...session, firstName, lastName };
  setSessionCookie(user);
  return NextResponse.json({ user });
}
