import { NextResponse } from "next/server";

import { getCurrentSession, PRO_PRICE_USD, setSessionCookie } from "../../../../lib/auth";
import { findUserByEmail } from "../../../../lib/users";

export async function GET() {
  const session = getCurrentSession();
  let user = session;

  if (session) {
    const storedUser = await findUserByEmail(session.email);
    if (storedUser) {
      user = {
        email: storedUser.email,
        firstName: storedUser.firstName,
        lastName: storedUser.lastName,
        plan: storedUser.plan,
        planPrice: storedUser.planPrice || PRO_PRICE_USD,
      };
      setSessionCookie(user);
    }
  }

  return NextResponse.json({
    user,
    plans: {
      temp: {
        requestLimit: Number(process.env.TEMP_RECEIVER_REQUEST_LIMIT ?? process.env.FREE_RECEIVER_REQUEST_LIMIT ?? 10000),
        rateLimitPerMinute: Number(process.env.TEMP_RECEIVER_RATE_LIMIT_PER_MINUTE ?? 60),
      },
      free: {
        requestLimit: Number(process.env.LOGGED_IN_RECEIVER_REQUEST_LIMIT ?? 50000),
        rateLimitPerMinute: Number(process.env.LOGGED_IN_RECEIVER_RATE_LIMIT_PER_MINUTE ?? 120),
        savedHooks: 2,
      },
      pro: {
        price: PRO_PRICE_USD,
        requestLimit: Number(process.env.PRO_RECEIVER_REQUEST_LIMIT ?? 1000000),
        rateLimitPerMinute: Number(process.env.PRO_RECEIVER_RATE_LIMIT_PER_MINUTE ?? 1200),
      },
    },
  });
}
