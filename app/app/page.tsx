"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckhooksLogo } from "@/components/checkhooks-logo";
import { SiteFooter } from "@/components/site-chrome";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Clipboard,
  Copy,
  CreditCard,
  Database,
  Edit3,
  History as HistoryIcon,
  Home,
  Inbox,
  Loader2,
  LogOut,
  MoreVertical,
  Plus,
  Radio,
  RotateCcw,
  Save,
  Send,
  Settings2,
  Trash2,
  Workflow,
  X,
} from "lucide-react";

type Header = { name: string; value: string };
type IncomingEvent = {
  id: number;
  receiverId?: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: string;
  when: string;
};
type UserSession = { email: string; firstName?: string; lastName?: string; plan: "free" | "pro"; planPrice: number };
type ReceiverUsage = {
  plan: "free" | "pro";
  totalAccepted: number;
  totalLimit: number;
  remaining: number;
  rateLimitPerMinute: number;
};
type ClientPage = "dashboard" | "hooks" | "workflow" | "dataCenter" | "sender" | "history" | "settings";
type WorkflowNodeType = "response" | "transform" | "condition" | "forward";
type WorkflowNode = {
  id: string;
  type: WorkflowNodeType;
  label: string;
  enabled: boolean;
  config: {
    status?: number;
    contentType?: string;
    bodyTemplate?: string;
    headerName?: string;
    headerValue?: string;
    path?: string;
    operator?: "exists" | "equals" | "contains";
    value?: string;
    failStatus?: number;
    failBodyTemplate?: string;
    url?: string;
    method?: string;
  };
};
type DataCenterField = { id: string; label: string; path: string };
type SavedHook = {
  id: string;
  name: string;
  url: string;
  method: string;
  headers: Header[];
  body: string;
  responseStatus?: number;
  responseContentType?: string;
  rateLimitPerMinute?: number;
  authEnabled?: boolean;
  authToken?: string;
  workflowEnabled?: boolean;
  workflowNodes?: WorkflowNode[];
  dataCenterEnabled?: boolean;
  dataCenterFields?: DataCenterField[];
  status?: "active" | "paused";
  createdAt: string;
  updatedAt: string;
  lastSentAt?: string;
  sentCount: number;
};
type DataCenterRow = {
  id: string;
  hookId?: string;
  hookName?: string;
  receiverId: string;
  method: string;
  url: string;
  values: Record<string, unknown>;
  createdAt: string;
};
type HookHistoryEntry = {
  id: string;
  hookId?: string;
  hookName: string;
  url: string;
  method: string;
  headers: Header[];
  body: string;
  status: number;
  statusText: string;
  responseText: string;
  success: boolean;
  createdAt: string;
};

const CLIENT_SESSION_KEY = "checkhooksClientSession";
const TEMP_USER_ID_KEY = "checkhooksTempUserId";
const CURRENT_RECEIVER_ID_KEY = "checkhooksCurrentReceiverId";
const SAVED_HOOKS_KEY = "checkhooksClientSavedHooks";
const HOOK_HISTORY_KEY = "checkhooksClientHookHistory";
const MAX_FREE_SAVED_HOOKS = 2;

function formatBody(value: string) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function getHeaderValue(headers: Record<string, string>, name: string) {
  const match = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return match?.[1] ?? "";
}

function getClientIp(headers: Record<string, string>) {
  return getHeaderValue(headers, "x-forwarded-for").split(",")[0]?.trim()
    || getHeaderValue(headers, "x-real-ip")
    || getHeaderValue(headers, "cf-connecting-ip")
    || "Not provided";
}

function getSafeReplayHeaders(headers: Record<string, string>): Header[] {
  const blockedHeaders = new Set(["host", "content-length", "connection", "cookie", "accept-encoding"]);
  return Object.entries(headers)
    .filter(([name, value]) => value && !blockedHeaders.has(name.toLowerCase()))
    .map(([name, value]) => ({ name, value }));
}

function getReceiverIdFromUrl(url: string) {
  return url.split("/api/receive/")[1]?.split(/[?#]/)[0] ?? "";
}

function getEventKey(event: IncomingEvent) {
  return `${event.receiverId ?? "receiver"}-${event.id}`;
}

export default function AppPage() {
  const tempUserIdRef = useRef<string>("");
  const [activePage, setActivePage] = useState<ClientPage>("dashboard");
  const [activeTempView, setActiveTempView] = useState<"receive" | "send">("receive");
  const [target, setTarget] = useState("https://example.com/checkhook");
  const [method, setMethod] = useState("POST");
  const [headers, setHeaders] = useState<Header[]>([{ name: "Content-Type", value: "application/json" }]);
  const [body, setBody] = useState(JSON.stringify({ event: "order.completed", order_id: "ord_9821" }, null, 2));
  const [hookName, setHookName] = useState("Order completed");
  const [savedHooks, setSavedHooks] = useState<SavedHook[]>([]);
  const [history, setHistory] = useState<HookHistoryEntry[]>([]);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [editingHookId, setEditingHookId] = useState<string | null>(null);
  const [activeHookId, setActiveHookId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [response, setResponse] = useState<{ status: number; statusText: string; body: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receiverId, setReceiverId] = useState("");
  const [origin, setOrigin] = useState("");
  const [incoming, setIncoming] = useState<IncomingEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<IncomingEvent | null>(null);
  const [copied, setCopied] = useState(false);
  const [responseStatus, setResponseStatus] = useState(200);
  const [responseContentType, setResponseContentType] = useState("application/json");
  const [responseHeaders, setResponseHeaders] = useState<Header[]>([]);
  const [responseBody, setResponseBody] = useState(JSON.stringify({ received: true, first_name: "{{body.first_name}}" }, null, 2));
  const [hookRateLimit, setHookRateLimit] = useState(120);
  const [hookAuthEnabled, setHookAuthEnabled] = useState(false);
  const [hookAuthToken, setHookAuthToken] = useState("");
  const [hookStatus, setHookStatus] = useState<"active" | "paused">("active");
  const [workflowEnabled, setWorkflowEnabled] = useState(false);
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowNode[]>([]);
  const [selectedWorkflowNodeId, setSelectedWorkflowNodeId] = useState<string | null>(null);
  const [isWorkflowAddMenuOpen, setIsWorkflowAddMenuOpen] = useState(false);
  const [dataCenterEnabled, setDataCenterEnabled] = useState(false);
  const [dataCenterFields, setDataCenterFields] = useState<DataCenterField[]>([]);
  const [dataCenterRows, setDataCenterRows] = useState<DataCenterRow[]>([]);
  const [dataCenterHookFilter, setDataCenterHookFilter] = useState("all");
  const [dataCenterSearch, setDataCenterSearch] = useState("");
  const [isHookFormOpen, setIsHookFormOpen] = useState(false);
  const [isSavingResponse, setIsSavingResponse] = useState(false);
  const [responseMessage, setResponseMessage] = useState("Ready");
  const [isResponseEditorOpen, setIsResponseEditorOpen] = useState(false);
  const [user, setUser] = useState<UserSession | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("Login to unlock Pro receiver limits.");
  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("Profile settings ready.");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [quota, setQuota] = useState<ReceiverUsage | null>(null);
  const [replayMessage, setReplayMessage] = useState<string | null>(null);
  const [copiedHookId, setCopiedHookId] = useState<string | null>(null);
  const [openHookMenuId, setOpenHookMenuId] = useState<string | null>(null);
  const [historyHookFilter, setHistoryHookFilter] = useState("all");
  const [historyDateFilter, setHistoryDateFilter] = useState("");
  const [hookInspectorEvents, setHookInspectorEvents] = useState<Array<IncomingEvent & { hookId: string; hookName: string; hookUrl: string }>>([]);
  const activeSavedHook = savedHooks.find((hook) => hook.id === activeHookId) ?? null;
  const selectedWorkflowNode = workflowNodes.find((node) => node.id === selectedWorkflowNodeId) ?? null;
  const receiverUrl = receiverId && origin ? `${origin}/api/receive/${receiverId}` : "";

  const validUrl = useMemo(() => {
    try {
      new URL(target);
      return true;
    } catch {
      return false;
    }
  }, [target]);

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentHistory = history.filter((entry) => Date.parse(entry.createdAt) >= sevenDaysAgo);
  const recentReceiverEvents = hookInspectorEvents.filter((entry) => Date.parse(entry.when) >= sevenDaysAgo);
  const requestTrend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const sentCount = recentHistory.filter((entry) => entry.createdAt.slice(0, 10) === key).length;
    const receivedCount = recentReceiverEvents.filter((entry) => entry.when.slice(0, 10) === key).length;
    const isToday = key === new Date().toISOString().slice(0, 10);
    const acceptedFallback = isToday ? Number(quota?.totalAccepted ?? 0) : 0;
    return {
      label: date.toLocaleDateString("en", { weekday: "short" }),
      date: date.toLocaleDateString("en", { month: "short", day: "numeric" }),
      value: Math.max(sentCount + receivedCount, acceptedFallback),
    };
  });
  const trendMax = Math.max(...requestTrend.map((item) => item.value), 1);
  const lineChartPoints = requestTrend
    .map((item, index) => {
      const x = 10 + index * 13.333;
      const y = 82 - (item.value / trendMax) * 62;
      return `${x},${y}`;
    })
    .join(" ");
  const lineChartFillPoints = `10,88 ${lineChartPoints} 90,88`;
  const quotaLimit = quota?.totalLimit ?? (user?.plan === "pro" ? 1000000 : 50000);
  const quotaUsed = Math.min(quota?.totalAccepted ?? 0, quotaLimit);
  const quotaRemaining = Math.max(quota?.remaining ?? quotaLimit - quotaUsed, 0);
  const acceptedRequestCount = Math.max(recentReceiverEvents.length, quotaUsed);
  const quotaUsedPercent = quotaLimit ? Math.round((quotaUsed / quotaLimit) * 100) : 0;
  const quotaRemainingPercent = Math.max(0, 100 - quotaUsedPercent);
  const mostActiveHooks = [...savedHooks].sort((left, right) => right.sentCount - left.sentCount).slice(0, 3);
  const recentSavedHooks = [...savedHooks].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)).slice(0, 3);
  const isProUser = user?.plan === "pro";
  const canSaveMoreHooks = Boolean(editingHookId) || isProUser || savedHooks.length < MAX_FREE_SAVED_HOOKS;
  const dataCenterVisibleRows = dataCenterRows.filter((row) => {
    const matchesHook = dataCenterHookFilter === "all" || row.receiverId === dataCenterHookFilter;
    const matchesSearch = !dataCenterSearch.trim() || JSON.stringify(row.values).toLowerCase().includes(dataCenterSearch.trim().toLowerCase()) || (row.hookName ?? "").toLowerCase().includes(dataCenterSearch.trim().toLowerCase());
    return matchesHook && matchesSearch;
  });
  const dataCenterColumns = Array.from(new Set(dataCenterVisibleRows.flatMap((row) => Object.keys(row.values)))).slice(0, 8);
  const filteredHookInspectorEvents = hookInspectorEvents.filter((event) => {
    const matchesHook = historyHookFilter === "all" || event.hookId === historyHookFilter;
    const matchesDate = !historyDateFilter || event.when.slice(0, 10) === historyDateFilter;
    return matchesHook && matchesDate;
  });
  const pageTitle = {
    dashboard: "Dashboard",
    hooks: "Hooks",
    workflow: "Workflow",
    dataCenter: "Data Center",
    sender: "Sender",
    history: "History",
    settings: "Settings",
  }[activePage];
  const pageDescription = {
    dashboard: "Track receiver activity, saved hooks, and usage from one workspace.",
    hooks: "Create, inspect, and manage saved receiver hooks.",
    workflow: "Build Pro hook workflows for conditional responses, transforms, and forwarding.",
    dataCenter: "Capture selected hook fields into searchable Pro data tables.",
    sender: "Send test requests from your logged-in workspace.",
    history: "Review saved hook receiver records with hook and date filters.",
    settings: "Manage profile, security, plan, and account actions.",
  }[activePage];

  useEffect(() => {
    const cachedSession = window.localStorage.getItem(CLIENT_SESSION_KEY);
    if (cachedSession) {
      try {
        const parsedSession = JSON.parse(cachedSession) as UserSession;
        if (parsedSession?.email && (parsedSession.plan === "free" || parsedSession.plan === "pro")) {
          setUser(parsedSession);
          setLoginEmail(parsedSession.email);
          setProfileFirstName(parsedSession.firstName || "Checkhooks");
          setProfileLastName(parsedSession.lastName || "User");
          setAuthMessage(`Welcome back. ${parsedSession.plan === "pro" ? "Pro" : "Free"} plan is active.`);
        }
      } catch {}
    }

    try {
      const storedHooks = JSON.parse(window.localStorage.getItem(SAVED_HOOKS_KEY) || "[]") as SavedHook[];
      if (Array.isArray(storedHooks)) setSavedHooks(storedHooks);
    } catch {}

    try {
      const storedHistory = JSON.parse(window.localStorage.getItem(HOOK_HISTORY_KEY) || "[]") as HookHistoryEntry[];
      if (Array.isArray(storedHistory)) {
        setHistory(storedHistory.filter((entry) => Date.parse(entry.createdAt) >= sevenDaysAgo));
      }
    } catch {}

    let tempUserId = window.localStorage.getItem(TEMP_USER_ID_KEY);
    if (!tempUserId) {
      tempUserId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.round(Math.random() * 100000)}`;
      window.localStorage.setItem(TEMP_USER_ID_KEY, tempUserId);
    }
    tempUserIdRef.current = tempUserId;
    setOrigin(window.location.origin);
    const storedReceiverId = window.localStorage.getItem(CURRENT_RECEIVER_ID_KEY);
    const nextReceiverId = storedReceiverId || `${Date.now()}-${Math.round(Math.random() * 10000)}`;
    window.localStorage.setItem(CURRENT_RECEIVER_ID_KEY, nextReceiverId);
    setReceiverId(nextReceiverId);
    void refreshSession();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SAVED_HOOKS_KEY, JSON.stringify(savedHooks));
  }, [savedHooks]);

  useEffect(() => {
    window.localStorage.setItem(HOOK_HISTORY_KEY, JSON.stringify(recentHistory));
  }, [recentHistory]);

  useEffect(() => {
    if (!user) return;

    const loadSavedHooks = async () => {
      try {
        const result = await fetch("/api/hooks", { cache: "no-store" });
        const data = await result.json();
        if (result.ok && Array.isArray(data.hooks)) {
          setSavedHooks(data.hooks);
        }
      } catch {}
    };

    void loadSavedHooks();
  }, [user?.email]);

  useEffect(() => {
    const shouldLoadHookEvents = activePage === "history" || activePage === "dashboard";
    if (!user || !shouldLoadHookEvents || savedHooks.length === 0) {
      if (shouldLoadHookEvents && savedHooks.length === 0) setHookInspectorEvents([]);
      return;
    }

    let disposed = false;
    const loadHookEvents = async () => {
      const results = await Promise.all(savedHooks.map(async (hook) => {
        const hookReceiverId = getReceiverIdFromUrl(hook.url);
        if (!hookReceiverId) return [];
        try {
          const result = await fetch(`/api/receive/${hookReceiverId}/events`, { cache: "no-store" });
          const data = await result.json();
          if (!result.ok || !Array.isArray(data.events)) return [];
          return (data.events as IncomingEvent[]).map((event) => ({
            ...event,
            receiverId: event.receiverId ?? hookReceiverId,
            hookId: hook.id,
            hookName: hook.name,
            hookUrl: hook.url,
          }));
        } catch {
          return [];
        }
      }));

      if (!disposed) {
        setHookInspectorEvents(results.flat().sort((left, right) => Date.parse(right.when) - Date.parse(left.when)));
      }
    };

    void loadHookEvents();
    return () => {
      disposed = true;
    };
  }, [activePage, savedHooks, user?.email]);

  useEffect(() => {
    if (!user || user.plan !== "pro" || activePage !== "dataCenter") return;

    const loadRows = async () => {
      const params = new URLSearchParams();
      if (dataCenterHookFilter !== "all") params.set("receiverId", dataCenterHookFilter);
      if (dataCenterSearch.trim()) params.set("search", dataCenterSearch.trim());
      try {
        const result = await fetch(`/api/data-center?${params.toString()}`, { cache: "no-store" });
        const data = await result.json();
        if (result.ok && Array.isArray(data.rows)) setDataCenterRows(data.rows);
      } catch {}
    };

    void loadRows();
  }, [activePage, dataCenterHookFilter, dataCenterSearch, user]);

  useEffect(() => {
    if (!receiverId || user) return;

    const updatePresence = () => {
      void fetch("/api/temp-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: tempUserIdRef.current, receiverId, page: "/app" }),
        keepalive: true,
      }).catch(() => undefined);
    };

    const clearPresence = () => {
      const payload = JSON.stringify({ id: tempUserIdRef.current, action: "delete" });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/temp-users", new Blob([payload], { type: "application/json" }));
        return;
      }
      void fetch("/api/temp-users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => undefined);
    };

    updatePresence();
    window.addEventListener("pagehide", clearPresence);
    window.addEventListener("beforeunload", clearPresence);

    return () => {
      window.removeEventListener("pagehide", clearPresence);
      window.removeEventListener("beforeunload", clearPresence);
      clearPresence();
    };
  }, [receiverId, user]);

  useEffect(() => {
    if (!isResponseEditorOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsResponseEditorOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isResponseEditorOpen]);

  useEffect(() => {
    if (!receiverId || !origin) return;
    let disposed = false;
    let socket: WebSocket | null = null;
    let eventSource: EventSource | null = null;
    let reconnectTimer: number | undefined;

    const applyEvents = (events: IncomingEvent[]) => {
      if (disposed) return;
      setIncoming(events);
      setSelectedEvent((current) => current ? events.find((event) => event.id === current.id) ?? null : null);
    };

    const applyRealtimeMessage = (eventName: string, data: unknown) => {
      if (eventName === "init" && Array.isArray((data as { events?: unknown[] })?.events)) {
        applyEvents((data as { events: IncomingEvent[] }).events);
      }
      if (eventName === "event") {
        const event = data as IncomingEvent;
        setIncoming((current) => current.some((item) => item.id === event.id) ? current : [event, ...current].slice(0, 50));
        void refreshQuota();
      }
    };

    const connectStream = () => {
      if (disposed) return;
      eventSource?.close();
      eventSource = new EventSource(`/api/receive/${encodeURIComponent(receiverId)}/stream`);
      eventSource.addEventListener("init", (message) => {
        try {
          applyRealtimeMessage("init", JSON.parse(message.data));
        } catch {}
      });
      eventSource.addEventListener("event", (message) => {
        try {
          applyRealtimeMessage("event", JSON.parse(message.data));
        } catch {}
      });
      eventSource.onerror = () => {
        if (disposed) eventSource?.close();
      };
    };

    const connectSocket = () => {
      if (disposed) return;
      socket = new WebSocket(`${origin.replace(/^http/, "ws")}/socket/receive/${receiverId}`);
      socket.onmessage = (message) => {
        try {
          const payload = JSON.parse(message.data);
          applyRealtimeMessage(payload.event, payload.data);
        } catch {}
      };
      socket.onclose = () => {
        if (disposed) return;
        reconnectTimer = window.setTimeout(connectStream, 500);
      };
      socket.onerror = () => {
        socket?.close();
      };
    };

    const shouldUseStream = window.location.hostname.includes("vercel.app") || window.location.protocol === "https:";
    if (shouldUseStream) {
      connectStream();
    } else {
      connectSocket();
    }

    return () => {
      disposed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
      eventSource?.close();
    };
  }, [receiverId, origin, user]);

  useEffect(() => {
    if (!receiverId) return;
    void registerReceiver(receiverId);
  }, [receiverId, user?.email, user?.plan]);

  const refreshSession = async () => {
    try {
      const result = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await result.json();
      const nextUser = data.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        window.localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(nextUser));
        setLoginEmail(nextUser.email);
        setProfileFirstName(nextUser.firstName || "Checkhooks");
        setProfileLastName(nextUser.lastName || "User");
        setAuthMessage(`Logged in. ${nextUser.plan === "pro" ? "Pro" : "Free"} plan is active.`);
      } else {
        window.localStorage.removeItem(CLIENT_SESSION_KEY);
      }
    } catch {}
  };

  const registerReceiver = async (nextReceiverId: string) => {
    try {
      const result = await fetch("/api/receivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: nextReceiverId }),
      });
      const data = await result.json();
      if (data.usage) setQuota(data.usage);
    } catch {}
  };

  const refreshQuota = async () => {
    if (!receiverId) return;
    try {
      const result = await fetch(`/api/receivers/${receiverId}/usage`, { cache: "no-store" });
      const data = await result.json();
      if (data.usage) setQuota(data.usage);
    } catch {}
  };

  const resetHookForm = () => {
    setEditingHookId(null);
    setActiveHookId(null);
    setHookName("Receiver hook");
    setHookRateLimit(user?.plan === "pro" ? 1200 : 120);
    setHookAuthEnabled(false);
    setHookAuthToken("");
    setHookStatus("active");
    setWorkflowEnabled(false);
    setWorkflowNodes([]);
    setDataCenterEnabled(false);
    setDataCenterFields([]);
    setResponse(null);
    setError(null);
  };

  const loadHook = (hook: SavedHook) => {
    const storedReceiverId = getReceiverIdFromUrl(hook.url);
    if (storedReceiverId) {
      window.localStorage.setItem(CURRENT_RECEIVER_ID_KEY, storedReceiverId);
      setReceiverId(storedReceiverId);
      setIncoming([]);
      setSelectedEvent(null);
    }
    setEditingHookId(hook.id);
    setActiveHookId(hook.id);
    setHookName(hook.name);
    setResponseHeaders(hook.headers);
    setResponseStatus(hook.responseStatus ?? 200);
    setResponseContentType(hook.responseContentType ?? "application/json");
    setResponseBody(formatBody(hook.body));
    setHookRateLimit(hook.rateLimitPerMinute ?? (user?.plan === "pro" ? 1200 : 120));
    setHookAuthEnabled(Boolean(hook.authEnabled));
    setHookAuthToken(hook.authToken ?? "");
    setHookStatus(hook.status ?? "active");
    setWorkflowEnabled(Boolean(hook.workflowEnabled));
    setWorkflowNodes(hook.workflowNodes ?? []);
    setDataCenterEnabled(Boolean(hook.dataCenterEnabled));
    setDataCenterFields(hook.dataCenterFields ?? []);
    setIsHookFormOpen(true);
    setActivePage("hooks");
  };

  const loadHookFeatureSettings = (hook: SavedHook) => {
    const storedReceiverId = getReceiverIdFromUrl(hook.url);
    if (storedReceiverId) {
      window.localStorage.setItem(CURRENT_RECEIVER_ID_KEY, storedReceiverId);
      setReceiverId(storedReceiverId);
    }
    setEditingHookId(hook.id);
    setActiveHookId(hook.id);
    setHookName(hook.name);
    setResponseHeaders(hook.headers);
    setResponseStatus(hook.responseStatus ?? 200);
    setResponseContentType(hook.responseContentType ?? "application/json");
    setResponseBody(formatBody(hook.body));
    setHookRateLimit(hook.rateLimitPerMinute ?? (user?.plan === "pro" ? 1200 : 120));
    setHookAuthEnabled(Boolean(hook.authEnabled));
    setHookAuthToken(hook.authToken ?? "");
    setHookStatus(hook.status ?? "active");
    setWorkflowEnabled(Boolean(hook.workflowEnabled));
    setWorkflowNodes(hook.workflowNodes ?? []);
    setSelectedWorkflowNodeId(null);
    setDataCenterEnabled(Boolean(hook.dataCenterEnabled));
    setDataCenterFields(hook.dataCenterFields ?? []);
    setIsHookFormOpen(false);
  };

  const inspectHook = (hook: SavedHook) => {
    const storedReceiverId = getReceiverIdFromUrl(hook.url);
    if (storedReceiverId) {
      window.localStorage.setItem(CURRENT_RECEIVER_ID_KEY, storedReceiverId);
      setReceiverId(storedReceiverId);
      setIncoming([]);
      setSelectedEvent(null);
    }
    setActiveHookId(hook.id);
    setActivePage("hooks");
    setIsHookFormOpen(false);
  };

  const saveHook = async () => {
    if (!receiverUrl) return;
    if (!editingHookId && !isProUser && savedHooks.length >= MAX_FREE_SAVED_HOOKS) {
      setError("Logged-in users can create up to 2 saved receiver hooks.");
      return;
    }

    const now = new Date().toISOString();
    const nextHook: SavedHook = {
      id: editingHookId ?? `${Date.now()}-${Math.round(Math.random() * 10000)}`,
      name: hookName.trim() || "Receiver hook",
      url: receiverUrl,
      method: "RECEIVER",
      headers: responseHeaders.filter((header) => header.name.trim()),
      body: responseBody,
      responseStatus,
      responseContentType,
      rateLimitPerMinute: hookRateLimit,
      authEnabled: hookAuthEnabled,
      authToken: hookAuthToken,
      workflowEnabled,
      workflowNodes,
      dataCenterEnabled,
      dataCenterFields,
      status: hookStatus,
      createdAt: savedHooks.find((hook) => hook.id === editingHookId)?.createdAt ?? now,
      updatedAt: now,
      lastSentAt: savedHooks.find((hook) => hook.id === editingHookId)?.lastSentAt,
      sentCount: savedHooks.find((hook) => hook.id === editingHookId)?.sentCount ?? 0,
    };

    try {
      const result = await fetch("/api/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...nextHook,
          receiverId,
        }),
      });
      const data = await result.json();
      if (!result.ok) throw new Error(String(data.error ?? "Unable to save hook"));
      const savedHook = data.hook as SavedHook;
      setSavedHooks((current) => {
        const withoutExisting = current.filter((hook) => hook.id !== savedHook.id && getReceiverIdFromUrl(hook.url) !== receiverId);
        return [savedHook, ...withoutExisting];
      });
      setEditingHookId(savedHook.id);
      setActiveHookId(savedHook.id);
      setIsHookFormOpen(false);
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save hook");
    }
  };

  const deleteHook = async (hookId: string) => {
    const hook = savedHooks.find((item) => item.id === hookId);
    const receiverIdToDelete = hook ? getReceiverIdFromUrl(hook.url) : "";
    if (receiverIdToDelete) {
      await fetch(`/api/hooks?receiverId=${encodeURIComponent(receiverIdToDelete)}`, { method: "DELETE" }).catch(() => undefined);
    }
    setSavedHooks((current) => current.filter((hook) => hook.id !== hookId));
    if (editingHookId === hookId) resetHookForm();
  };

  const toggleHookStatus = async (hook: SavedHook) => {
    const receiverIdToUpdate = getReceiverIdFromUrl(hook.url);
    if (!receiverIdToUpdate) return;
    const nextStatus: "active" | "paused" = hook.status === "paused" ? "active" : "paused";
    const nextHook: SavedHook = { ...hook, status: nextStatus, updatedAt: new Date().toISOString() };
    setSavedHooks((current) => current.map((item) => item.id === hook.id ? nextHook : item));

    try {
      const result = await fetch("/api/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nextHook, receiverId: receiverIdToUpdate }),
      });
      const data = await result.json();
      if (!result.ok) throw new Error(String(data.error ?? "Unable to update hook status"));
      setSavedHooks((current) => current.map((item) => item.id === hook.id ? data.hook : item));
    } catch (statusError) {
      setSavedHooks((current) => current.map((item) => item.id === hook.id ? hook : item));
      setError(statusError instanceof Error ? statusError.message : "Unable to update hook status");
    }
  };

  const addWorkflowNode = (type: WorkflowNodeType) => {
    const defaults: Record<WorkflowNodeType, WorkflowNode["config"]> = {
      response: { status: responseStatus, contentType: responseContentType, bodyTemplate: responseBody },
      transform: { bodyTemplate: responseBody, contentType: responseContentType },
      condition: { path: "body.event", operator: "exists", failStatus: 422, failBodyTemplate: JSON.stringify({ error: "Condition failed" }, null, 2) },
      forward: { url: "https://example.com/webhook", method: "POST", bodyTemplate: "{{body}}" },
    };
    const nodeId = `node-${Date.now()}-${Math.round(Math.random() * 1000)}`;
    setWorkflowNodes((current) => [
      ...current,
      {
        id: nodeId,
        type,
        label: `${type.charAt(0).toUpperCase()}${type.slice(1)} node`,
        enabled: true,
        config: defaults[type],
      },
    ]);
    setSelectedWorkflowNodeId(nodeId);
    setIsWorkflowAddMenuOpen(false);
  };

  const updateWorkflowNode = (nodeId: string, patch: Partial<WorkflowNode>) => {
    setWorkflowNodes((current) => current.map((node) => node.id === nodeId ? { ...node, ...patch, config: { ...node.config, ...(patch.config ?? {}) } } : node));
  };

  const removeWorkflowNode = (nodeId: string) => {
    setWorkflowNodes((current) => current.filter((node) => node.id !== nodeId));
  };

  const addDataCenterField = () => {
    setDataCenterFields((current) => [...current, { id: `field-${Date.now()}`, label: "Event", path: "body.event" }]);
  };

  const updateDataCenterField = (fieldId: string, patch: Partial<DataCenterField>) => {
    setDataCenterFields((current) => current.map((field) => field.id === fieldId ? { ...field, ...patch } : field));
  };

  const saveProHookSettings = async (kind: "workflow" | "dataCenter") => {
    if (!activeSavedHook) {
      setError("Select a saved hook first.");
      return;
    }
    if (!isProUser) {
      setError(`${kind === "workflow" ? "Workflow" : "Data Center"} is available for Pro users.`);
      return;
    }
    const receiverIdToUpdate = getReceiverIdFromUrl(activeSavedHook.url);
    if (!receiverIdToUpdate) return;
    const nextHook: SavedHook = {
      ...activeSavedHook,
      workflowEnabled,
      workflowNodes,
      dataCenterEnabled,
      dataCenterFields,
      updatedAt: new Date().toISOString(),
    };
    try {
      const result = await fetch("/api/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nextHook, receiverId: receiverIdToUpdate }),
      });
      const data = await result.json();
      if (!result.ok) throw new Error(String(data.error ?? "Unable to save settings"));
      setSavedHooks((current) => current.map((hook) => hook.id === activeSavedHook.id ? data.hook : hook));
      setError(null);
    } catch (settingsError) {
      setError(settingsError instanceof Error ? settingsError.message : "Unable to save settings");
    }
  };

  const deleteDataCenterRow = async (rowId: string) => {
    await fetch(`/api/data-center?rowId=${encodeURIComponent(rowId)}`, { method: "DELETE" }).catch(() => undefined);
    setDataCenterRows((current) => current.filter((row) => row.id !== rowId));
  };

  const recordHookHistory = (entry: Omit<HookHistoryEntry, "id" | "createdAt">) => {
    const now = new Date().toISOString();
    const nextEntry: HookHistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.round(Math.random() * 10000)}`,
      createdAt: now,
    };

    setHistory((current) => [nextEntry, ...current].filter((item) => Date.parse(item.createdAt) >= sevenDaysAgo));
    if (entry.hookId) {
      setSavedHooks((current) => current.map((hook) => hook.id === entry.hookId ? { ...hook, sentCount: hook.sentCount + 1, lastSentAt: now, updatedAt: now } : hook));
    }
  };

  const deleteHistory = (historyId: string) => {
    setHistory((current) => current.filter((entry) => entry.id !== historyId));
    setSelectedHistoryIds((current) => current.filter((id) => id !== historyId));
  };

  const deleteSelectedHistory = () => {
    setHistory((current) => current.filter((entry) => !selectedHistoryIds.includes(entry.id)));
    setSelectedHistoryIds([]);
  };

  const login = async () => {
    setAuthMessage("Logging in...");
    try {
      const result = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await result.json();
      if (!result.ok) throw new Error(String(data.error ?? "Login failed"));
      setUser(data.user);
      window.localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(data.user));
      setProfileFirstName(data.user.firstName || "Checkhooks");
      setProfileLastName(data.user.lastName || "User");
      setAuthMessage(`Logged in. ${data.user.plan === "pro" ? "Pro" : "Free"} plan is active.`);
      setActivePage("dashboard");
      if (receiverId) await registerReceiver(receiverId);
    } catch (loginError) {
      setAuthMessage(loginError instanceof Error ? loginError.message : "Login failed");
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.localStorage.removeItem(CLIENT_SESSION_KEY);
    setAuthMessage("Logged out. New receivers use the Free limit.");
    if (receiverId) await registerReceiver(receiverId);
  };

  const subscribe = async () => {
    setAuthMessage("Activating Pro...");
    try {
      const result = await fetch("/api/billing/plan", { method: "POST" });
      const data = await result.json();
      if (!result.ok) throw new Error(String(data.error ?? "Plan update failed"));
      setUser(data.user);
      window.localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(data.user));
      setAuthMessage(String(data.message ?? "Pro plan enabled."));
      if (receiverId) await registerReceiver(receiverId);
    } catch (subscribeError) {
      setAuthMessage(subscribeError instanceof Error ? subscribeError.message : "Plan update failed");
    }
  };

  const updateProfile = async () => {
    setSettingsMessage("Updating profile...");
    try {
      const result = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: profileFirstName, lastName: profileLastName }),
      });
      const data = await result.json();
      if (!result.ok) throw new Error(String(data.error ?? "Profile update failed"));
      setUser(data.user);
      window.localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(data.user));
      setSettingsMessage("Profile updated.");
    } catch (profileError) {
      setSettingsMessage(profileError instanceof Error ? profileError.message : "Profile update failed");
    }
  };

  const changePassword = async () => {
    setSettingsMessage("Updating password...");
    try {
      const result = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await result.json();
      if (!result.ok) throw new Error(String(data.error ?? "Password update failed"));
      setCurrentPassword("");
      setNewPassword("");
      setSettingsMessage(String(data.message ?? "Password updated."));
    } catch (passwordError) {
      setSettingsMessage(passwordError instanceof Error ? passwordError.message : "Password update failed");
    }
  };

  const deleteAccount = async () => {
    setSettingsMessage("Deleting account...");
    try {
      const result = await fetch("/api/account/delete", { method: "POST" });
      const data = await result.json();
      if (!result.ok) throw new Error(String(data.error ?? "Delete account failed"));
      window.localStorage.removeItem(CLIENT_SESSION_KEY);
      window.localStorage.removeItem(SAVED_HOOKS_KEY);
      window.localStorage.removeItem(HOOK_HISTORY_KEY);
      setUser(null);
      setSavedHooks([]);
      setHistory([]);
      setSettingsMessage("Account deleted.");
    } catch (deleteError) {
      setSettingsMessage(deleteError instanceof Error ? deleteError.message : "Delete account failed");
    }
  };

  const createReceiver = () => {
    const nextReceiverId = `${Date.now()}-${Math.round(Math.random() * 10000)}`;
    window.localStorage.setItem(CURRENT_RECEIVER_ID_KEY, nextReceiverId);
    setReceiverId(nextReceiverId);
    setQuota(null);
    setIncoming([]);
    setSelectedEvent(null);
    setResponseStatus(200);
    setResponseContentType("application/json");
    setResponseHeaders([]);
    setResponseBody(JSON.stringify({ received: true, first_name: "{{body.first_name}}" }, null, 2));
    setHookRateLimit(user?.plan === "pro" ? 1200 : 120);
    setHookAuthEnabled(false);
    setHookAuthToken("");
    setHookStatus("active");
    setResponseMessage("Ready");
    setActiveTempView("receive");
  };

  const copyReceiver = async () => {
    if (!receiverUrl) return;
    await navigator.clipboard.writeText(receiverUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const clearIncomingHistory = async () => {
    if (!receiverId) return;
    try {
      const result = await fetch(`/api/receive/${receiverId}/events`, { method: "DELETE" });
      if (!result.ok) return;
      setIncoming([]);
      setSelectedEvent(null);
      await refreshQuota();
    } catch {}
  };

  const deleteIncomingEvent = async (eventId: number) => {
    if (!receiverId) return;
    try {
      const result = await fetch(`/api/receive/${receiverId}/events?eventId=${eventId}`, { method: "DELETE" });
      if (!result.ok) return;
      const data = await result.json();
      const events = Array.isArray(data.events) ? data.events as IncomingEvent[] : [];
      setIncoming(events);
      setSelectedEvent((current) => current?.id === eventId ? null : current);
      await refreshQuota();
    } catch {}
  };

  const deleteHookInspectorEvent = async (event: IncomingEvent) => {
    const eventReceiverId = event.receiverId;
    if (!eventReceiverId) return;
    try {
      const result = await fetch(`/api/receive/${eventReceiverId}/events?eventId=${event.id}`, { method: "DELETE" });
      if (!result.ok) return;
      const key = getEventKey(event);
      setHookInspectorEvents((current) => current.filter((item) => getEventKey(item) !== key));
      setSelectedHistoryIds((current) => current.filter((id) => id !== key));
      setSelectedEvent((current) => current && getEventKey(current) === key ? null : current);
    } catch {}
  };

  const deleteSelectedHookInspectorEvents = async () => {
    const selectedEvents = hookInspectorEvents.filter((event) => selectedHistoryIds.includes(getEventKey(event)));
    await Promise.all(selectedEvents.map(deleteHookInspectorEvent));
    setSelectedHistoryIds([]);
  };

  const resendIncomingEvent = async (event: IncomingEvent) => {
    const replayUrl = event.url.startsWith("http") ? event.url : `${origin}${event.url}`;
    setReplayMessage(`Resending ${event.method} ${event.url}...`);

    try {
      const result = await fetch("/api/send-checkhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: replayUrl,
          method: event.method,
          headers: getSafeReplayHeaders(event.headers),
          body: event.body,
        }),
      });
      const data = await result.json();
      setReplayMessage(result.ok ? `Resent successfully with status ${data.status ?? result.status}.` : String(data.error ?? "Resend failed"));
    } catch (resendError) {
      setReplayMessage(resendError instanceof Error ? resendError.message : "Resend failed");
    }
  };

  const sendCheckhook = async (source?: SavedHook | HookHistoryEntry) => {
    const requestUrl = source?.url ?? target;
    const requestMethod = source?.method ?? method;
    const requestHeaders = source?.headers ?? headers;
    const requestBody = source?.body ?? body;
    try {
      new URL(requestUrl);
    } catch {
      setError("Enter a valid request URL.");
      return;
    }

    setIsSending(true);
    setError(null);
    setResponse(null);
    const hookId = source && "hookId" in source ? source.hookId : (activeHookId ?? editingHookId ?? undefined);
    const storedHookName = savedHooks.find((hook) => hook.id === hookId)?.name;
    const hookNameForHistory = source && "hookName" in source ? source.hookName : (storedHookName ?? (hookName.trim() || "Unsaved request"));

    try {
      const result = await fetch("/api/send-checkhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: requestUrl,
          method: requestMethod,
          headers: requestHeaders.filter((header) => header.name.trim()),
          body: requestBody,
        }),
      });
      const data = await result.json();
      const responseText = String(data.body ?? data.error ?? "No response body");
      setResponse({
        status: Number(data.status ?? result.status),
        statusText: String(data.statusText ?? result.statusText),
        body: responseText,
      });
      recordHookHistory({
        hookId,
        hookName: hookNameForHistory,
        url: requestUrl,
        method: requestMethod,
        headers: requestHeaders.filter((header) => header.name.trim()),
        body: requestBody,
        status: Number(data.status ?? result.status),
        statusText: String(data.statusText ?? result.statusText),
        responseText,
        success: result.ok,
      });
      if (!result.ok) setError(String(data.error ?? "Request failed"));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send request");
      recordHookHistory({
        hookId,
        hookName: hookNameForHistory,
        url: requestUrl,
        method: requestMethod,
        headers: requestHeaders.filter((header) => header.name.trim()),
        body: requestBody,
        status: 0,
        statusText: "Failed",
        responseText: requestError instanceof Error ? requestError.message : "Unable to send request",
        success: false,
      });
    } finally {
      setIsSending(false);
    }
  };

  const updateHeader = (index: number, field: "name" | "value", value: string) => {
    setHeaders((current) => current.map((header, currentIndex) => currentIndex === index ? { ...header, [field]: value } : header));
  };

  const updateResponseHeader = (index: number, field: "name" | "value", value: string) => {
    setResponseHeaders((current) => current.map((header, currentIndex) => currentIndex === index ? { ...header, [field]: value } : header));
  };

  const saveReceiverResponse = async () => {
    if (!receiverId) return;
    if (!Number.isInteger(responseStatus) || responseStatus < 100 || responseStatus > 599) {
      setResponseMessage("Use a status from 100 to 599");
      return;
    }
    if (!responseContentType.trim()) {
      setResponseMessage("Content type is required");
      return;
    }
    setIsSavingResponse(true);
    setResponseMessage("Saving…");

    try {
      const result = await fetch(`/api/receive/${receiverId}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: responseStatus,
          contentType: responseContentType,
          headers: Object.fromEntries(responseHeaders.filter((header) => header.name.trim()).map((header) => [header.name, header.value])),
          body: responseBody,
          rateLimitPerMinute: hookRateLimit,
          authEnabled: hookAuthEnabled,
          authToken: hookAuthToken,
          hookStatus,
        }),
      });
      if (!result.ok) throw new Error("Unable to update response");
      const data = await result.json();
      if (data.usage) setQuota(data.usage);
      setResponseMessage("Response updated");
      setIsResponseEditorOpen(false);
    } catch {
      setResponseMessage("Update failed");
    } finally {
      setIsSavingResponse(false);
    }
  };

  const copyHookUrl = async (hook: SavedHook) => {
    await navigator.clipboard.writeText(hook.url);
    setCopiedHookId(hook.id);
    window.setTimeout(() => setCopiedHookId(null), 1600);
  };

  return (
    <main className="quick-app min-h-screen transition-colors">
      <nav className="quick-nav">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5 sm:px-8">
          <a href="/" className="inline-flex items-center gap-2.5" aria-label="Checkhooks home">
            <CheckhooksLogo />
          </a>
          <div className="flex items-center gap-2">
            <a href="/" className="quick-icon-button hidden sm:inline-flex" aria-label="Back to home"><ArrowLeft className="h-4 w-4" /></a>
            {user ? <button type="button" onClick={() => setActivePage("sender")} className={`quick-nav-action hidden sm:inline-flex ${activePage === "sender" ? "active" : ""}`}><Send className="h-4 w-4" /> Sender</button> : null}
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 sm:py-12">
        {!user ? (
          <div className="space-y-6">
            <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="quick-eyebrow"><span className="h-2 w-2 rounded-full bg-[#18a36f]" /> Temporary workspace</div>
                <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">Test a checkhook. Get your answer.</h1>
                <p className="quick-muted mt-4 max-w-2xl leading-7">Use the receiver to catch real checkhook calls, inspect requests, customize the response, or send a test request.</p>
              </div>
              <div className="quick-tabs">
                <button type="button" onClick={() => setActiveTempView("receive")} className={activeTempView === "receive" ? "active" : ""}><Radio className="h-4 w-4" /> Receiver</button>
                <button type="button" onClick={() => setActiveTempView("send")} className={activeTempView === "send" ? "active" : ""}><Send className="h-4 w-4" /> Sender</button>
              </div>
            </header>

            <section className="quick-shell grid gap-4 p-5 sm:p-6 lg:grid-cols-[1fr_1.15fr]">
              <div>
                <p className="quick-section-label">Plan and quota</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Free temporary workspace</h2>
                <p className="quick-muted mt-3 text-sm leading-6">Temporary receivers accept 10,000 requests per day with a 60/min rate limit. Login to save receiver hooks, history, and account settings.</p>
                {quota ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="quick-metric"><span>Accepted</span><b>{quota.totalAccepted.toLocaleString()}</b></div>
                    <div className="quick-metric"><span>Remaining</span><b>{quota.remaining.toLocaleString()}</b></div>
                    <div className="quick-metric"><span>Rate/min</span><b>{quota.rateLimitPerMinute.toLocaleString()}</b></div>
                  </div>
                ) : null}
              </div>
              <div className="rounded-xl border border-inherit bg-white/50 p-4 dark:bg-white/5">
                <p className="quick-section-label">Login for CRM</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" className="quick-form-control" />
                  <input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="Password" autoComplete="current-password" className="quick-form-control" />
                  <button type="button" onClick={login} className="quick-primary !m-0">Login</button>
                </div>
                <p className="quick-muted mt-3 text-sm">{authMessage}</p>
              </div>
            </section>

            {activeTempView === "send" ? (
              <div className="quick-shell grid overflow-hidden lg:grid-cols-[1fr_360px]">
                <section className="p-5 sm:p-8 lg:p-10">
                  <div className="mb-8 flex items-center justify-between">
                    <div><p className="quick-section-label">Request sender</p><h2 className="mt-2 text-2xl font-semibold">Send a checkhook</h2></div>
                    <span className={`quick-status ${validUrl ? "valid" : "invalid"}`}>{validUrl ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}{validUrl ? "Valid URL" : "Invalid URL"}</span>
                  </div>
                  <div className="quick-url-row">
                    <div className="relative">
                      <select value={method} onChange={(event) => setMethod(event.target.value)} className="quick-method">{["POST", "GET", "PUT", "PATCH", "DELETE"].map((item) => <option key={item}>{item}</option>)}</select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    </div>
                    <input value={target} onChange={(event) => setTarget(event.target.value)} aria-label="Target URL" />
                    <button type="button" onClick={() => sendCheckhook()} disabled={!validUrl || isSending} className="quick-send-button">{isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send</button>
                  </div>
                  <div className="mt-8">
                    <div className="quick-field-heading"><span>JSON body</span><button type="button" onClick={() => setBody(formatBody(body))}>Format</button></div>
                    <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={11} className="quick-code-field" spellCheck={false} />
                  </div>
                </section>
                <aside className="quick-response-panel p-5 sm:p-8">
                  <div className="flex items-center justify-between"><p className="quick-section-label">Response</p>{response ? <span className={`quick-status ${response.status < 400 ? "valid" : "invalid"}`}>{response.status} {response.statusText}</span> : null}</div>
                  {response ? <pre className="quick-response-code mt-7">{formatBody(response.body)}</pre> : <div className="flex min-h-[320px] flex-col items-center justify-center text-center"><span className="quick-empty-icon"><Send className="h-6 w-6" /></span><h3 className="mt-5 font-semibold">Ready to send</h3><p className="quick-muted mt-2 max-w-[230px] text-sm leading-6">Send a request to inspect its response here.</p></div>}
                  {error ? <p className="mt-4 text-sm text-[#dc4a3d]">{error}</p> : null}
                </aside>
              </div>
            ) : (
              <div className="quick-shell overflow-hidden">
                <div className="grid lg:grid-cols-[390px_1fr]">
                  <section className="border-b border-inherit p-5 sm:p-8 lg:min-h-[560px] lg:border-b-0 lg:border-r">
                    <p className="quick-section-label">Receiver hook</p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em]">Catch the next event.</h2>
                    <p className="quick-muted mt-4 leading-7">This receiver is the hook. Point an external service to this URL and inspect what arrives.</p>
                    <div className="mt-8">
                      <div className="quick-receiver-url mt-3"><span>{receiverUrl || "Preparing receiver..."}</span><button type="button" onClick={copyReceiver} disabled={!receiverUrl}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button></div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={createReceiver} className="quick-secondary"><RotateCcw className="h-4 w-4" /> Replace receiver</button>
                        <button type="button" onClick={() => setIsResponseEditorOpen(true)} className="quick-secondary"><Settings2 className="h-4 w-4" /> Edit response</button>
                      </div>
                      <div className="mt-8 border-t border-inherit pt-6"><p className="quick-section-label">Incoming</p><p className="mt-2 text-4xl font-semibold tracking-[-0.04em]">{incoming.length}</p><p className="quick-muted mt-1 text-sm">events this session</p></div>
                    </div>
                  </section>
                  <section className="p-5 sm:p-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div><p className="quick-section-label">Live events</p><h3 className="mt-2 text-xl font-semibold">Request inspector</h3></div>
                      <button type="button" onClick={clearIncomingHistory} disabled={incoming.length === 0} className="quick-danger-button"><Trash2 className="h-3.5 w-3.5" /> Clear</button>
                    </div>
                    {incoming.length === 0 ? (
                      <div className="flex min-h-[300px] flex-col items-center justify-center text-center"><span className="quick-empty-icon"><Clipboard className="h-6 w-6" /></span><h3 className="mt-5 font-semibold">Waiting for an event</h3><p className="quick-muted mt-2 max-w-xs text-sm leading-6">Send a request to the receiver URL. Headers, body, IP, and user agent will appear here.</p></div>
                    ) : (
                      <div className="quick-event-list mt-6">
                        {replayMessage ? <p className="quick-muted mb-3 text-sm">{replayMessage}</p> : null}
                        {incoming.map((event) => {
                          const isOpen = selectedEvent?.id === event.id;
                          return (
                            <article key={event.id} className={`quick-event-row ${isOpen ? "active" : ""}`}>
                              <div className="quick-event-summary">
                                <button type="button" onClick={() => setSelectedEvent(isOpen ? null : event)} className="quick-event">
                                  <span>{event.method}</span>
                                  <div><b>{event.url}</b><small>{new Date(event.when).toLocaleString()} · {getClientIp(event.headers)}</small></div>
                                  <ChevronDown className={`quick-event-chevron h-4 w-4 ${isOpen ? "rotate-180" : ""}`} />
                                </button>
                                <button type="button" onClick={() => deleteIncomingEvent(event.id)} className="quick-event-delete" aria-label="Delete event"><Trash2 className="h-3.5 w-3.5" /></button>
                              </div>
                              {isOpen ? (
                                <div className="quick-event-details">
                                  <div className="quick-event-actions">
                                    <div><p className="quick-section-label">Request details</p><h4>{event.method} request captured</h4></div>
                                    <button type="button" onClick={() => resendIncomingEvent(event)} className="quick-primary !m-0"><Send className="h-4 w-4" /> Resend request</button>
                                  </div>
                                  <div className="quick-inspector-grid">
                                    <section className="quick-inspector-card"><span>IP address</span><b>{getClientIp(event.headers)}</b></section>
                                    <section className="quick-inspector-card"><span>User agent</span><p>{getHeaderValue(event.headers, "user-agent") || "Not provided"}</p></section>
                                    <section className="quick-inspector-card"><span>Headers</span><b>{Object.keys(event.headers).length}</b></section>
                                  </div>
                                  <section className="quick-inspector-section"><div className="quick-inspector-heading"><span>Body</span><b>{event.body ? "Captured" : "Empty"}</b></div><pre className="quick-response-code min-h-[140px]">{event.body ? formatBody(event.body) : "No request body."}</pre></section>
                                </div>
                              ) : null}
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
        <div className="quick-crm-layout">
          <aside className="quick-crm-sidebar">
            <div>
              <h2>{profileFirstName || "Checkhooks"} workspace</h2>
              <p>{user.email}</p>
            </div>
            <nav>
              <button type="button" onClick={() => setActivePage("dashboard")} className={activePage === "dashboard" ? "active" : ""}><Home className="h-4 w-4" /> Dashboard</button>
              <button type="button" onClick={() => setActivePage("hooks")} className={activePage === "hooks" ? "active" : ""}><Inbox className="h-4 w-4" /> Hooks</button>
              <button type="button" onClick={() => setActivePage("workflow")} className={activePage === "workflow" ? "active" : ""}><Workflow className="h-4 w-4" /> Workflow</button>
              <button type="button" onClick={() => setActivePage("dataCenter")} className={activePage === "dataCenter" ? "active" : ""}><Database className="h-4 w-4" /> Data Center</button>
              <button type="button" onClick={() => setActivePage("history")} className={activePage === "history" ? "active" : ""}><HistoryIcon className="h-4 w-4" /> History</button>
              <button type="button" onClick={() => setActivePage("settings")} className={activePage === "settings" ? "active" : ""}><Settings2 className="h-4 w-4" /> Settings</button>
            </nav>
            <div className="quick-crm-sidebar-note">
              <span>{savedHooks.length}</span>
              <p>{isProUser ? "Pro hooks saved" : `${MAX_FREE_SAVED_HOOKS} hook limit`}</p>
            </div>
          </aside>

          <div className="min-w-0">
            <header className="quick-crm-page-header">
              <div>
                <div className="quick-eyebrow"><span className="h-2 w-2 rounded-full bg-[#18a36f]" /> Logged-in workspace</div>
                <h1>{pageTitle}</h1>
                <p>{pageDescription}</p>
              </div>
              {activePage === "dashboard" || activePage === "hooks" ? (
                <button type="button" onClick={() => { resetHookForm(); setIsHookFormOpen(true); setActivePage("hooks"); }} disabled={!canSaveMoreHooks} className="quick-primary !m-0"><Plus className="h-4 w-4" /> Create receiver hook</button>
              ) : null}
            </header>

        {activePage === "dashboard" ? (
          <div className="space-y-6">
            <section className="quick-crm-stats">
              <div className="quick-crm-stat"><span>Accepted requests</span><b>{acceptedRequestCount.toLocaleString()}</b><small>Current daily quota window</small></div>
              <div className="quick-crm-stat"><span>Saved hooks</span><b>{savedHooks.length}</b><small>{isProUser ? "Workflow-ready Pro hooks" : `${Math.max(MAX_FREE_SAVED_HOOKS - savedHooks.length, 0)} hook slots available`}</small></div>
              <div className="quick-crm-stat"><span>Received events</span><b>{recentReceiverEvents.length}</b><small>Saved hook events · 7 days</small></div>
              <div className="quick-crm-stat"><span>Daily quota</span><b>{quotaRemaining.toLocaleString()}</b><small>{quota?.rateLimitPerMinute ?? 120}/min · {quotaRemainingPercent}% remaining</small></div>
            </section>

            <div className="quick-dashboard-charts">
              <section className="quick-shell quick-line-panel p-5 sm:p-6">
                <div className="quick-chart-heading">
                  <div><p className="quick-section-label">Requests by day</p><h2 className="mt-2 text-2xl font-semibold">7-day request flow</h2><p className="quick-muted mt-2 text-sm">Accepted receiver requests from saved hooks and current quota counters.</p></div>
                  <span><BarChart3 className="h-5 w-5" /></span>
                </div>
                <div className="quick-line-chart" aria-label="Request counts by day">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img">
                    <defs>
                      <linearGradient id="requestLineFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#f6821f" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#f6821f" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon points={lineChartFillPoints} fill="url(#requestLineFill)" />
                    <polyline points={lineChartPoints} fill="none" stroke="#f6821f" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                    {requestTrend.map((item, index) => {
                      const x = 10 + index * 13.333;
                      const y = 82 - (item.value / trendMax) * 62;
                      return <circle key={item.label} cx={x} cy={y} r="1.8" fill="#fff7ed" stroke="#f6821f" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />;
                    })}
                  </svg>
                  <div className="quick-line-chart-labels">
                    {requestTrend.map((item) => (
                      <span key={item.label}><b>{item.value}</b><small>{item.label}</small></span>
                    ))}
                  </div>
                </div>
              </section>

              <section className="quick-shell quick-quota-panel p-5 sm:p-6">
                <div><p className="quick-section-label">Quota health</p><h2 className="mt-2 text-2xl font-semibold">Daily request quota</h2><p className="quick-muted mt-2 text-sm">Resets every day with your current plan limits.</p></div>
                <div className="quick-donut-wrap">
                  <div className="quick-donut" style={{ background: `conic-gradient(#f6821f ${quotaUsedPercent}%, rgba(24, 163, 111, 0.72) 0)` }}>
                    <div><b>{quotaRemainingPercent}%</b><small>remaining</small></div>
                  </div>
                  <div className="quick-quota-details">
                    <span><b>{quotaRemaining.toLocaleString()}</b><small>Requests remaining</small></span>
                    <span><b>{quotaUsed.toLocaleString()}</b><small>Requests accepted</small></span>
                    <span><b>{quotaLimit.toLocaleString()}</b><small>Daily limit</small></span>
                  </div>
                </div>
              </section>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="quick-shell p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between"><div><p className="quick-section-label">Most active</p><h2 className="mt-2 text-xl font-semibold">Top hooks</h2></div><button type="button" onClick={() => setActivePage("hooks")} className="quick-secondary">View all</button></div>
                <div className="space-y-3">
                  {mostActiveHooks.length ? mostActiveHooks.map((hook) => (
                    <button key={hook.id} type="button" onClick={() => loadHook(hook)} className="quick-crm-list-item">
                      <span><b>{hook.name}</b><small>{hook.method} · {hook.url}</small></span>
                      <strong>{hook.sentCount}</strong>
                    </button>
                  )) : <p className="quick-muted rounded-xl border border-dashed border-inherit p-5 text-sm">No active hooks yet. Save a receiver hook and retest requests to build activity.</p>}
                </div>
              </section>

              <section className="quick-shell p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between"><div><p className="quick-section-label">Saved hooks</p><h2 className="mt-2 text-xl font-semibold">Recent templates</h2></div><button type="button" onClick={() => setActivePage("hooks")} className="quick-secondary">Manage</button></div>
                <div className="space-y-3">
                  {recentSavedHooks.length ? recentSavedHooks.map((hook) => (
                    <button key={hook.id} type="button" onClick={() => loadHook(hook)} className="quick-crm-list-item">
                      <span><b>{hook.name}</b><small>{new Date(hook.updatedAt).toLocaleString()}</small></span>
                      <strong>Receiver</strong>
                    </button>
                  )) : <p className="quick-muted rounded-xl border border-dashed border-inherit p-5 text-sm">Saved hooks will appear here.</p>}
                </div>
              </section>
            </div>
          </div>
        ) : null}

        {activePage === "hooks" ? (
          <div className="space-y-6">
            <section className="quick-shell quick-hooks-board p-5 sm:p-6">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="quick-section-label">Hooks</p>
                  <h2 className="mt-2 text-2xl font-semibold">Saved receiver hooks</h2>
                  <p className="quick-muted mt-2 text-sm">Manage receiver URLs, authorization, response behavior, and per-hook rate limits.</p>
                </div>
                <button type="button" onClick={() => { createReceiver(); resetHookForm(); setIsHookFormOpen(true); }} disabled={!canSaveMoreHooks} className="quick-primary !m-0"><Plus className="h-4 w-4" /> Add receiver hook</button>
              </div>

              <div className="quick-hook-card-grid">
                {savedHooks.length ? savedHooks.map((hook) => (
                  <article key={hook.id} className={`quick-hook-card ${editingHookId === hook.id ? "active" : ""}`}>
                    <div className="quick-hook-card-top">
                      <div>
                        <h3>{hook.name}</h3>
                      </div>
                      <div className="quick-hook-card-controls">
                        <button type="button" onClick={() => toggleHookStatus(hook)} className={`quick-status quick-status-toggle ${hook.status === "paused" ? "invalid" : "valid"}`}>{hook.status === "paused" ? "Inactive" : "Active"}</button>
                        <div className="quick-hook-menu">
                          <button type="button" onClick={() => setOpenHookMenuId((current) => current === hook.id ? null : hook.id)} className="quick-hook-menu-button" aria-label="Hook actions"><MoreVertical className="h-4 w-4" /></button>
                          {openHookMenuId === hook.id ? (
                            <div className="quick-hook-menu-popover">
                              <button type="button" onClick={() => { setOpenHookMenuId(null); loadHook(hook); }}><Edit3 className="h-4 w-4" /> Edit</button>
                              <button type="button" onClick={() => { setOpenHookMenuId(null); inspectHook(hook); }}><Radio className="h-4 w-4" /> Inspect</button>
                              <button type="button" onClick={() => { setOpenHookMenuId(null); loadHookFeatureSettings(hook); setActivePage("workflow"); }}><Workflow className="h-4 w-4" /> Workflow</button>
                              <button type="button" onClick={() => { setOpenHookMenuId(null); loadHookFeatureSettings(hook); setActivePage("dataCenter"); }}><Database className="h-4 w-4" /> Data Center</button>
                              <button type="button" onClick={() => { setOpenHookMenuId(null); loadHook(hook); setIsResponseEditorOpen(true); }}><Settings2 className="h-4 w-4" /> Response</button>
                              <button type="button" onClick={() => { setOpenHookMenuId(null); deleteHook(hook.id); }} className="danger"><Trash2 className="h-4 w-4" /> Delete</button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="quick-hook-card-url">
                      <code>{hook.url}</code>
                      <button type="button" onClick={() => copyHookUrl(hook)} aria-label="Copy hook URL">{copiedHookId === hook.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button>
                    </div>
                    <div className="quick-hook-card-meta">
                      <span><b>Created</b>{new Date(hook.createdAt).toLocaleString()}</span>
                      <span><b>Rate</b>{hook.rateLimitPerMinute ?? 120}/min</span>
                      <span><b>Auth</b>{hook.authEnabled ? "Required" : "Open"}</span>
                      <span><b>Activity</b>{hook.sentCount} retests</span>
                    </div>
                  </article>
                )) : (
                  <div className="quick-hooks-empty">
                    <span className="quick-empty-icon"><Inbox className="h-6 w-6" /></span>
                    <h3>No receiver hooks saved yet</h3>
                    <p className="quick-muted">Create your first hook to save a receiver URL, response, rate limit, and authorization settings.</p>
                    <button type="button" onClick={() => { createReceiver(); resetHookForm(); setIsHookFormOpen(true); }} className="quick-primary !m-0"><Plus className="h-4 w-4" /> Create hook</button>
                  </div>
                )}
              </div>

              {!canSaveMoreHooks ? <p className="mt-4 text-sm text-[#dc4a3d]">Free logged-in users can create up to 2 receiver hooks.</p> : null}
              {error ? <p className="mt-4 text-sm text-[#dc4a3d]">{error}</p> : null}
            </section>

            {isHookFormOpen ? (
              <section className="quick-hook-editor quick-shell p-5 sm:p-6">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div><p className="quick-section-label">{editingHookId ? "Edit receiver hook" : "Create receiver hook"}</p><h2 className="mt-2 text-2xl font-semibold">Hook configuration</h2></div>
                  <button type="button" onClick={() => setIsHookFormOpen(false)} className="quick-icon-button !inline-flex" aria-label="Close hook editor"><X className="h-4 w-4" /></button>
                </div>
                <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
                  <div className="space-y-5">
                    <label className="quick-form-label">Hook name<input value={hookName} onChange={(event) => setHookName(event.target.value)} className="quick-form-control" /></label>
                    <div className="rounded-xl border border-inherit bg-white/50 p-4 dark:bg-white/5">
                      <p className="quick-section-label">Current receiver URL</p>
                      <div className="quick-receiver-url mt-3"><span>{receiverUrl || "Preparing receiver..."}</span><button type="button" onClick={copyReceiver} disabled={!receiverUrl}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button></div>
                    </div>
                    <div>
                      <div className="quick-field-heading"><span>Response body</span><button type="button" onClick={() => setResponseBody(formatBody(responseBody))}>Format JSON</button></div>
                      <textarea value={responseBody} onChange={(event) => setResponseBody(event.target.value)} rows={8} className="quick-code-field" spellCheck={false} />
                    </div>
                  </div>
                  <div className="space-y-5">
                    <div className="quick-config-grid">
                      <label><span>Status code</span><input type="number" min={100} max={599} value={responseStatus} onChange={(event) => setResponseStatus(Number(event.target.value))} className="quick-form-control" /></label>
                      <label><span>Content type</span><input value={responseContentType} onChange={(event) => setResponseContentType(event.target.value)} className="quick-form-control" /></label>
                    </div>
                    <label className="quick-form-label">Rate limit per minute<input type="number" min={1} max={user?.plan === "pro" ? 1200 : 120} value={hookRateLimit} onChange={(event) => setHookRateLimit(Number(event.target.value))} className="quick-form-control" /></label>
                    <label className="quick-form-label">Hook status<select value={hookStatus} onChange={(event) => setHookStatus(event.target.value === "paused" ? "paused" : "active")} className="quick-form-control"><option value="active">Active</option><option value="paused">Paused</option></select></label>
                    <div className="quick-auth-box">
                      <label className="quick-auth-toggle"><input type="checkbox" checked={hookAuthEnabled} onChange={(event) => setHookAuthEnabled(event.target.checked)} /> Require authorization</label>
                      <input value={hookAuthToken} onChange={(event) => setHookAuthToken(event.target.value)} disabled={!hookAuthEnabled} placeholder="Bearer token value" className="quick-form-control mt-3" />
                      <p className="quick-muted mt-2 text-xs">Callers can send `Authorization: Bearer token` or `x-checkhooks-token`.</p>
                    </div>
                    <div>
                      <div className="quick-field-heading"><span>Extra response headers</span><button type="button" onClick={() => setResponseHeaders((current) => [...current, { name: "", value: "" }])}><Plus className="h-3.5 w-3.5" /> Add header</button></div>
                      <div className="space-y-2.5">{responseHeaders.map((header, index) => <div key={index} className="quick-header-row"><input value={header.name} onChange={(event) => updateResponseHeader(index, "name", event.target.value)} placeholder="Header name" /><input value={header.value} onChange={(event) => updateResponseHeader(index, "value", event.target.value)} placeholder="Value" /><button type="button" onClick={() => setResponseHeaders((current) => current.filter((_, currentIndex) => currentIndex !== index))} aria-label="Remove response header"><Trash2 className="h-4 w-4" /></button></div>)}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={() => setIsHookFormOpen(false)} className="quick-secondary">Cancel</button>
                  <button type="button" onClick={saveHook} disabled={!receiverUrl || !canSaveMoreHooks || isSavingResponse} className="quick-primary !m-0"><Save className="h-4 w-4" /> {editingHookId ? "Update hook" : "Save hook"}</button>
                </div>
              </section>
            ) : null}

            {activeSavedHook ? (
              <section className="quick-shell p-5 sm:p-6">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="quick-section-label">Receiver inspector</p>
                    <h2 className="mt-2 text-2xl font-semibold">{activeSavedHook.name}</h2>
                    <p className="quick-muted mt-2 text-sm">Live records are stored for 7 days for signed-in users, then removed automatically.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={clearIncomingHistory} disabled={incoming.length === 0} className="quick-danger-button"><Trash2 className="h-3.5 w-3.5" /> Clear records</button>
                  </div>
                </div>
                {incoming.length === 0 ? (
                  <div className="quick-hooks-empty">
                    <span className="quick-empty-icon"><Clipboard className="h-6 w-6" /></span>
                    <h3>No live records yet</h3>
                    <p className="quick-muted">Send a request to this saved hook URL. Header, body, cookies, IP, and user agent will appear here.</p>
                  </div>
                ) : (
                  <div className="quick-event-list">
                    {incoming.map((event) => {
                      const isOpen = selectedEvent?.id === event.id;
                      return (
                        <article key={event.id} className={`quick-event-row ${isOpen ? "active" : ""}`}>
                          <div className="quick-event-summary">
                            <button type="button" onClick={() => setSelectedEvent(isOpen ? null : event)} className="quick-event">
                              <span>{event.method}</span>
                              <div><b>{event.url}</b><small>{new Date(event.when).toLocaleString()} · {getClientIp(event.headers)}</small></div>
                              <ChevronDown className={`quick-event-chevron h-4 w-4 ${isOpen ? "rotate-180" : ""}`} />
                            </button>
                            <button type="button" onClick={() => deleteIncomingEvent(event.id)} className="quick-event-delete" aria-label="Delete event"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                          {isOpen ? (
                            <div className="quick-event-details">
                              <div className="quick-event-actions">
                                <div><p className="quick-section-label">Request details</p><h4>{event.method} request captured</h4></div>
                                <button type="button" onClick={() => resendIncomingEvent(event)} className="quick-primary !m-0"><Send className="h-4 w-4" /> Resend request</button>
                              </div>
                              <div className="quick-inspector-grid">
                                <section className="quick-inspector-card"><span>IP address</span><b>{getClientIp(event.headers)}</b></section>
                                <section className="quick-inspector-card"><span>User agent</span><p>{getHeaderValue(event.headers, "user-agent") || "Not provided"}</p></section>
                                <section className="quick-inspector-card"><span>Cookies</span><p>{getHeaderValue(event.headers, "cookie") || "No cookies"}</p></section>
                              </div>
                              <section className="quick-inspector-section"><div className="quick-inspector-heading"><span>Headers</span><b>{Object.keys(event.headers).length}</b></div><pre className="quick-response-code min-h-[120px]">{JSON.stringify(event.headers, null, 2)}</pre></section>
                              <section className="quick-inspector-section"><div className="quick-inspector-heading"><span>Body</span><b>{event.body ? "Captured" : "Empty"}</b></div><pre className="quick-response-code min-h-[140px]">{event.body ? formatBody(event.body) : "No request body."}</pre></section>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            ) : null}
          </div>
        ) : null}

        {activePage === "workflow" ? (
          <div className="space-y-6">
            <section className="quick-shell quick-workflow-shell p-5 sm:p-6">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="quick-section-label">Pro workflow</p>
                  <h2 className="mt-2 text-2xl font-semibold">Hook workflow builder</h2>
                  <p className="quick-muted mt-2 text-sm">Create node flows for each receiver hook. Nodes run top-to-bottom when a request arrives.</p>
                </div>
                <select value={activeHookId ?? ""} onChange={(event) => {
                  const hook = savedHooks.find((item) => item.id === event.target.value);
                  if (hook) loadHookFeatureSettings(hook);
                }} className="quick-form-control max-w-sm">
                  <option value="">Select saved hook</option>
                  {savedHooks.map((hook) => <option key={hook.id} value={hook.id}>{hook.name}</option>)}
                </select>
              </div>
              {!isProUser ? (
                <div className="quick-pro-lock">
                  <Workflow className="h-7 w-7 text-[#f6821f]" />
                  <h3>Workflow is a Pro feature</h3>
                  <p>Upgrade to attach conditional response, transform, and forward nodes to each receiver hook.</p>
                  <Link href="/plan" className="quick-primary !m-0">Upgrade to Pro <ArrowRight className="h-4 w-4" /></Link>
                </div>
              ) : !activeSavedHook ? (
                <p className="quick-muted rounded-xl border border-dashed border-inherit p-5 text-sm">Select or create a saved hook to build its workflow.</p>
              ) : (
                <>
                  <div className="quick-workflow-canvas quick-workflow-full-canvas">
                    <div className="quick-workflow-canvas-toolbar">
                      <label className="quick-toggle-row"><input type="checkbox" checked={workflowEnabled} onChange={(event) => setWorkflowEnabled(event.target.checked)} /> Enabled</label>
                      <div className="relative">
                        <button type="button" onClick={() => setIsWorkflowAddMenuOpen((current) => !current)} className="quick-primary !m-0"><Plus className="h-4 w-4" /> Add node</button>
                        {isWorkflowAddMenuOpen ? (
                          <div className="quick-workflow-popup quick-workflow-add-popup">
                            {(["condition", "transform", "forward", "response"] as WorkflowNodeType[]).map((type) => (
                              <button key={type} type="button" onClick={() => addWorkflowNode(type)}><Plus className="h-4 w-4" /> {type}</button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <button type="button" onClick={() => saveProHookSettings("workflow")} className="quick-secondary"><Save className="h-4 w-4" /> Save</button>
                    </div>
                    <div className="quick-workflow-flow">
                      <article className="quick-canvas-node quick-canvas-node-start">
                        <span className="quick-canvas-node-icon"><Radio className="h-4 w-4" /></span>
                        <div><b>Receiver trigger</b><small>{activeSavedHook.name}</small></div>
                      </article>
                      {workflowNodes.length ? workflowNodes.map((node, index) => (
                        <div key={node.id} className="quick-canvas-step">
                          <span className="quick-canvas-connector" />
                          <article className={`quick-canvas-node quick-canvas-node-${node.type}`}>
                            <div className="quick-canvas-node-actions">
                              <button type="button" onClick={() => setSelectedWorkflowNodeId(node.id)} aria-label="Edit node"><Edit3 className="h-4 w-4" /></button>
                              <button type="button" onClick={() => removeWorkflowNode(node.id)} aria-label="Delete node"><Trash2 className="h-4 w-4" /></button>
                            </div>
                            <div className="quick-canvas-node-compact" onDoubleClick={() => setSelectedWorkflowNodeId(node.id)}>
                              <span className="quick-canvas-node-icon">{node.type === "condition" ? <Settings2 className="h-4 w-4" /> : node.type === "forward" ? <Send className="h-4 w-4" /> : node.type === "transform" ? <Workflow className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}</span>
                              <div><b>{node.label}</b><small>{node.type}</small></div>
                            </div>
                            {node.type === "condition" ? (
                              <div className="quick-condition-branches">
                                <div><span>If</span><i /></div>
                                <div><span>Else</span><i /></div>
                              </div>
                            ) : null}
                          </article>
                        </div>
                      )) : (
                        <div className="quick-canvas-step">
                          <span className="quick-canvas-connector" />
                          <article className="quick-canvas-node quick-canvas-empty" onClick={() => setIsWorkflowAddMenuOpen(true)}>
                            <Plus className="h-5 w-5" />
                            <b>No workflow nodes</b>
                            <small>Click Add node to start.</small>
                          </article>
                        </div>
                      )}
                      <div className="quick-canvas-step">
                        <span className="quick-canvas-connector" />
                        <article className="quick-canvas-node quick-canvas-node-end">
                          <span className="quick-canvas-node-icon"><Send className="h-4 w-4" /></span>
                          <div><b>Return response</b><small>{workflowEnabled ? "Workflow output" : "Default hook response"}</small></div>
                        </article>
                      </div>
                      {workflowNodes.some((node) => node.type === "condition") ? (
                        <article className="quick-canvas-node quick-canvas-fallback">
                          <span className="quick-canvas-node-icon"><X className="h-4 w-4" /></span>
                          <div><b>Else fallback</b><small>422 condition failed</small></div>
                        </article>
                      ) : null}
                    </div>
                    {selectedWorkflowNode ? (
                      <div className="quick-workflow-popup quick-workflow-edit-popup">
                        <div className="quick-workflow-popup-head"><b>Edit node</b><button type="button" onClick={() => setSelectedWorkflowNodeId(null)}><X className="h-4 w-4" /></button></div>
                        <div className="quick-workflow-node-head">
                          <input value={selectedWorkflowNode.label} onChange={(event) => updateWorkflowNode(selectedWorkflowNode.id, { label: event.target.value })} className="quick-form-control" />
                          <select value={selectedWorkflowNode.type} onChange={(event) => updateWorkflowNode(selectedWorkflowNode.id, { type: event.target.value as WorkflowNodeType })} className="quick-form-control">
                            <option value="condition">Condition</option><option value="transform">Transform</option><option value="forward">Forward</option><option value="response">Response</option>
                          </select>
                        </div>
                        <div className="quick-workflow-node-body">
                          {selectedWorkflowNode.type === "condition" ? (
                            <>
                              <label><span>Path</span><input value={selectedWorkflowNode.config.path ?? ""} onChange={(event) => updateWorkflowNode(selectedWorkflowNode.id, { config: { path: event.target.value } })} placeholder="body.event" className="quick-form-control" /></label>
                              <label><span>Operator</span><select value={selectedWorkflowNode.config.operator ?? "exists"} onChange={(event) => updateWorkflowNode(selectedWorkflowNode.id, { config: { operator: event.target.value as WorkflowNode["config"]["operator"] } })} className="quick-form-control"><option value="exists">Exists</option><option value="equals">Equals</option><option value="contains">Contains</option></select></label>
                              <label><span>Value</span><input value={selectedWorkflowNode.config.value ?? ""} onChange={(event) => updateWorkflowNode(selectedWorkflowNode.id, { config: { value: event.target.value } })} className="quick-form-control" /></label>
                              <label><span>Else status</span><input type="number" value={selectedWorkflowNode.config.failStatus ?? 422} onChange={(event) => updateWorkflowNode(selectedWorkflowNode.id, { config: { failStatus: Number(event.target.value) } })} className="quick-form-control" /></label>
                            </>
                          ) : null}
                          {selectedWorkflowNode.type === "forward" ? (
                            <>
                              <label><span>Request URL</span><input value={selectedWorkflowNode.config.url ?? ""} onChange={(event) => updateWorkflowNode(selectedWorkflowNode.id, { config: { url: event.target.value } })} className="quick-form-control" /></label>
                              <label><span>Method</span><input value={selectedWorkflowNode.config.method ?? "POST"} onChange={(event) => updateWorkflowNode(selectedWorkflowNode.id, { config: { method: event.target.value.toUpperCase() } })} className="quick-form-control" /></label>
                            </>
                          ) : null}
                          {selectedWorkflowNode.type === "response" || selectedWorkflowNode.type === "transform" || selectedWorkflowNode.type === "forward" ? (
                            <label className="lg:col-span-2"><span>Body template</span><textarea value={selectedWorkflowNode.config.bodyTemplate ?? ""} onChange={(event) => updateWorkflowNode(selectedWorkflowNode.id, { config: { bodyTemplate: event.target.value } })} rows={5} className="quick-form-control font-mono" /></label>
                          ) : null}
                          {selectedWorkflowNode.type === "response" || selectedWorkflowNode.type === "transform" ? (
                            <>
                              <label><span>Status</span><input type="number" value={selectedWorkflowNode.config.status ?? responseStatus} onChange={(event) => updateWorkflowNode(selectedWorkflowNode.id, { config: { status: Number(event.target.value) } })} className="quick-form-control" /></label>
                              <label><span>Content type</span><input value={selectedWorkflowNode.config.contentType ?? responseContentType} onChange={(event) => updateWorkflowNode(selectedWorkflowNode.id, { config: { contentType: event.target.value } })} className="quick-form-control" /></label>
                            </>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </section>
          </div>
        ) : null}

        {activePage === "dataCenter" ? (
          <div className="space-y-6">
            <section className="quick-shell p-5 sm:p-6">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="quick-section-label">Pro data center</p>
                  <h2 className="mt-2 text-2xl font-semibold">Captured hook data</h2>
                  <p className="quick-muted mt-2 text-sm">Map fields per hook, then inspect saved request data in table format.</p>
                </div>
                <select value={activeHookId ?? ""} onChange={(event) => {
                  const hook = savedHooks.find((item) => item.id === event.target.value);
                  if (hook) loadHookFeatureSettings(hook);
                }} className="quick-form-control max-w-sm">
                  <option value="">Select hook to configure</option>
                  {savedHooks.map((hook) => <option key={hook.id} value={hook.id}>{hook.name}</option>)}
                </select>
              </div>
              {!isProUser ? (
                <div className="quick-pro-lock"><Database className="h-7 w-7 text-[#f6821f]" /><h3>Data Center is a Pro feature</h3><p>Upgrade to map request fields and build searchable receiver tables.</p><Link href="/plan" className="quick-primary !m-0">Upgrade to Pro <ArrowRight className="h-4 w-4" /></Link></div>
              ) : (
                <>
                  {activeSavedHook ? (
                    <div className="quick-data-config">
                      <label className="quick-toggle-row"><input type="checkbox" checked={dataCenterEnabled} onChange={(event) => setDataCenterEnabled(event.target.checked)} /> Capture data for {activeSavedHook.name}</label>
                      <button type="button" onClick={addDataCenterField} className="quick-secondary"><Plus className="h-4 w-4" /> Add field</button>
                      <div className="quick-data-field-grid">
                        {dataCenterFields.map((field) => (
                          <div key={field.id} className="quick-data-field">
                            <input value={field.label} onChange={(event) => updateDataCenterField(field.id, { label: event.target.value })} placeholder="Column label" className="quick-form-control" />
                            <input value={field.path} onChange={(event) => updateDataCenterField(field.id, { path: event.target.value })} placeholder="body.customer.email" className="quick-form-control" />
                            <button type="button" onClick={() => setDataCenterFields((current) => current.filter((item) => item.id !== field.id))} className="quick-danger-button"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => saveProHookSettings("dataCenter")} className="quick-primary !m-0"><Save className="h-4 w-4" /> Save mapping</button>
                    </div>
                  ) : <p className="quick-muted rounded-xl border border-dashed border-inherit p-5 text-sm">Select a hook to configure Data Center fields.</p>}
                  <div className="quick-data-stats">
                    <div className="quick-crm-stat"><span>Total rows</span><b>{dataCenterRows.length}</b><small>Latest captured records</small></div>
                    <div className="quick-crm-stat"><span>Visible rows</span><b>{dataCenterVisibleRows.length}</b><small>After filters</small></div>
                    <div className="quick-crm-stat"><span>Columns</span><b>{dataCenterColumns.length}</b><small>Mapped fields</small></div>
                  </div>
                  <div className="quick-data-filters">
                    <select value={dataCenterHookFilter} onChange={(event) => setDataCenterHookFilter(event.target.value)} className="quick-form-control"><option value="all">All hooks</option>{savedHooks.map((hook) => <option key={hook.id} value={getReceiverIdFromUrl(hook.url)}>{hook.name}</option>)}</select>
                    <input value={dataCenterSearch} onChange={(event) => setDataCenterSearch(event.target.value)} placeholder="Filter table data..." className="quick-form-control" />
                  </div>
                  <div className="quick-data-table">
                    <div className="quick-data-table-head" style={{ gridTemplateColumns: `160px 160px repeat(${Math.max(dataCenterColumns.length, 1)}, minmax(130px, 1fr)) 70px` }}><span>Hook</span><span>Received</span>{dataCenterColumns.length ? dataCenterColumns.map((column) => <span key={column}>{column}</span>) : <span>Data</span>}<span></span></div>
                    {dataCenterVisibleRows.length ? dataCenterVisibleRows.map((row) => (
                      <div key={row.id} className="quick-data-table-row" style={{ gridTemplateColumns: `160px 160px repeat(${Math.max(dataCenterColumns.length, 1)}, minmax(130px, 1fr)) 70px` }}>
                        <span>{row.hookName ?? row.receiverId}</span><span>{new Date(row.createdAt).toLocaleString()}</span>{dataCenterColumns.length ? dataCenterColumns.map((column) => <span key={column}>{String(row.values[column] ?? "")}</span>) : <span>{JSON.stringify(row.values)}</span>}<button type="button" onClick={() => deleteDataCenterRow(row.id)} className="quick-danger-button"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    )) : <p className="quick-muted p-5 text-sm">No data rows yet. Send requests to a mapped saved hook.</p>}
                  </div>
                </>
              )}
            </section>
          </div>
        ) : null}

        {activePage === "sender" ? (
          <div className="quick-shell grid overflow-hidden lg:grid-cols-[1fr_380px]">
            <section className="p-5 sm:p-8 lg:p-10">
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="quick-section-label">Request sender</p><h2 className="mt-2 text-2xl font-semibold">Send a test request</h2><p className="quick-muted mt-2 text-sm">Use this sender to retest checkhooks or any endpoint you own.</p></div>
                <span className={`quick-status ${validUrl ? "valid" : "invalid"}`}>{validUrl ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}{validUrl ? "Valid URL" : "Invalid URL"}</span>
              </div>
              <div className="quick-url-row">
                <div className="relative">
                  <select value={method} onChange={(event) => setMethod(event.target.value)} className="quick-method">{["POST", "GET", "PUT", "PATCH", "DELETE"].map((item) => <option key={item}>{item}</option>)}</select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                </div>
                <input value={target} onChange={(event) => setTarget(event.target.value)} aria-label="Target URL" />
                <button type="button" onClick={() => sendCheckhook()} disabled={!validUrl || isSending} className="quick-send-button">{isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send</button>
              </div>
              <div className="mt-8">
                <div className="quick-field-heading"><span>Headers</span><button type="button" onClick={() => setHeaders((current) => [...current, { name: "", value: "" }])}><Plus className="h-3.5 w-3.5" /> Add header</button></div>
                <div className="space-y-2.5">{headers.map((header, index) => <div key={index} className="quick-header-row"><input value={header.name} onChange={(event) => updateHeader(index, "name", event.target.value)} placeholder="Header name" /><input value={header.value} onChange={(event) => updateHeader(index, "value", event.target.value)} placeholder="Value" /><button type="button" onClick={() => setHeaders((current) => current.filter((_, currentIndex) => currentIndex !== index))} aria-label="Remove header"><Trash2 className="h-4 w-4" /></button></div>)}</div>
              </div>
              <div className="mt-8">
                <div className="quick-field-heading"><span>JSON body</span><button type="button" onClick={() => setBody(formatBody(body))}>Format</button></div>
                <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={11} className="quick-code-field" spellCheck={false} />
              </div>
            </section>
            <aside className="quick-response-panel p-5 sm:p-8">
              <div className="flex items-center justify-between"><p className="quick-section-label">Response</p>{response ? <span className={`quick-status ${response.status < 400 ? "valid" : "invalid"}`}>{response.status} {response.statusText}</span> : null}</div>
              {response ? <pre className="quick-response-code mt-7">{formatBody(response.body)}</pre> : <div className="flex min-h-[360px] flex-col items-center justify-center text-center"><span className="quick-empty-icon"><Send className="h-6 w-6" /></span><h3 className="mt-5 font-semibold">Ready to send</h3><p className="quick-muted mt-2 max-w-[240px] text-sm leading-6">Send a request to inspect response status, headers, and body.</p></div>}
              {error ? <p className="mt-4 text-sm text-[#dc4a3d]">{error}</p> : null}
            </aside>
          </div>
        ) : null}

        {activePage === "history" ? (
          <section className="quick-shell p-5 sm:p-6">
            <div className="quick-history-header">
              <div><p className="quick-section-label">History</p><h2 className="mt-2 text-2xl font-semibold">Saved hook request inspector</h2><p className="quick-muted mt-2 text-sm">Live receiver records are stored for 7 days and automatically deleted.</p></div>
              <div className="quick-history-actions">
                <button type="button" onClick={() => setSelectedHistoryIds(filteredHookInspectorEvents.map(getEventKey))} disabled={filteredHookInspectorEvents.length === 0} className="quick-secondary">Select visible</button>
                <button type="button" onClick={deleteSelectedHookInspectorEvents} disabled={selectedHistoryIds.length === 0} className="quick-danger-button"><Trash2 className="h-4 w-4" /> Delete selected</button>
              </div>
            </div>

            <div className="quick-history-filters">
              <label className="quick-form-label">Filter by hook<select value={historyHookFilter} onChange={(event) => setHistoryHookFilter(event.target.value)} className="quick-form-control"><option value="all">All saved hooks</option>{savedHooks.map((hook) => <option key={hook.id} value={hook.id}>{hook.name}</option>)}</select></label>
              <label className="quick-form-label">Filter by date<input type="date" value={historyDateFilter} onChange={(event) => setHistoryDateFilter(event.target.value)} className="quick-form-control" /></label>
            </div>

            {filteredHookInspectorEvents.length === 0 ? (
              <div className="quick-hooks-empty">
                <span className="quick-empty-icon"><Clipboard className="h-6 w-6" /></span>
                <h3>No request records found</h3>
                <p className="quick-muted">Try another hook/date filter or send a request to a saved receiver hook.</p>
              </div>
            ) : (
              <div className="quick-event-list">
                {filteredHookInspectorEvents.map((event) => {
                  const eventKey = getEventKey(event);
                  const isOpen = selectedEvent ? getEventKey(selectedEvent) === eventKey : false;
                  return (
                    <article key={eventKey} className={`quick-event-row ${isOpen ? "active" : ""}`}>
                      <div className="quick-event-summary quick-history-event-summary">
                        <label className="quick-history-checkbox">
                          <input type="checkbox" checked={selectedHistoryIds.includes(eventKey)} onChange={() => setSelectedHistoryIds((current) => current.includes(eventKey) ? current.filter((id) => id !== eventKey) : [...current, eventKey])} />
                        </label>
                        <button type="button" onClick={() => setSelectedEvent(isOpen ? null : event)} className="quick-event">
                          <span>{event.method}</span>
                          <div>
                            <b>{event.url}</b>
                            <small><em className="quick-hook-tag">{event.hookName}</em> {new Date(event.when).toLocaleString()} · {getClientIp(event.headers)}</small>
                          </div>
                          <ChevronDown className={`quick-event-chevron h-4 w-4 ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                        <button type="button" onClick={() => deleteHookInspectorEvent(event)} className="quick-event-delete" aria-label="Delete event"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                      {isOpen ? (
                        <div className="quick-event-details">
                          <div className="quick-event-actions">
                            <div><p className="quick-section-label">Request details</p><h4>{event.hookName}</h4></div>
                            <button type="button" onClick={() => resendIncomingEvent(event)} className="quick-primary !m-0"><Send className="h-4 w-4" /> Resend request</button>
                          </div>
                          <div className="quick-inspector-grid">
                            <section className="quick-inspector-card"><span>IP address</span><b>{getClientIp(event.headers)}</b></section>
                            <section className="quick-inspector-card"><span>User agent</span><p>{getHeaderValue(event.headers, "user-agent") || "Not provided"}</p></section>
                            <section className="quick-inspector-card"><span>Cookies</span><p>{getHeaderValue(event.headers, "cookie") || "No cookies"}</p></section>
                          </div>
                          <section className="quick-inspector-section"><div className="quick-inspector-heading"><span>Headers</span><b>{Object.keys(event.headers).length}</b></div><pre className="quick-response-code min-h-[120px]">{JSON.stringify(event.headers, null, 2)}</pre></section>
                          <section className="quick-inspector-section"><div className="quick-inspector-heading"><span>Body</span><b>{event.body ? "Captured" : "Empty"}</b></div><pre className="quick-response-code min-h-[140px]">{event.body ? formatBody(event.body) : "No request body."}</pre></section>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        {activePage === "settings" ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <section className="quick-shell p-5 sm:p-6">
              <p className="quick-section-label">Profile details</p>
              <h2 className="mt-2 text-2xl font-semibold">Account profile</h2>
              <div className="mt-5 grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="quick-form-label">First name<input value={profileFirstName} onChange={(event) => setProfileFirstName(event.target.value)} className="quick-form-control" /></label>
                  <label className="quick-form-label">Last name<input value={profileLastName} onChange={(event) => setProfileLastName(event.target.value)} className="quick-form-control" /></label>
                </div>
                <div className="quick-settings-row"><span>Email</span><b>{user.email}</b></div>
                <button type="button" onClick={updateProfile} className="quick-primary w-fit !m-0"><Save className="h-4 w-4" /> Save profile</button>
              </div>
              <div className="mt-8 border-t border-inherit pt-6">
                <p className="quick-section-label">Security</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Current password" autoComplete="current-password" className="quick-form-control" />
                  <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" autoComplete="new-password" className="quick-form-control" />
                </div>
                <button type="button" onClick={changePassword} className="quick-secondary mt-4"><Settings2 className="h-4 w-4" /> Change password</button>
              </div>
              <p className="quick-muted mt-5 text-sm">{settingsMessage}</p>
            </section>
            <section className="quick-shell p-5 sm:p-6">
              <p className="quick-section-label">Plan</p>
              <h2 className="mt-2 text-2xl font-semibold">{user.plan === "pro" ? "Pro workspace" : "Free workspace"}</h2>
              <p className="quick-muted mt-3 text-sm leading-6">Free logged-in users get 2 saved receiver hooks, 50,000 requests per day, and a 120/min rate limit. Upgrade when your integrations need more room.</p>
              <div className="mt-5 grid gap-3">
                <div className="quick-settings-row"><span>Plan</span><b>{user.plan.toUpperCase()}</b></div>
                <div className="quick-settings-row"><span>Price</span><b>${user.planPrice}/month</b></div>
                <div className="quick-settings-row"><span>Receiver quota</span><b>{quota?.totalLimit ? quota.totalLimit.toLocaleString() : "50,000"} / day</b></div>
                {user.plan !== "pro" ? <button type="button" onClick={subscribe} className="quick-primary !m-0"><CreditCard className="h-4 w-4" /> Upgrade for $5/mo</button> : <button type="button" className="quick-secondary"><CreditCard className="h-4 w-4" /> Update payment info</button>}
              </div>
              <div className="mt-8 border-t border-inherit pt-6">
                <p className="quick-section-label">Danger zone</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={logout} className="quick-secondary"><LogOut className="h-4 w-4" /> Logout</button>
                  <button type="button" onClick={deleteAccount} className="quick-danger-button"><Trash2 className="h-4 w-4" /> Delete account</button>
                </div>
              </div>
            </section>
          </div>
        ) : null}
          </div>
        </div>
          </>
        )}

        {isResponseEditorOpen ? (
          <div className="quick-modal-backdrop" role="presentation" onMouseDown={() => setIsResponseEditorOpen(false)}>
            <section className="quick-modal" role="dialog" aria-modal="true" aria-labelledby="response-editor-title" onMouseDown={(event) => event.stopPropagation()}>
              <div className="quick-modal-header">
                <div><p className="quick-section-label">Dynamic response</p><h2 id="response-editor-title" className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Edit receiver response</h2></div>
                <button type="button" onClick={() => setIsResponseEditorOpen(false)} className="quick-icon-button !inline-flex" aria-label="Close response editor"><X className="h-4 w-4" /></button>
              </div>
              <div className="quick-modal-body">
                <p className="quick-muted text-sm leading-6">Set the exact response callers receive. Template values are resolved independently for every incoming request.</p>
                <div className="quick-config-grid mt-6">
                  <label><span>Status code</span><input type="number" min={100} max={599} value={responseStatus} onChange={(event) => setResponseStatus(Number(event.target.value))} className="quick-form-control" /></label>
                  <label><span>Content type</span><input value={responseContentType} onChange={(event) => setResponseContentType(event.target.value)} placeholder="application/json" className="quick-form-control" /></label>
                </div>
                <div className="mt-6">
                  <div className="quick-field-heading"><span>Response body</span><button type="button" onClick={() => setResponseBody(formatBody(responseBody))}>Format JSON</button></div>
                  <textarea value={responseBody} onChange={(event) => setResponseBody(event.target.value)} rows={9} className="quick-code-field" spellCheck={false} />
                  <div className="quick-template-help mt-3"><span>Dynamic values:</span><code>{`{{body.first_name}}`}</code><code>{`{{query.id}}`}</code><code>{`{{headers.authorization}}`}</code><code>{`{{method}}`}</code><code>{`{{url}}`}</code></div>
                </div>
                <div className="mt-6">
                  <div className="quick-field-heading"><span>Extra response headers</span><button type="button" onClick={() => setResponseHeaders((current) => [...current, { name: "", value: "" }])}><Plus className="h-3.5 w-3.5" /> Add header</button></div>
                  {responseHeaders.length === 0 ? <p className="quick-muted text-xs">Optional. Content-Type is managed separately.</p> : null}
                  <div className="space-y-2.5">{responseHeaders.map((header, index) => <div key={index} className="quick-header-row"><input value={header.name} onChange={(event) => updateResponseHeader(index, "name", event.target.value)} placeholder="Header name" /><input value={header.value} onChange={(event) => updateResponseHeader(index, "value", event.target.value)} placeholder="Value" /><button type="button" onClick={() => setResponseHeaders((current) => current.filter((_, currentIndex) => currentIndex !== index))} aria-label="Remove response header"><Trash2 className="h-4 w-4" /></button></div>)}</div>
                </div>
              </div>
              <div className="quick-modal-footer"><span className="quick-muted text-xs">{responseMessage}</span><div className="flex gap-2"><button type="button" onClick={() => setIsResponseEditorOpen(false)} className="quick-secondary">Cancel</button><button type="button" onClick={saveReceiverResponse} disabled={!receiverId || isSavingResponse} className="quick-primary !m-0"><Save className="h-4 w-4" /> {isSavingResponse ? "Saving" : "Update response"}</button></div></div>
            </section>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col items-center justify-center gap-3 text-center sm:flex-row">
          <p className="quick-muted text-xs">Temporary workspace · Refreshing this page clears receiver access and response results.</p>
          <ThemeToggle />
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
