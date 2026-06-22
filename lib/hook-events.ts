import { getCheckhooksDb } from "./mongodb";
import type { ReceivedEvent } from "./receiver-store";

export type StoredHookEvent = ReceivedEvent & {
  ownerEmail: string;
  createdAt: Date;
};

const HOOK_EVENTS_COLLECTION = "hook_events";
const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

async function getHookEventsCollection() {
  const db = await getCheckhooksDb();
  if (!db) return null;

  const collection = db.collection<StoredHookEvent>(HOOK_EVENTS_COLLECTION);
  await collection.createIndex({ ownerEmail: 1, receiverId: 1, createdAt: -1 });
  await collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: SEVEN_DAYS_IN_SECONDS });
  return collection;
}

export async function saveHookEvent(ownerEmail: string, event: ReceivedEvent) {
  const collection = await getHookEventsCollection();
  if (!collection) return;
  await collection.insertOne({ ...event, ownerEmail, createdAt: new Date(event.when) });
}

export async function listHookEvents(ownerEmail: string, receiverId: string) {
  const collection = await getHookEventsCollection();
  if (!collection) return [];
  const since = new Date(Date.now() - SEVEN_DAYS_IN_SECONDS * 1000);
  const events = await collection
    .find({ ownerEmail, receiverId, createdAt: { $gte: since } })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  return events.map(({ ownerEmail: _ownerEmail, createdAt: _createdAt, ...event }) => event);
}

export async function deleteHookEvent(ownerEmail: string, receiverId: string, eventId: number) {
  const collection = await getHookEventsCollection();
  await collection?.deleteOne({ ownerEmail, receiverId, id: eventId });
}

export async function clearHookEvents(ownerEmail: string, receiverId: string) {
  const collection = await getHookEventsCollection();
  await collection?.deleteMany({ ownerEmail, receiverId });
}
