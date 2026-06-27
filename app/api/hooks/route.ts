import { NextResponse } from "next/server";

import { getCurrentSession } from "../../../lib/auth";
import { deleteUserHook, listUserHooks, upsertUserHook, type StoredHook } from "../../../lib/hooks";
import type { DataCenterField, WorkflowNode } from "../../../lib/receiver-store";

type HeaderInput = { name?: unknown; value?: unknown };

function toClientHook(hook: StoredHook) {
  return {
    id: hook.id,
    name: hook.name,
    url: hook.url,
    method: "RECEIVER",
    headers: hook.responseHeaders,
    body: hook.responseBody,
    responseStatus: hook.responseStatus,
    responseContentType: hook.responseContentType,
    rateLimitPerMinute: hook.rateLimitPerMinute,
    authEnabled: hook.authEnabled,
    authToken: hook.authToken,
    workflowEnabled: Boolean(hook.workflowEnabled),
    workflowNodes: hook.workflowNodes ?? [],
    dataCenterEnabled: Boolean(hook.dataCenterEnabled),
    dataCenterFields: hook.dataCenterFields ?? [],
    status: hook.status,
    createdAt: hook.createdAt.toISOString(),
    updatedAt: hook.updatedAt.toISOString(),
    lastSentAt: hook.lastSentAt?.toISOString(),
    sentCount: hook.sentCount,
  };
}

function sanitizeWorkflowNodes(value: unknown): WorkflowNode[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((node, index) => {
    const raw = node && typeof node === "object" ? node as Record<string, unknown> : {};
    const type = raw.type === "transform" || raw.type === "condition" || raw.type === "forward" ? raw.type : "response";
    const config = raw.config && typeof raw.config === "object" ? raw.config as Record<string, unknown> : {};
    return {
      id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `node-${index + 1}`,
      type,
      label: typeof raw.label === "string" && raw.label.trim() ? raw.label.trim().slice(0, 80) : `${type} node`,
      enabled: raw.enabled !== false,
      config: {
        status: Number(config.status) >= 100 && Number(config.status) <= 599 ? Number(config.status) : undefined,
        contentType: typeof config.contentType === "string" ? config.contentType.trim().slice(0, 120) : undefined,
        bodyTemplate: typeof config.bodyTemplate === "string" ? config.bodyTemplate : undefined,
        headerName: typeof config.headerName === "string" ? config.headerName.trim().slice(0, 80) : undefined,
        headerValue: typeof config.headerValue === "string" ? config.headerValue : undefined,
        path: typeof config.path === "string" ? config.path.trim().slice(0, 120) : undefined,
        operator: config.operator === "equals" || config.operator === "contains" ? config.operator : config.operator === "exists" ? "exists" : undefined,
        value: typeof config.value === "string" ? config.value : undefined,
        failStatus: Number(config.failStatus) >= 100 && Number(config.failStatus) <= 599 ? Number(config.failStatus) : undefined,
        failBodyTemplate: typeof config.failBodyTemplate === "string" ? config.failBodyTemplate : undefined,
        url: typeof config.url === "string" ? config.url.trim().slice(0, 500) : undefined,
        method: typeof config.method === "string" ? config.method.trim().toUpperCase().slice(0, 12) : undefined,
      },
    };
  });
}

function sanitizeDataCenterFields(value: unknown): DataCenterField[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 24).map((field, index) => {
    const raw = field && typeof field === "object" ? field as Record<string, unknown> : {};
    return {
      id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `field-${index + 1}`,
      label: typeof raw.label === "string" && raw.label.trim() ? raw.label.trim().slice(0, 80) : `Field ${index + 1}`,
      path: typeof raw.path === "string" && raw.path.trim() ? raw.path.trim().slice(0, 120) : "body",
    };
  }).filter((field) => field.path);
}

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const hooks = await listUserHooks(session.email);
  return NextResponse.json({ hooks: hooks.map(toClientHook) });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid hook payload." }, { status: 400 });
  }

  const receiverId = typeof payload.receiverId === "string" ? payload.receiverId.trim() : "";
  const url = typeof payload.url === "string" ? payload.url.trim() : "";
  if (!receiverId || !url) {
    return NextResponse.json({ error: "Receiver ID and URL are required." }, { status: 400 });
  }

  try {
    if (session.plan !== "pro" && (Boolean(payload.workflowEnabled) || Boolean(payload.dataCenterEnabled))) {
      return NextResponse.json({ error: "Workflow and Data Center are available on Pro." }, { status: 403 });
    }

    const workflowEnabled = Boolean(payload.workflowEnabled) && session.plan === "pro";
    const dataCenterEnabled = Boolean(payload.dataCenterEnabled) && session.plan === "pro";
    const hook = await upsertUserHook(session.email, session.plan, {
      id: typeof payload.id === "string" && payload.id ? payload.id : receiverId,
      receiverId,
      name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : "Receiver hook",
      url,
      status: payload.status === "paused" ? "paused" : "active",
      responseStatus: Number(payload.responseStatus) >= 100 && Number(payload.responseStatus) <= 599 ? Number(payload.responseStatus) : 200,
      responseContentType: typeof payload.responseContentType === "string" && payload.responseContentType.trim() ? payload.responseContentType.trim() : "application/json",
      responseHeaders: Array.isArray(payload.headers)
        ? (payload.headers as HeaderInput[])
            .filter((header) => typeof header.name === "string" && header.name.trim() && typeof header.value === "string")
            .map((header) => ({ name: String(header.name).trim(), value: String(header.value) }))
        : [],
      responseBody: typeof payload.body === "string" ? payload.body : JSON.stringify({ received: true }, null, 2),
      rateLimitPerMinute: Number(payload.rateLimitPerMinute) > 0 ? Number(payload.rateLimitPerMinute) : session.plan === "pro" ? 1200 : 120,
      authEnabled: Boolean(payload.authEnabled),
      authToken: typeof payload.authToken === "string" ? payload.authToken.trim() : "",
      workflowEnabled,
      workflowNodes: workflowEnabled ? sanitizeWorkflowNodes(payload.workflowNodes) : [],
      dataCenterEnabled,
      dataCenterFields: dataCenterEnabled ? sanitizeDataCenterFields(payload.dataCenterFields) : [],
      sentCount: Number(payload.sentCount ?? 0),
    });

    return NextResponse.json({ hook: toClientHook(hook) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save hook." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const receiverId = searchParams.get("receiverId") ?? "";
  if (!receiverId) return NextResponse.json({ error: "Receiver ID required." }, { status: 400 });

  await deleteUserHook(session.email, receiverId);
  return NextResponse.json({ status: "deleted" });
}
