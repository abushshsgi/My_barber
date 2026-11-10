import { API_BASE, getUserAccessToken } from "@/lib/api/client";
import { resolveFetchBase } from "@/lib/api/base-url";

const VISITOR_KEY = "mysaloon_visitor_id";
const SESSION_KEY = "mysaloon_session_id";
const FIRST_UTM = "mysaloon_utm_first";
const LAST_UTM = "mysaloon_utm_last";

export type AnalyticsEventName =
  | "page_view"
  | "session_start"
  | "registration_started"
  | "registration_completed"
  | "login_completed"
  | "premium_page_viewed"
  | "premium_offer_viewed"
  | "subscription_plan_selected"
  | "subscribe_clicked"
  | "payment_initiated"
  | "checkout_redirect_attempted"
  | "payme_return_viewed"
  | "ai_tryon_opened"
  | "ai_style_selected"
  | "ai_generation_requested"
  | "ai_generation_completed"
  | "ai_generation_failed"
  | "catalog_opened"
  | "shampoo_product_viewed"
  | "barcode_scan_started"
  | "barcode_scan_completed";

type Props = Record<string, string | number | boolean>;

type QueuedEvent = {
  event_id: string;
  name: AnalyticsEventName;
  version: 1;
  page: string;
  properties: Props;
  occurred_at: string;
};

const queue: QueuedEvent[] = [];
const seen = new Set<string>();
let timer: number | null = null;

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

function storageId(storage: Storage, key: string): string {
  const existing = storage.getItem(key);
  if (existing && existing.length >= 8) return existing;
  const next = randomId();
  storage.setItem(key, next);
  return next;
}

export function analyticsVisitorId(): string {
  if (typeof window === "undefined") return "";
  return storageId(window.localStorage, VISITOR_KEY);
}

export function analyticsSessionId(): string {
  if (typeof window === "undefined") return "";
  return storageId(window.sessionStorage, SESSION_KEY);
}

function readUtm(raw: string | null): Props {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const utm: Props = {};
    for (const key of ["source", "medium", "campaign", "content", "term"]) {
      const value = parsed[key];
      if (typeof value === "string" && value) utm[key] = value.slice(0, 120);
    }
    return utm;
  } catch {
    return {};
  }
}

export function captureUtm(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const utm = {
    source: params.get("utm_source") || "",
    medium: params.get("utm_medium") || "",
    campaign: params.get("utm_campaign") || "",
    content: params.get("utm_content") || "",
    term: params.get("utm_term") || "",
  };
  if (!Object.values(utm).some(Boolean)) return;
  try {
    if (!window.localStorage.getItem(FIRST_UTM)) {
      window.localStorage.setItem(FIRST_UTM, JSON.stringify(utm));
    }
    window.localStorage.setItem(LAST_UTM, JSON.stringify(utm));
  } catch {
    /* storage may be blocked */
  }
}

export function currentUtm(): Props {
  if (typeof window === "undefined") return {};
  captureUtm();
  const last = readUtm(window.localStorage.getItem(LAST_UTM));
  return Object.keys(last).length ? last : readUtm(window.localStorage.getItem(FIRST_UTM));
}

function cleanProps(properties: Props | undefined): Props {
  const cleaned: Props = {};
  if (!properties) return cleaned;
  for (const [key, value] of Object.entries(properties)) {
    if (/password|token|otp|secret|card|cvv|pan/i.test(key)) continue;
    if (typeof value === "string") cleaned[key.slice(0, 40)] = value.slice(0, 120);
    else if (typeof value === "number" || typeof value === "boolean") cleaned[key.slice(0, 40)] = value;
  }
  return cleaned;
}

export function trackEvent(
  name: AnalyticsEventName,
  properties?: Props,
  options?: { dedupeKey?: string },
): void {
  try {
    if (typeof window === "undefined") return;
    if (options?.dedupeKey) {
      const token = `${name}:${options.dedupeKey}`;
      if (seen.has(token)) return;
      seen.add(token);
    }
    queue.push({
      event_id: randomId(),
      name,
      version: 1,
      page: window.location.pathname.slice(0, 300),
      properties: cleanProps(properties),
      occurred_at: new Date().toISOString(),
    });
    if (queue.length >= 15) {
      void flushAnalytics();
      return;
    }
    if (timer != null) return;
    timer = window.setTimeout(() => {
      timer = null;
      void flushAnalytics();
    }, 1200);
  } catch {
    /* analytics must not affect the product */
  }
}

export async function flushAnalytics(): Promise<void> {
  if (typeof window === "undefined" || queue.length === 0) return;
  const events = queue.splice(0, 20);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const token = getUserAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(`${resolveFetchBase(API_BASE)}/api/v1/analytics/events/`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        visitor_id: analyticsVisitorId(),
        session_id: analyticsSessionId(),
        referrer: document.referrer || "",
        utm: currentUtm(),
        events,
      }),
      keepalive: true,
      credentials: "omit",
    });
    if (!res.ok && res.status >= 500 && queue.length < 40) queue.unshift(...events);
  } catch {
    if (queue.length < 40) queue.unshift(...events);
  }
}
