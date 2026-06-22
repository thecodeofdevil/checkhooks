import { NextResponse } from "next/server";
import { logUserActivity } from "../../../../lib/activity-log";
import { saveDataCenterRow } from "../../../../lib/data-center";
import { saveHookEvent } from "../../../../lib/hook-events";
import { appendReceiverEvent, checkAndCountReceiverRequest, getReceiverResponseConfig } from "../../../../lib/receiver-store";
import { executeWorkflow, renderWorkflowTemplate } from "../../../../lib/workflow-engine";

type TemplateContext = {
  body: unknown;
  query: Record<string, string>;
  headers: Record<string, string>;
  method: string;
  url: string;
};

function getPathValue(context: TemplateContext, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, context);
}

function renderTemplate(template: string, context: TemplateContext) {
  return template.replace(/{{\s*([\w.-]+)\s*}}/g, (placeholder, path: string, offset: number, source: string) => {
    const value = getPathValue(context, path);
    if (value === undefined || value === null) return "";
    const isInsideJsonString = source[offset - 1] === '"' && source[offset + placeholder.length] === '"';
    if (isInsideJsonString) {
      const stringValue = typeof value === "object" ? JSON.stringify(value) : String(value);
      return JSON.stringify(stringValue).slice(1, -1);
    }
    return typeof value === "object" ? JSON.stringify(value) : String(value);
  });
}

async function handleReceiver(request: Request, receiverId: string) {
  if (!receiverId) {
    return NextResponse.json({ error: "Receiver ID required." }, { status: 400 });
  }

  const config = await getReceiverResponseConfig(receiverId);
  if (config.hookStatus === "paused") {
    return NextResponse.json({ error: "Receiver hook is paused." }, { status: 403 });
  }

  if (config.authEnabled && config.authToken) {
    const authorization = request.headers.get("authorization") ?? "";
    const token = request.headers.get("x-checkhooks-token") ?? "";
    const expectedBearer = `Bearer ${config.authToken}`;
    if (authorization !== expectedBearer && token !== config.authToken) {
      return NextResponse.json(
        { error: "Receiver authorization failed." },
        { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
      );
    }
  }

  const quota = await checkAndCountReceiverRequest(receiverId);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: quota.reason === "rate"
          ? "Receiver rate limit exceeded. Try again in a minute."
          : "Receiver daily quota exceeded. Requests are blocked until the daily limit resets.",
        usage: quota.usage,
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(quota.usage.rateLimitPerMinute),
          "X-RateLimit-Remaining": String(Math.max(quota.usage.rateLimitPerMinute - quota.usage.windowAccepted, 0)),
          "X-Receiver-Request-Limit": String(quota.usage.totalLimit),
          "X-Receiver-Request-Remaining": String(quota.usage.remaining),
          "Retry-After": quota.reason === "rate" ? "60" : "86400",
        },
      }
    );
  }

  const requestUrl = new URL(request.url);
  const url = `${requestUrl.pathname}${requestUrl.search}`;
  const headers: Record<string, string> = {};
  request.headers.forEach((value, name) => {
    headers[name] = value;
  });

  const query = Object.fromEntries(requestUrl.searchParams.entries());
  const bodyText = request.method === "GET" || request.method === "HEAD" ? "" : await request.text();
  let parsedBody: unknown = bodyText;

  if (bodyText) {
    try {
      parsedBody = request.headers.get("content-type")?.includes("application/x-www-form-urlencoded")
        ? Object.fromEntries(new URLSearchParams(bodyText).entries())
        : JSON.parse(bodyText);
    } catch {
      parsedBody = bodyText;
    }
  }

  const receivedEvent = appendReceiverEvent(receiverId, {
    receiverId,
    method: request.method,
    url,
    headers,
    query,
    body: bodyText,
  }, { persist: Boolean(quota.usage.ownerEmail) });
  if (quota.usage.ownerEmail) {
    await saveHookEvent(quota.usage.ownerEmail, receivedEvent);
    await logUserActivity({
      email: quota.usage.ownerEmail,
      type: "receiver_request",
      plan: quota.usage.plan,
      receiverId,
      metadata: { method: request.method, path: url },
    });
  }

  const context: TemplateContext = {
    body: parsedBody,
    query,
    headers,
    method: request.method,
    url,
  };
  if (config.dataCenter?.enabled && config.ownerEmail) {
    await saveDataCenterRow({
      ownerEmail: config.ownerEmail,
      hookId: config.hookId,
      hookName: config.hookName,
      receiverId,
      event: receivedEvent,
      fields: config.dataCenter.fields ?? [],
      context,
    });
  }

  const workflowResult = await executeWorkflow(config, context);
  const responseHeaders = new Headers();
  Object.entries(workflowResult.headers).forEach(([name, value]) => {
    responseHeaders.set(name, renderWorkflowTemplate(value, context));
  });
  responseHeaders.set("Content-Type", renderWorkflowTemplate(workflowResult.contentType, context));

  const bodylessStatus = workflowResult.status === 204 || workflowResult.status === 205 || workflowResult.status === 304;
  return new NextResponse(bodylessStatus ? null : renderWorkflowTemplate(workflowResult.body, context), {
    status: workflowResult.status,
    headers: {
      ...Object.fromEntries(responseHeaders.entries()),
      "X-RateLimit-Limit": String(quota.usage.rateLimitPerMinute),
      "X-RateLimit-Remaining": String(Math.max(quota.usage.rateLimitPerMinute - quota.usage.windowAccepted, 0)),
      "X-Receiver-Request-Limit": String(quota.usage.totalLimit),
      "X-Receiver-Request-Remaining": String(quota.usage.remaining),
    },
  });
}

type RouteContext = { params: { receiverId: string } };

export async function GET(request: Request, { params }: RouteContext) {
  return handleReceiver(request, params.receiverId);
}

export async function POST(request: Request, { params }: RouteContext) {
  return handleReceiver(request, params.receiverId);
}

export async function PUT(request: Request, { params }: RouteContext) {
  return handleReceiver(request, params.receiverId);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  return handleReceiver(request, params.receiverId);
}

export async function DELETE(request: Request, { params }: RouteContext) {
  return handleReceiver(request, params.receiverId);
}
