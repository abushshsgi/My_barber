import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BadgeCheck,
  Check,
  Crown,
  Droplets,
  Flame,
  Loader2,
  Lock,
  Sparkles,
  Ticket,
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
import { PromoCountdown } from "@/components/subscriptions/PromoCountdown";
import { useSubscriptionCheckout, useSubscriptionMe, useSubscriptionPlans, useSubscriptionPromos } from "@/hooks/use-subscription";
import { useWalletMe } from "@/hooks/use-wallet";
import { parseWalletBalance } from "@/lib/api/wallet";
import {
  confirmSubscriptionPayment,
  previewSubscriptionPromo,
  type SubscriptionPlan,
} from "@/lib/api/subscriptions";
import { cn } from "@/lib/utils";

function readSubscriptionDeepLink(searchStr: string) {
  const sp = new URLSearchParams(searchStr.startsWith("?") ? searchStr.slice(1) : searchStr);
  const planRaw = (sp.get("plan") || "").toLowerCase();
  const plan = planRaw === "starter" || planRaw === "plus" || planRaw === "pro" ? planRaw : null;
  const returnToRaw = sp.get("returnTo");
  const returnTo =
    returnToRaw && returnToRaw.startsWith("/") && !returnToRaw.startsWith("//") ? returnToRaw : null;
  const promoRaw = (sp.get("promo") || "").trim().toUpperCase();
  const promo = promoRaw || null;
  return { plan, returnTo, promo };
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
  promoCode,
  discountedPrice,
  onSubscribe,
}: {
  plan: SubscriptionPlan;
  activeCode: string | null;
  busy: boolean;
  focused?: boolean;
  promoCode?: string | null;
  discountedPrice?: number | null;
  onSubscribe: (code: string, method: "wallet" | "click" | "payme") => void;
}) {
  const isActive = activeCode === plan.code;
  const PlanGlyph =
    plan.code === "pro" ? Crown : plan.code === "plus" ? Sparkles : Zap;
  const cardRef = useRef<HTMLElement | null>(null);
  const showDiscount =
    discountedPrice != null && discountedPrice < plan.price_uzs && Boolean(promoCode);

  useEffect(() => {
    if (!focused || !cardRef.current) return;
    cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focused]);

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
      {plan.highlight ? (
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
      {showDiscount ? (
        <p className="mt-1 text-[11px] font-bold text-foreground">
          {promoCode} −{Math.round((1 - discountedPrice! / plan.price_uzs) * 100)}%
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
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSubscribe(plan.code, "wallet")}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-bold text-background disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Hamyondan to'lash
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
  const { plan: focusPlan, returnTo, promo: promoFromUrl } = useMemo(
    () => readSubscriptionDeepLink(searchStr),
    [searchStr],
  );
  const plansQ = useSubscriptionPlans();
  const promosQ = useSubscriptionPromos();
  const meQ = useSubscriptionMe();
  const checkout = useSubscriptionCheckout();
  const { data: wallet } = useWalletMe();
  const launchPromo = promosQ.data?.[0] ?? null;
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [promoInput, setPromoInput] = useState(promoFromUrl || "MORPH30");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(promoFromUrl || "MORPH30");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoPrices, setPromoPrices] = useState<Record<string, number>>({});
  const [promoBusy, setPromoBusy] = useState(false);

  useEffect(() => {
    if (!promoFromUrl) return;
    setPromoInput(promoFromUrl);
    setAppliedPromo(promoFromUrl);
  }, [promoFromUrl]);

  useEffect(() => {
    if (!appliedPromo || !plansQ.data?.length) {
      setPromoPrices({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const next: Record<string, number> = {};
      for (const plan of plansQ.data) {
        try {
          const res = await previewSubscriptionPromo({
            plan_code: plan.code,
            promo_code: appliedPromo,
          });
          if (!cancelled) next[plan.code] = res.amount_uzs;
        } catch {
          /* skip plan */
        }
      }
      if (!cancelled) setPromoPrices(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [appliedPromo, plansQ.data]);

  const balance = wallet ? parseWalletBalance(wallet.balance) : 0;
  const me = meQ.data;
  const activeCode = me?.subscription?.plan_code ?? null;
  const sub = me?.subscription;
  const trial = me?.referral_trial;
  const required = trial?.required_referrals ?? 3;
  const progress = trial?.progress ?? trial?.invite_count ?? 0;
  const remainingInvites = trial?.remaining_invites ?? Math.max(0, required - progress);
  const daysLeft = me?.days_remaining ?? sub?.days_remaining ?? null;

  const goAfterSuccess = () => {
    if (returnTo) {
      void navigate({ to: returnTo });
    }
  };

  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) {
      setAppliedPromo(null);
      setPromoPrices({});
      setPromoError(null);
      return;
    }
    const samplePlan = focusPlan || plansQ.data?.[0]?.code || "starter";
    setPromoBusy(true);
    try {
      const res = await previewSubscriptionPromo({ plan_code: samplePlan, promo_code: code });
      setAppliedPromo(res.promo_code);
      setPromoError(null);
      toast.success(`${res.promo_code} qo'llandi (−${res.discount_pct}%)`);
    } catch (e) {
      setAppliedPromo(null);
      setPromoPrices({});
      setPromoError(e instanceof Error ? e.message : "Promokod ishlamadi");
    } finally {
      setPromoBusy(false);
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
          ? `${window.location.origin}${returnTo || "/wallet?section=subscriptions"}`
          : undefined;
      const res = await checkout.mutateAsync({
        plan_code,
        method,
        return_url,
        promo_code: appliedPromo || undefined,
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
          defaultValue:
            "Morph AI yangi userlarga yopiq. 3 ta do'stni taklif qiling (7 kun Starter) yoki obuna sotib oling.",
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
                  Yangi hisobda Morph AI ishlamaydi. Obuna sotib oling yoki {required} ta do&apos;stni
                  taklif qilib {trial?.trial_days ?? 7} kunlik Starter sinov oling.
                </p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                Faol emas
              </span>
            </div>

            <div className="mt-4 rounded-xl bg-muted/40 p-3">
              <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                <span className="inline-flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Referal sinov
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.min(progress, required)} / {required}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-foreground transition-all"
                  style={{
                    width: `${Math.min(100, Math.round((Math.min(progress, required) / required) * 100))}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {remainingInvites > 0
                  ? `Yana ${remainingInvites} ta do'st kerak — keyin ${trial?.trial_days ?? 7} kun Starter ochiladi.`
                  : trial?.granted
                    ? "Sinov allaqachon berilgan."
                    : "Shart bajarildi — sinov tez orada faollashadi."}
              </p>
              <Link
                to="/referrals"
                className="mt-3 inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-xs font-bold"
              >
                Do&apos;stlarni taklif qilish
              </Link>
            </div>
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

          <section className="overflow-hidden rounded-[22px] border border-border bg-card">
            <div className="flex items-start gap-3 border-b border-border bg-foreground px-4 py-4 text-background">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-background text-foreground">
                <Flame className="size-4.5" strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-background/55">
                  Ulgutib qoling
                </p>
                <p className="mt-1 text-[15px] font-bold leading-snug">
                  {launchPromo?.urgency_uz ?? "Aksiyа tugashiga kam vaqt qoldi"}
                </p>
                <div className="mt-3">
                  <PromoCountdown
                    endsAt={launchPromo?.ends_at}
                    initialSecondsLeft={launchPromo?.seconds_left}
                    inverted
                  />
                </div>
              </div>
            </div>

            <div className="p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Promokod
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 font-bold text-foreground">
                  <Ticket className="size-3.5" />
                  {launchPromo?.code ?? "MORPH30"}
                </span>
                <span>−{launchPromo?.discount_pct ?? 30}% birinchi to‘lovga</span>
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="MORPH30"
                  className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-bold uppercase tracking-wide outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => void applyPromo()}
                  disabled={promoBusy}
                  className="shrink-0 rounded-xl bg-foreground px-4 py-2.5 text-xs font-bold text-background disabled:opacity-60"
                >
                  Qo&apos;llash
                </button>
              </div>
              {promoError ? (
                <p className="mt-2 text-xs font-medium text-destructive">{promoError}</p>
              ) : appliedPromo ? (
                <p className="mt-2 text-xs font-bold text-foreground">
                  {appliedPromo} faol — hozir to‘lang, aksiya kutmaydi
                </p>
              ) : null}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            {(plansQ.data ?? []).map((plan) => (
              <PlanCard
                key={plan.code}
                plan={plan}
                activeCode={activeCode}
                busy={busyCode === plan.code || checkout.isPending}
                focused={focusPlan === plan.code}
                promoCode={appliedPromo}
                discountedPrice={promoPrices[plan.code] ?? null}
                onSubscribe={onSubscribe}
              />
            ))}
          </div>
        </>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Obuna faqat to&apos;lov tasdiqlangandan keyin yoqiladi. Limitlar serverda hisoblanadi.
        3 ta do&apos;stni taklif qilsangiz — 7 kunlik Starter sinov (8-kuni avtomatik to&apos;xtaydi).
      </p>
    </div>
  );
}
