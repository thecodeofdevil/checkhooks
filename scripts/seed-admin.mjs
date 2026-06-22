import { pbkdf2Sync, randomBytes } from "crypto";
import { readFileSync } from "fs";
import { MongoClient } from "mongodb";

function loadEnvFile(path) {
  try {
    const content = readFileSync(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...valueParts] = trimmed.split("=");
      if (!process.env[key]) {
        process.env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
      }
    }
  } catch {}
}

function hashPassword(password) {
  const iterations = 210_000;
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64url");
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const email = (process.env.DEFAULT_ADMIN_EMAIL || "").trim().toLowerCase();
const password = process.env.DEFAULT_ADMIN_PASSWORD || "";
const uri = process.env.MONGODB_URI || process.env.MONGO_URL || "";
const databaseName = process.env.MONGODB_DB || "checkhooks";

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error("Set DEFAULT_ADMIN_EMAIL to a valid email address.");
}

if (password.length < 8) {
  throw new Error("Set DEFAULT_ADMIN_PASSWORD to at least 8 characters.");
}

if (!uri) {
  throw new Error("Set MONGODB_URI before seeding an admin user.");
}

const client = new MongoClient(uri);
await client.connect();

try {
  const users = client.db(databaseName).collection("users");
  const now = new Date();
  await users.createIndex({ email: 1 }, { unique: true });
  await users.updateOne(
    { email },
    {
      $set: {
        email,
        passwordHash: hashPassword(password),
        plan: "pro",
        planPrice: Number(process.env.PRO_PLAN_PRICE_USD ?? 5),
        updatedAt: now,
        lastLoginAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  console.log(`Admin user ready: ${email}`);
} finally {
  await client.close();
}
