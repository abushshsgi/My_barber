import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Check,
  Loader2,
  Sparkles,
  Users,
  Wand2,
  Droplets,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useSubscriptionCheckout, useSubscriptionMe, useSubscriptionPlans } from "@/hooks/use-subscription";
import { useWalletMe } from "@/hooks/use-wallet";
import { parseWalletBalance } from "@/lib/api/wallet";
import { confirmSubscriptionPayment, type SubscriptionPlan } from "@/lib/api/subscriptions";
import { cn } from "@/lib/utils";

function formatUzs(n: number) {
  return `${n.toLocaleString("uz-UZ")} so'm`;
}

function FeatureRow({
  included,
  label,
}: {
  included: boolean;
  label: string;
}) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {included ? (
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.5} />
      ) : (
        <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" strokeWidth={2} />
      )}
      <span className={cn(included ? "text-foreground" : "text-muted-foreground line-through decoration-muted-foreground/40")}>
        {label}
      </span>
    </li>
  );
}

function PlanCard({
  plan,
  activeCode,
  busy,
  onSubscribe,
}: {
  plan: SubscriptionPlan;
  activeCode: string | null;
  busy: boolean;
  onSubscribe: (code: string, method: "wallet" | "click" | "payme") => void;
}) {
  const isActive = activeCode === plan.code;
  const badgeIcon =
    plan.badge === "pro" ? (
      <BadgeCheck className="h-4 w-4 text-amber-500" />
    ) : plan.badge === "plus" ? (
      <BadgeCheck className="h-4 w-4 text-sky-500" />
    ) : (
      <BadgeCheck className="h-4 w-4 text-muted-foreground" />
    );

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 transition-shadow",
        plan.highlight
          ? "border-foreground/20 bg-gradient-to-b from-foreground/[0.06] to-background shadow-md"
          : "border-border bg-card",
        isActive && "ring-2 ring-foreground/80",
      )}
    >
      {plan.highlight ? (
        <span className="absolute right-3 top-3 rounded-full bg-foreground px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background">
          Mashhur
        </span>
      ) : null}

      <div className="flex items-center gap-2">
        {badgeIcon}
        <h3 className="text-lg font-bold tracking-tight">{plan.name_uz}</h3>
      </div>

      <p className="mt-3">
        <span className="text-2xl font-bold tracking-tight">{formatUzs(plan.price_uzs)}</span>
        <span className="ml-1 text-sm text-muted-foreground">/ oy</span>
      </p>

      <ul className="mt-4 space-y-2.5">
        {plan.features.map((f) => (
          <FeatureRow key={f.key} included={f.included !== false} label={f.label_uz} />
        ))}
      </ul>

      <div className="mt-5 space-y-2">
        {isActive ? (
          <div className="flex h-11 items-center justify-center rounded-xl bg-emerald-500/10 text-sm font-bold text-emerald-700">
            Faol obuna
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
  const plansQ = useSubscriptionPlans();
  const meQ = useSubscriptionMe();
  const checkout = useSubscriptionCheckout();
  const { data: wallet } = useWalletMe();
  const [busyCode, setBusyCode] = useState<string | null>(null);

  const balance = wallet ? parseWalletBalance(wallet.balance) : 0;
  const me = meQ.data;
  const activeCode = me?.subscription?.plan_code ?? null;

  // Click/Payme return: ?sub_order=...&provider=click
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
  }, [qc]);

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
          ? `${window.location.origin}/wallet?section=subscriptions`
          : undefined;
      const res = await checkout.mutateAsync({ plan_code, method, return_url });
      if (method === "wallet") {
        toast.success("Obuna faollashtirildi!");
        void qc.invalidateQueries({ queryKey: ["wallet"] });
        return;
      }
      if (res.checkout_url) {
        window.location.assign(res.checkout_url);
        return;
      }
      // DEBUG / sozlanmagan provider — order_id bo'lsa tasdiqlashga urinish
      if (res.order_id) {
        try {
          await confirmSubscriptionPayment({
            provider: method,
            order_id: res.order_id,
            transaction_id: res.transaction_id,
          });
          toast.success("Obuna faollashtirildi!");
          void qc.invalidateQueries({ queryKey: ["subscriptions"] });
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
          defaultValue: "Morph AI, Studio, oila va parvarish — oylik obuna.",
        })}
      </p>

      {wallet ? (
        <p className="text-xs text-muted-foreground">
          Hamyon balansi: <span className="font-semibold text-foreground">{formatUzs(balance)}</span>
        </p>
      ) : null}

      {me?.has_active && me.subscription ? (
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Joriy obuna
              </p>
              <p className="mt-1 text-lg font-bold">
                {me.subscription.plan?.name_uz ?? me.subscription.plan_code}
              </p>
              {me.subscription.ends_at ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Tugash: {new Date(me.subscription.ends_at).toLocaleDateString("uz-UZ")}
                  {me.subscription.source === "referral_trial" ? " · Referal sinov" : ""}
                </p>
              ) : null}
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
        </section>
      ) : null}

      {meQ.isLoading || plansQ.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {(plansQ.data ?? []).map((plan) => (
            <PlanCard
              key={plan.code}
              plan={plan}
              activeCode={activeCode}
              busy={busyCode === plan.code || checkout.isPending}
              onSubscribe={onSubscribe}
            />
          ))}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Obuna faqat to'lov tasdiqlangandan keyin yoqiladi. Limitlar serverda hisoblanadi.
        3 ta do'stni taklif qilsangiz — 7 kunlik Plus sinov beriladi (8-kuni avtomatik to'xtaydi).
      </p>
    </div>
  );
}
