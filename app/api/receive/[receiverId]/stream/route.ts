import { NextResponse } from "next/server";
import { getReceiverEvents, subscribeReceiverEvents } from "../../../../../lib/receiver-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ receiverId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { receiverId } = await params;
  if (!receiverId) {
    return NextResponse.json({ error: "Receiver ID required." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          closed = true;
        }
      };

      const existingEvents = getReceiverEvents(receiverId);
      send(`event: ready\ndata: ${JSON.stringify({ connected: true })}\n\n`);
      send(`event: init\ndata: ${JSON.stringify({ events: existingEvents })}\n\n`);

      unsubscribe = subscribeReceiverEvents(receiverId, (event) => {
        send(`event: event\ndata: ${JSON.stringify(event)}\n\n`);
      });

      request.signal.addEventListener("abort", () => {
        closed = true;
        if (unsubscribe) unsubscribe();
      }, { once: true });
    },
    cancel() {
      closed = true;
      try {
        if (unsubscribe) unsubscribe();
      } catch {
        // best-effort cleanup
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
