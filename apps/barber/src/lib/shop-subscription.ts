/** Sartarosh SaaS obuna — API + entitlements. */

import { apiFetch, formatApiError } from "@/lib/api";

export type ShopPlanCode = "start" | "business" | "pro";

export type ShopPlanFeature = {
  key: string;
  label_uz: string;
  included?: boolean;
};

export type ShopEntitlements = {
  panel_access?: boolean;
  active?: boolean;
  plan_code?: ShopPlanCode | null;
  bookings?: boolean;
  calendar?: boolean;
  clients?: boolean;
  chat?: boolean;
  reviews?: boolean;
  portfolio?: boolean;
  earnings?: boolean;
  qr_pay?: boolean;
  withdrawals?: boolean;
  invites_monthly?: number | null;
  expenses?: boolean;
  inventory?: boolean;
  stats_basic?: boolean;
  stats_graphs?: boolean;
  goals?: boolean;
  marketing?: boolean;
  marketing_boost_week_included?: number;
  marketing_boost_month_included?: number;
  team_seats?: number | null;
  salon_gallery?: boolean;
  salon_amenities?: boolean;
  priority_support?: boolean;
  featured_listing?: boolean;
  badge?: string;
  ends_at?: string | null;
  subscription_id?: string;
};

export type ShopPlan = {
  code: ShopPlanCode;
  name_uz: string;
  tagline_uz?: string;
  price_uzs: number;
  period_days: number;
  badge: string;
  sort_order: number;
  highlight: boolean;
  popular_label_uz?: string;
  entitlements: ShopEntitlements;
  features: ShopPlanFeature[];
  invites_unlimited?: boolean;
  team_unlimited?: boolean;
};

export type ShopSubscription = {
  id: string;
  plan_code: ShopPlanCode;
  plan_name: string;
  status: string;
  source: string;
  starts_at: string | null;
  ends_at: string | null;
  price_uzs: number;
  is_active: boolean;
  entitlements: ShopEntitlements;
  badge: string;
};

export type ShopSubscriptionMe = {
  has_subscription: boolean;
  subscription: ShopSubscription | null;
  entitlements: ShopEntitlements;
  required: boolean;
  subscribe_path: string;
};

export type ShopCheckoutResult = {
  ok: boolean;
  method?: string;
  provider?: string;
  order_id?: string;
  checkout_url?: string | null;
  amount_uzs?: number;
  plan_code?: string;
  configured?: boolean;
  message?: string;
  debug_confirm_allowed?: boolean;
  subscription?: ShopSubscription;
  me?: ShopSubscriptionMe;
  detail?: string;
};

async function readJson(res: Response) {
  return res.json().catch(() => null);
}

export async function fetchShopPlans(): Promise<{
  plans: ShopPlan[];
  providers: Array<{ id: string; label: string; configured: boolean }>;
}> {
  const res = await apiFetch("/api/v1/barber/subscription/plans/");
  const body = await readJson(res);
  if (!res.ok) throw new Error(formatApiError(body, "Tariflar yuklanmadi"));
  return body as { plans: ShopPlan[]; providers: Array<{ id: string; label: string; configured: boolean }> };
}

export async function fetchShopSubscriptionMe(): Promise<ShopSubscriptionMe> {
  const res = await apiFetch("/api/v1/barber/subscription/me/");
  const body = await readJson(res);
  if (!res.ok) throw new Error(formatApiError(body, "Obuna holati yuklanmadi"));
  return body as ShopSubscriptionMe;
}

export async function checkoutShopSubscription(input: {
  plan_code: ShopPlanCode;
  method: "wallet" | "click" | "payme";
  return_url?: string;
  idempotency_key?: string;
}): Promise<ShopCheckoutResult> {
  const res = await apiFetch("/api/v1/barber/subscription/checkout/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = (await readJson(res)) as ShopCheckoutResult | null;
  if (!res.ok) {
    const err = new Error(formatApiError(body, "To'lovni boshlab bo'lmadi")) as Error & {
      status?: number;
      body?: ShopCheckoutResult | null;
    };
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body as ShopCheckoutResult;
}

export async function confirmShopSubscription(input: {
  order_id: string;
  provider: string;
}): Promise<ShopCheckoutResult> {
  const res = await apiFetch("/api/v1/barber/subscription/confirm/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = (await readJson(res)) as ShopCheckoutResult | null;
  if (!res.ok) throw new Error(formatApiError(body, "To'lovni tasdiqlab bo'lmadi"));
  return body as ShopCheckoutResult;
}

/** Sahifa → kerakli entitlement kaliti */
export const PAGE_FEATURE_MAP: Record<string, keyof ShopEntitlements | "panel"> = {
  "/barber": "panel",
  "/barber/calendar": "calendar",
  "/barber/bookings": "bookings",
  "/barber/clients": "clients",
  "/barber/invites": "panel",
  "/barber/chat": "chat",
  "/barber/reviews": "reviews",
  "/barber/portfolio": "portfolio",
  "/barber/earnings": "earnings",
  "/barber/expenses": "expenses",
  "/barber/inventory": "inventory",
  "/barber/stats": "stats_basic",
  "/barber/stats/graphs": "stats_graphs",
  "/barber/marketing": "marketing",
  "/barber/goals": "goals",
  "/barber/qr-pay": "qr_pay",
  "/barber/withdrawals": "withdrawals",
  "/barber/salon-view": "panel",
  "/barber/amenities": "salon_amenities",
};

export function pathNeedsSubscription(pathname: string): boolean {
  if (pathname.startsWith("/barber/subscription")) return false;
  if (pathname.startsWith("/barber/activation")) return false;
  if (pathname === "/barber/services" || pathname.startsWith("/barber/services/")) return false;
  if (pathname === "/barber/schedule" || pathname.startsWith("/barber/schedule/")) return false;
  if (pathname === "/barber/profile" || pathname.startsWith("/barber/profile/")) return false;
  if (pathname === "/barber/settings" || pathname.startsWith("/barber/settings/")) return false;
  if (pathname === "/barber/help" || pathname.startsWith("/barber/help/")) return false;
  if (pathname === "/barber/notifications" || pathname.startsWith("/barber/notifications/")) return false;
  if (pathname.startsWith("/barber/verify-email")) return false;
  return pathname.startsWith("/barber");
}

export function featureAllowed(
  ents: ShopEntitlements | null | undefined,
  feature: keyof ShopEntitlements | "panel",
): boolean {
  if (!ents?.active || !ents.panel_access) return false;
  if (feature === "panel") return true;
  const val = ents[feature];
  if (val === undefined) return true;
  return Boolean(val);
}

export function pathFeatureAllowed(
  pathname: string,
  ents: ShopEntitlements | null | undefined,
): boolean {
  if (!pathNeedsSubscription(pathname)) return true;
  if (!ents?.active) return false;
  // Exact then prefix match
  const exact = PAGE_FEATURE_MAP[pathname];
  if (exact) return featureAllowed(ents, exact);
  for (const [path, feat] of Object.entries(PAGE_FEATURE_MAP)) {
    if (pathname === path || pathname.startsWith(path + "/")) {
      return featureAllowed(ents, feat);
    }
  }
  return Boolean(ents.panel_access);
}

export function formatShopPrice(n: number) {
  return `${n.toLocaleString("uz-UZ")} so'm`;
}

export function newCheckoutIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
