import type { MorphAiGeneration } from "./ai";
import { fetchMorphAiGenerations } from "./ai";
import { apiJson } from "./client";
import { fetchSubscriptionMe, type SubscriptionUsage } from "./subscriptions";
import {
  fetchFavoriteSalonIds,
  fetchMe,
  fetchWallet,
  type ApiUser,
  type ApiWallet,
} from "./user";

export type ProfileSubscription = {
  has_active: boolean;
  plan_code: string | null;
  plan_name: string | null;
  badge: string | null;
  days_remaining: number | null;
  morph_care: boolean;
  usage: SubscriptionUsage;
  access?: {
    morph_ai_allowed: boolean;
    reason: string | null;
    message: string | null;
  };
  upgrade?: { plan_code: string; label_uz: string } | null;
};

export type ProfileDashboard = {
  user: ApiUser;
  verified: boolean;
  wallet: ApiWallet | null;
  subscription: ProfileSubscription;
  morph: {
    photo_count: number;
    photo_limit: number;
    scan_count: number;
    history: MorphAiGeneration[];
  };
  mysaloon: {
    upcoming_bookings: number;
    history_bookings: number;
    favorites: number;
  };
};

const EMPTY_USAGE: SubscriptionUsage = {
  morph_ai_used: 0,
  morph_ai_limit: 0,
  morph_ai_remaining: 0,
  morph_studio_used: 0,
  morph_studio_limit: 0,
  morph_studio_remaining: 0,
};

export async function fetchProfileDashboard(): Promise<ProfileDashboard> {
  return apiJson<ProfileDashboard>("/api/v1/users/me/dashboard/");
}

/** Backend hali deploy bo‘lmagan bo‘lsa — mavjud endpointlardan yig‘adi. */
export async function fetchProfileDashboardFallback(): Promise<ProfileDashboard> {
  const [user, wallet, sub, history, favs] = await Promise.all([
    fetchMe(),
    fetchWallet().catch(() => null),
    fetchSubscriptionMe().catch(() => null),
    fetchMorphAiGenerations().catch(() => [] as MorphAiGeneration[]),
    fetchFavoriteSalonIds().catch(() => []),
  ]);
  const plan = sub?.subscription?.plan ?? null;
  return {
    user,
    verified: Boolean(user.phone) || Boolean(user.email_verified),
    wallet,
    subscription: {
      has_active: Boolean(sub?.has_active),
      plan_code: sub?.subscription?.plan_code ?? null,
      plan_name: plan?.name_uz ?? null,
      badge: sub?.badge ?? null,
      days_remaining: sub?.days_remaining ?? null,
      morph_care: Boolean(sub?.morph_care),
      usage: sub?.usage ?? EMPTY_USAGE,
      access: sub?.access,
      upgrade: sub?.upgrade ?? null,
    },
    morph: {
      photo_count: history.length,
      photo_limit: 60,
      scan_count: 0,
      history: history.slice(0, 8),
    },
    mysaloon: {
      upcoming_bookings: 0,
      history_bookings: 0,
      favorites: favs.length,
    },
  };
}

export function planLabel(sub: ProfileSubscription | null | undefined): string {
  if (!sub) return "Obuna yo‘q";
  if (sub.has_active && sub.plan_name) return sub.plan_name;
  if (sub.has_active && sub.plan_code) {
    const code = sub.plan_code.toLowerCase();
    if (code === "starter") return "Starter";
    if (code === "plus") return "Plus";
    if (code === "pro") return "Pro";
    return sub.plan_code;
  }
  return "Obuna yo‘q";
}
