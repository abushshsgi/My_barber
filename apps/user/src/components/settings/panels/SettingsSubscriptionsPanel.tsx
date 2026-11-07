import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Droplets,
  Loader2,
  Sparkles,
  UserPlus,
  Users,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useSubscriptionCancel,
  useSubscriptionCheckout,
  useSubscriptionMe,
  useSubscriptionPlans,
} from "@/hooks/use-subscription";
import { getPublicSiteOrigin } from "@/lib/public-origin";
import { type SubscriptionPlan } from "@/lib/api/subscriptions";
import { storePaymeOrder } from "@/components/subscriptions/PaymeCheckoutStatus";
import { pickFeatureLabel, pickPlanName } from "@/lib/plan-labels";
import { isPlanUpgrade, nextUpgradePlan } from "@/lib/subscription-upgrade";

function readSubscriptionDeepLink(searchStr: string) {
  const sp = new URLSearchParams(searchStr.startsWith("?") ? searchStr.slice(1) : searchStr);
  const planRaw = (sp.get("plan") || "").toLowerCase();
  const plan = planRaw === "starter" || planRaw === "plus" || planRaw === "pro" ? planRaw : null;
  const returnToRaw = sp.get("returnTo");
  const returnTo =
    returnToRaw && returnToRaw.startsWith("/") && !returnToRaw.startsWith("//")
      ? returnToRaw
      : null;
  return { plan, returnTo };
}

function dateLocale(lang: string) {
  if (lang.startsWith("en")) return "en-US";
  if (lang.startsWith("ru")) return "ru-RU";
  return "uz-UZ";
}

function formatUzs(n: number, lang: string, currency: string) {
  return `${n.toLocaleString(dateLocale(lang))} ${currency}`;
}

function formatDate(iso: string | null | undefined, lang: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(dateLocale(lang), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ShopPlanPicker({
  plans,
  picked,
  busyCode,
  pending,
  locked = false,
  upgrade = false,
  onPick,
  onSubscribe,
}: {
  plans: SubscriptionPlan[];
  picked: string | null;
  busyCode: string | null;
  pending: boolean;
  locked?: boolean;
  upgrade?: boolean;
  onPick: (code: string) => void;
  onSubscribe: (code: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const selected = plans.find((plan) => plan.code === picked) ?? plans[0] ?? null;
  if (!selected) return null;
  const included = selected.features.filter((feature) => feature.included !== false).slice(0, 4);
  const busy = busyCode === selected.code || pending;
  const cta = upgrade
    ? locked
      ? t("subscriptions.upgradeWait")
      : t("subscriptions.upgradeTo", { plan: pickPlanName(selected, lang) })
    : t("subscriptions.payWithPayme");
  return (
    <div className="flex flex-col gap-3">
      {plans.length > 1 ? (
        <div className="flex gap-2">
          {plans.map((plan) => {
            const on = plan.code === selected.code;
            return (
              <button
                key={plan.code}
                type="button"
                onClick={() => onPick(plan.code)}
                className={
                  on
                    ? "h-10 flex-1 cursor-pointer rounded-full bg-foreground text-sm font-bold text-background"
                    : "h-10 flex-1 cursor-pointer rounded-full border border-border bg-card text-sm font-bold"
                }
              >
                {pickPlanName(plan, lang)}
              </button>
            );
          })}
        </div>
      ) : null}
      <article className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("subscriptions.upgradeSection")}
          </p>
          <p className="text-sm font-bold">
            {formatUzs(selected.price_uzs, lang, t("common.currencySom"))}
            <span className="font-semibold text-muted-foreground"> / {t("common.perMonth")}</span>
          </p>
        </div>
        <h3 className="mt-1 text-xl font-bold tracking-tight">{pickPlanName(selected, lang)}</h3>
        <ul className="mt-3 space-y-1 text-sm font-medium">
          {included.map((feature) => (
            <li key={feature.key} className="truncate">
              {pickFeatureLabel(feature, lang)}
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={busy || locked}
          onClick={() => onSubscribe(selected.code)}
          className="mt-4 flex h-11 w-full cursor-pointer items-center justify-center rounded-full bg-foreground text-sm font-bold text-background disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : cta}
        </button>
      </article>
    </div>
  );
}

export function SettingsSubscriptionsPanel() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const { plan: focusPlan } = useMemo(
    () => readSubscriptionDeepLink(searchStr),
    [searchStr],
  );
  const plansQ = useSubscriptionPlans();
  const meQ = useSubscriptionMe();
  const checkout = useSubscriptionCheckout();
  const cancelSub = useSubscriptionCancel();
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [pickedPlan, setPickedPlan] = useState<string | null>(null);
  const me = meQ.data;
  const activeCode = me?.subscription?.plan_code ?? null;
  const sub = me?.subscription;
  const isCancelled = Boolean(
    me?.has_active && (me.status === "cancelled" || sub?.status === "cancelled" || sub?.cancelled_at),
  );
  const canCancel = Boolean(me?.can_cancel ?? sub?.can_cancel);
  const endsLabel = formatDate(sub?.expires_at ?? sub?.ends_at ?? me?.expires_at, lang);
  const refGenOn =
    me?.referral_generation_enabled ?? me?.access?.referral_generation_enabled ?? true;
  const daysLeft = me?.days_remaining ?? sub?.days_remaining ?? null;

  const offerPlans = useMemo(() => {
    const all = (plansQ.data ?? []).filter(
      (plan) => plan.code !== "free" && plan.purchasable !== false,
    );
    if (!me?.has_active || !activeCode) return all;
    return all.filter((plan) => isPlanUpgrade(plan.code, activeCode));
  }, [plansQ.data, me?.has_active, activeCode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("sub_order") || params.get("order_id");
    if (!orderId || !orderId.startsWith("sub-")) return;
    storePaymeOrder(orderId);
    void navigate({ to: "/subscriptions/payme" });
  }, [navigate]);

  const usageRows = useMemo(() => {
    if (!me?.has_active) return [];
    const u = me.usage;
    return [
      {
        icon: Sparkles,
        label: t("subscriptions.usageAi"),
        used: u.morph_ai_used,
        limit: u.morph_ai_limit,
        remaining: u.morph_ai_remaining,
      },
      {
        icon: Wand2,
        label: t("subscriptions.usageStudio"),
        used: u.morph_studio_used,
        limit: u.morph_studio_limit,
        remaining: u.morph_studio_remaining,
      },
    ];
  }, [me, t]);

  const onSubscribe = async (plan_code: string) => {
    if (isCancelled) {
      toast.message(t("subscriptions.stillPremium"));
      return;
    }
    setBusyCode(plan_code);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : getPublicSiteOrigin();
      const return_url = `${origin}/subscriptions/payme`;
      const res = await checkout.mutateAsync({
        plan_code,
        method: "payme",
        return_url,
      });
      if (res.order_id) storePaymeOrder(res.order_id);
      if (res.checkout_url) {
        window.location.assign(res.checkout_url);
        return;
      }
      toast.error(res.message || t("subscriptions.checkoutFailed"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("subscriptions.genericError"));
    } finally {
      setBusyCode(null);
    }
  };

  return (
    <div className="mt-4 space-y-6">
      <p className="text-sm text-muted-foreground">
        {me?.has_active
          ? t("subscriptions.manageLead")
          : t("subscriptions.subtitle")}
      </p>

      {/* Joriy holat — faol yoki yopiq */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,15,15,0.05)]">
        {me?.has_active && sub ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("subscriptions.current")}
                </p>
                <p className="mt-1 text-lg font-bold">
                  {sub.plan ? pickPlanName(sub.plan, lang) : sub.plan_code}
                  {sub.is_trial || sub.source === "referral_trial" ? (
                    <span className="ml-2 text-sm font-semibold text-sky-600">
                      · {t("subscriptions.trial")}
                    </span>
                  ) : null}
                </p>
                <dl className="mt-3 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
                  <div>
                    <dt className="inline text-muted-foreground/80">{t("subscriptions.statusLabel")}: </dt>
                    <dd className="inline font-semibold text-foreground">
                      {isCancelled
                        ? t("subscriptions.cancelledActive")
                        : t("subscriptions.active")}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-muted-foreground/80">{t("subscriptions.sourceLabel")}: </dt>
                    <dd className="inline font-semibold text-foreground">
                      {sub.is_trial || sub.source === "referral_trial"
                        ? t("subscriptions.sourceReferral")
                        : sub.source === "wallet"
                          ? t("subscriptions.sourceWallet")
                          : sub.source === "click" || sub.source === "payme"
                            ? t("subscriptions.sourcePayment")
                            : sub.source === "admin"
                              ? t("subscriptions.sourceAdmin")
                              : sub.source || t("subscriptions.sourceDefault")}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-muted-foreground/80">{t("subscriptions.starts")}: </dt>
                    <dd className="inline font-semibold text-foreground">
                      {formatDate(sub.starts_at, lang)}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-muted-foreground/80">{t("subscriptions.validUntil")}: </dt>
                    <dd className="inline font-semibold text-foreground">
                      {formatDate(sub.ends_at, lang)}
                      {typeof daysLeft === "number" ? (
                        <span className="text-muted-foreground">
                          {" "}
                          (
                          {daysLeft === 0
                            ? t("subscriptions.endsToday")
                            : t("subscriptions.daysLeft", { count: daysLeft })}
                          )
                        </span>
                      ) : null}
                    </dd>
                  </div>
                </dl>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700">
                {isCancelled ? t("subscriptions.cancelledActive") : t("subscriptions.active")}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {usageRows.map((row) => {
                const pct =
                  row.limit > 0 ? Math.min(100, Math.round((row.used / row.limit) * 100)) : 0;
                const Icon = row.icon;
                return (
                  <div
                    key={row.label}
                    className="rounded-xl border border-border bg-background p-3"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Icon className="h-4 w-4" />
                      {row.label}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.limit > 0
                        ? `${row.used} / ${row.limit} · ${t("subscriptions.usageLeft", { count: row.remaining })}`
                        : t("subscriptions.notInPlan")}
                    </p>
                    {row.limit > 0 ? (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
                        <div
                          className="h-full rounded-full bg-foreground transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
                <Users className="h-3.5 w-3.5" />
                {me.family_unlimited
                  ? t("subscriptions.familyUnlimited")
                  : t("subscriptions.familyCount", { count: me.family_members_max ?? 0 })}
              </span>
              {me.morph_care ? (
                <Link
                  to="/ai-style/care"
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 font-medium"
                >
                  <Droplets className="h-3.5 w-3.5" />
                  {t("subscriptions.care")}
                </Link>
              ) : null}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{t("subscriptions.autoRenewOff")}</p>
            {isCancelled ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {t("subscriptions.cancelledBody", { date: endsLabel })}
              </p>
            ) : null}
            {canCancel ? (
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="mt-4 inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-border px-4 text-xs font-bold transition-colors duration-200 hover:bg-muted/50"
              >
                {t("subscriptions.cancelCta")}
              </button>
            ) : null}
            {cancelOpen ? (
              <div className="mt-4 rounded-xl border border-border bg-background p-4">
                <p className="text-[15px] font-bold">{t("subscriptions.cancelTitle")}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t("subscriptions.cancelBody")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={cancelSub.isPending}
                    onClick={async () => {
                      try {
                        const res = await cancelSub.mutateAsync();
                        setCancelOpen(false);
                        toast.success(t("subscriptions.cancelOk"));
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : t("subscriptions.cancelFail"));
                      }
                    }}
                    className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-foreground px-4 text-xs font-bold text-background disabled:opacity-60"
                  >
                    {cancelSub.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t("subscriptions.cancelConfirm")
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={cancelSub.isPending}
                    onClick={() => setCancelOpen(false)}
                    className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-border px-4 text-xs font-bold"
                  >
                    {t("subscriptions.cancelBack")}
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("subscriptions.current")}
                </p>
                <p className="mt-1 text-lg font-bold">
                  {me?.current_plan ? pickPlanName(me.current_plan, lang) : "Free"}
                </p>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  {t("subscriptions.freePlanBody")}
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700">
                Free
              </span>
            </div>
            {me?.usage ? (
              <div className="mt-4 grid gap-2 text-sm">
                <p className="font-semibold">
                  {t("subscriptions.usageAi")}: {me.usage.morph_ai_used}/{me.usage.morph_ai_limit || 1}
                </p>
                <p className="font-semibold">
                  {t("subscriptions.usageChat")}:{" "}
                  {me.usage.morph_chat_tokens_used ?? 0}/{me.usage.morph_chat_tokens_limit ?? 10000}
                </p>
              </div>
            ) : null}

            {refGenOn ? (
              <div className="mt-4 rounded-xl border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                  <span className="inline-flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    {t("subscriptions.referralOne")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("subscriptions.referralCredit", {
                      count: me?.referral_credits ?? me?.access?.referral_credits ?? 0,
                    })}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{t("subscriptions.referralHint")}</p>
                <Link
                  to="/referrals"
                  className="mt-3 inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-card px-4 text-xs font-bold transition-colors duration-200 hover:bg-muted/50"
                >
                  {t("subscriptions.inviteFriends")}
                </Link>
              </div>
            ) : null}
          </>
        )}
      </section>

      {meQ.isLoading || plansQ.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : offerPlans.length ? (
        <ShopPlanPicker
          plans={offerPlans}
          picked={pickedPlan ?? (me?.has_active ? nextUpgradePlan(activeCode) : focusPlan)}
          busyCode={busyCode}
          pending={checkout.isPending}
          locked={isCancelled}
          upgrade={Boolean(me?.has_active)}
          onPick={setPickedPlan}
          onSubscribe={onSubscribe}
        />
      ) : me?.has_active ? (
        <p className="text-sm text-muted-foreground">{t("subscriptions.highestPlan")}</p>
      ) : null}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {t("subscriptions.footnote")}
        {refGenOn ? t("subscriptions.footnoteReferral") : ""}
      </p>
    </div>
  );
}
