import type { ReceiverResponseConfig, WorkflowNode } from "./receiver-store";

export type WorkflowContext = {
  body: unknown;
  query: Record<string, string>;
  headers: Record<string, string>;
  method: string;
  url: string;
};

export type WorkflowResult = {
  status: number;
  contentType: string;
  headers: Record<string, string>;
  body: string;
  halted: boolean;
};

export function getWorkflowPathValue(context: WorkflowContext, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, context);
}

export function renderWorkflowTemplate(template: string, context: WorkflowContext) {
  return template.replace(/{{\s*([\w.-]+)\s*}}/g, (placeholder, path: string, offset: number, source: string) => {
    const value = getWorkflowPathValue(context, path);
    if (value === undefined || value === null) return "";
    const isInsideJsonString = source[offset - 1] === '"' && source[offset + placeholder.length] === '"';
    if (isInsideJsonString) {
      const stringValue = typeof value === "object" ? JSON.stringify(value) : String(value);
      return JSON.stringify(stringValue).slice(1, -1);
    }
    return typeof value === "object" ? JSON.stringify(value) : String(value);
  });
}

function conditionMatches(node: WorkflowNode, context: WorkflowContext) {
  const path = node.config.path || "body";
  const value = getWorkflowPathValue(context, path);
  if (node.config.operator === "equals") return String(value ?? "") === String(node.config.value ?? "");
  if (node.config.operator === "contains") return String(value ?? "").includes(String(node.config.value ?? ""));
  return value !== undefined && value !== null && value !== "";
}

export async function executeWorkflow(config: ReceiverResponseConfig, context: WorkflowContext): Promise<WorkflowResult> {
  const result: WorkflowResult = {
    status: config.status,
    contentType: config.contentType,
    headers: { ...config.headers },
    body: config.body,
    halted: false,
  };

  const nodes = config.workflow?.enabled ? (config.workflow.nodes ?? []).filter((node) => node.enabled) : [];
  for (const node of nodes) {
    if (node.type === "condition" && !conditionMatches(node, context)) {
      result.status = node.config.failStatus ?? 422;
      result.body = node.config.failBodyTemplate ?? JSON.stringify({ error: "Workflow condition failed.", node: node.label }, null, 2);
      result.contentType = "application/json";
      result.halted = true;
      break;
    }

    if (node.type === "transform") {
      if (node.config.bodyTemplate !== undefined) result.body = node.config.bodyTemplate;
      if (node.config.contentType) result.contentType = node.config.contentType;
      if (node.config.headerName) result.headers[node.config.headerName] = node.config.headerValue ?? "";
    }

    if (node.type === "forward" && node.config.url) {
      try {
        await fetch(node.config.url, {
          method: node.config.method || "POST",
          headers: { "Content-Type": result.contentType },
          body: renderWorkflowTemplate(node.config.bodyTemplate ?? result.body, context),
        });
      } catch (error) {
        result.headers["X-Checkhooks-Workflow-Warning"] = error instanceof Error ? error.message.slice(0, 160) : "Forward request failed";
      }
    }

    if (node.type === "response") {
      if (node.config.status) result.status = node.config.status;
      if (node.config.contentType) result.contentType = node.config.contentType;
      if (node.config.bodyTemplate !== undefined) result.body = node.config.bodyTemplate;
      if (node.config.headerName) result.headers[node.config.headerName] = node.config.headerValue ?? "";
    }
  }

  return result;
}
