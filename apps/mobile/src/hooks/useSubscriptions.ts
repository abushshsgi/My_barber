import { useCallback, useEffect, useRef, useState } from "react";
import i18n from "../i18n/config";
import { createPaymeReceipt } from "../lib/payme-checkout";
import {
  clearPaymeOrder,
  notifyPaymeActivated,
  onPaymeActivated,
  rememberPaymeOrder,
  stopPaymeWatch,
  watchPaymeOrder,
} from "../lib/payme-session";
import {
  cancelSubscription,
  fetchSubscriptionMe,
  fetchSubscriptionPaymentStatus,
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
    morph_care_pro: false,
    badge: "basic",
    sort_order: 1,
    highlight: false,
    features: [
      {
        key: "morph_ai",
        label_uz: "Morf AI try-on — oyiga 5 marta",
        label_ru: "Morf AI try-on — 5 раз в месяц",
        label_en: "Morf AI try-on — 5 times / month",
      },
      {
        key: "chat",
        label_uz: "Morf AI chat — 50 000 token / oy",
        label_ru: "Morf AI чат — 50 000 токенов / мес",
        label_en: "Morf AI chat — 50,000 tokens / month",
      },
      {
        key: "studio",
        label_uz: "Morf AI Studio — yo'q",
        label_ru: "Morf AI Studio — нет",
        label_en: "Morf AI Studio — not included",
        included: false,
      },
      {
        key: "care",
        label_uz: "Parvarish, Tarkib, ob-havo — yo'q",
        label_ru: "Уход, состав, погода — нет",
        label_en: "Care, scan, weather — not included",
        included: false,
      },
      {
        key: "sos",
        label_uz: "SOS va Javon — yo'q",
        label_ru: "SOS и полка — нет",
        label_en: "SOS and Shelf — not included",
        included: false,
      },
    ],
  },
  {
    code: "plus",
    name_uz: "Plus",
    name_ru: "Plus",
    name_en: "Plus",
    price_uzs: 29990,
    period_days: 30,
    morph_ai_monthly: 20,
    morph_studio_monthly: 30,
    morph_chat_tokens_monthly: 150000,
    family_members_max: 2,
    family_unlimited: false,
    morph_care: true,
    morph_care_pro: false,
    badge: "plus",
    sort_order: 2,
    highlight: true,
    features: [
      {
        key: "morph_ai",
        label_uz: "Morf AI try-on — oyiga 20 marta",
        label_ru: "Morf AI try-on — 20 раз в месяц",
        label_en: "Morf AI try-on — 20 times / month",
      },
      {
        key: "chat",
        label_uz: "Morf AI chat — 150 000 token / oy",
        label_ru: "Morf AI чат — 150 000 токенов / мес",
        label_en: "Morf AI chat — 150,000 tokens / month",
      },
      {
        key: "studio",
        label_uz: "Morf AI Studio — sochni AI tahriri (30 marta)",
        label_ru: "Morf AI Studio — ИИ-редактор (30 раз)",
        label_en: "Morf AI Studio — AI edits (30 times)",
      },
      {
        key: "care",
        label_uz: "Shaxsiy parvarish rejasi",
        label_ru: "Личный план ухода",
        label_en: "Personal care plan",
      },
      {
        key: "scan",
        label_uz: "Tarkib skani — mahsulot sizga mosmi",
        label_ru: "Скан состава — подходит ли продукт",
        label_en: "Ingredient scan — does it fit you",
      },
      {
        key: "weather",
        label_uz: "Ob-havo bo'yicha soch himoyasi",
        label_ru: "Защита волос по погоде",
        label_en: "Weather-based hair protection",
      },
      {
        key: "growth",
        label_uz: "Soch o'sish prognozi",
        label_ru: "Прогноз роста волос",
        label_en: "Hair growth forecast",
      },
      {
        key: "sos",
        label_uz: "SOS — faqat Pro",
        label_ru: "SOS — только Pro",
        label_en: "SOS — Pro only",
        included: false,
      },
      {
        key: "shelf",
        label_uz: "Javon — faqat Pro",
        label_ru: "Полка — только Pro",
        label_en: "Shelf — Pro only",
        included: false,
      },
    ],
  },
  {
    code: "pro",
    name_uz: "Pro",
    name_ru: "Pro",
    name_en: "Pro",
    price_uzs: 69990,
    period_days: 30,
    morph_ai_monthly: 100,
    morph_studio_monthly: 150,
    morph_chat_tokens_monthly: 500000,
    family_members_max: null,
    family_unlimited: true,
    morph_care: true,
    morph_care_pro: true,
    badge: "pro",
    sort_order: 3,
    highlight: false,
    features: [
      {
        key: "morph_ai",
        label_uz: "Morf AI try-on — oyiga 100 marta",
        label_ru: "Morf AI try-on — 100 раз в месяц",
        label_en: "Morf AI try-on — 100 times / month",
      },
      {
        key: "chat",
        label_uz: "Morf AI chat — 500 000 token / oy",
        label_ru: "Morf AI чат — 500 000 токенов / мес",
        label_en: "Morf AI chat — 500,000 tokens / month",
      },
      {
        key: "studio",
        label_uz: "Morf AI Studio — 150 ta tahrir",
        label_ru: "Morf AI Studio — 150 правок",
        label_en: "Morf AI Studio — 150 edits",
      },
      {
        key: "care",
        label_uz: "Shaxsiy parvarish rejasi",
        label_ru: "Личный план ухода",
        label_en: "Personal care plan",
      },
      {
        key: "scan",
        label_uz: "Tarkib skani — mahsulot sizga mosmi",
        label_ru: "Скан состава — подходит ли продукт",
        label_en: "Ingredient scan — does it fit you",
      },
      {
        key: "weather",
        label_uz: "Ob-havo bo'yicha soch himoyasi",
        label_ru: "Защита волос по погоде",
        label_en: "Weather-based hair protection",
      },
      {
        key: "growth",
        label_uz: "Soch o'sish prognozi",
        label_ru: "Прогноз роста волос",
        label_en: "Hair growth forecast",
      },
      {
        key: "sos",
        label_uz: "SOS — 60 soniyada yomon kun yechimi",
        label_ru: "SOS — решение за 60 секунд",
        label_en: "SOS — 60-second bad-hair fix",
      },
      {
        key: "shelf",
        label_uz: "Javon — mahsulot tugashini kuzatish",
        label_ru: "Полка — когда закончится средство",
        label_en: "Shelf — refill tracker",
      },
    ],
  },
];

type SubSnapshot = { plans: SubscriptionPlan[]; me: SubscriptionMe | null };

let shared: SubSnapshot | null = null;
let sharedAt = 0;
let inflight: Promise<SubSnapshot> | null = null;
const CACHE_MS = 4_000;

export function clearSubscriptionSnapshot() {
  shared = null;
  sharedAt = 0;
}

function fingerprintMe(me: SubscriptionMe | null): string {
  if (!me) return "";
  return JSON.stringify({
    has_active: me.has_active,
    is_premium: me.is_premium,
    status: me.status,
    cancelled_at: me.cancelled_at,
    can_cancel: me.can_cancel,
    plan: me.subscription?.plan_code,
    usage: me.usage,
    credits: me.referral_credits,
    access: me.access,
    welcome: me.welcome_offer,
    free: me.free_tryon,
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
        // Offline — oxirgi ma'lum holat saqlanadi (limit/obuna UI yo'qolmasin).
        me = shared?.me ?? null;
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

  useEffect(
    () =>
      onPaymeActivated(() => {
        clearSubscriptionSnapshot();
        refresh();
      }),
    [refresh],
  );

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
          setError(err instanceof Error ? err.message : i18n.t("profile.plansLoadFail"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick]);

  const [paymeCheckout, setPaymeCheckout] = useState<{
    checkoutUrl: string;
    orderId: string;
  } | null>(null);

  const startPayme = useCallback(async (planCode: string) => {
    setBusyCode(planCode);
    try {
      const session = await createPaymeReceipt(planCode);
      await rememberPaymeOrder(session.orderId);
      setPaymeCheckout(session);
      return { ok: true as const, message: "" };
    } catch (err) {
      const raw = err instanceof Error ? err.message : i18n.t("profile.paymeFail");
      const message = /401|credentials|Authentication/i.test(raw)
        ? i18n.t("profile.paymeLogin")
        : raw;
      return { ok: false as const, message };
    } finally {
      setBusyCode(null);
    }
  }, []);

  const closePayme = useCallback(() => {
    setPaymeCheckout((current) => {
      if (current?.orderId) watchPaymeOrder(current.orderId);
      return null;
    });
  }, []);

  const onPaymePaid = useCallback(async () => {
    setPaymeCheckout(null);
    stopPaymeWatch();
    await clearPaymeOrder();
    notifyPaymeActivated();
    await refresh();
  }, [refresh]);

  /** Payme «Вернуться в приложение» — webview yopiladi, ilova qoladi. */
  const returnFromPayme = useCallback(async () => {
    const current = paymeCheckout;
    setPaymeCheckout(null);
    if (!current?.orderId) return "closed" as const;
    try {
      const row = await fetchSubscriptionPaymentStatus(current.orderId);
      if (row.status === "paid") {
        stopPaymeWatch();
        await clearPaymeOrder();
        notifyPaymeActivated();
        await refresh();
        return "paid" as const;
      }
      if (row.status && row.status !== "pending") {
        stopPaymeWatch();
        await clearPaymeOrder();
        return "closed" as const;
      }
    } catch {
      /* kuzatuv davom etadi */
    }
    watchPaymeOrder(current.orderId);
    return "pending" as const;
  }, [paymeCheckout, refresh]);

  const cancelCurrent = useCallback(async () => {
    const res = await cancelSubscription();
    if (res.me) {
      shared = { plans: shared?.plans ?? FALLBACK_PLANS, me: res.me };
      sharedAt = Date.now();
    }
    await refresh();
    return res;
  }, [refresh]);

  return {
    plans,
    me,
    loading,
    error,
    busyCode,
    refresh,
    startPayme,
    paymeCheckout,
    closePayme,
    onPaymePaid,
    returnFromPayme,
    cancelCurrent,
    activeCode: me?.has_active ? me.subscription?.plan_code ?? null : null,
  };
}
