import { useCallback, useEffect, useRef, useState } from "react";
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
      {
        key: "morph_ai",
        label_uz: "Morph AI try-on — oyiga 5 marta",
        label_ru: "Morph AI try-on — 5 раз в месяц",
      },
      {
        key: "chat",
        label_uz: "Morf AI chat — 50 000 token / oy",
        label_ru: "Morf AI чат — 50 000 токенов / мес",
      },
      {
        key: "studio",
        label_uz: "Morph AI Studio — yo'q",
        label_ru: "Morph AI Studio — нет",
        included: false,
      },
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
      {
        key: "morph_ai",
        label_uz: "Morph AI try-on — oyiga 20 marta",
        label_ru: "Morph AI try-on — 20 раз в месяц",
      },
      {
        key: "chat",
        label_uz: "Morf AI chat — 150 000 token / oy",
        label_ru: "Morf AI чат — 150 000 токенов / мес",
      },
      {
        key: "studio",
        label_uz: "Morph AI Studio — 30 marta",
        label_ru: "Morph AI Studio — 30 раз",
      },
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
      {
        key: "morph_ai",
        label_uz: "Morph AI try-on — oyiga 100 marta",
        label_ru: "Morph AI try-on — 100 раз в месяц",
      },
      {
        key: "chat",
        label_uz: "Morf AI chat — 500 000 token / oy",
        label_ru: "Morf AI чат — 500 000 токенов / мес",
      },
      {
        key: "studio",
        label_uz: "Morph AI Studio — 150 marta",
        label_ru: "Morph AI Studio — 150 раз",
      },
      { key: "care", label_uz: "Morph AI Parvarish", label_ru: "Morph AI Уход" },
    ],
  },
];

type SubSnapshot = { plans: SubscriptionPlan[]; me: SubscriptionMe | null };

let shared: SubSnapshot | null = null;
let sharedAt = 0;
let inflight: Promise<SubSnapshot> | null = null;
const CACHE_MS = 12_000;

function fingerprintMe(me: SubscriptionMe | null): string {
  if (!me) return "";
  return JSON.stringify({
    has_active: me.has_active,
    plan: me.subscription?.plan_code,
    usage: me.usage,
    credits: me.referral_credits,
    access: me.access,
    welcome: me.welcome_offer,
  });
}

function fingerprintPlans(plans: SubscriptionPlan[]): string {
  return plans.map((p) => `${p.code}:${p.price_uzs}:${p.sort_order}`).join("|");
}

async function loadSnapshot(force: boolean): Promise<SubSnapshot> {
  if (!force && shared && Date.now() - sharedAt < CACHE_MS) {
    return shared;
  }
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const catalog = await fetchSubscriptionPlans();
      const list = [...(catalog.plans ?? [])].sort((a, b) => a.sort_order - b.sort_order);
      const plans = list.length > 0 ? list : FALLBACK_PLANS;
      let me: SubscriptionMe | null = null;
      try {
        me = await fetchSubscriptionMe();
      } catch {
        me = null;
      }
      shared = { plans, me };
      sharedAt = Date.now();
      return shared;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function useSubscriptions() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(shared?.plans ?? FALLBACK_PLANS);
  const [me, setMe] = useState<SubscriptionMe | null>(shared?.me ?? null);
  const [loading, setLoading] = useState(!shared);
  const [error, setError] = useState<string | null>(null);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const plansFp = useRef(fingerprintPlans(shared?.plans ?? FALLBACK_PLANS));
  const meFp = useRef(fingerprintMe(shared?.me ?? null));

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const force = tick > 0;

    (async () => {
      if (!shared || force) setLoading(true);
      setError(null);
      try {
        const snap = await loadSnapshot(force);
        if (cancelled) return;
        const nextPlansFp = fingerprintPlans(snap.plans);
        if (nextPlansFp !== plansFp.current) {
          plansFp.current = nextPlansFp;
          setPlans(snap.plans);
        }
        const nextMeFp = fingerprintMe(snap.me);
        if (nextMeFp !== meFp.current) {
          meFp.current = nextMeFp;
          setMe(snap.me);
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
        if (res.me) {
          shared = { plans: shared?.plans ?? FALLBACK_PLANS, me: res.me };
          sharedAt = Date.now();
          meFp.current = fingerprintMe(res.me);
          setMe(res.me);
        } else await refresh();
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
