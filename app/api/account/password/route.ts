import { NextResponse } from "next/server";

import { getCurrentSession } from "../../../../lib/auth";
import { findUserByEmail, updateUserPassword, validatePassword, verifyPassword } from "../../../../lib/users";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Login required." }, { status: 401 });

  let payload: { currentPassword?: string; newPassword?: string } = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const currentPassword = typeof payload.currentPassword === "string" ? payload.currentPassword : "";
  const newPassword = typeof payload.newPassword === "string" ? payload.newPassword : "";
  const passwordError = validatePassword(newPassword);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

  const user = await findUserByEmail(session.email).catch((error) => {
    console.error("Unable to load user for password update", error);
    return null;
  });
  if (!user) return NextResponse.json({ error: "Unable to access user database." }, { status: 503 });
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  await updateUserPassword(session.email, newPassword);
  return NextResponse.json({ message: "Password updated." });
}
