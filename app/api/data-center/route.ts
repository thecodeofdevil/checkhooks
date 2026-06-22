import { NextResponse } from "next/server";

import { getCurrentSession } from "../../../lib/auth";
import { deleteDataCenterRow, listDataCenterRows } from "../../../lib/data-center";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Login required." }, { status: 401 });
  if (session.plan !== "pro") return NextResponse.json({ error: "Data Center is available on Pro." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const rows = await listDataCenterRows(session.email, {
    receiverId: searchParams.get("receiverId") || undefined,
    search: searchParams.get("search") || undefined,
  });
  return NextResponse.json({ rows }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Login required." }, { status: 401 });
  if (session.plan !== "pro") return NextResponse.json({ error: "Data Center is available on Pro." }, { status: 403 });

  const rowId = new URL(request.url).searchParams.get("rowId");
  if (!rowId) return NextResponse.json({ error: "Row ID required." }, { status: 400 });
  await deleteDataCenterRow(session.email, rowId);
  return NextResponse.json({ status: "deleted" });
}
