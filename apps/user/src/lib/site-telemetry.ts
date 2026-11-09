import { API_BASE, getUserAccessToken } from "@/lib/api/client";
import { resolveFetchBase } from "@/lib/api/base-url";

const VISITOR_KEY = "mysaloon_visitor_id";
const SESSION_KEY = "mysaloon_session_id";

type SiteEvent = {
  kind: "page" | "click";
  path: string;
  label: string;
};

const queue: SiteEvent[] = [];
let timer: number | null = null;

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function storageId(storage: Storage, key: string): string {
  const existing = storage.getItem(key);
  if (existing && existing.length >= 8) return existing;
  const next = randomId();
  storage.setItem(key, next);
  return next;
}

function clip(value: string, limit: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

export function trackSiteEvent(kind: SiteEvent["kind"], path: string, label = ""): void {
  if (typeof window === "undefined") return;
  queue.push({
    kind,
    path: clip(path || window.location.pathname, 300),
    label: clip(label, 120),
  });
  if (queue.length >= 20) {
    void flushSiteTelemetry();
    return;
  }
  if (timer != null) return;
  timer = window.setTimeout(() => {
    timer = null;
    void flushSiteTelemetry();
  }, 2500);
}

export async function flushSiteTelemetry(): Promise<void> {
  if (typeof window === "undefined" || queue.length === 0) return;
  const events = queue.splice(0, 25);
  const payload = JSON.stringify({
    visitor_id: storageId(window.localStorage, VISITOR_KEY),
    session_id: storageId(window.sessionStorage, SESSION_KEY),
    referrer: document.referrer || "",
    events,
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const token = getUserAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const base = resolveFetchBase(API_BASE);
  try {
    const res = await fetch(`${base}/api/v1/telemetry/collect/`, {
      method: "POST",
      headers,
      body: payload,
      keepalive: true,
      credentials: "omit",
    });
    if (!res.ok && res.status >= 500 && queue.length < 40) {
      queue.unshift(...events);
    }
  } catch {
    if (queue.length < 40) queue.unshift(...events);
  }
}

export function installSiteTelemetry(): () => void {
  if (typeof window === "undefined") return () => {};

  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const el = target.closest("a,button,[role='button']");
    if (!(el instanceof HTMLElement)) return;
    if (el.closest("input,textarea,select")) return;
    const label =
      el.getAttribute("aria-label") ||
      el.innerText ||
      el.getAttribute("title") ||
      el.tagName;
    trackSiteEvent("click", window.location.pathname, label);
  };

  const onHide = () => {
    void flushSiteTelemetry();
  };

  document.addEventListener("click", onClick, true);
  window.addEventListener("pagehide", onHide);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") onHide();
  });

  return () => {
    document.removeEventListener("click", onClick, true);
    window.removeEventListener("pagehide", onHide);
  };
}
