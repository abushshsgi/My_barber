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
  period_start: string;
  period_end: string;
  morph_ai_used: number;
  morph_ai_limit: number;
  morph_ai_remaining: number;
  morph_studio_used: number;
  morph_studio_limit: number;
  morph_studio_remaining: number;
  is_free_tier?: boolean;
};

export type UserSubscription = {
  id: string;
  plan_code: string;
  plan: SubscriptionPlan | null;
  status: string;
  source: string;
  starts_at: string | null;
  ends_at: string | null;
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
  referral_trial: {
    granted: boolean;
    ends_at: string | null;
    required_referrals: number;
    trial_days: number;
    trial_plan: string;
  };
};

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const data = await apiJson<{ plans: SubscriptionPlan[] }>("/api/v1/subscriptions/plans/");
  return data.plans ?? [];
}

export async function fetchSubscriptionMe(): Promise<SubscriptionMe> {
  return apiJson<SubscriptionMe>("/api/v1/subscriptions/me/");
}

export async function checkoutSubscription(payload: {
  plan_code: string;
  method: "wallet" | "click" | "payme";
  return_url?: string;
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
