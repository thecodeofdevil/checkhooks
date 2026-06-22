"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckhookMark } from "@/components/checkhooks-logo";
import { SiteFooter } from "@/components/site-chrome";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Copy,
  CreditCard,
  Loader2,
  Link,
  LogOut,
  Plus,
  Repeat,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";

type Header = { name: string; value: string };
type EndpointItem = { id: number; name: string; url: string; created: string };
type TemplateItem = { id: number; name: string; method: string; headers: Header[]; body: string; created: string };
type ReceiverEndpoint = { id: number; name: string; receiverId: string; created: string };
type IncomingEntry = { id: number; url: string; method: string; headers: Record<string, string>; query: Record<string, string>; body: string; when: string };
type UserSession = { email: string; plan: "free" | "pro"; planPrice: number };
type HistoryEntry = {
  id: number;
  target: string;
  method: string;
  status: number;
  statusText: string;
  success: boolean;
  when: string;
  headers: Header[];
  body: string;
  responseText: string;
};

const sampleHeaders: Header[] = [{ name: "Content-Type", value: "application/json" }];
const initialTemplates: TemplateItem[] = [];

function formatBody(value: string) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export default function HomePage() {
  const [target, setTarget] = useState("https://example.com/checkhook");
  const [method, setMethod] = useState("POST");
  const [headers, setHeaders] = useState<Header[]>(sampleHeaders);
  const [body, setBody] = useState(JSON.stringify({ message: "Hello from Checkhooks" }, null, 2));
  const [isSending, setIsSending] = useState(false);
  const [sentLog, setSentLog] = useState<string | null>(null);
  const [lastResponseStatus, setLastResponseStatus] = useState<number | null>(null);
  const [lastResponseStatusText, setLastResponseStatusText] = useState<string | null>(null);
  const [lastResponseText, setLastResponseText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [endpointLabel, setEndpointLabel] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [savedEndpoints, setSavedEndpoints] = useState<EndpointItem[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<TemplateItem[]>(initialTemplates);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
  const [selectedEndpointIds, setSelectedEndpointIds] = useState<number[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<number[]>([]);

  const [receiverEndpoints, setReceiverEndpoints] = useState<ReceiverEndpoint[]>([]);
  const [selectedReceiverIds, setSelectedReceiverIds] = useState<number[]>([]);
  const [activeReceiverId, setActiveReceiverId] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverOrigin, setReceiverOrigin] = useState("");
  const [incomingHistory, setIncomingHistory] = useState<IncomingEntry[]>([]);
  const [selectedIncomingId, setSelectedIncomingId] = useState<number | null>(null);
  const [receiverResponseStatus, setReceiverResponseStatus] = useState(200);
  const [receiverResponseBody, setReceiverResponseBody] = useState(JSON.stringify({ received: true }, null, 2));
  const [receiverResponseMessage, setReceiverResponseMessage] = useState<string | null>(null);
  const [user, setUser] = useState<UserSession | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("Login to connect receivers to your plan.");

  const validUrl = useMemo(() => {
    try {
      new URL(target);
      return true;
    } catch {
      return false;
    }
  }, [target]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedEndpoints = window.localStorage.getItem("checkhookCloneEndpoints");
    const storedTemplates = window.localStorage.getItem("checkhookCloneTemplates");
    const storedHistory = window.localStorage.getItem("checkhookCloneHistory");
    const storedReceiverEndpoints = window.localStorage.getItem("checkhookCloneReceiverEndpoints");
    const storedActiveReceiver = window.localStorage.getItem("checkhookCloneActiveReceiverId");

    if (storedEndpoints) setSavedEndpoints(JSON.parse(storedEndpoints));
    if (storedTemplates) setSavedTemplates(JSON.parse(storedTemplates));
    if (storedHistory) setHistory(JSON.parse(storedHistory));
    if (storedReceiverEndpoints) setReceiverEndpoints(JSON.parse(storedReceiverEndpoints));
    if (storedActiveReceiver) setActiveReceiverId(storedActiveReceiver);
    void refreshSession();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("checkhookCloneEndpoints", JSON.stringify(savedEndpoints));
  }, [savedEndpoints]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("checkhookCloneTemplates", JSON.stringify(savedTemplates));
  }, [savedTemplates]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("checkhookCloneHistory", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("checkhookCloneReceiverEndpoints", JSON.stringify(receiverEndpoints));
  }, [receiverEndpoints]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("checkhookCloneActiveReceiverId", activeReceiverId);
  }, [activeReceiverId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReceiverOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!activeReceiverId) return;
    void registerReceiver(activeReceiverId);
  }, [activeReceiverId, user?.email, user?.plan]);

  useEffect(() => {
    if (!activeReceiverId || !receiverOrigin) {
      setIncomingHistory([]);
      return;
    }

    let closed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;

    const connectSocket = () => {
      if (closed) return;
      socket = new WebSocket(`${receiverOrigin.replace(/^http/, "ws")}/socket/receive/${activeReceiverId}`);
      socket.onmessage = (message) => {
        try {
          const payload = JSON.parse(message.data);
          if (payload.event === "init" && Array.isArray(payload.data?.events)) {
            setIncomingHistory(payload.data.events);
          }
          if (payload.event === "event") {
            setIncomingHistory((prev) => [payload.data, ...prev].slice(0, 50));
          }
        } catch {
          // ignore malformed socket payload
        }
      };
      socket.onclose = () => {
        if (closed) return;
        reconnectTimer = window.setTimeout(connectSocket, 1500);
      };
      socket.onerror = () => {
        socket?.close();
      };
    };

    connectSocket();

    return () => {
      closed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [activeReceiverId, receiverOrigin]);

  const handleHeaderChange = (index: number, field: "name" | "value", value: string) => {
    const next = [...headers];
    next[index] = { ...next[index], [field]: value };
    setHeaders(next);
  };

  const addHeader = () => setHeaders((prev) => [...prev, { name: "", value: "" }]);
  const removeHeader = (index: number) => setHeaders((prev) => prev.filter((_, i) => i !== index));

  const saveEndpoint = () => {
    if (!target.trim()) return;
    const label = endpointLabel.trim() || "Saved endpoint";
    if (savedEndpoints.some((endpoint) => endpoint.url === target)) {
      setEndpointLabel("");
      return;
    }

    setSavedEndpoints((prev) => [
      { id: Date.now(), name: label, url: target, created: new Date().toISOString() },
      ...prev,
    ]);
    setEndpointLabel("");
  };

  const saveTemplate = () => {
    const name = templateName.trim();
    if (!name) return;

    setSavedTemplates((prev) => [
      {
        id: Date.now(),
        name,
        method,
        headers,
        body,
        created: new Date().toISOString(),
      },
      ...prev,
    ]);
    setTemplateName("");
  };

  const createReceiverEndpoint = () => {
    const name = receiverName.trim() || "Live receiver";
    const receiverId = `${Date.now()}-${Math.round(Math.random() * 10000)}`;

    setReceiverEndpoints((prev) => [
      { id: Date.now(), name, receiverId, created: new Date().toISOString() },
      ...prev,
    ]);
    setReceiverName("");
    setActiveReceiverId(receiverId);
  };

  const refreshSession = async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await response.json();
      setUser(data.user ?? null);
    } catch {}
  };

  const registerReceiver = async (receiverId: string) => {
    try {
      await fetch("/api/receivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId }),
      });
    } catch {}
  };

  const login = async () => {
    setAuthMessage("Logging in...");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(String(data.error ?? "Login failed"));
      setUser(data.user);
      setAuthMessage("Logged in on the Free plan.");
    } catch (loginError) {
      setAuthMessage(loginError instanceof Error ? loginError.message : "Login failed");
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setAuthMessage("Logged out.");
  };

  const subscribe = async () => {
    setAuthMessage("Activating Pro...");
    try {
      const response = await fetch("/api/billing/plan", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(String(data.error ?? "Plan update failed"));
      setUser(data.user);
      setAuthMessage(String(data.message ?? "Pro plan enabled."));
    } catch (subscribeError) {
      setAuthMessage(subscribeError instanceof Error ? subscribeError.message : "Plan update failed");
    }
  };

  const loadReceiverEndpoint = (id: number) => {
    const endpoint = receiverEndpoints.find((item) => item.id === id);
    if (endpoint) setActiveReceiverId(endpoint.receiverId);
  };

  const deleteSelectedReceiverEndpoints = () => {
    setReceiverEndpoints((prev) => prev.filter((item) => !selectedReceiverIds.includes(item.id)));
    if (selectedReceiverIds.includes(receiverEndpoints.find((item) => item.receiverId === activeReceiverId)?.id ?? -1)) {
      setActiveReceiverId("");
    }
    setSelectedReceiverIds([]);
  };

  const toggleReceiverSelection = (id: number) => {
    setSelectedReceiverIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const selectAllReceivers = () => setSelectedReceiverIds(receiverEndpoints.map((item) => item.id));

  const loadSavedEndpointById = (id: number) => {
    const endpoint = savedEndpoints.find((item) => item.id === id);
    if (endpoint) setTarget(endpoint.url);
  };

  const deleteSelectedEndpoints = () => {
    setSavedEndpoints((prev) => prev.filter((item) => !selectedEndpointIds.includes(item.id)));
    setSelectedEndpointIds([]);
  };

  const toggleEndpointSelection = (id: number) => {
    setSelectedEndpointIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const selectAllEndpoints = () => setSelectedEndpointIds(savedEndpoints.map((item) => item.id));

  const loadSavedTemplateById = (id: number) => {
    const template = savedTemplates.find((item) => item.id === id);
    if (template) {
      setMethod(template.method);
      setHeaders(template.headers);
      setBody(formatBody(template.body));
    }
  };

  const deleteSelectedTemplates = () => {
    setSavedTemplates((prev) => prev.filter((item) => !selectedTemplateIds.includes(item.id)));
    setSelectedTemplateIds([]);
  };

  const toggleTemplateSelection = (id: number) => {
    setSelectedTemplateIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const selectAllTemplates = () => setSelectedTemplateIds(savedTemplates.map((item) => item.id));

  const submitPayload = async (payload: { url: string; method: string; headers: Header[]; body: string }) => {
    setError(null);
    setSuccess(false);
    setIsSending(true);

    try {
      const response = await fetch("/api/send-checkhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      const responseText = String(data.body ?? data.error ?? "No response body");
      const succeeded = response.ok;

      const entry: HistoryEntry = {
        id: Date.now(),
        target: payload.url,
        method: payload.method,
        status: response.status,
        statusText: response.statusText,
        success: succeeded,
        when: new Date().toISOString(),
        headers: payload.headers,
        body: payload.body,
        responseText,
      };

      setHistory((prev) => [entry, ...prev].slice(0, 10));
      setLastResponseStatus(response.status);
      setLastResponseStatusText(response.statusText);
      setLastResponseText(responseText);
      setSentLog(`Sent ${payload.method} to ${payload.url} at ${new Date().toLocaleTimeString()} (${response.status})`);
      setSuccess(succeeded);
      setSelectedHistoryId(entry.id);

      if (!succeeded) {
        throw new Error(String(data.error || "Unable to send checkhook"));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setSuccess(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async () => {
    await submitPayload({ url: target, method, headers: headers.filter((header) => header.name.trim()), body });
  };

  const retryHistoryItem = async (entry: HistoryEntry) => {
    setTarget(entry.target);
    setMethod(entry.method);
    setHeaders(entry.headers);
    setBody(entry.body);
    await submitPayload({ url: entry.target, method: entry.method, headers: entry.headers, body: entry.body });
  };

  const updateReceiverResponseConfig = async () => {
    if (!activeReceiverId) return;

    try {
      const response = await fetch(`/api/receive/${activeReceiverId}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: receiverResponseStatus, body: receiverResponseBody }),
      });

      if (!response.ok) {
        const data = await response.json();
        setReceiverResponseMessage(String(data.error || "Unable to update response."));
        return;
      }

      setReceiverResponseMessage("Receiver response saved.");
      window.setTimeout(() => setReceiverResponseMessage(null), 3000);
    } catch {
      setReceiverResponseMessage("Unable to update response.");
      window.setTimeout(() => setReceiverResponseMessage(null), 3000);
    }
  };

  const activeReceiverUrl = activeReceiverId ? `${receiverOrigin}/api/receive/${activeReceiverId}` : "";
  const selectedHistory = selectedHistoryId ? history.find((item) => item.id === selectedHistoryId) : history[0] ?? null;
  const selectedIncoming = selectedIncomingId ? incomingHistory.find((item) => item.id === selectedIncomingId) : incomingHistory[0] ?? null;

  const toggleHistorySelection = (id: number) => setSelectedHistoryId((prev) => (prev === id ? null : id));
  const toggleIncomingSelection = (id: number) => setSelectedIncomingId((prev) => (prev === id ? null : id));

  return (
    <main className="app-workspace min-h-screen bg-[#efebe5] px-4 pb-12 sm:px-6 lg:px-12">
      <nav className="mx-auto flex h-[72px] max-w-7xl items-center justify-between border-b border-black/10">
        <a href="/" className="inline-flex items-center gap-2.5" aria-label="Checkhooks home">
          <CheckhookMark className="h-8 w-9" />
          <span className="text-[19px] font-bold tracking-[-0.04em] text-[#111111]">checkhooks</span>
        </a>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user ? <span className="hidden text-xs font-semibold text-[#6a645c] sm:inline">{user.plan.toUpperCase()} · {user.email}</span> : null}
          <span className="hidden items-center gap-2 text-xs font-semibold text-[#6a645c] sm:flex"><span className="h-2 w-2 rounded-full bg-[#15a36d]" /> Workspace online</span>
          <a href="/" className="rounded-lg border border-black/15 bg-white/60 px-4 py-2 text-sm font-semibold text-[#292621] transition hover:bg-white">Back to home</a>
        </div>
      </nav>
      <div className="h-8" />
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 sm:p-8 shadow-glow glass-panel">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500/10 to-orange-400/10 px-3 py-1 text-sm font-semibold uppercase tracking-[0.22em] text-sky-300">
                Checkhooks
              </span>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Send checkhooks faster with a beautiful builder.
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                  Build and dispatch checkhook payloads with instant validation, live receiver streaming, saved endpoints, and retryable request history.
                </p>
              </div>
            </div>
            <div className="space-y-3 rounded-3xl bg-slate-950/80 p-5 ring-1 ring-white/10 sm:p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">New features</p>
              <ul className="space-y-2 text-sm leading-6 text-slate-300">
                <li>Saved checkhooks with bulk delete.</li>
                <li>Payload templates you can load instantly.</li>
                <li>Live receiver events via SSE.</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 grid gap-4 rounded-[32px] border border-slate-800/80 bg-slate-950/90 p-6 shadow-glow glass-panel sm:grid-cols-[1.2fr,_0.8fr]">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Quick start</p>
              <h3 className="text-xl font-semibold text-white">Ready to test checkhooks in seconds?</h3>
              <p className="text-sm leading-6 text-slate-300">Create a receiver, compose a payload, or save a template. Your request history and receiver logs update instantly.</p>
            </div>
            <div className="flex flex-col gap-3">
              {user ? (
                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/95 p-4">
                  <p className="text-sm font-semibold text-slate-100">{user.email}</p>
                  <p className="mt-1 text-xs text-slate-400">{authMessage}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {user.plan !== "pro" ? <button type="button" onClick={subscribe} className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"><CreditCard className="h-4 w-4" /> $5 Pro</button> : null}
                    <button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/95 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/90"><LogOut className="h-4 w-4" /> Logout</button>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/95 p-4">
                  <p className="text-sm font-semibold text-slate-100">Login for Pro limits</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <input type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" className="rounded-full border border-slate-800/80 bg-slate-950/90 px-4 py-2 text-sm text-slate-100 outline-none focus:border-sky-500/70" />
                    <input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="Password" autoComplete="current-password" className="rounded-full border border-slate-800/80 bg-slate-950/90 px-4 py-2 text-sm text-slate-100 outline-none focus:border-sky-500/70" />
                    <button type="button" onClick={login} className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110">Login</button>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{authMessage}</p>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-end gap-3">
                <a href="/terms" className="inline-flex items-center justify-center rounded-full border border-slate-700/70 bg-slate-900/95 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/90">Terms</a>
                <a href="/privacy" className="inline-flex items-center justify-center rounded-full border border-slate-700/70 bg-slate-900/95 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/90">Privacy</a>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6">
          <aside className="space-y-6 lg:space-y-8">
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-[32px] border border-white/10 bg-slate-950/90 p-6 sm:p-8 shadow-glow glass-panel">
                <div className="mb-7 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Activity panel</p>
                    <h2 className="mt-3 text-3xl font-semibold text-white">Live status</h2>
                  </div>
                  <div className="rounded-3xl bg-slate-900/90 px-4 py-3 text-sm text-slate-300">Fast flow</div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-slate-200">
                    {success ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <AlertCircle className="h-5 w-5 text-orange-400" />}
                    <p className="font-semibold">Last delivery</p>
                  </div>
                  <span className="rounded-full bg-slate-800/90 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-400">{success ? "Delivered" : "Pending"}</span>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-300">{sentLog ?? "Send a checkhook to see the request details here."}</p>
                {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/95 p-5">
                  <div className="flex items-center gap-3 text-slate-200">
                    <Sparkles className="h-5 w-5 text-sky-400" />
                    <p className="font-semibold">What's next</p>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-slate-300">
                    <p>Use this site to test checkhook URLs, mock services, and inspect delivery status instantly.</p>
                    <p>Add new headers, update JSON body payloads, or change the method for different checkhook behaviors.</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[32px] border border-white/10 bg-slate-950/90 p-6 sm:p-8 shadow-glow glass-panel">
                <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Live receiver</p>
                    <h2 className="mt-3 text-3xl font-semibold text-white">Receive checkhooks directly</h2>
                  </div>
                  <button
                    type="button"
                    onClick={createReceiverEndpoint}
                    className="w-full sm:w-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-orange-400 px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110"
                  >
                    <Link className="h-4 w-4" />
                    Create receiver
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-[1fr,_auto]">
                    <input
                      value={receiverName}
                      onChange={(event) => setReceiverName(event.target.value)}
                      placeholder="Receiver name"
                      className="w-full rounded-3xl border border-slate-800/80 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500/70 focus:ring-2 focus:ring-sky-500/20"
                    />
                    <button
                      type="button"
                      onClick={createReceiverEndpoint}
                      className="w-full sm:w-auto rounded-3xl bg-sky-500 px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110"
                    >
                      Generate
                    </button>
                  </div>

                  <div className="rounded-3xl border border-slate-800/80 bg-slate-900/95 p-5">
                    <p className="text-sm font-semibold text-slate-100">Active checkhook URL</p>
                    <div className="mt-3 flex flex-col gap-3 rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-slate-300 break-words">{activeReceiverUrl || "Create a receiver to begin."}</div>
                      {activeReceiverUrl ? (
                        <button
                          type="button"
                          onClick={async () => await navigator.clipboard.writeText(activeReceiverUrl)}
                          className="inline-flex items-center gap-2 rounded-3xl bg-slate-800/90 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700/90"
                        >
                          <Copy className="h-4 w-4" />
                          Copy URL
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-800/80 bg-slate-900/95 p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">Outgoing response</p>
                        <p className="text-sm text-slate-500">Customize the HTTP status and body returned to incoming checkhook callers.</p>
                      </div>
                      <span className="rounded-full bg-slate-800/90 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-400">Editable</span>
                    </div>

                    <div className="grid gap-4">
                      <label className="grid gap-2 text-sm text-slate-300">
                        <span className="text-slate-100">HTTP Status</span>
                        <input
                          type="number"
                          min={100}
                          max={599}
                          value={receiverResponseStatus}
                          onChange={(event) => setReceiverResponseStatus(Number(event.target.value))}
                          className="rounded-3xl border border-slate-800/80 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-500/70 focus:ring-2 focus:ring-sky-500/20"
                        />
                      </label>

                      <label className="grid gap-2 text-sm text-slate-300">
                        <span className="text-slate-100">Response body</span>
                        <textarea
                          value={receiverResponseBody}
                          onChange={(event) => setReceiverResponseBody(event.target.value)}
                          rows={6}
                          className="min-h-[140px] rounded-3xl border border-slate-800/80 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-500/70 focus:ring-2 focus:ring-sky-500/20"
                        />
                      </label>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <button
                          type="button"
                          onClick={updateReceiverResponseConfig}
                          className="w-full sm:w-auto rounded-3xl bg-sky-500 px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110"
                        >
                          Save response
                        </button>
                        <p className="text-sm text-slate-300">{receiverResponseMessage ?? "This response is returned to the active receiver."}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {receiverEndpoints.length === 0 ? (
                      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-5 text-sm text-slate-400">
                        No receiver endpoints yet. Create one and point external checkhooks to it.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {receiverEndpoints.map((endpoint) => (
                          <div key={endpoint.id} className="grid gap-3 rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 sm:grid-cols-[auto,1fr,auto]">
                            <label className="inline-flex items-center gap-2 text-slate-300">
                              <input
                                type="checkbox"
                                checked={selectedReceiverIds.includes(endpoint.id)}
                                onChange={() => toggleReceiverSelection(endpoint.id)}
                                className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-sky-500"
                              />
                              <span className="sr-only">Select receiver</span>
                            </label>
                            <div>
                              <p className="text-sm font-semibold text-slate-100">{endpoint.name}</p>
                              <p className="text-xs text-slate-500">{`${receiverOrigin}/api/receive/${endpoint.receiverId}`}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => loadReceiverEndpoint(endpoint.id)}
                                className="inline-flex items-center gap-2 rounded-3xl bg-slate-900/95 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/90"
                              >
                                <ChevronRight className="h-4 w-4" />
                                Use
                              </button>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={deleteSelectedReceiverEndpoints}
                          disabled={selectedReceiverIds.length === 0}
                          className="w-full sm:w-auto inline-flex items-center justify-center rounded-3xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Delete selected receivers
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>

            <section className="rounded-[32px] border border-white/10 bg-slate-950/90 p-6 sm:p-8 shadow-glow glass-panel">
              <div className="mb-7 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Incoming requests</p>
                  <h2 className="mt-3 text-3xl font-semibold text-white">Live receiver history</h2>
                </div>
                <div className="rounded-3xl bg-slate-900/90 px-4 py-3 text-sm text-slate-300">Auto-updating</div>
              </div>
              {activeReceiverId ? (
                <div className="grid gap-6">
                  <div className="rounded-3xl border border-slate-800/80 bg-slate-900/95 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">Receiver ID</p>
                        <p className="mt-1 text-xs text-slate-500">{activeReceiverId}</p>
                      </div>
                      <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">{incomingHistory.length} events</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {incomingHistory.length === 0 ? (
                      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-5 text-sm text-slate-400">
                        No inbound requests received yet. Send a request to the active checkhook URL to populate this feed.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {incomingHistory.map((entry) => (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => toggleIncomingSelection(entry.id)}
                            className={`w-full rounded-3xl border p-4 text-left transition ${
                              selectedIncomingId === entry.id ? "border-sky-500/60 bg-slate-900/80" : "border-slate-800/80 bg-slate-950/80 hover:border-slate-600/80"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-100">{entry.method} {entry.url}</p>
                                <p className="mt-2 text-xs text-slate-500">{new Date(entry.when).toLocaleString()}</p>
                              </div>
                              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">Received</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedIncoming ? (
                    <div className="rounded-3xl border border-slate-800/80 bg-slate-900/95 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">Selected request</p>
                          <p className="text-xs text-slate-500">{new Date(selectedIncoming.when).toLocaleString()}</p>
                        </div>
                        <span className="rounded-full bg-slate-800/90 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-400">{selectedIncoming.method}</span>
                      </div>
                      <div className="mt-4 space-y-4 text-sm text-slate-300">
                        <div className="rounded-3xl bg-slate-950/80 p-4">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Received URL</p>
                          <p className="mt-2 break-words text-slate-200">{selectedIncoming.url}</p>
                        </div>
                        <div className="rounded-3xl bg-slate-950/80 p-4">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Query params</p>
                          <pre className="mt-2 overflow-x-auto text-xs text-slate-200">{JSON.stringify(selectedIncoming.query, null, 2)}</pre>
                        </div>
                        <div className="rounded-3xl bg-slate-950/80 p-4">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Headers</p>
                          <pre className="mt-2 overflow-x-auto text-xs text-slate-200">{JSON.stringify(selectedIncoming.headers, null, 2)}</pre>
                        </div>
                        <div className="rounded-3xl bg-slate-950/80 p-4">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Body</p>
                          <pre className="mt-2 overflow-x-auto text-xs text-slate-200">{formatBody(selectedIncoming.body)}</pre>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-5 text-sm text-slate-400">
                  Select or create a receiver to view incoming requests.
                </div>
              )}
            </section>

            <section className="rounded-[32px] border border-white/10 bg-slate-950/90 p-6 sm:p-8 shadow-glow glass-panel">
              <div className="mb-7 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Saved items</p>
                  <h2 className="mt-3 text-3xl font-semibold text-white">Reusable resources</h2>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/95 p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">Saved endpoints</p>
                      <p className="text-sm text-slate-500">Manage frequently used checkhook URLs.</p>
                    </div>
                    <button
                      type="button"
                      onClick={selectAllEndpoints}
                      disabled={savedEndpoints.length === 0}
                      className="rounded-full bg-slate-800/90 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Select all
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-[1fr,_auto]">
                      <input
                        value={endpointLabel}
                        onChange={(event) => setEndpointLabel(event.target.value)}
                        placeholder="Endpoint label"
                        className="w-full rounded-3xl border border-slate-800/80 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500/70 focus:ring-2 focus:ring-sky-500/20"
                      />
                      <button
                        type="button"
                        onClick={saveEndpoint}
                        disabled={!target.trim()}
                        className="rounded-3xl bg-sky-500 px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Save endpoint
                      </button>
                    </div>

                    {savedEndpoints.length === 0 ? (
                      <p className="rounded-3xl bg-slate-950/80 p-4 text-sm text-slate-400">No endpoints saved yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {savedEndpoints.map((endpoint) => (
                          <div key={endpoint.id} className="grid gap-3 rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 sm:grid-cols-[auto,1fr,auto]">
                            <label className="inline-flex items-center gap-2 text-slate-300">
                              <input
                                type="checkbox"
                                checked={selectedEndpointIds.includes(endpoint.id)}
                                onChange={() => toggleEndpointSelection(endpoint.id)}
                                className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-sky-500"
                              />
                              <span className="sr-only">Select endpoint</span>
                            </label>
                            <div>
                              <p className="text-sm font-semibold text-slate-100">{endpoint.name}</p>
                              <p className="text-xs text-slate-500">{endpoint.url}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => loadSavedEndpointById(endpoint.id)}
                                className="inline-flex items-center gap-2 rounded-3xl bg-slate-900/95 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/90"
                              >
                                <ChevronRight className="h-4 w-4" />
                                Load
                              </button>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={deleteSelectedEndpoints}
                          disabled={selectedEndpointIds.length === 0}
                          className="w-full sm:w-auto inline-flex items-center justify-center rounded-3xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Delete selected endpoints
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/95 p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">Payload templates</p>
                      <p className="text-sm text-slate-500">Quickly load saved request payloads.</p>
                    </div>
                    <button
                      type="button"
                      onClick={selectAllTemplates}
                      disabled={savedTemplates.length === 0}
                      className="rounded-full bg-slate-800/90 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Select all
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-[1fr,_auto]">
                      <input
                        value={templateName}
                        onChange={(event) => setTemplateName(event.target.value)}
                        placeholder="Template name"
                        className="w-full rounded-3xl border border-slate-800/80 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500/70 focus:ring-2 focus:ring-sky-500/20"
                      />
                      <button
                        type="button"
                        onClick={saveTemplate}
                        disabled={!templateName.trim()}
                        className="rounded-3xl bg-orange-400 px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Save template
                      </button>
                    </div>

                    {savedTemplates.length === 0 ? (
                      <p className="rounded-3xl bg-slate-950/80 p-4 text-sm text-slate-400">No templates saved yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {savedTemplates.map((template) => (
                          <div key={template.id} className="grid gap-3 rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 sm:grid-cols-[auto,1fr,auto]">
                            <label className="inline-flex items-center gap-2 text-slate-300">
                              <input
                                type="checkbox"
                                checked={selectedTemplateIds.includes(template.id)}
                                onChange={() => toggleTemplateSelection(template.id)}
                                className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-sky-500"
                              />
                              <span className="sr-only">Select template</span>
                            </label>
                            <div>
                              <p className="text-sm font-semibold text-slate-100">{template.name}</p>
                              <p className="text-xs text-slate-500">{template.method} • {new Date(template.created).toLocaleDateString()}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => loadSavedTemplateById(template.id)}
                                className="inline-flex items-center gap-2 rounded-3xl bg-slate-900/95 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/90"
                              >
                                <ChevronRight className="h-4 w-4" />
                                Load
                              </button>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={deleteSelectedTemplates}
                          disabled={selectedTemplateIds.length === 0}
                          className="w-full sm:w-auto inline-flex items-center justify-center rounded-3xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Delete selected templates
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <section className="rounded-[32px] border border-white/10 bg-slate-950/90 p-6 sm:p-8 shadow-glow glass-panel">
          <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Request history</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">Detailed timeline</h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedHistoryId(null)}
              className="inline-flex items-center gap-2 rounded-3xl bg-slate-900/95 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/90"
            >
              <Repeat className="h-4 w-4" />
              Refresh selection
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.95fr,_1.05fr]">
            <div className="space-y-4">
              {history.length === 0 ? (
                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/95 p-6 text-sm text-slate-300">
                  No requests recorded yet. Every sent checkhook appears here with a retry button.
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => toggleHistorySelection(entry.id)}
                      className={`w-full rounded-3xl border p-5 text-left transition ${
                        selectedHistoryId === entry.id ? "border-sky-500/60 bg-slate-900/80" : "border-slate-800/80 bg-slate-950/80 hover:border-slate-600/80"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{entry.method} • {entry.target}</p>
                          <p className="mt-2 text-xs text-slate-500">{new Date(entry.when).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${entry.success ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
                            {entry.success ? `Success ${entry.status}` : "Failed"}
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              retryHistoryItem(entry);
                            }}
                            className="inline-flex items-center gap-1 rounded-full bg-slate-900/95 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-800/90"
                          >
                            <Repeat className="h-3.5 w-3.5" />
                            Retry
                          </button>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/95 p-5">
                <p className="text-sm font-semibold text-slate-100">History details</p>
                <p className="mt-3 text-sm text-slate-400">Select an entry on the left to inspect the request payload and response.</p>
              </div>
              {selectedHistory ? (
                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-800/80 bg-slate-900/95 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{selectedHistory.method} request</p>
                        <p className="text-xs text-slate-500">{selectedHistory.target}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedHistory.success ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
                        {selectedHistory.success ? "Success" : "Failed"}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-slate-300">
                      <div className="rounded-3xl bg-slate-950/80 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Requested headers</p>
                        <pre className="mt-2 overflow-x-auto text-xs text-slate-200">{JSON.stringify(selectedHistory.headers, null, 2)}</pre>
                      </div>
                      <div className="rounded-3xl bg-slate-950/80 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Request body</p>
                        <pre className="mt-2 overflow-x-auto text-xs text-slate-200">{formatBody(selectedHistory.body)}</pre>
                      </div>
                      <div className="rounded-3xl bg-slate-950/80 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Response</p>
                        <pre className="mt-2 overflow-x-auto text-xs text-slate-200">{selectedHistory.responseText}</pre>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => retryHistoryItem(selectedHistory)}
                    className="w-full rounded-3xl bg-gradient-to-r from-sky-500 to-orange-400 px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110"
                  >
                    Retry this request
                  </button>
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/95 p-5 text-sm text-slate-400">
                  No history entry selected yet.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-slate-950/90 p-6 sm:p-8 shadow-glow glass-panel">
          <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Checkhook Builder</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">Compose a request</h2>
            </div>
            <button
              type="button"
              onClick={addHeader}
              className="w-full lg:w-auto inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/90 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500/80 hover:bg-slate-800/90"
            >
              <Plus className="h-4 w-4" />
              Add header
            </button>
          </div>

          <div className="grid gap-6">
            <div className="grid gap-4 lg:grid-cols-[1.2fr,_0.8fr]">
              <label className="grid gap-3 text-sm text-slate-300">
                <span className="flex items-center justify-between text-slate-100">
                  Target URL
                  {validUrl ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
                      Valid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-300">
                      Invalid
                    </span>
                  )}
                </span>
                <div className="flex gap-2">
                  <input
                    value={target}
                    onChange={(event) => setTarget(event.target.value)}
                    placeholder="https://example.com/checkhook"
                    className="w-full rounded-3xl border border-slate-800/80 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500/70 focus:ring-2 focus:ring-sky-500/20"
                  />
                  <button
                    type="button"
                    onClick={async () => await navigator.clipboard.writeText(target)}
                    className="inline-flex h-12 items-center justify-center rounded-3xl border border-slate-800/80 bg-slate-900/95 px-4 text-sm text-slate-200 transition hover:border-slate-500/80 hover:bg-slate-800/90"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </label>

              <label className="grid gap-2 text-sm text-slate-300">
                <span className="text-slate-100">HTTP Method</span>
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value)}
                  className="rounded-3xl border border-slate-800/80 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500/70 focus:ring-2 focus:ring-sky-500/20"
                >
                  <option>POST</option>
                  <option>PUT</option>
                  <option>PATCH</option>
                  <option>DELETE</option>
                  <option>GET</option>
                </select>
              </label>
            </div>

            <label className="grid gap-2 text-sm text-slate-300">
              <span className="text-slate-100">Body</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={10}
                className="min-h-[220px] rounded-3xl border border-slate-800/80 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500/70 focus:ring-2 focus:ring-sky-500/20"
              />
            </label>

            <div className="rounded-3xl border border-slate-800/80 bg-slate-950/90 p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Headers</p>
                  <p className="text-sm text-slate-500">Add as many request headers as you need.</p>
                </div>
                <span className="text-xs uppercase tracking-[0.24em] text-slate-500">{headers.length} entries</span>
              </div>
              <div className="space-y-3">
                {headers.map((header, index) => (
                  <div key={`${header.name}-${index}`} className="grid gap-3 sm:grid-cols-[1fr,1fr,auto]">
                    <input
                      value={header.name}
                      onChange={(event) => handleHeaderChange(index, "name", event.target.value)}
                      placeholder="Header name"
                      className="rounded-3xl border border-slate-800/80 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500/70 focus:ring-2 focus:ring-sky-500/20"
                    />
                    <input
                      value={header.value}
                      onChange={(event) => handleHeaderChange(index, "value", event.target.value)}
                      placeholder="Header value"
                      className="rounded-3xl border border-slate-800/80 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500/70 focus:ring-2 focus:ring-sky-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => removeHeader(index)}
                      className="inline-flex h-12 items-center justify-center rounded-3xl bg-rose-500/10 px-4 text-sm font-medium text-rose-200 transition hover:bg-rose-500/15"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-100">Send to endpoint</p>
                <p className="text-sm text-slate-500">One click sends the payload to your configured checkhook.</p>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSending || !validUrl}
                className="w-full sm:inline-flex items-center justify-center gap-2 rounded-3xl bg-gradient-to-r from-sky-500 to-orange-400 px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send checkhook
              </button>
            </div>

            <section className="rounded-3xl border border-slate-800/80 bg-slate-900/95 p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-slate-100">Last response</p>
                <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Compose pane</span>
              </div>
              <div className="grid gap-3 text-sm text-slate-300">
                <div className="grid gap-2 sm:grid-cols-[auto,1fr]">
                  <span className="text-slate-400">Status</span>
                  <span className="text-slate-200">{lastResponseStatus != null ? `${lastResponseStatus} ${lastResponseStatusText ?? ""}` : "No response yet."}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-[auto,1fr]">
                  <span className="text-slate-400">Body</span>
                  <pre className="overflow-x-auto rounded-3xl bg-slate-950/80 p-4 text-xs text-slate-200">{lastResponseText ?? "Send a checkhook to view the response here."}</pre>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
