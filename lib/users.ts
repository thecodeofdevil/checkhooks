import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

import { getCheckhooksDb } from "./mongodb";
import type { UserPlan } from "./receiver-store";

export type StoredUser = {
  email: string;
  firstName?: string;
  lastName?: string;
  passwordHash: string;
  plan: UserPlan;
  planPrice: number;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
};

const USERS_COLLECTION = "users";
const PASSWORD_ITERATIONS = 210_000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_DIGEST = "sha256";

export function getDefaultProfileNames(email: string) {
  const base = email.split("@")[0] || "checkhooks";
  const clean = base.replace(/[^a-zA-Z0-9]+/g, " ").trim();
  const [first = "Checkhooks", ...rest] = clean.split(/\s+/).filter(Boolean);
  const last = rest.join(" ") || "User";
  return {
    firstName: first.charAt(0).toUpperCase() + first.slice(1),
    lastName: last.charAt(0).toUpperCase() + last.slice(1),
  };
}

export function validatePassword(value: unknown) {
  if (typeof value !== "string") return "Enter your password.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (value.length > 128) return "Password must be 128 characters or fewer.";
  return null;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST).toString("base64url");
  return `pbkdf2$${PASSWORD_ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [algorithm, iterationsValue, salt, hash] = storedHash.split("$");
  const iterations = Number(iterationsValue);
  if (algorithm !== "pbkdf2" || !Number.isFinite(iterations) || !salt || !hash) return false;

  const expectedHash = pbkdf2Sync(password, salt, iterations, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST).toString("base64url");
  const storedBuffer = Buffer.from(hash);
  const expectedBuffer = Buffer.from(expectedHash);
  return storedBuffer.length === expectedBuffer.length && timingSafeEqual(storedBuffer, expectedBuffer);
}

async function getUsersCollection() {
  const db = await getCheckhooksDb();
  if (!db) return null;

  const collection = db.collection<StoredUser>(USERS_COLLECTION);
  await collection.createIndex({ email: 1 }, { unique: true });
  return collection;
}

export async function findUserByEmail(email: string) {
  const collection = await getUsersCollection();
  return collection?.findOne({ email }) ?? null;
}

export async function createUser(email: string, password: string, planPrice: number) {
  const collection = await getUsersCollection();
  if (!collection) throw new Error("MongoDB is required for user accounts.");

  const now = new Date();
  const names = getDefaultProfileNames(email);
  const user: StoredUser = {
    email,
    ...names,
    passwordHash: hashPassword(password),
    plan: "free",
    planPrice,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await collection.insertOne(user);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      throw new Error("An account already exists for this email.");
    }
    throw error;
  }

  return user;
}

export async function markUserLoggedIn(email: string) {
  const collection = await getUsersCollection();
  await collection?.updateOne({ email }, { $set: { lastLoginAt: new Date(), updatedAt: new Date() } });
}

export async function updateUserPlan(email: string, plan: UserPlan, planPrice: number) {
  const collection = await getUsersCollection();
  await collection?.updateOne({ email }, { $set: { plan, planPrice, updatedAt: new Date() } });
}

export async function updateUserProfile(email: string, profile: { firstName: string; lastName: string }) {
  const collection = await getUsersCollection();
  await collection?.updateOne({ email }, { $set: { firstName: profile.firstName, lastName: profile.lastName, updatedAt: new Date() } });
}

export async function updateUserPassword(email: string, password: string) {
  const collection = await getUsersCollection();
  await collection?.updateOne({ email }, { $set: { passwordHash: hashPassword(password), updatedAt: new Date() } });
}

export async function deleteUserByEmail(email: string) {
  const collection = await getUsersCollection();
  await collection?.deleteOne({ email });
}
