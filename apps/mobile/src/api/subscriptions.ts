import { apiJson } from "./client";

export type SubscriptionPlan = {
  code: string;
  name_uz: string;
  name_ru: string;
  name_en: string;
  price_uzs: number;
  period_days: number;
  morph_ai_monthly: number;
  morph_studio_monthly: number;
  family_members_max: number | null;
  family_unlimited: boolean;
  morph_care: boolean;
  badge: "basic" | "plus" | "pro";
  sort_order: number;
  highlight: boolean;
  features: Array<{ key: string; label_uz: string; included?: boolean }>;
};

export type SubscriptionUsage = {
  morph_ai_used: number;
  morph_ai_limit: number;
  morph_ai_remaining: number;
  morph_studio_used: number;
  morph_studio_limit: number;
  morph_studio_remaining: number;
};

export type UserSubscription = {
  id: string;
  plan_code: string;
  plan: SubscriptionPlan | null;
  status: string;
  source: string;
  is_trial?: boolean;
  starts_at: string | null;
  ends_at: string | null;
  days_remaining?: number | null;
  price_uzs: number;
  auto_renew: boolean;
};

export type SubscriptionMe = {
  has_active: boolean;
  subscription: UserSubscription | null;
  usage: SubscriptionUsage;
  badge: string | null;
  morph_care: boolean;
  days_remaining?: number | null;
  access?: {
    morph_ai_allowed: boolean;
    reason: string | null;
    message: string | null;
  };
  welcome_offer?: {
    eligible: boolean;
    discount_pct: number;
    plans: string[];
    label_uz: string;
  } | null;
  upgrade?: {
    plan_code: "plus" | "pro";
    label_uz: string;
  } | null;
};

export type PlansResponse = {
  plans: SubscriptionPlan[];
  promos?: Array<{ code: string; label_uz: string; discount_pct: number }>;
};

export async function fetchSubscriptionPlans(): Promise<PlansResponse> {
  return apiJson<PlansResponse>("/api/v1/subscriptions/plans/");
}

export async function fetchSubscriptionMe(): Promise<SubscriptionMe> {
  return apiJson<SubscriptionMe>("/api/v1/subscriptions/me/");
}

export async function checkoutSubscription(payload: {
  plan_code: string;
  method: "wallet" | "click" | "payme";
  promo_code?: string;
}): Promise<{
  ok?: boolean;
  me?: SubscriptionMe;
  subscription?: UserSubscription;
  detail?: string;
  message?: string;
  amount_uzs?: number;
}> {
  return apiJson("/api/v1/subscriptions/checkout/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

const PLAN_RANK: Record<string, number> = {
  starter: 1,
  plus: 2,
  pro: 3,
};

export function isPlanUpgrade(planCode: string, activeCode: string | null | undefined): boolean {
  if (!activeCode) return true;
  return (PLAN_RANK[planCode] ?? 0) > (PLAN_RANK[activeCode] ?? 0);
}

export function upgradeCtaLabel(code: string | null | undefined, hasActive: boolean): string {
  if (!hasActive) return "Hamyondan to'lash";
  const c = (code || "").toLowerCase();
  if (c === "starter") return "Plus ga upgrade";
  if (c === "plus") return "Pro ga upgrade";
  return "Joriy obuna";
}

export function formatUzs(n: number): string {
  return `${Math.round(n).toLocaleString("uz-UZ")} so'm`;
}

export function formatSubDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
