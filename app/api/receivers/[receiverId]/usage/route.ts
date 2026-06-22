import { NextResponse } from "next/server";

import { getReceiverUsage } from "../../../../../lib/receiver-store";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ receiverId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { receiverId } = await params;
  if (!receiverId) {
    return NextResponse.json({ error: "Receiver ID required." }, { status: 400 });
  }

  return NextResponse.json({ usage: await getReceiverUsage(receiverId) }, { headers: { "Cache-Control": "no-store" } });
}
