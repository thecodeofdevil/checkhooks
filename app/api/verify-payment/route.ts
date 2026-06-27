import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

import { logUserActivity } from "../../../lib/activity-log";
import { getCurrentSession, PRO_PRICE_USD, setSessionCookie } from "../../../lib/auth";
import { updateUserPlan } from "../../../lib/users";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function fetchRazorpayJson(path: string) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;

  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return await response.json().catch(() => null) as Record<string, unknown> | null;
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Login required before payment verification." }, { status: 401 });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return NextResponse.json({ error: "Razorpay secret is not configured." }, { status: 500 });
  }

  const payload = await request.json().catch(() => null);
  const orderId = typeof payload?.razorpay_order_id === "string" ? payload.razorpay_order_id : "";
  const paymentId = typeof payload?.razorpay_payment_id === "string" ? payload.razorpay_payment_id : "";
  const signature = typeof payload?.razorpay_signature === "string" ? payload.razorpay_signature : "";

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "Missing Razorpay payment verification fields." }, { status: 400 });
  }

  const expectedSignature = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  if (!safeEqual(expectedSignature, signature)) {
    return NextResponse.json({ error: "Payment signature mismatch." }, { status: 400 });
  }

  const paymentDetails = await fetchRazorpayJson(`payments/${encodeURIComponent(paymentId)}`);
  const invoiceId = typeof paymentDetails?.invoice_id === "string" ? paymentDetails.invoice_id : "";
  const invoiceDetails = invoiceId ? await fetchRazorpayJson(`invoices/${encodeURIComponent(invoiceId)}`) : null;
  const invoiceUrl = typeof invoiceDetails?.short_url === "string" ? invoiceDetails.short_url : "";

  const updatedSession = {
    ...session,
    plan: "pro" as const,
    planPrice: PRO_PRICE_USD,
  };
  await setSessionCookie(updatedSession);
  await updateUserPlan(updatedSession.email, updatedSession.plan, updatedSession.planPrice);
  await logUserActivity({
    email: updatedSession.email,
    type: "subscribe",
    plan: updatedSession.plan,
    metadata: {
      provider: "razorpay",
      orderId,
      paymentId,
      signature,
      priceUsd: PRO_PRICE_USD,
      amount: Number(paymentDetails?.amount ?? process.env.RAZORPAY_PRO_AMOUNT_SUBUNITS ?? 500),
      currency: typeof paymentDetails?.currency === "string" ? paymentDetails.currency : process.env.RAZORPAY_CURRENCY || "USD",
      status: typeof paymentDetails?.status === "string" ? paymentDetails.status : "captured",
      method: typeof paymentDetails?.method === "string" ? paymentDetails.method : "checkout",
      invoiceId: invoiceId || undefined,
      invoiceUrl: invoiceUrl || undefined,
    },
  });

  return NextResponse.json({
    success: true,
    user: updatedSession,
    message: "Payment verified. Pro plan is active.",
  });
}
