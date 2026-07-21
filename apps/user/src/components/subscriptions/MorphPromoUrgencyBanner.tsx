import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useSubscriptionPromos } from "@/hooks/use-subscription";
import { PromoCountdown } from "@/components/subscriptions/PromoCountdown";
import { cn } from "@/lib/utils";

type Props = {
  onNavigate?: () => void;
  className?: string;
  /** glass = Morph home (shaffof); card = settings panel */
  variant?: "glass" | "card" | "dark";
};

/**
 * Muddatli Morph promo — countdown + «Ulgutib qoling».
 * Katta kompaniya uslubi: shaffof, jimjiq, ortiqcha dekoratsiyasiz.
 */
export function MorphPromoUrgencyBanner({ onNavigate, className, variant = "glass" }: Props) {
  const promosQ = useSubscriptionPromos();
  const promo = promosQ.data?.[0] ?? null;
  const code = promo?.code ?? "MORPH30";
  const pct = promo?.discount_pct ?? 30;
  const urgency = promo?.urgency_uz ?? "Ulgutib qoling — muddat tugayapti";
  const endsAt = promo?.ends_at ?? null;
  const expired = promo != null && (promo.seconds_left ?? 1) <= 0;

  if (expired) return null;

  const glass = variant === "glass" || variant === "dark";

  return (
    <Link
      to="/wallet"
      search={{
        section: "subscriptions",
        plan: "starter",
        returnTo: "/ai-style",
        promo: code,
      }}
      onClick={onNavigate}
      className={cn(
        "group relative flex flex-col gap-3.5 overflow-hidden rounded-2xl border px-4 py-3.5 transition-opacity active:opacity-90",
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
              Cheklangan aksiya
            </p>
            <span className="rounded-md border border-black/[0.08] bg-black/[0.03] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground/80">
              −{pct}%
            </span>
          </div>
          <p className="mt-1.5 text-[14px] font-semibold leading-snug tracking-tight text-foreground">
            {urgency}
          </p>
          <p className="mt-1 text-[12px] font-medium text-muted-foreground">
            <span className="font-semibold text-foreground/85">{code}</span>
            {" · "}birinchi to‘lov
          </p>
        </div>
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white/50 text-foreground/70 transition-colors group-hover:border-black/15 group-hover:text-foreground">
          <ArrowUpRight className="size-3.5" strokeWidth={2} />
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] pt-3">
        <PromoCountdown endsAt={endsAt} initialSecondsLeft={promo?.seconds_left} tone="ghost" />
        <span className="text-[12px] font-semibold tracking-tight text-foreground/80 transition-colors group-hover:text-foreground">
          Hozir ochish
        </span>
      </div>
    </Link>
  );
}
