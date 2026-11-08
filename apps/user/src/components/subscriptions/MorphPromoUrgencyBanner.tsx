import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSubscriptionMe } from "@/hooks/use-subscription";
import { nextUpgradePlan } from "@/lib/subscription-upgrade";
import { cn } from "@/lib/utils";

type Props = {
  onNavigate?: () => void;
  className?: string;
  variant?: "glass" | "card" | "dark";
};

/** Faol obunachi — faqat Plus/Pro upgrade. Chegirma yo'q. */
export function MorphPromoUrgencyBanner({ onNavigate, className, variant = "glass" }: Props) {
  const { t } = useTranslation();
  const meQ = useSubscriptionMe();
  const me = meQ.data;
  if (!me || me.has_active !== true) return null;

  const code = me.subscription?.plan_code ?? null;
  const next = nextUpgradePlan(code);
  const glass = variant === "glass" || variant === "dark";

  if (!next) return null;
  return (
      <Link
        to="/subscriptions"
        search={{
          plan: next,
          returnTo: "/ai-style",
        }}
        onClick={onNavigate}
        className={cn(
          "group relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 transition-opacity active:opacity-90",
          glass
            ? "border-black/[0.08] bg-white/45 text-foreground shadow-[0_1px_0_rgba(255,255,255,0.55)_inset] backdrop-blur-xl"
            : "border-border/70 bg-background/90 text-foreground backdrop-blur-md",
          className,
        )}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("aiStylePage.limitSheet.plansUpgrade")}
          </p>
          <p className="mt-1 text-[14px] font-semibold leading-snug tracking-tight">
            {t("aiStylePage.limitSheet.upgradeTo", { plan: next === "plus" ? "Plus" : "Pro" })}
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Ko‘proq Morf AI limit va imkoniyatlar.
          </p>
        </div>
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white/50 text-foreground/70">
          <ArrowUpRight className="size-3.5" strokeWidth={2} />
        </span>
      </Link>
  );
}
