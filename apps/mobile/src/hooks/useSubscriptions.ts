import { useCallback, useEffect, useState } from "react";
import {
  checkoutSubscription,
  fetchSubscriptionMe,
  fetchSubscriptionPlans,
  type SubscriptionMe,
  type SubscriptionPlan,
} from "../api/subscriptions";

/** Railway deploy kutganda ham UI bo'sh qolmasin. */
const FALLBACK_PLANS: SubscriptionPlan[] = [
  {
    code: "starter",
    name_uz: "Starter",
    name_ru: "Starter",
    name_en: "Starter",
    price_uzs: 9990,
    period_days: 30,
    morph_ai_monthly: 5,
    morph_studio_monthly: 0,
    morph_chat_tokens_monthly: 50000,
    family_members_max: 0,
    family_unlimited: false,
    morph_care: false,
    badge: "basic",
    sort_order: 1,
    highlight: false,
    features: [
      { key: "morph_ai", label_uz: "Morph AI try-on — oyiga 5 marta" },
      { key: "chat", label_uz: "Morf AI chat — 50 000 token / oy" },
      { key: "studio", label_uz: "Morph AI Studio — yo'q", included: false },
    ],
  },
  {
    code: "plus",
    name_uz: "Plus",
    name_ru: "Plus",
    name_en: "Plus",
    price_uzs: 39990,
    period_days: 30,
    morph_ai_monthly: 20,
    morph_studio_monthly: 30,
    morph_chat_tokens_monthly: 150000,
    family_members_max: 2,
    family_unlimited: false,
    morph_care: false,
    badge: "plus",
    sort_order: 2,
    highlight: true,
    features: [
      { key: "morph_ai", label_uz: "Morph AI try-on — oyiga 20 marta" },
      { key: "chat", label_uz: "Morf AI chat — 150 000 token / oy" },
      { key: "studio", label_uz: "Morph AI Studio — 30 marta" },
    ],
  },
  {
    code: "pro",
    name_uz: "Pro",
    name_ru: "Pro",
    name_en: "Pro",
    price_uzs: 89990,
    period_days: 30,
    morph_ai_monthly: 100,
    morph_studio_monthly: 150,
    morph_chat_tokens_monthly: 500000,
    family_members_max: null,
    family_unlimited: true,
    morph_care: true,
    badge: "pro",
    sort_order: 3,
    highlight: false,
    features: [
      { key: "morph_ai", label_uz: "Morph AI try-on — oyiga 100 marta" },
      { key: "chat", label_uz: "Morf AI chat — 500 000 token / oy" },
      { key: "studio", label_uz: "Morph AI Studio — 150 marta" },
      { key: "care", label_uz: "Morph AI Parvarish" },
    ],
  },
];

export function useSubscriptions() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(FALLBACK_PLANS);
  const [me, setMe] = useState<SubscriptionMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const catalog = await fetchSubscriptionPlans();
        if (cancelled) return;
        const list = [...(catalog.plans ?? [])].sort((a, b) => a.sort_order - b.sort_order);
        setPlans(list.length > 0 ? list : FALLBACK_PLANS);

        try {
          const subMe = await fetchSubscriptionMe();
          if (!cancelled) setMe(subMe);
        } catch {
          if (!cancelled) setMe(null);
        }
      } catch (err) {
        if (!cancelled) {
          setPlans(FALLBACK_PLANS);
          setError(err instanceof Error ? err.message : "Obunalar yuklanmadi");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick]);

  const subscribeWallet = useCallback(
    async (planCode: string) => {
      setBusyCode(planCode);
      try {
        const res = await checkoutSubscription({
          plan_code: planCode,
          method: "wallet",
        });
        if (res.me) setMe(res.me);
        else await refresh();
        return { ok: true as const, message: res.message || "Obuna faollashtirildi!" };
      } catch (err) {
        const raw = err instanceof Error ? err.message : "To'lov amalga oshmadi";
        const message = /401|credentials|Authentication/i.test(raw)
          ? "Obuna uchun avval tizimga kiring."
          : raw;
        return { ok: false as const, message };
      } finally {
        setBusyCode(null);
      }
    },
    [refresh],
  );

  return {
    plans,
    me,
    loading,
    error,
    busyCode,
    refresh,
    subscribeWallet,
    activeCode: me?.has_active ? me.subscription?.plan_code ?? null : null,
  };
}
