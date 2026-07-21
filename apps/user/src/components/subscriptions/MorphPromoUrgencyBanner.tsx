import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useSubscriptionMe } from "@/hooks/use-subscription";
import { nextUpgradePlan, upgradeCtaLabel } from "@/lib/subscription-upgrade";
import { cn } from "@/lib/utils";

type Props = {
  onNavigate?: () => void;
  className?: string;
  variant?: "glass" | "card" | "dark";
};

/**
 * Yangi user (obunasiz) — 24 soatlik chegirma.
 * Faol obunachi — faqat Plus/Pro upgrade (obuna ol reklamalari yo'q).
 */
export function MorphPromoUrgencyBanner({ onNavigate, className, variant = "glass" }: Props) {
  const meQ = useSubscriptionMe();
  const me = meQ.data;
  if (!me) return null;

  const hasActive = me.has_active === true;
  const offer = me.welcome_offer;
  const code = me.subscription?.plan_code ?? null;
  const next = nextUpgradePlan(code);
  const glass = variant === "glass" || variant === "dark";

  if (hasActive) {
    if (!next) return null;
    return (
      <Link
        to="/wallet"
        search={{
          section: "subscriptions",
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
            Upgrade
          </p>
          <p className="mt-1 text-[14px] font-semibold leading-snug tracking-tight">
            {upgradeCtaLabel(code, true)}
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Ko‘proq Morph AI limit va imkoniyatlar.
          </p>
        </div>
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white/50 text-foreground/70">
          <ArrowUpRight className="size-3.5" strokeWidth={2} />
        </span>
      </Link>
    );
  }

  if (!offer?.eligible) return null;

  return (
    <Link
      to="/wallet"
      search={{
        section: "subscriptions",
        plan: "plus",
        returnTo: "/ai-style",
      }}
      onClick={onNavigate}
      className={cn(
        "group relative flex flex-col gap-2 overflow-hidden rounded-2xl border px-4 py-3.5 transition-opacity active:opacity-90",
        glass
          ? "border-black/[0.08] bg-white/45 text-foreground shadow-[0_1px_0_rgba(255,255,255,0.55)_inset] backdrop-blur-xl"
          : "border-border/70 bg-background/90 text-foreground backdrop-blur-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Yangi hisob
            </p>
            <span className="rounded-md border border-black/[0.08] bg-black/[0.03] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground/80">
              −{offer.discount_pct}%
            </span>
          </div>
          <p className="mt-1.5 text-[14px] font-semibold leading-snug tracking-tight text-foreground">
            {offer.label_uz}
          </p>
          <p className="mt-1 text-[12px] font-medium text-muted-foreground">
            {offer.hint_uz}
          </p>
        </div>
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white/50 text-foreground/70 transition-colors group-hover:border-black/15 group-hover:text-foreground">
          <ArrowUpRight className="size-3.5" strokeWidth={2} />
        </span>
      </div>
      <div className="flex items-center justify-end border-t border-black/[0.06] pt-2.5">
        <span className="text-[12px] font-semibold tracking-tight text-foreground/80">
          Tariflarni ko‘rish
        </span>
      </div>
    </Link>
  );
}
