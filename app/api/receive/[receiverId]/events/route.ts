import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../../../lib/auth";
import { clearHookEvents, deleteHookEvent, listHookEvents } from "../../../../../lib/hook-events";
import { clearReceiverEvents, deleteReceiverEvent, getReceiverEvents } from "../../../../../lib/receiver-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { receiverId: string } }) {
  const receiverId = params.receiverId;
  if (!receiverId) {
    return NextResponse.json({ error: "Receiver ID required." }, { status: 400 });
  }

  const session = getCurrentSession();
  const events = session ? await listHookEvents(session.email, receiverId) : getReceiverEvents(receiverId);
  return NextResponse.json({ events }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request, { params }: { params: { receiverId: string } }) {
  const receiverId = params.receiverId;
  if (!receiverId) {
    return NextResponse.json({ error: "Receiver ID required." }, { status: 400 });
  }

  const eventId = Number(new URL(request.url).searchParams.get("eventId"));
  const session = getCurrentSession();
  if (Number.isFinite(eventId) && eventId > 0) {
    if (session) {
      await deleteHookEvent(session.email, receiverId, eventId);
      return NextResponse.json({ events: await listHookEvents(session.email, receiverId) });
    }
    return NextResponse.json({ events: deleteReceiverEvent(receiverId, eventId) });
  }

  if (session) {
    await clearHookEvents(session.email, receiverId);
    return NextResponse.json({ events: [] });
  }

  clearReceiverEvents(receiverId);
  return NextResponse.json({ events: [] });
}
