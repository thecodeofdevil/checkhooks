import { NextResponse } from "next/server";

import { getCurrentSession } from "../../../lib/auth";
import { deleteTempUserPresence, upsertTempUserPresence } from "../../../lib/temp-users";

type TempUserPayload = {
  id?: string;
  receiverId?: string;
  page?: string;
  action?: string;
};

async function readPayload(request: Request): Promise<TempUserPayload> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return request.json();
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const payload = await readPayload(request);
  if (payload.action === "delete" && payload.id && typeof payload.id === "string") {
    await deleteTempUserPresence(payload.id);
    return NextResponse.json({ ok: true });
  }

  const session = getCurrentSession();
  if (session) return NextResponse.json({ skipped: true, reason: "logged_in" });
  if (!payload.id || typeof payload.id !== "string" || !payload.receiverId || typeof payload.receiverId !== "string") {
    return NextResponse.json({ error: "Temp user id and receiver id required." }, { status: 400 });
  }

  const presence = await upsertTempUserPresence({
    id: payload.id,
    receiverId: payload.receiverId,
    page: typeof payload.page === "string" ? payload.page : "/app",
    userAgent: request.headers.get("user-agent") || "Unknown",
  });

  return NextResponse.json({ presence });
}

export async function DELETE(request: Request) {
  const payload = await readPayload(request);
  if (payload.id && typeof payload.id === "string") {
    await deleteTempUserPresence(payload.id);
  }
  return NextResponse.json({ ok: true });
}
