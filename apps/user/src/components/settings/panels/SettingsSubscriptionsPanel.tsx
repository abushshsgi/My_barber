import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BadgeCheck,
  Check,
  Crown,
  Droplets,
  Loader2,
  Lock,
  Sparkles,
  UserPlus,
  Users,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FeatureIcon } from "@/components/subscriptions/SubscriptionPlanAds";
import { MorphPromoUrgencyBanner } from "@/components/subscriptions/MorphPromoUrgencyBanner";
import { useSubscriptionCheckout, useSubscriptionMe, useSubscriptionPlans } from "@/hooks/use-subscription";
import { useWalletMe } from "@/hooks/use-wallet";
import { parseWalletBalance } from "@/lib/api/wallet";
import { getPublicSiteOrigin } from "@/lib/public-origin";
import {
  confirmSubscriptionPayment,
  previewSubscriptionPromo,
  type SubscriptionPlan,
} from "@/lib/api/subscriptions";
import { filterPlansForSubscriber, isPlanUpgrade, upgradeCtaLabel } from "@/lib/subscription-upgrade";
import { cn } from "@/lib/utils";

function readSubscriptionDeepLink(searchStr: string) {
  const sp = new URLSearchParams(searchStr.startsWith("?") ? searchStr.slice(1) : searchStr);
  const planRaw = (sp.get("plan") || "").toLowerCase();
  const plan = planRaw === "starter" || planRaw === "plus" || planRaw === "pro" ? planRaw : null;
  const returnToRaw = sp.get("returnTo");
  const returnTo =
    returnToRaw && returnToRaw.startsWith("/") && !returnToRaw.startsWith("//") ? returnToRaw : null;
  return { plan, returnTo };
}

function formatUzs(n: number) {
  return `${n.toLocaleString("uz-UZ")} so'm`;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function sourceLabel(source: string, isTrial?: boolean) {
  if (isTrial || source === "referral_trial") return "Referal sinov";
  if (source === "wallet") return "Hamyon";
  if (source === "click" || source === "payme") return "To'lov";
  if (source === "admin") return "Admin";
  return source || "Obuna";
}

function FeatureRow({
  included,
  label,
  featureKey,
}: {
  included: boolean;
  label: string;
  featureKey: string;
}) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      {included ? (
        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-foreground">
          <Check className="size-3 text-background" strokeWidth={3} />
        </span>
      ) : (
        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-muted">
          <X className="size-3 text-muted-foreground/60" strokeWidth={2.5} />
        </span>
      )}
      <span className="flex min-w-0 items-start gap-1.5">
        {included ? (
          <FeatureIcon featureKey={featureKey} className="mt-0.5 size-3.5 shrink-0 opacity-60" />
        ) : null}
        <span
          className={cn(
            included ? "text-foreground" : "text-muted-foreground line-through decoration-muted-foreground/40",
          )}
        >
          {label}
        </span>
      </span>
    </li>
  );
}

function PlanCard({
  plan,
  activeCode,
  busy,
  focused,
  discountedPrice,
  discountPct,
  onSubscribe,
}: {
  plan: SubscriptionPlan;
  activeCode: string | null;
  busy: boolean;
  focused?: boolean;
  discountedPrice?: number | null;
  discountPct?: number | null;
  onSubscribe: (code: string, method: "wallet" | "click" | "payme") => void;
}) {
  const isActive = activeCode === plan.code;
  const canUpgrade = isPlanUpgrade(plan.code, activeCode);
  const PlanGlyph =
    plan.code === "pro" ? Crown : plan.code === "plus" ? Sparkles : Zap;
  const cardRef = useRef<HTMLElement | null>(null);
  const showDiscount =
    discountedPrice != null && discountedPrice < plan.price_uzs && !activeCode;

  useEffect(() => {
    if (!focused || !cardRef.current) return;
    cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focused]);

  const payLabel = activeCode && canUpgrade
    ? upgradeCtaLabel(activeCode, true)
    : "Hamyondan to'lash";

  return (
    <article
      ref={cardRef}
      id={`sub-plan-${plan.code}`}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 transition-shadow",
        plan.highlight
          ? "border-foreground/20 bg-gradient-to-b from-foreground/[0.06] to-background shadow-md"
          : "border-border bg-card",
        isActive && "ring-2 ring-foreground/80",
        focused && !isActive && "ring-2 ring-foreground/40",
      )}
    >
      {isActive ? (
        <span className="absolute right-3 top-3 rounded-full bg-foreground/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground">
          Joriy
        </span>
      ) : canUpgrade && activeCode ? (
        <span className="absolute right-3 top-3 rounded-full bg-foreground px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background">
          Upgrade
        </span>
      ) : plan.highlight ? (
        <span className="absolute right-3 top-3 rounded-full bg-foreground px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background">
          Mashhur
        </span>
      ) : null}

      <div className="flex items-center gap-2.5">
        <span className="grid size-10 place-items-center rounded-xl bg-foreground text-background">
          <PlanGlyph className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-lg font-bold tracking-tight">{plan.name_uz}</h3>
            <BadgeCheck
              className={cn(
                "h-4 w-4",
                plan.badge === "pro"
                  ? "text-foreground"
                  : plan.badge === "plus"
                    ? "text-foreground/70"
                    : "text-muted-foreground",
              )}
            />
          </div>
        </div>
      </div>

      <p className="mt-3">
        {showDiscount ? (
          <>
            <span className="mr-2 text-sm font-semibold text-muted-foreground line-through">
              {formatUzs(plan.price_uzs)}
            </span>
            <span className="text-2xl font-bold tracking-tight">{formatUzs(discountedPrice!)}</span>
          </>
        ) : (
          <span className="text-2xl font-bold tracking-tight">{formatUzs(plan.price_uzs)}</span>
        )}
        <span className="ml-1 text-sm text-muted-foreground">/ oy</span>
      </p>
      {showDiscount && discountPct ? (
        <p className="mt-1 text-[11px] font-bold text-foreground">
          Yangi hisob −{discountPct}%
        </p>
      ) : null}

      <ul className="mt-4 space-y-2.5">
        {plan.features.map((f) => (
          <FeatureRow
            key={f.key}
            featureKey={f.key}
            included={f.included !== false}
            label={f.label_uz}
          />
        ))}
      </ul>

      <div className="mt-5 space-y-2">
        {isActive ? (
          <div className="flex h-11 items-center justify-center rounded-xl bg-foreground/10 text-sm font-bold text-foreground">
            Joriy obuna
          </div>
        ) : activeCode && !canUpgrade ? (
          <div className="flex h-11 items-center justify-center rounded-xl bg-muted text-sm font-bold text-muted-foreground">
            Pastroq tarif
          </div>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSubscribe(plan.code, "wallet")}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-bold text-background disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {payLabel}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => onSubscribe(plan.code, "click")}
                className="h-10 rounded-xl border border-border text-xs font-bold disabled:opacity-60"
              >
                Click
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onSubscribe(plan.code, "payme")}
                className="h-10 rounded-xl border border-border text-xs font-bold disabled:opacity-60"
              >
                Payme
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

export function SettingsSubscriptionsPanel() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const { plan: focusPlan, returnTo } = useMemo(
    () => readSubscriptionDeepLink(searchStr),
    [searchStr],
  );
  const plansQ = useSubscriptionPlans();
  const meQ = useSubscriptionMe();
  const checkout = useSubscriptionCheckout();
  const { data: wallet } = useWalletMe();
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [offerPrices, setOfferPrices] = useState<Record<string, number>>({});

  const welcomeOffer = meQ.data?.welcome_offer;
  const welcomeEligible = welcomeOffer?.eligible === true;

  useEffect(() => {
    if (!welcomeEligible || !plansQ.data?.length) {
      setOfferPrices({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const next: Record<string, number> = {};
      for (const plan of plansQ.data) {
        try {
          const res = await previewSubscriptionPromo({ plan_code: plan.code });
          if (!cancelled && res.discount_uzs > 0) next[plan.code] = res.amount_uzs;
        } catch {
          /* skip */
        }
      }
      if (!cancelled) setOfferPrices(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [welcomeEligible, plansQ.data]);

  const balance = wallet ? parseWalletBalance(wallet.balance) : 0;
  const me = meQ.data;
  const activeCode = me?.subscription?.plan_code ?? null;
  const sub = me?.subscription;
  const refGenOn =
    me?.referral_generation_enabled ?? me?.access?.referral_generation_enabled ?? true;
  const daysLeft = me?.days_remaining ?? sub?.days_remaining ?? null;

  const visiblePlans = useMemo(() => {
    const all = plansQ.data ?? [];
    if (!me?.has_active || !activeCode) return all;
    // Faol obunachi: joriy + faqat yuqori (upgrade) tariflar
    const upgrades = filterPlansForSubscriber(all, activeCode);
    const current = all.find((p) => p.code === activeCode);
    return current ? [current, ...upgrades] : upgrades;
  }, [plansQ.data, me?.has_active, activeCode]);

  const goAfterSuccess = () => {
    if (returnTo) {
      void navigate({ to: returnTo });
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("sub_order") || params.get("order_id");
    const provider = (params.get("provider") || "").toLowerCase();
    if (!orderId || !orderId.startsWith("sub-")) return;
    if (provider !== "click" && provider !== "payme") return;
    let cancelled = false;
    void (async () => {
      try {
        await confirmSubscriptionPayment({
          provider: provider as "click" | "payme",
          order_id: orderId,
          transaction_id: params.get("transaction_id") || undefined,
        });
        if (!cancelled) {
          toast.success("Obuna faollashtirildi!");
          void qc.invalidateQueries({ queryKey: ["subscriptions"] });
          void qc.invalidateQueries({ queryKey: ["wallet"] });
          if (returnTo) {
            void navigate({ to: returnTo });
          }
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "To'lovni tasdiqlab bo'lmadi");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [qc, navigate, returnTo]);

  const usageRows = useMemo(() => {
    if (!me?.has_active) return [];
    const u = me.usage;
    return [
      {
        icon: Sparkles,
        label: "Morph AI",
        used: u.morph_ai_used,
        limit: u.morph_ai_limit,
        remaining: u.morph_ai_remaining,
      },
      {
        icon: Wand2,
        label: "Morph AI Studio",
        used: u.morph_studio_used,
        limit: u.morph_studio_limit,
        remaining: u.morph_studio_remaining,
      },
    ];
  }, [me]);

  const onSubscribe = async (plan_code: string, method: "wallet" | "click" | "payme") => {
    setBusyCode(plan_code);
    try {
      const return_url =
        typeof window !== "undefined"
          ? `${getPublicSiteOrigin()}${returnTo || "/wallet?section=subscriptions"}`
          : undefined;
      const res = await checkout.mutateAsync({
        plan_code,
        method,
        return_url,
      });
      if (method === "wallet") {
        toast.success("Obuna faollashtirildi!");
        void qc.invalidateQueries({ queryKey: ["wallet"] });
        void qc.invalidateQueries({ queryKey: ["subscriptions"] });
        goAfterSuccess();
        return;
      }
      if (res.checkout_url) {
        window.location.assign(res.checkout_url);
        return;
      }
      if (res.order_id) {
        try {
          await confirmSubscriptionPayment({
            provider: method,
            order_id: res.order_id,
            transaction_id: res.transaction_id,
          });
          toast.success("Obuna faollashtirildi!");
          void qc.invalidateQueries({ queryKey: ["subscriptions"] });
          goAfterSuccess();
          return;
        } catch {
          /* fall through */
        }
      }
      toast.message(res.message || "To'lov sahifasi ochilmadi", {
        description: "Hamyon balansidan to'lashni sinab ko'ring.",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusyCode(null);
    }
  };

  return (
    <div className="mt-4 space-y-6">
      <p className="text-sm text-muted-foreground">
        {t("subscriptions.subtitle", {
          defaultValue: refGenOn
            ? "Morph AI yangi userlarga yopiq. 1 ta do'stni taklif qiling (1 generatsiya) yoki obuna sotib oling."
            : "Morph AI yangi userlarga yopiq. Obuna sotib oling.",
        })}
      </p>

      {wallet ? (
        <p className="text-xs text-muted-foreground">
          Hamyon balansi: <span className="font-semibold text-foreground">{formatUzs(balance)}</span>
        </p>
      ) : null}

      {/* Joriy holat — faol yoki yopiq */}
      <section className="rounded-2xl border border-border bg-card p-4">
        {me?.has_active && sub ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Joriy obuna
                </p>
                <p className="mt-1 text-lg font-bold">
                  {sub.plan?.name_uz ?? sub.plan_code}
                  {sub.is_trial || sub.source === "referral_trial" ? (
                    <span className="ml-2 text-sm font-semibold text-sky-600">· Sinov</span>
                  ) : null}
                </p>
                <dl className="mt-3 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
                  <div>
                    <dt className="inline text-muted-foreground/80">Holat: </dt>
                    <dd className="inline font-semibold text-foreground">Faol</dd>
                  </div>
                  <div>
                    <dt className="inline text-muted-foreground/80">Manba: </dt>
                    <dd className="inline font-semibold text-foreground">
                      {sourceLabel(sub.source, sub.is_trial)}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-muted-foreground/80">Boshlanish: </dt>
                    <dd className="inline font-semibold text-foreground">
                      {formatDate(sub.starts_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-muted-foreground/80">Amal qiladi: </dt>
                    <dd className="inline font-semibold text-foreground">
                      {formatDate(sub.ends_at)}
                      {typeof daysLeft === "number" ? (
                        <span className="text-muted-foreground">
                          {" "}
                          ({daysLeft === 0 ? "bugun tugaydi" : `${daysLeft} kun qoldi`})
                        </span>
                      ) : null}
                    </dd>
                  </div>
                </dl>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700">
                Faol
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {usageRows.map((row) => {
                const pct =
                  row.limit > 0 ? Math.min(100, Math.round((row.used / row.limit) * 100)) : 0;
                const Icon = row.icon;
                return (
                  <div key={row.label} className="rounded-xl bg-muted/40 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Icon className="h-4 w-4" />
                      {row.label}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.limit > 0
                        ? `${row.used} / ${row.limit} · qoldi ${row.remaining}`
                        : "Bu rejada yo'q"}
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
                  ? "Oila: cheksiz"
                  : `Oila: ${me.family_members_max ?? 0}`}
              </span>
              {me.morph_care ? (
                <Link
                  to="/ai-style/care"
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 font-medium"
                >
                  <Droplets className="h-3.5 w-3.5" />
                  Parvarish
                </Link>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Joriy obuna
                </p>
                <p className="mt-1 flex items-center gap-2 text-lg font-bold">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Yo&apos;q — Morph AI yopiq
                </p>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  {refGenOn
                    ? "Yangi hisobda Morph AI ishlamaydi. Obuna sotib oling yoki 1 ta do'stni taklif qilib 1 generatsiya oling."
                    : "Yangi hisobda Morph AI ishlamaydi. Obuna sotib oling."}
                </p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                Faol emas
              </span>
            </div>

            {refGenOn ? (
              <div className="mt-4 rounded-xl bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                  <span className="inline-flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    1 do&apos;st = 1 generatsiya
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Kredit: {me?.referral_credits ?? me?.access?.referral_credits ?? 0}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Do&apos;stingiz kodingiz bilan ro&apos;yxatdan o&apos;tsa, sizga 1 Morph AI
                  generatsiya krediti beriladi.
                </p>
                <Link
                  to="/referrals"
                  className="mt-3 inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-xs font-bold"
                >
                  Do&apos;stlarni taklif qilish
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
      ) : (
        <>
          <MorphPromoUrgencyBanner variant="card" className="mb-1" />

          {welcomeEligible && !me?.has_active ? (
            <section className="rounded-[22px] border border-border bg-card p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Yangi hisob
              </p>
              <p className="mt-1 text-[15px] font-bold">
                {welcomeOffer?.label_uz ?? "Birinchi 24 soat — chegirma"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {welcomeOffer?.hint_uz ??
                  "Promokod kerak emas — to‘lovda avtomatik qo‘llanadi."}
              </p>
            </section>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-3">
            {visiblePlans.map((plan) => (
              <PlanCard
                key={plan.code}
                plan={plan}
                activeCode={activeCode}
                busy={busyCode === plan.code || checkout.isPending}
                focused={focusPlan === plan.code}
                discountedPrice={offerPrices[plan.code] ?? null}
                discountPct={welcomeOffer?.discount_pct ?? null}
                onSubscribe={onSubscribe}
              />
            ))}
          </div>
        </>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Obuna faqat to&apos;lov tasdiqlangandan keyin yoqiladi. Limitlar serverda hisoblanadi.
        {refGenOn
          ? " 1 ta do'stni taklif qilsangiz — 1 Morph AI generatsiya krediti beriladi."
          : ""}
      </p>
    </div>
  );
}
