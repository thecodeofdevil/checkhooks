import { NextResponse } from "next/server";

import { getCurrentSession } from "../../../lib/auth";

const MIN_AMOUNT_SUBUNITS = 100;

function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Login required before payment." }, { status: 401 });
  }

  const credentials = getRazorpayCredentials();
  if (!credentials) {
    return NextResponse.json({ error: "Razorpay credentials are not configured." }, { status: 500 });
  }

  const payload = await request.json().catch(() => ({}));
  const amount = Math.max(Number(payload.amount ?? process.env.RAZORPAY_PRO_AMOUNT_SUBUNITS ?? 500), MIN_AMOUNT_SUBUNITS);
  const currency = typeof payload.currency === "string" && payload.currency.trim()
    ? payload.currency.trim().toUpperCase()
    : process.env.RAZORPAY_CURRENCY || "USD";
  const receipt = typeof payload.receipt === "string" && payload.receipt.trim()
    ? payload.receipt.trim().slice(0, 40)
    : `pro_${Date.now()}`;

  try {
    const auth = Buffer.from(`${credentials.keyId}:${credentials.keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt,
        notes: {
          email: session.email,
          plan: "pro",
        },
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: data.error?.description ?? "Unable to create Razorpay order." }, { status: response.status === 401 ? 401 : 500 });
    }

    return NextResponse.json({
      order_id: data.id,
      amount: data.amount,
      currency: data.currency,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create Razorpay order." }, { status: 500 });
  }
}
