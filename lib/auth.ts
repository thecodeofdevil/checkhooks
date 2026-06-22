import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

import type { UserPlan } from "./receiver-store";

export type UserSession = {
  email: string;
  firstName?: string;
  lastName?: string;
  plan: UserPlan;
  planPrice: number;
};

export const AUTH_COOKIE = "checkhooks_session";
export const PRO_PRICE_USD = Number(process.env.PRO_PLAN_PRICE_USD ?? 5);

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function getSecret() {
  return process.env.AUTH_SECRET || "checkhooks-local-dev-secret-change-me";
}

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionToken(session: UserSession) {
  const payload = encodeBase64Url(JSON.stringify(session));
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token?: string | null): UserSession | null {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const session = JSON.parse(decodeBase64Url(payload));
    if (typeof session.email !== "string" || (session.plan !== "free" && session.plan !== "pro")) return null;
    return {
      email: session.email,
      firstName: typeof session.firstName === "string" ? session.firstName : undefined,
      lastName: typeof session.lastName === "string" ? session.lastName : undefined,
      plan: session.plan,
      planPrice: typeof session.planPrice === "number" ? session.planPrice : PRO_PRICE_USD,
    };
  } catch {
    return null;
  }
}

export function getCurrentSession() {
  return readSessionToken(cookies().get(AUTH_COOKIE)?.value);
}

export function setSessionCookie(session: UserSession) {
  cookies().set(AUTH_COOKIE, createSessionToken(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export function clearSessionCookie() {
  cookies().delete(AUTH_COOKIE);
}

export function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
