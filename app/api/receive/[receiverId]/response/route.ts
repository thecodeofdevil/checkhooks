import { NextResponse } from "next/server";
import { getReceiverResponseConfig, setReceiverResponseConfig, updateReceiverRateLimit } from "../../../../../lib/receiver-store";

export async function GET(request: Request, { params }: { params: { receiverId: string } }) {
  const receiverId = params.receiverId;
  if (!receiverId) {
    return NextResponse.json({ error: "Receiver ID required." }, { status: 400 });
  }

  return NextResponse.json(await getReceiverResponseConfig(receiverId));
}

export async function POST(request: Request, { params }: { params: { receiverId: string } }) {
  const receiverId = params.receiverId;
  if (!receiverId) {
    return NextResponse.json({ error: "Receiver ID required." }, { status: 400 });
  }

  const bodyText = await request.text();
  let payload: {
    status?: number;
    contentType?: string;
    headers?: Record<string, string>;
    body?: string;
    authEnabled?: boolean;
    authToken?: string;
    rateLimitPerMinute?: number;
    hookStatus?: "active" | "paused";
  } = {};

  try {
    payload = JSON.parse(bodyText ?? "{}");
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const status = typeof payload.status === "number" && payload.status >= 100 && payload.status <= 599 ? payload.status : 200;
  const contentType = typeof payload.contentType === "string" && payload.contentType.trim()
    ? payload.contentType.replace(/[\r\n]/g, "").trim()
    : "application/json";
  const headers = payload.headers && typeof payload.headers === "object"
    ? Object.fromEntries(Object.entries(payload.headers).filter(([name, value]) => {
        if (!name.trim() || typeof value !== "string") return false;
        try {
          new Headers([[name, value]]);
          return true;
        } catch {
          return false;
        }
      }))
    : {};
  const responseBody = typeof payload.body === "string" ? payload.body : JSON.stringify({ received: true }, null, 2);
  const authEnabled = Boolean(payload.authEnabled);
  const authToken = typeof payload.authToken === "string" ? payload.authToken.trim() : "";
  const hookStatus = payload.hookStatus === "paused" ? "paused" : "active";

  await setReceiverResponseConfig(receiverId, {
    status,
    contentType,
    headers,
    body: responseBody,
    authEnabled,
    authToken,
    hookStatus,
  });
  const usage = await updateReceiverRateLimit(receiverId, payload.rateLimitPerMinute);

  return NextResponse.json({ status: "updated", usage });
}
