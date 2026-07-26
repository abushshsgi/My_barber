import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Crown,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/barber/primitives";
import { AgentTrialClaimCard } from "@/components/barber/AgentTrialClaimCard";
import {
  useClaimAgentTrial,
  useShopCheckout,
  useShopConfirm,
  useShopPlans,
  useShopSubscriptionMe,
  shopSubKeys,
} from "@/hooks/use-shop-subscription";
import {
  formatShopPrice,
  newCheckoutIdempotencyKey,
  type ShopPlan,
  type ShopPlanCode,
} from "@/lib/shop-subscription";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/barber/subscription")({
  validateSearch: (raw: Record<string, unknown>) => {
    const order =
      typeof raw.order === "string"
        ? raw.order
        : typeof raw.order_id === "string"
          ? raw.order_id
          : undefined;
    const provider =
      typeof raw.provider === "string"
        ? raw.provider.toLowerCase()
        : undefined;
    const planRaw = typeof raw.plan === "string" ? raw.plan.toLowerCase() : "";
    const plan =
      planRaw === "start" || planRaw === "business" || planRaw === "pro"
        ? (planRaw as ShopPlanCode)
        : undefined;
    return { order, provider, plan };
  },
  component: BarberSubscriptionPage,
});

function FeatureLine({ included, label }: { included: boolean; label: string }) {
  return (
    <li
      className={cn(
        "flex items-start gap-2.5 text-sm transition-colors",
        included ? "text-foreground" : "text-muted-foreground/70",
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
          included ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
        )}
      >
        {included ? <Check className="size-3" strokeWidth={3} /> : <Lock className="size-2.5" />}
      </span>
      <span className={cn(!included && "line-through decoration-muted-foreground/40")}>{label}</span>
    </li>
  );
}

function PlanCard({
  plan,
  selected,
  current,
  busy,
  onSelect,
  onBuy,
}: {
  plan: ShopPlan;
  selected: boolean;
  current: boolean;
  busy: boolean;
  onSelect: () => void;
  onBuy: (method: "wallet" | "click" | "payme") => void;
}) {
  const Icon = plan.code === "pro" ? Crown : plan.code === "business" ? Zap : Sparkles;
  return (
    <article
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-5 sm:p-6 shadow-card transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-lg",
        plan.highlight && "border-foreground/30 ring-1 ring-foreground/10",
        selected && "border-foreground ring-2 ring-foreground/20",
        current && "bg-muted/30",
      )}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
      role="button"
      tabIndex={0}
    >
      {plan.highlight || plan.popular_label_uz ? (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-background shadow-sm animate-in fade-in zoom-in-95 duration-500">
            <Sparkles className="size-3" />
            {plan.popular_label_uz || "Tavsiya"}
          </span>
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <Icon className="size-5 text-foreground" />
            <h3 className="font-heading text-xl font-semibold">{plan.name_uz}</h3>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground leading-snug">{plan.tagline_uz}</p>
        </div>
        {current ? (
          <span className="shrink-0 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            Faol
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        <div className="font-heading text-3xl font-semibold tracking-tight tabular-nums">
          {formatShopPrice(plan.price_uzs)}
        </div>
        <p className="text-xs text-muted-foreground mt-1">/ {plan.period_days} kun</p>
      </div>

      <ul className="mt-5 space-y-2.5 flex-1">
        {plan.features.map((f) => (
          <FeatureLine key={f.key} included={f.included !== false} label={f.label_uz} />
        ))}
      </ul>

      <div className="mt-6 space-y-2" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          disabled={busy || current}
          onClick={() => onBuy("click")}
          className={cn(
            "w-full h-11 rounded-xl text-sm font-semibold transition-all",
            plan.highlight
              ? "bg-foreground text-background hover:opacity-90"
              : "border border-border hover:bg-muted/50",
            (busy || current) && "opacity-60 cursor-not-allowed",
          )}
        >
          {current ? "Joriy tarif" : "Click orqali to'lash"}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy || current}
            onClick={() => onBuy("payme")}
            className="h-10 rounded-xl border border-border text-xs font-medium hover:bg-muted/50 disabled:opacity-60"
          >
            Payme
          </button>
          <button
            type="button"
            disabled={busy || current}
            onClick={() => onBuy("wallet")}
            className="h-10 rounded-xl border border-border text-xs font-medium hover:bg-muted/50 disabled:opacity-60"
          >
            Hisob raqam
          </button>
        </div>
      </div>
    </article>
  );
}

function BarberSubscriptionPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const search = Route.useSearch();
  const plansQ = useShopPlans();
  const meQ = useShopSubscriptionMe();
  const checkout = useShopCheckout();
  const confirm = useShopConfirm();
  const claimTrial = useClaimAgentTrial();
  const [selected, setSelected] = useState<ShopPlanCode>(search.plan || "start");
  const [confirming, setConfirming] = useState(false);

  const plans = plansQ.data?.plans ?? [];
  const me = meQ.data;
  const currentCode = me?.subscription?.is_active ? me.subscription.plan_code : null;

  useEffect(() => {
    if (search.plan) setSelected(search.plan);
  }, [search.plan]);

  // Provider return — order_id bilan tasdiqlash (DEBUG / callback)
  useEffect(() => {
    if (!search.order || !search.provider) return;
    if (confirming || confirm.isPending) return;
    setConfirming(true);
    confirm.mutate(
      { order_id: search.order, provider: search.provider },
      {
        onSuccess: () => {
          toast.success("Obuna faollashtirildi!");
          void qc.invalidateQueries({ queryKey: shopSubKeys.me });
          void navigate({ to: "/barber", replace: true });
        },
        onError: (e: Error) => {
          toast.error(e.message || "Tasdiqlashda xato");
          setConfirming(false);
        },
      },
    );
  }, [search.order, search.provider]); // eslint-disable-line react-hooks/exhaustive-deps

  const busy = checkout.isPending || confirm.isPending || confirming || claimTrial.isPending;

  const returnUrl = useMemo(() => {
    if (typeof window === "undefined") return "/barber/subscription";
    return `${window.location.origin}/barber/subscription`;
  }, []);

  async function onClaimTrial(agentCode: string) {
    try {
      await claimTrial.mutateAsync(agentCode);
      toast.success("21 kunlik bepul trial faollashtirildi!");
      void navigate({ to: "/barber", replace: true });
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Trial berilmadi");
      throw e;
    }
  }

  async function buy(planCode: ShopPlanCode, method: "wallet" | "click" | "payme") {
    try {
      const result = await checkout.mutateAsync({
        plan_code: planCode,
        method,
        return_url: returnUrl,
        idempotency_key: newCheckoutIdempotencyKey(),
      });
      if (method === "wallet" && result.ok) {
        toast.success("Obuna faollashtirildi!");
        void navigate({ to: "/barber", replace: true });
        return;
      }
      if (result.checkout_url) {
        window.location.href = result.checkout_url;
        return;
      }
      if (result.debug_confirm_allowed && result.order_id) {
        // Dev stub — darhol confirm
        await confirm.mutateAsync({
          order_id: result.order_id,
          provider: method,
        });
        toast.success("Obuna faollashtirildi (dev)!");
        void navigate({ to: "/barber", replace: true });
        return;
      }
      toast.message(result.message || "To'lov tizimi sozlanmoqda");
    } catch (e) {
      const err = e as Error & { status?: number };
      toast.error(err.message || "Xatolik");
    }
  }

  return (
    <div className="relative min-h-[70vh]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-amber-200/40 via-stone-200/30 to-transparent blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-emerald-200/20 blur-3xl" />
      </div>

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-8">
        <PageHeader
          title="Obuna tariflari"
          description="Panel to'liq ishlashi uchun obuna majburiy. Start — eng mashhur tanlov."
        />

        {me?.has_subscription && me.subscription?.is_active ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
            <ShieldCheck className="size-5 text-emerald-700" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                Faol: {me.subscription.plan_name}
              </p>
              <p className="text-xs text-muted-foreground">
                Amal qiladi:{" "}
                {me.subscription.ends_at
                  ? new Date(me.subscription.ends_at).toLocaleDateString("uz-UZ", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void navigate({ to: "/barber" })}
              className="text-sm font-medium underline-offset-4 hover:underline"
            >
              Panelga o'tish
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
            <Lock className="size-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Obunasiz panel yopiq</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Bronlar, mijozlar, daromad va marketing — faqat to'lovdan keyin. Agent taklif kodi
                bo'lsa — 21 kun bepul ochiladi. Aks holda Click / Payme yoki hisob raqam orqali
                to'lang.
              </p>
            </div>
          </div>
        )}

        <AgentTrialClaimCard
          trial={me?.agent_trial}
          busy={busy}
          onClaim={onClaimTrial}
        />

        {plansQ.isLoading ? (
          <div className="flex justify-center py-20 text-muted-foreground gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Tariflar yuklanmoqda…
          </div>
        ) : plansQ.isError ? (
          <div className="rounded-xl border border-border p-6 text-sm text-muted-foreground">
            Tariflarni yuklab bo'lmadi. Qayta urinib ko'ring.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
            {plans.map((plan, i) => (
              <div
                key={plan.code}
                className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both"
                style={{ animationDelay: `${i * 90}ms`, animationDuration: "500ms" }}
              >
                <PlanCard
                  plan={plan}
                  selected={selected === plan.code}
                  current={currentCode === plan.code}
                  busy={busy}
                  onSelect={() => setSelected(plan.code)}
                  onBuy={(method) => void buy(plan.code, method)}
                />
              </div>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card/80 p-4 sm:p-5 text-xs text-muted-foreground space-y-2">
          <p className="font-medium text-foreground text-sm flex items-center gap-2">
            <ShieldCheck className="size-4" />
            Xavfsizlik
          </p>
          <ul className="list-disc pl-4 space-y-1 leading-relaxed">
            <li>Narxlar faqat serverdan — klient o'zgartira olmaydi</li>
            <li>Checkout so'rovlari IP va akkaunt bo'yicha cheklangan (anti-spam / carding)</li>
            <li>Idempotency kaliti — qayta bosish ikki marta yechmaydi</li>
            <li>return_url faqat ruxsat etilgan domenlarga</li>
            <li>Agent trial — bir partner / telefon / email uchun umrbod bir marta</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
