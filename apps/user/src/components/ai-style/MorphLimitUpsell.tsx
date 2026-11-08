import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck, Star, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { markPaymeAwaitReturn, storePaymeOrder } from "@/components/subscriptions/PaymeCheckoutStatus";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSubscriptionCheckout, useSubscriptionPlans } from "@/hooks/use-subscription";
import { hasValidUserSession } from "@/lib/api/client";
import type { MorphLimitKind } from "@/lib/morph-plan-limit";
import type { SubscriptionMe, SubscriptionPlan } from "@/lib/api/subscriptions";
import { pickFeatureLabel, pickPlanName } from "@/lib/plan-labels";
import { getPublicSiteOrigin } from "@/lib/public-origin";
import { FALLBACK_SUBSCRIPTION_PLANS } from "@/lib/subscription-fallback-plans";
import { isPlanUpgrade } from "@/lib/subscription-upgrade";
import { cn } from "@/lib/utils";

const HIDDEN_FEATURE_KEYS = new Set(["voice", "family", "badge", "priority", "sos"]);

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: MorphLimitKind;
  me: SubscriptionMe | null;
  /** SOS / Javon — Pro tanlangan holda ochiladi. */
  preferPlan?: "plus" | "pro";
};

function moneyLocale(lang: string) {
  if (lang.startsWith("ru")) return "ru-RU";
  if (lang.startsWith("en")) return "en-US";
  return "uz-UZ";
}

function shopPlans(plans: SubscriptionPlan[]): SubscriptionPlan[] {
  return [...plans]
    .filter((plan) => plan.code !== "free" && plan.purchasable !== false)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function MorphLimitUpsell({ open, onOpenChange, kind, me, preferPlan }: Props) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const hero = paywallHero(kind, t);
  const title = hero.title;
  const subtitle = hero.subtitle;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} handleOnly shouldScaleBackground={false}>
        <DrawerContent
          className={cn(
            "morph-ai-type flex max-h-[min(92dvh,720px)] flex-col overflow-hidden rounded-t-[28px] border-black/10 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 text-[#111111]",
            "[&_[data-vaul-handle]]:bg-black/20",
          )}
        >
          <DrawerHeader className="sr-only">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{subtitle}</DrawerDescription>
          </DrawerHeader>
          <MorphPaywallBody
            kind={kind}
            me={me}
            preferPlan={preferPlan}
            onClose={() => onOpenChange(false)}
          />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,640px)] w-[min(94vw,420px)] gap-0 overflow-y-auto rounded-[28px] border-black/10 bg-white p-4 text-[#111111]">
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>
        <MorphPaywallBody
          kind={kind}
          me={me}
          preferPlan={preferPlan}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function paywallHero(
  kind: MorphLimitKind,
  t: (key: string, opts?: { defaultValue?: string }) => string,
) {
  if (kind === "chat") {
    return {
      kicker: t("morph.paywall.titleChatKicker", { defaultValue: "Chat limiti tugadi" }),
      title: t("morph.paywall.titleChat", { defaultValue: "Suhbatni davom ettiring" }),
      subtitle: t("morph.paywall.subtitleChat", {
        defaultValue: "Plus bilan 150 000 token — Morf AI yana javob beradi",
      }),
    };
  }
  if (kind === "studio") {
    return {
      kicker: t("morph.paywall.kickerStudio", { defaultValue: "Studio yopiq" }),
      title: t("morph.paywall.titleStudio", { defaultValue: "Studio uchun yuqori tarif kerak" }),
      subtitle: t("morph.paywall.subtitleStudio", {
        defaultValue: "Plus va Pro da AI tahrir ochiladi",
      }),
    };
  }
  if (kind === "care") {
    return {
      kicker: t("morph.paywall.kickerDay", { defaultValue: "Kunlik taklif" }),
      title: t("morph.paywall.titleMonth", { defaultValue: "Morf AI ni bir oyga oching" }),
      subtitle: t("morph.paywall.subtitleCare", {
        defaultValue: "Parvarish, SOS, ob-havo. To‘lov Payme — siz qaror qilasiz",
      }),
    };
  }
  return {
    kicker: t("morph.paywall.kickerDay", { defaultValue: "Kunlik taklif" }),
    title: t("morph.paywall.titleMonth", { defaultValue: "Morf AI ni bir oyga oching" }),
    subtitle: t("morph.paywall.subtitleMonth", {
      defaultValue: "Selfie, chat, Studio. To‘lov Payme — siz qaror qilasiz",
    }),
  };
}

function MorphPaywallBody({
  kind,
  me,
  preferPlan,
  onClose,
}: {
  kind: MorphLimitKind;
  me: SubscriptionMe | null;
  preferPlan?: "plus" | "pro";
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const locale = moneyLocale(lang);
  const navigate = useNavigate();
  const plansQ = useSubscriptionPlans();
  const checkout = useSubscriptionCheckout();
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const hero = paywallHero(kind, t);
  const activeCode = me?.has_active ? me.subscription?.plan_code ?? null : null;

  const cards = useMemo(() => {
    const catalog = plansQ.data?.length ? plansQ.data : FALLBACK_SUBSCRIPTION_PLANS;
    return shopPlans(catalog).filter((plan) => isPlanUpgrade(plan.code, activeCode));
  }, [plansQ.data, activeCode]);

  useEffect(() => {
    if (picked && cards.some((p) => p.code === picked)) return;
    const prefer =
      (preferPlan === "pro" && cards.find((p) => p.code === "pro")?.code) ||
      (preferPlan === "plus" && cards.find((p) => p.code === "plus")?.code) ||
      (kind === "care" && cards.find((p) => p.code === "plus")?.code) ||
      cards.find((p) => p.highlight)?.code ||
      cards[0]?.code ||
      null;
    setPicked(prefer);
  }, [cards, kind, picked, preferPlan]);

  const selected = cards.find((p) => p.code === picked) ?? cards[0] ?? null;
  const included = (selected?.features ?? []).filter(
    (f) => f.included !== false && !HIDDEN_FEATURE_KEYS.has(f.key),
  );

  const startCheckout = async () => {
    if (!selected) return;
    if (!hasValidUserSession()) {
      void navigate({ to: "/auth", search: { redirect: "/ai-style" } });
      return;
    }
    setBusy(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : getPublicSiteOrigin();
      const res = await checkout.mutateAsync({
        plan_code: selected.code,
        method: "payme",
        return_url: `${origin}/subscriptions/payme`,
      });
      if (!res.checkout_url || !res.order_id) {
        toast.error(res.message || t("subscriptions.checkoutFailed", { defaultValue: "To‘lov ochilmadi" }));
        return;
      }
      storePaymeOrder(res.order_id);
      markPaymeAwaitReturn();
      setPayOpen(false);
      window.location.assign(res.checkout_url);
    } catch (error) {
      const raw =
        error instanceof Error ? error.message : t("subscriptions.genericError", { defaultValue: "Xatolik" });
      toast.error(/401|credentials|Authentication/i.test(raw)
        ? t("profile.paymeLogin", { defaultValue: "To‘lov uchun kiring" })
        : raw);
    } finally {
      setBusy(false);
    }
  };

  const onCta = () => {
    if (!selected) return;
    if (!hasValidUserSession()) {
      void navigate({ to: "/auth", search: { redirect: "/ai-style" } });
      return;
    }
    setPayOpen(true);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain pb-2 [-webkit-overflow-scrolling:touch]">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#737373]">
            {hero.kicker}
          </p>
          <h3 className="mt-0.5 text-[22px] font-extrabold leading-7 tracking-tight">{hero.title}</h3>
          <p className="mt-0.5 text-[13px] leading-5 text-[#737373]">{hero.subtitle}</p>
        </div>

        {cards.length > 1 ? (
          <div className="flex rounded-full bg-black/5 p-0.5">
            {cards.map((plan) => {
              const on = plan.code === selected?.code;
              return (
                <button
                  key={plan.code}
                  type="button"
                  onClick={() => setPicked(plan.code)}
                  className={cn(
                    "h-9 flex-1 rounded-full text-[14px] font-semibold",
                    on ? "bg-[#111111] font-extrabold text-white" : "text-[#737373]",
                  )}
                >
                  {pickPlanName(plan, lang)}
                </button>
              );
            })}
          </div>
        ) : null}

        {selected ? (
          <article className="relative rounded-[22px] border border-black/10 bg-white px-4 py-3">
            {selected.highlight ? (
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#111111] px-2 py-0.5 text-[10px] font-extrabold text-white">
                <Star className="size-3" fill="currentColor" />
                {t("morph.paywall.bestValue", { defaultValue: "Eng foydali" })}
              </span>
            ) : null}
            <p className="flex items-baseline gap-1.5 pr-24">
              <span className="text-[34px] font-extrabold leading-none tracking-tight">
                {selected.price_uzs.toLocaleString(locale)}
              </span>
              <span className="text-[13px] font-semibold text-[#737373]">
                {t("morph.paywall.currencyShort", { defaultValue: "so‘m" })} /{" "}
                {t("morph.paywall.monthShort", { defaultValue: "oy" })}
              </span>
            </p>
            <ul className="mt-2.5 space-y-1">
              {included.map((feature) => (
                <li key={feature.key} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span className="truncate text-[13px] font-medium">
                    {pickFeatureLabel(feature, lang)}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ) : (
          <p className="py-6 text-center text-sm text-[#737373]">
            {t("profile.highestPlan", { defaultValue: "Siz Pro tarifidasiz — bu eng yuqori reja." })}
          </p>
        )}
      </div>

      {selected ? (
        <div className="shrink-0 space-y-2 pt-1">
          <div className="flex gap-1.5">
            <span className="inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full bg-black/5 px-2 py-1.5 text-[11px] font-semibold text-[#737373]">
              <ShieldCheck className="size-3.5 shrink-0" />
              <span className="truncate">
                {t("morph.paywall.autoRenewShort", { defaultValue: "Avtoyangilanish" })}
              </span>
            </span>
            <span className="inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full bg-black/5 px-2 py-1.5 text-[11px] font-semibold text-[#737373]">
              {t("morph.paywall.cancelAnytimeShort", { defaultValue: "Istalgan vaqtda bekor" })}
            </span>
          </div>
          <button
            type="button"
            onClick={onCta}
            disabled={busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#111111] text-[15px] font-extrabold text-white disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                {t("morph.paywall.ctaCards", { defaultValue: "Uzcard / Humo orqali to‘lash" })}
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className="mt-2 h-11 w-full rounded-full bg-black/5 text-sm font-bold"
        >
          {t("common.close", { defaultValue: "Yopish" })}
        </button>
      )}

      {payOpen ? (
        <PaySheet
          busy={busy}
          onClose={() => setPayOpen(false)}
          onPay={() => void startCheckout()}
        />
      ) : null}
    </div>
  );
}

function PaySheet({ busy, onClose, onPay }: { busy: boolean; onClose: () => void; onPay: () => void }) {
  const { t } = useTranslation();
  const steps = [
    t("morph.paywall.payStep1", { defaultValue: "Karta raqami va amal qilish muddatini kiriting" }),
    t("morph.paywall.payStep2", {
      defaultValue: "SMS-kod bilan tasdiqlang — u karta ulangan raqamga keladi",
    }),
    t("morph.paywall.payStep3", { defaultValue: "Ilovaga qayting va Premium oling" }),
  ];
  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-black/40" onClick={onClose}>
      <div
        className="w-full rounded-t-3xl bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 text-[#111111]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="mx-auto h-1 w-10 rounded-full bg-black/15" />
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close", { defaultValue: "Yopish" })}
            className="grid size-8 place-items-center rounded-full bg-black/5"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="text-lg font-extrabold">
          {t("morph.paywall.paySheetTitle", { defaultValue: "Uzcard yoki Humo kartasi bilan to‘lov" })}
        </p>
        <p className="mt-1 text-sm text-[#737373]">
          {t("morph.paywall.paySheetLead", {
            defaultValue:
              "Hozir xavfsiz Payme sahifasi ochiladi. O‘zbekistondagi istalgan bank kartasi — Uzcard yoki Humo — mos keladi.",
          })}
        </p>
        <ol className="mt-3 space-y-1.5 rounded-2xl bg-black/5 p-3">
          {steps.map((line, index) => (
            <li key={line} className="flex items-center gap-2 text-[13px] font-medium">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#111111] text-[11px] font-bold text-white">
                {index + 1}
              </span>
              {line}
            </li>
          ))}
        </ol>
        <button
          type="button"
          disabled={busy}
          onClick={onPay}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#111111] text-[15px] font-extrabold text-white disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : t("morph.paywall.paySheetCta", { defaultValue: "To‘lash" })}
        </button>
      </div>
    </div>
  );
}
