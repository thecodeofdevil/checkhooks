import { NextResponse } from "next/server";

import { getReceiverUsage } from "../../../../../lib/receiver-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { receiverId: string } }) {
  if (!params.receiverId) {
    return NextResponse.json({ error: "Receiver ID required." }, { status: 400 });
  }

  return NextResponse.json({ usage: await getReceiverUsage(params.receiverId) }, { headers: { "Cache-Control": "no-store" } });
}
