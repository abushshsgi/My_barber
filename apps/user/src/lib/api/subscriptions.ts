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
  badge: "basic" | "plus" | "pro";
  sort_order: number;
  highlight: boolean;
  features: Array<{ key: string; label_uz: string; included?: boolean }>;
};

export type SubscriptionUsage = {
  period_start: string;
  period_end: string;
  morph_ai_used: number;
  morph_ai_limit: number;
  morph_ai_remaining: number;
  morph_studio_used: number;
  morph_studio_limit: number;
  morph_studio_remaining: number;
  morph_chat_tokens_used?: number;
  morph_chat_tokens_limit?: number;
  morph_chat_tokens_remaining?: number;
  is_free_tier?: boolean;
  locked?: boolean;
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
  entitlements: Record<string, unknown>;
  deactivated_at: string | null;
  deactivated_reason: string;
  created_at: string;
};

export type SubscriptionMe = {
  has_active: boolean;
  subscription: UserSubscription | null;
  entitlements: Record<string, unknown>;
  usage: SubscriptionUsage;
  badge: string | null;
  morph_care: boolean;
  family_members_max: number | null;
  family_unlimited: boolean;
  days_remaining?: number | null;
  access?: {
    morph_ai_allowed: boolean;
    morph_chat_allowed?: boolean;
    reason: string | null;
    message: string | null;
    referral_credits?: number;
    referral_generation_enabled?: boolean;
  };
  referral_credits?: number;
  referral_generation_enabled?: boolean;
  welcome_offer?: {
    eligible: boolean;
    discount_pct: number;
    plans: string[];
    ends_at: string;
    seconds_left: number;
    label_uz: string;
    hint_uz: string;
  } | null;
  upgrade?: {
    plan_code: "plus" | "pro";
    label_uz: string;
  } | null;
};

export type SubscriptionPromo = {
  code: string;
  label_uz: string;
  urgency_uz?: string;
  discount_pct: number;
  ends_at?: string | null;
  seconds_left?: number | null;
};

export type SubscriptionPromoPreview = {
  ok: boolean;
  plan_code: string;
  base_uzs: number;
  amount_uzs: number;
  discount_uzs: number;
  discount_pct: number;
  promo_code: string | null;
  promo_label: string | null;
  ends_at?: string | null;
  seconds_left?: number | null;
  urgency_uz?: string | null;
  detail?: string;
};

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const data = await apiJson<{ plans: SubscriptionPlan[]; promos?: SubscriptionPromo[] }>(
    "/api/v1/subscriptions/plans/",
  );
  return data.plans ?? [];
}

export async function fetchSubscriptionPromos(): Promise<SubscriptionPromo[]> {
  const data = await apiJson<{ plans: SubscriptionPlan[]; promos?: SubscriptionPromo[] }>(
    "/api/v1/subscriptions/plans/",
  );
  return data.promos ?? [];
}

export async function previewSubscriptionPromo(payload: {
  plan_code: string;
  promo_code?: string;
}): Promise<SubscriptionPromoPreview> {
  return apiJson("/api/v1/subscriptions/promo-preview/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchSubscriptionMe(): Promise<SubscriptionMe> {
  return apiJson<SubscriptionMe>("/api/v1/subscriptions/me/");
}

export async function checkoutSubscription(payload: {
  plan_code: string;
  method: "wallet" | "click" | "payme";
  return_url?: string;
  promo_code?: string;
}): Promise<{
  ok?: boolean;
  method?: string;
  subscription?: UserSubscription;
  me?: SubscriptionMe;
  checkout_url?: string | null;
  order_id?: string;
  transaction_id?: string;
  configured?: boolean;
  message?: string;
  amount_uzs?: number;
  base_uzs?: number;
  discount_uzs?: number;
  promo_code?: string | null;
  plan_code?: string;
  detail?: string;
}> {
  return apiJson("/api/v1/subscriptions/checkout/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function confirmSubscriptionPayment(payload: {
  provider: "click" | "payme";
  order_id: string;
  transaction_id?: string;
}): Promise<{ ok: boolean; subscription: UserSubscription; me: SubscriptionMe }> {
  return apiJson("/api/v1/subscriptions/confirm/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchCareAccess(): Promise<{ allowed: boolean; detail: string | null }> {
  return apiJson("/api/v1/subscriptions/care-access/");
}
