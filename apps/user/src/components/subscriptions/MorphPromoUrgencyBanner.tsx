import { Link } from "@tanstack/react-router";
import { ChevronRight, Flame, Ticket } from "lucide-react";
import { useSubscriptionPromos } from "@/hooks/use-subscription";
import { PromoCountdown } from "@/components/subscriptions/PromoCountdown";
import { cn } from "@/lib/utils";

type Props = {
  onNavigate?: () => void;
  className?: string;
  /** Dark strip (Morph home) vs light card */
  variant?: "dark" | "card";
};

/**
 * Muddatli Morph promo — countdown + «Ulgutib qoling».
 */
export function MorphPromoUrgencyBanner({ onNavigate, className, variant = "dark" }: Props) {
  const promosQ = useSubscriptionPromos();
  const promo = promosQ.data?.[0] ?? null;
  const code = promo?.code ?? "MORPH30";
  const pct = promo?.discount_pct ?? 30;
  const urgency = promo?.urgency_uz ?? "Ulgutib qoling — muddat tugayapti";
  const endsAt = promo?.ends_at ?? null;
  const expired = promo != null && (promo.seconds_left ?? 1) <= 0;

  if (expired) return null;

  const dark = variant === "dark";

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
        "group relative flex flex-col gap-3 overflow-hidden rounded-[22px] border px-4 py-4 transition-[transform] active:scale-[0.99]",
        dark
          ? "border-white/15 bg-[#0a0a0a] text-white"
          : "border-border bg-foreground text-background",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl"
      />

      <div className="relative flex items-start gap-3">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-2xl",
            dark ? "bg-white text-black" : "bg-background text-foreground",
          )}
        >
          <Flame className="size-5" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[10px] font-bold uppercase tracking-[0.18em]",
              dark ? "text-white/50" : "text-background/55",
            )}
          >
            Cheklangan aksiya
          </p>
          <p className="mt-1 text-[15px] font-bold leading-snug tracking-tight">
            {urgency}
          </p>
          <p
            className={cn(
              "mt-1 text-[12px] font-medium",
              dark ? "text-white/65" : "text-background/65",
            )}
          >
            <span className="inline-flex items-center gap-1 font-bold">
              <Ticket className="size-3.5" strokeWidth={2.25} />
              {code}
            </span>
            {" · "}−{pct}% · birinchi to‘lov
          </p>
        </div>
        <ChevronRight
          className={cn(
            "mt-1 size-5 shrink-0 transition-transform group-hover:translate-x-0.5",
            dark ? "text-white/50" : "text-background/50",
          )}
          strokeWidth={2.25}
        />
      </div>

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <PromoCountdown
          endsAt={endsAt}
          initialSecondsLeft={promo?.seconds_left}
          inverted
        />
        <span
          className={cn(
            "inline-flex h-10 items-center rounded-xl px-3.5 text-[12px] font-bold",
            dark ? "bg-white text-black" : "bg-background text-foreground",
          )}
        >
          Hozir ochish
        </span>
      </div>
    </Link>
  );
}
