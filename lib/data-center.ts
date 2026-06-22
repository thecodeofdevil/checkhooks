import { getCheckhooksDb } from "./mongodb";
import type { DataCenterField, ReceivedEvent } from "./receiver-store";
import { getWorkflowPathValue, type WorkflowContext } from "./workflow-engine";

export type DataCenterRow = {
  id: string;
  ownerEmail: string;
  hookId?: string;
  hookName?: string;
  receiverId: string;
  method: string;
  url: string;
  values: Record<string, unknown>;
  createdAt: Date;
};

const DATA_CENTER_COLLECTION = "data_center_rows";

async function getDataCenterCollection() {
  const db = await getCheckhooksDb();
  if (!db) return null;

  const collection = db.collection<DataCenterRow>(DATA_CENTER_COLLECTION);
  await collection.createIndex({ ownerEmail: 1, receiverId: 1, createdAt: -1 });
  await collection.createIndex({ ownerEmail: 1, createdAt: -1 });
  return collection;
}

export async function saveDataCenterRow(input: {
  ownerEmail: string;
  hookId?: string;
  hookName?: string;
  receiverId: string;
  event: ReceivedEvent;
  fields: DataCenterField[];
  context: WorkflowContext;
}) {
  const collection = await getDataCenterCollection();
  if (!collection || input.fields.length === 0) return null;

  const values = Object.fromEntries(input.fields.map((field) => [field.label, getWorkflowPathValue(input.context, field.path)]));
  const row: DataCenterRow = {
    id: `${Date.now()}-${Math.round(Math.random() * 100000)}`,
    ownerEmail: input.ownerEmail,
    hookId: input.hookId,
    hookName: input.hookName,
    receiverId: input.receiverId,
    method: input.event.method,
    url: input.event.url,
    values,
    createdAt: new Date(input.event.when),
  };
  await collection.insertOne(row);
  return row;
}

export async function listDataCenterRows(ownerEmail: string, filters?: { receiverId?: string; search?: string }) {
  const collection = await getDataCenterCollection();
  if (!collection) return [];
  const query: Record<string, unknown> = { ownerEmail };
  if (filters?.receiverId) query.receiverId = filters.receiverId;

  const rows = await collection.find(query).sort({ createdAt: -1 }).limit(200).toArray();
  const search = filters?.search?.trim().toLowerCase();
  const filtered = search
    ? rows.filter((row) => JSON.stringify({ hookName: row.hookName, values: row.values }).toLowerCase().includes(search))
    : rows;
  return filtered.map(({ ownerEmail: _ownerEmail, ...row }) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

export async function deleteDataCenterRow(ownerEmail: string, rowId: string) {
  const collection = await getDataCenterCollection();
  await collection?.deleteOne({ ownerEmail, id: rowId });
}
