import i18n from "../i18n/config";
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
  morph_chat_tokens_monthly?: number;
  family_members_max: number | null;
  family_unlimited: boolean;
  morph_care: boolean;
  morph_care_pro?: boolean;
  badge: "free" | "basic" | "plus" | "pro";
  purchasable?: boolean;
  morph_voice?: boolean;
  sort_order: number;
  highlight: boolean;
  features: Array<{
    key: string;
    label_uz: string;
    label_ru?: string;
    label_en?: string;
    included?: boolean;
  }>;
};

export type SubscriptionUsage = {
  morph_ai_used: number;
  morph_ai_limit: number;
  morph_ai_remaining: number;
  morph_studio_used: number;
  morph_studio_limit: number;
  morph_studio_remaining: number;
  referral_credits?: number;
  morph_chat_tokens_used?: number;
  morph_chat_tokens_limit?: number;
  morph_chat_tokens_remaining?: number;
  morph_chat_tokens_period?: "lifetime" | "month";
  free_tryon_remaining?: number;
};

/** Yangi user — bir martalik bepul try-on holati. */
export type FreeTryOnState = {
  eligible: boolean;
  available: boolean;
  used: boolean;
  used_at: string | null;
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
  expires_at?: string | null;
  cancelled_at?: string | null;
  days_remaining?: number | null;
  price_uzs: number;
  auto_renew: boolean;
  is_premium?: boolean;
  can_cancel?: boolean;
  payment_provider?: string;
  payment_id?: string;
};

export type SubscriptionMe = {
  has_active: boolean;
  is_premium?: boolean;
  status?: string;
  auto_renew?: boolean;
  expires_at?: string | null;
  cancelled_at?: string | null;
  can_cancel?: boolean;
  subscription: UserSubscription | null;
  last_subscription?: UserSubscription | null;
  current_plan_code?: string;
  current_plan?: SubscriptionPlan | null;
  usage: SubscriptionUsage;
  badge: string | null;
  morph_care: boolean;
  morph_care_pro?: boolean;
  days_remaining?: number | null;
  referral_credits?: number;
  referral_generation_enabled?: boolean;
  free_tryon?: FreeTryOnState;
  access?: {
    morph_ai_allowed: boolean;
    morph_chat_allowed?: boolean;
    morph_voice_allowed?: boolean;
    reason: string | null;
    message: string | null;
    referral_credits?: number;
    referral_generation_enabled?: boolean;
    free_tryon_available?: boolean;
  };
  welcome_offer?: {
    eligible: boolean;
    discount_pct: number;
    plans: string[];
    label_uz: string;
    label_ru?: string;
    label_en?: string;
  } | null;
  upgrade?: {
    plan_code: "plus" | "pro";
    label_uz: string;
    label_ru?: string;
    label_en?: string;
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

export async function cancelSubscription(): Promise<{
  ok: boolean;
  status: string;
  is_premium: boolean;
  expires_at: string | null;
  cancelled_at: string | null;
  can_cancel: boolean;
  message: string;
  me?: SubscriptionMe;
  detail?: string;
}> {
  return apiJson("/api/v1/subscriptions/cancel/", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function checkoutSubscription(payload: {
  plan_code: string;
  method: "payme";
  return_url?: string;
  promo_code?: string;
}): Promise<{
  ok?: boolean;
  me?: SubscriptionMe;
  subscription?: UserSubscription;
  detail?: string;
  message?: string;
  amount_uzs?: number;
  amount_tiyin?: number;
  checkout_url?: string | null;
  order_id?: string;
  status?: string;
}> {
  return apiJson("/api/v1/subscriptions/checkout/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type SubscriptionPaymentStatus = {
  ok: boolean;
  status: string;
  order_id: string;
  checkout_url?: string | null;
  payme_receipt_id?: string | null;
  message?: string;
  sync_error?: string;
  amount_uzs?: number;
};

export async function fetchSubscriptionPaymentStatus(
  orderId: string,
): Promise<SubscriptionPaymentStatus> {
  const id = encodeURIComponent(orderId);
  return apiJson(`/api/v1/subscriptions/payments/${id}/`);
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

/** Starter → plus, Plus → pro. Pro da keyingi tarif yo'q. */
export function nextUpgradeCode(code: string | null | undefined): "plus" | "pro" | null {
  const c = (code || "").toLowerCase();
  if (c === "starter") return "plus";
  if (c === "plus") return "pro";
  return null;
}

export function upgradeCtaLabel(code: string | null | undefined, hasActive: boolean): string {
  if (!hasActive) return i18n.t("profile.purchase");
  const next = nextUpgradeCode(code);
  if (next) return i18n.t("profile.upgradeTo", { plan: next === "plus" ? "Plus" : "Pro" });
  return i18n.t("profile.manage");
}

function moneyLocale(): string {
  const lang = (i18n.resolvedLanguage || i18n.language || "uz").slice(0, 2);
  if (lang === "en") return "en-US";
  if (lang === "ru") return "ru-RU";
  return "uz-UZ";
}

export function formatUzs(n: number): string {
  return `${Math.round(n).toLocaleString(moneyLocale())} ${i18n.t("morph.paywall.currencyShort")}`;
}

export function formatSubDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(moneyLocale(), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
