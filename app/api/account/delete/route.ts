import { NextResponse } from "next/server";

import { clearSessionCookie, getCurrentSession } from "../../../../lib/auth";
import { deleteUserByEmail } from "../../../../lib/users";

export async function POST() {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Login required." }, { status: 401 });

  await deleteUserByEmail(session.email);
  clearSessionCookie();
  return NextResponse.json({ user: null, message: "Account deleted." });
}
