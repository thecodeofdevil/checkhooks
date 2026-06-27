import { NextResponse } from "next/server";

import { getCurrentSession } from "../../../lib/auth";
import { getCheckhooksDb } from "../../../lib/mongodb";

type PaymentActivity = {
  email: string;
  type: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const db = await getCheckhooksDb();
  if (!db) return NextResponse.json({ payments: [] });

  const activities = await db.collection<PaymentActivity>("user_activities")
    .find({ email: session.email, type: "subscribe" })
    .sort({ createdAt: -1 })
    .limit(25)
    .toArray();

  return NextResponse.json({
    payments: activities.map((activity, index) => {
      const metadata = activity.metadata ?? {};
      return {
        id: stringValue(metadata.paymentId) || `${activity.createdAt?.toISOString() ?? Date.now()}-${index}`,
        provider: stringValue(metadata.provider) || "razorpay",
        orderId: stringValue(metadata.orderId),
        paymentId: stringValue(metadata.paymentId),
        amount: Number(metadata.amount ?? 500),
        currency: stringValue(metadata.currency) || "USD",
        status: stringValue(metadata.status) || "captured",
        method: stringValue(metadata.method) || "checkout",
        invoiceId: stringValue(metadata.invoiceId),
        invoiceUrl: stringValue(metadata.invoiceUrl),
        createdAt: activity.createdAt?.toISOString() ?? new Date().toISOString(),
      };
    }),
  });
}
