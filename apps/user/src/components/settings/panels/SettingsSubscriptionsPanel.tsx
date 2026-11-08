import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck, X, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { markPaymeAwaitReturn, storePaymeOrder } from "@/components/subscriptions/PaymeCheckoutStatus";
import {
  useSubscriptionCancel,
  useSubscriptionCheckout,
  useSubscriptionMe,
  useSubscriptionPlans,
} from "@/hooks/use-subscription";
import { hasValidUserSession } from "@/lib/api/client";
import { type SubscriptionPlan } from "@/lib/api/subscriptions";
import { getPublicSiteOrigin } from "@/lib/public-origin";
import { pickFeatureLabel, pickPlanName } from "@/lib/plan-labels";
import { FALLBACK_SUBSCRIPTION_PLANS } from "@/lib/subscription-fallback-plans";
import { isPlanUpgrade, nextUpgradePlan } from "@/lib/subscription-upgrade";
import { cn } from "@/lib/utils";

function readFocusPlan(searchStr: string) {
  const sp = new URLSearchParams(searchStr.startsWith("?") ? searchStr.slice(1) : searchStr);
  const planRaw = (sp.get("plan") || "").toLowerCase();
  return planRaw === "starter" || planRaw === "plus" || planRaw === "pro" ? planRaw : null;
}

function moneyLocale(lang: string) {
  if (lang.startsWith("ru")) return "ru-RU";
  if (lang.startsWith("en")) return "en-US";
  return "uz-UZ";
}

function formatDate(iso: string | null | undefined, lang: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(moneyLocale(lang), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function tagline(code: string, t: (key: string, opts?: { defaultValue?: string }) => string) {
  if (code === "plus") return t("morph.paywall.taglinePlus", { defaultValue: "Studio, Parvarish va Tarkib ochiladi" });
  if (code === "pro") return t("morph.paywall.taglinePro", { defaultValue: "100 try-on, Studio va eng yuqori limitlar" });
  return t("morph.paywall.taglineStarter", { defaultValue: "Faqat try-on va chat" });
}

function RemainRow({ label, used, limit }: { label: string; used: number; limit: number }) {
  const { t } = useTranslation();
  const safeLimit = limit > 0 ? limit : 1;
  const ratio = Math.min(1, Math.max(0, used / safeLimit));
  const left = Math.max(0, safeLimit - used);
  return (
    <div>
      <div className="flex items-center justify-between text-[15px] font-bold">
        <span>{label}</span>
        <span>{t("profile.leftCount", { count: left, defaultValue: "{{count}} qoldi" })}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/10">
        <div className="h-full rounded-full bg-[var(--morph-fg,#111)]" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
    </div>
  );
}

/** Obuna sahifasi — ilovadagi SubscriptionsScreen tartibi va xavfsizlik qoidalari. */
export function SettingsSubscriptionsPanel() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const focusPlan = useMemo(() => readFocusPlan(searchStr), [searchStr]);
  const plansQ = useSubscriptionPlans();
  const meQ = useSubscriptionMe();
  const checkout = useSubscriptionCheckout();
  const cancelSub = useSubscriptionCancel();
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [cancelView, setCancelView] = useState(false);
  const me = meQ.data;
  const sub = me?.subscription;
  const activeCode = me?.has_active ? sub?.plan_code ?? null : null;
  const isCancelled = Boolean(
    me?.has_active && (me.status === "cancelled" || sub?.status === "cancelled" || sub?.cancelled_at),
  );
  const canCancel = Boolean(me?.can_cancel ?? sub?.can_cancel);
  const usage = me?.usage;
  const endsAt = formatDate(sub?.expires_at ?? sub?.ends_at ?? me?.expires_at, lang);

  const shopPlans = useMemo(() => {
    const catalog = plansQ.data?.length ? plansQ.data : FALLBACK_SUBSCRIPTION_PLANS;
    return catalog.filter((plan) => plan.code !== "free" && plan.purchasable !== false);
  }, [plansQ.data]);
  const upgradeChoices = useMemo(() => {
    if (!me?.has_active) return shopPlans;
    return shopPlans.filter(
      (plan) => (plan.code === "plus" || plan.code === "pro") && isPlanUpgrade(plan.code, activeCode),
    );
  }, [shopPlans, me?.has_active, activeCode]);

  useEffect(() => {
    setPicked(null);
  }, [activeCode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("sub_order") || params.get("order_id");
    if (!orderId || !orderId.startsWith("sub-")) return;
    storePaymeOrder(orderId);
    void navigate({ to: "/subscriptions/payme" });
  }, [navigate]);

  const nextCode = me?.has_active ? nextUpgradePlan(activeCode) : null;
  const selected =
    upgradeChoices.find((plan) => plan.code === picked) ??
    upgradeChoices.find((plan) => plan.code === focusPlan) ??
    upgradeChoices.find((plan) => plan.code === nextCode) ??
    upgradeChoices[0] ??
    null;

  const currentName =
    me?.has_active && sub
      ? sub.plan
        ? pickPlanName(sub.plan, lang)
        : sub.plan_code.toUpperCase()
      : me?.current_plan
        ? pickPlanName(me.current_plan, lang)
        : "Free";

  const startCheckout = async (planCode: string) => {
    if (!hasValidUserSession()) {
      void navigate({ to: "/auth" });
      return;
    }
    if (isCancelled) return;
    if (me?.has_active && !isPlanUpgrade(planCode, activeCode)) return;
    if (!upgradeChoices.some((plan) => plan.code === planCode)) return;
    setBusyCode(planCode);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : getPublicSiteOrigin();
      const checkoutPromise = checkout.mutateAsync({
        plan_code: planCode,
        method: "payme",
        return_url: `${origin}/subscriptions/payme`,
      });
      const timeout = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error(t("subscriptions.genericError", { defaultValue: "Xatolik" }))), 25_000);
      });
      const res = await Promise.race([checkoutPromise, timeout]);
      if (!res.checkout_url || !res.order_id) {
        toast.error(res.message || t("subscriptions.checkoutFailed", { defaultValue: "To‘lov ochilmadi" }));
        return;
      }
      storePaymeOrder(res.order_id);
      markPaymeAwaitReturn();
      setPendingCode(null);
      window.location.assign(res.checkout_url);
    } catch (error) {
      const raw = error instanceof Error ? error.message : t("subscriptions.genericError", { defaultValue: "Xatolik" });
      toast.error(/401|credentials|Authentication/i.test(raw) ? t("profile.paymeLogin", { defaultValue: "To‘lov uchun kiring" }) : raw);
    } finally {
      setBusyCode(null);
    }
  };

  if (cancelView) {
    return (
      <CancelView
        planLabel={currentName}
        endsAt={endsAt}
        canCancel={canCancel}
        isCancelled={isCancelled}
        busy={cancelSub.isPending}
        onBack={() => setCancelView(false)}
        onConfirm={async () => {
          if (!canCancel) return;
          try {
            await cancelSub.mutateAsync();
            toast.success(t("profile.cancelOk", { defaultValue: "Obuna bekor qilindi. Premium muddati tugaguncha ishlaydi." }));
          } catch (error) {
            toast.error(error instanceof Error ? error.message : t("profile.cancelFail", { defaultValue: "Bekor qilib bo‘lmadi" }));
          }
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2 pb-4">
      <section className="rounded-2xl border border-black/10 bg-[var(--morph-card,#fff)] px-3.5 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--morph-muted,#737373)]">
            {t("profile.subCurrent", { defaultValue: "Joriy obuna" })}
          </p>
          {canCancel ? (
            <button type="button" onClick={() => setCancelView(true)} className="text-sm font-bold text-[var(--morph-muted,#737373)]">
              {t("profile.cancelCta", { defaultValue: "Obunani bekor qilish" })}
            </button>
          ) : (
            <p className="text-sm font-bold">
              {me?.has_active
                ? isCancelled
                  ? t("profile.subCancelledActive", { defaultValue: "Bekor qilingan — Premium hali faol" })
                  : t("profile.subActive", { defaultValue: "Faol" })
                : "Free"}
            </p>
          )}
        </div>
        <p className="mt-1 truncate text-[22px] font-extrabold tracking-tight">{currentName}</p>
        {me?.has_active ? (
          <p className="text-sm font-semibold text-[var(--morph-muted,#737373)]">
            {t("profile.subDaysLeft", {
              count: sub?.days_remaining ?? me.days_remaining ?? 0,
              defaultValue: "{{count}} kun qoldi",
            })}
          </p>
        ) : null}
        {usage ? (
          <div className="mt-2 space-y-2">
            <RemainRow
              label={t("profile.meterAi", { defaultValue: "Morf AI" })}
              used={usage.morph_ai_used}
              limit={usage.morph_ai_limit || 1}
            />
            {typeof usage.morph_chat_tokens_limit === "number" ? (
              <RemainRow
                label={t("profile.meterChat", { defaultValue: "Chat" })}
                used={usage.morph_chat_tokens_used ?? 0}
                limit={usage.morph_chat_tokens_limit}
              />
            ) : null}
          </div>
        ) : null}
      </section>

      {plansQ.isError ? (
        <button type="button" onClick={() => { void meQ.refetch(); void plansQ.refetch(); }} className="rounded-xl bg-black/5 px-3 py-3 text-left text-sm text-[var(--morph-muted,#737373)]">
          {t("profile.plansLoadFail", { defaultValue: "Tariflar yuklanmadi. Qayta urinib ko‘ring." })}
        </button>
      ) : null}

      {selected ? (
        <>
          {upgradeChoices.length > 1 ? (
            <div className="flex rounded-full bg-black/5 p-0.5">
              {upgradeChoices.map((plan) => {
                const on = plan.code === selected.code;
                return (
                  <button
                    key={plan.code}
                    type="button"
                    onClick={() => setPicked(plan.code)}
                    className={cn(
                      "h-9 flex-1 rounded-full text-base font-semibold",
                      on ? "bg-[var(--morph-fg,#111)] font-extrabold text-[var(--morph-bg,#fff)]" : "text-[var(--morph-muted,#737373)]",
                    )}
                  >
                    {pickPlanName(plan, lang)}
                  </button>
                );
              })}
            </div>
          ) : null}

          <Offer plan={selected} lang={lang} />

          <button
            type="button"
            disabled={isCancelled || busyCode === selected.code}
            onClick={() => setPendingCode(selected.code)}
            className="mt-auto flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--morph-fg,#111)] text-base font-extrabold text-[var(--morph-bg,#fff)] disabled:opacity-45"
          >
            {busyCode === selected.code ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                {isCancelled
                  ? t("profile.upgradeWait", { defaultValue: "Muddat tugagach" })
                  : t("morph.paywall.ctaCards", { defaultValue: "Uzcard / Humo orqali to‘lash" })}
                {isCancelled ? null : <ArrowRight className="size-4" />}
              </>
            )}
          </button>
        </>
      ) : me?.has_active ? (
        <p className="text-sm text-[var(--morph-muted,#737373)]">
          {t("profile.highestPlan", { defaultValue: "Siz Pro tarifidasiz — bu eng yuqori reja." })}
        </p>
      ) : null}

      {pendingCode ? (
        <PaySheet
          busy={Boolean(busyCode)}
          onClose={() => {
            setPendingCode(null);
            setBusyCode(null);
          }}
          onPay={() => void startCheckout(pendingCode)}
        />
      ) : null}
    </div>
  );
}

function Offer({ plan, lang }: { plan: SubscriptionPlan; lang: string }) {
  const { t } = useTranslation();
  return (
    <article className="rounded-[18px] border border-black/10 bg-[var(--morph-card,#fff)] px-3.5 py-2.5">
      <h2 className="text-2xl font-extrabold tracking-tight">{pickPlanName(plan, lang)}</h2>
      <p className="truncate text-sm text-[var(--morph-muted,#737373)]">{tagline(plan.code, t)}</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="text-[32px] font-extrabold leading-9 tracking-tight">
          {plan.price_uzs.toLocaleString(moneyLocale(lang))}
        </span>
        <span className="text-[15px] font-semibold text-[var(--morph-muted,#737373)]">
          {t("morph.paywall.currencyShort", { defaultValue: "so‘m" })} / {t("morph.paywall.monthShort", { defaultValue: "oy" })}
        </span>
      </p>
      <div className="my-2 h-px bg-black/10" />
      <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-[var(--morph-muted,#737373)]">
        {t("morph.paywall.includes", { defaultValue: "Nima kiradi" })}
      </p>
      <ul className="space-y-0.5">
        {plan.features.map((feature) => {
          const included = feature.included !== false;
          return (
            <li key={feature.key} className="flex items-center gap-2">
              {included ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <XCircle className="size-4 shrink-0 text-[var(--morph-muted,#737373)]" />
              )}
              <span className={cn("truncate text-[15px] font-medium", !included && "text-[var(--morph-muted,#737373)]")}>
                {pickFeatureLabel(feature, lang)}
              </span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function PaySheet({ busy, onClose, onPay }: { busy: boolean; onClose: () => void; onPay: () => void }) {
  const { t } = useTranslation();
  const steps = [
    t("morph.paywall.payStep1", { defaultValue: "Karta raqami va amal qilish muddatini kiriting" }),
    t("morph.paywall.payStep2", { defaultValue: "SMS-kod bilan tasdiqlang — u karta ulangan raqamga keladi" }),
    t("morph.paywall.payStep3", { defaultValue: "Ilovaga qayting va Premium oling" }),
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="w-full rounded-t-3xl bg-[var(--morph-card,#fff)] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 text-[var(--morph-fg,#111)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="mx-auto h-1 w-10 rounded-full bg-black/15" />
          <button type="button" onClick={onClose} aria-label={t("common.close", { defaultValue: "Yopish" })} className="grid size-8 place-items-center rounded-full bg-black/5">
            <X className="size-4" />
          </button>
        </div>
        <p className="text-lg font-extrabold">{t("morph.paywall.paySheetTitle", { defaultValue: "Uzcard yoki Humo kartasi bilan to‘lov" })}</p>
        <p className="mt-1 text-sm text-[var(--morph-muted,#737373)]">
          {t("morph.paywall.paySheetLead", { defaultValue: "Hozir xavfsiz Payme sahifasi ochiladi. O‘zbekistondagi istalgan bank kartasi — Uzcard yoki Humo — mos keladi." })}
        </p>
        <div className="mt-3 flex gap-2">
          {["HUMO", "UZCARD", "VISA"].map((brand) => (
            <span key={brand} className="rounded-lg bg-[#111] px-2 py-1 text-[11px] font-extrabold text-white">{brand}</span>
          ))}
          <span className="inline-flex items-center gap-1 rounded-lg bg-black/5 px-2 py-1 text-[11px] font-bold text-[#2563EB]">
            <ShieldCheck className="size-3.5" />
            3D Secure
          </span>
        </div>
        <ol className="mt-3 space-y-2 rounded-2xl bg-black/5 p-3">
          {steps.map((line, index) => (
            <li key={line} className="flex items-center gap-2 text-sm font-medium">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--morph-fg,#111)] text-[11px] font-bold text-[var(--morph-bg,#fff)]">{index + 1}</span>
              {line}
            </li>
          ))}
        </ol>
        <button
          type="button"
          disabled={busy}
          onClick={onPay}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--morph-fg,#111)] text-base font-extrabold text-[var(--morph-bg,#fff)] disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : t("morph.paywall.paySheetCta", { defaultValue: "To‘lash" })}
        </button>
      </div>
    </div>
  );
}

function CancelView({
  planLabel,
  endsAt,
  canCancel,
  isCancelled,
  busy,
  onBack,
  onConfirm,
}: {
  planLabel: string;
  endsAt: string;
  canCancel: boolean;
  isCancelled: boolean;
  busy: boolean;
  onBack: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const title = isCancelled
    ? t("profile.subCancelledActive", { defaultValue: "Bekor qilingan — Premium hali faol" })
    : t("profile.cancelTitle", { defaultValue: "Obunani bekor qilasizmi?" });
  const body = isCancelled
    ? t("profile.subCancelledBody", { date: endsAt, defaultValue: "Obunangiz bekor qilindi. Premium imkoniyatlari {{date}} gacha ishlaydi." })
    : t("profile.cancelBody", { defaultValue: "Obunani bekor qilsangiz ham, to‘langan muddat tugaguncha AI Premium ishlaydi. To‘lov qaytarilmaydi." });
  const facts = [
    `${t("profile.premiumName", { defaultValue: "AI Premium" })} · ${planLabel}`,
    t("profile.cancelKeepUntil", { date: endsAt, defaultValue: "Premium {{date}} gacha ishlaydi" }),
    t("profile.subAutoRenewOff", { defaultValue: "Avtomatik yangilanish: o‘chirilgan" }),
    t("profile.cancelNoRefund", { defaultValue: "To‘lov avtomatik qaytarilmaydi" }),
    t("profile.cancelPaymeSafe", { defaultValue: "Payme tranzaksiyasi o‘zgarmaydi" }),
  ];
  return (
    <div className="pb-6">
      <h2 className="text-xl font-extrabold">{title}</h2>
      <p className="mt-2 text-sm text-[var(--morph-muted,#737373)]">{body}</p>
      <ul className="mt-4 space-y-2">
        {facts.map((fact) => (
          <li key={fact} className="flex items-start gap-2 text-sm font-medium">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            {fact}
          </li>
        ))}
      </ul>
      {canCancel && !isCancelled ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void onConfirm()}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-[var(--morph-fg,#111)] text-sm font-extrabold text-[var(--morph-bg,#fff)] disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : t("profile.cancelConfirm", { defaultValue: "Obunani bekor qilish" })}
        </button>
      ) : null}
      <button type="button" disabled={busy} onClick={onBack} className="mt-2 flex h-11 w-full items-center justify-center text-sm font-bold">
        {t("profile.cancelBack", { defaultValue: "Ortga qaytish" })}
      </button>
    </div>
  );
}
