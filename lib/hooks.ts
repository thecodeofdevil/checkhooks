import { getCheckhooksDb } from "./mongodb";
import { setReceiverResponseConfig, updateReceiverRateLimit, type DataCenterField, type UserPlan, type WorkflowNode } from "./receiver-store";

export type StoredHook = {
  id: string;
  ownerEmail: string;
  receiverId: string;
  name: string;
  url: string;
  status: "active" | "paused";
  responseStatus: number;
  responseContentType: string;
  responseHeaders: { name: string; value: string }[];
  responseBody: string;
  rateLimitPerMinute: number;
  authEnabled: boolean;
  authToken: string;
  workflowEnabled?: boolean;
  workflowNodes?: WorkflowNode[];
  dataCenterEnabled?: boolean;
  dataCenterFields?: DataCenterField[];
  sentCount: number;
  lastSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const HOOKS_COLLECTION = "hooks";

async function getHooksCollection() {
  const db = await getCheckhooksDb();
  if (!db) return null;

  const collection = db.collection<StoredHook>(HOOKS_COLLECTION);
  await collection.createIndex({ ownerEmail: 1, receiverId: 1 }, { unique: true });
  await collection.createIndex({ ownerEmail: 1, updatedAt: -1 });
  return collection;
}

export async function listUserHooks(ownerEmail: string) {
  const collection = await getHooksCollection();
  if (!collection) return [];
  return collection.find({ ownerEmail }).sort({ updatedAt: -1 }).toArray();
}

export async function upsertUserHook(ownerEmail: string, plan: UserPlan, hook: Omit<StoredHook, "ownerEmail" | "createdAt" | "updatedAt">) {
  const collection = await getHooksCollection();
  if (!collection) throw new Error("Data Collection is required to save hooks.");

  const now = new Date();
  const count = await collection.countDocuments({ ownerEmail });
  const existing = await collection.findOne({ ownerEmail, receiverId: hook.receiverId });
  if (!existing && plan !== "pro" && count >= 2) {
    throw new Error("Free users can save up to 2 receiver hooks.");
  }

  const nextHook: StoredHook = {
    ...hook,
    ownerEmail,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    sentCount: existing?.sentCount ?? hook.sentCount ?? 0,
    lastSentAt: existing?.lastSentAt ?? hook.lastSentAt,
  };

  await collection.updateOne(
    { ownerEmail, receiverId: hook.receiverId },
    existing
      ? { $set: nextHook }
      : { $set: { ...nextHook, createdAt: now } },
    { upsert: true }
  );

  await syncHookRuntime(nextHook);
  return nextHook;
}

export async function deleteUserHook(ownerEmail: string, receiverId: string) {
  const collection = await getHooksCollection();
  await collection?.deleteOne({ ownerEmail, receiverId });
  await setReceiverResponseConfig(receiverId, {
    status: 410,
    contentType: "application/json",
    headers: {},
    body: JSON.stringify({ error: "Receiver hook deleted." }, null, 2),
    authEnabled: false,
    authToken: "",
    hookStatus: "paused",
  });
}

export async function syncHookRuntime(hook: Pick<StoredHook, "ownerEmail" | "id" | "name" | "receiverId" | "status" | "responseStatus" | "responseContentType" | "responseHeaders" | "responseBody" | "rateLimitPerMinute" | "authEnabled" | "authToken" | "workflowEnabled" | "workflowNodes" | "dataCenterEnabled" | "dataCenterFields">) {
  await setReceiverResponseConfig(hook.receiverId, {
    status: hook.responseStatus,
    contentType: hook.responseContentType,
    headers: Object.fromEntries(hook.responseHeaders.filter((header) => header.name.trim()).map((header) => [header.name, header.value])),
    body: hook.responseBody,
    authEnabled: hook.authEnabled,
    authToken: hook.authToken,
    hookStatus: hook.status,
    ownerEmail: hook.ownerEmail,
    hookId: hook.id,
    hookName: hook.name,
    workflow: {
      enabled: Boolean(hook.workflowEnabled),
      nodes: hook.workflowNodes ?? [],
    },
    dataCenter: {
      enabled: Boolean(hook.dataCenterEnabled),
      fields: hook.dataCenterFields ?? [],
    },
  });
  await updateReceiverRateLimit(hook.receiverId, hook.rateLimitPerMinute);
}
