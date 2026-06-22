import { getCheckhooksDb } from "./mongodb";
import type { UserPlan } from "./receiver-store";

type ActivityInput = {
  email: string;
  type: "login" | "signup" | "logout" | "subscribe" | "receiver_registered" | "receiver_request";
  plan?: UserPlan;
  receiverId?: string;
  metadata?: Record<string, unknown>;
};

export async function logUserActivity(activity: ActivityInput) {
  try {
    const db = await getCheckhooksDb();
    if (!db) return;

    await db.collection("user_activities").insertOne({
      ...activity,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Unable to log user activity", error);
  }
}
