import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  ChevronRight,
  Crown,
  Droplets,
  Sparkles,
  Users,
  Wand2,
  Zap,
} from "lucide-react";
import type { ComponentType } from "react";
import type { SubscriptionPlan } from "@/lib/api/subscriptions";
import { cn } from "@/lib/utils";

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

const PLAN_ICONS: Record<string, IconType> = {
  starter: Zap,
  plus: Sparkles,
  pro: Crown,
};

const FEATURE_ICONS: Record<string, IconType> = {
  morph_ai: Sparkles,
  studio: Wand2,
  family: Users,
  care: Droplets,
  badge: BadgeCheck,
  priority: Crown,
};

function formatUzs(n: number) {
  return `${n.toLocaleString("uz-UZ")} so'm`;
}

function PlanIcon({ code, className }: { code: string; className?: string }) {
  const Icon = PLAN_ICONS[code] ?? Sparkles;
  return <Icon className={className} strokeWidth={2} />;
}

export function FeatureIcon({
  featureKey,
  className,
}: {
  featureKey: string;
  className?: string;
}) {
  const Icon = FEATURE_ICONS[featureKey] ?? CheckFallback;
  return <Icon className={className} strokeWidth={2.25} />;
}

function CheckFallback({ className, strokeWidth }: { className?: string; strokeWidth?: number }) {
  return <BadgeCheck className={className} strokeWidth={strokeWidth} />;
}

type AdsProps = {
  plans: SubscriptionPlan[];
  activeCode?: string | null;
  onNavigate?: () => void;
  /** compact = horizontal scroll chips; cards = full promo grid */
  variant?: "cards" | "strip";
  className?: string;
};

/** Obuna tariflarini reklama qiluvchi kartalar — ikonka + narx + link. */
export function SubscriptionPlanAds({
  plans,
  activeCode = null,
  onNavigate,
  variant = "cards",
  className,
}: AdsProps) {
  const sorted = [...plans].sort((a, b) => a.sort_order - b.sort_order);

  if (variant === "strip") {
    return (
      <div className={cn("no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1", className)}>
        {sorted.map((plan) => {
          const isActive = activeCode === plan.code;
          return (
            <Link
              key={plan.code}
              to="/wallet"
              search={{ section: "subscriptions" }}
              onClick={onNavigate}
              className={cn(
                "flex min-w-[148px] shrink-0 flex-col gap-2 rounded-2xl border px-3.5 py-3 transition-[transform,background-color] active:scale-[0.98]",
                plan.highlight
                  ? "border-white/25 bg-white text-[#0a0a0a]"
                  : "border-white/15 bg-white/[0.05] text-white hover:bg-white/[0.08]",
                isActive && "ring-2 ring-white/60",
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-xl",
                    plan.highlight ? "bg-black/10" : "bg-white/10",
                  )}
                >
                  <PlanIcon code={plan.code} className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold leading-tight">{plan.name_uz}</span>
                  {plan.highlight ? (
                    <span className="text-[10px] font-bold uppercase tracking-wide opacity-60">
                      Mashhur
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="text-[12px] font-semibold tabular-nums opacity-80">
                {formatUzs(plan.price_uzs)}
                <span className="font-medium opacity-60"> / oy</span>
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-[11px] font-bold",
                  plan.highlight ? "text-black/70" : "text-white/70",
                )}
              >
                Ochish
                <ChevronRight className="size-3.5" strokeWidth={2.5} />
              </span>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-2.5", className)}>
      {sorted.map((plan) => {
        const isActive = activeCode === plan.code;
        const highlights = plan.features.filter((f) => f.included !== false).slice(0, 3);
        return (
          <Link
            key={plan.code}
            to="/wallet"
            search={{ section: "subscriptions" }}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-stretch gap-3 overflow-hidden rounded-[22px] border p-3.5 transition-[transform,background-color] active:scale-[0.985]",
              plan.highlight
                ? "border-white/30 bg-white text-[#0a0a0a] shadow-[0_14px_36px_-18px_rgba(255,255,255,0.35)]"
                : "border-white/12 bg-white/[0.04] text-white hover:bg-white/[0.07]",
              isActive && "ring-2 ring-white/50",
            )}
          >
            <span
              className={cn(
                "grid size-12 shrink-0 place-items-center self-center rounded-2xl",
                plan.highlight ? "bg-black text-white" : "bg-white/10 text-white",
              )}
            >
              <PlanIcon code={plan.code} className="size-5" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-bold tracking-tight">{plan.name_uz}</span>
                {plan.highlight ? (
                  <span className="rounded-full bg-black px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                    Mashhur
                  </span>
                ) : null}
                {isActive ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                      plan.highlight ? "bg-black/10 text-black" : "bg-white/15 text-white",
                    )}
                  >
                    Joriy
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  "mt-0.5 block text-[13px] font-semibold tabular-nums",
                  plan.highlight ? "text-black/70" : "text-white/70",
                )}
              >
                {formatUzs(plan.price_uzs)}
                <span className="font-medium opacity-60"> / oy</span>
              </span>
              <span className="mt-2 flex flex-wrap gap-1.5">
                {highlights.map((f) => (
                  <span
                    key={f.key}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      plan.highlight ? "bg-black/8 text-black/75" : "bg-white/10 text-white/70",
                    )}
                  >
                    <FeatureIcon featureKey={f.key} className="size-3 shrink-0" />
                    <span className="max-w-[9.5rem] truncate">{f.label_uz}</span>
                  </span>
                ))}
              </span>
            </span>

            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center self-center rounded-full transition-transform group-hover:translate-x-0.5",
                plan.highlight ? "bg-black text-white" : "bg-white/10 text-white",
              )}
            >
              <ChevronRight className="size-4" strokeWidth={2.5} />
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/** Morph AI home / sahifalar uchun qisqa promo banner. */
export function SubscriptionPromoBanner({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <Link
      to="/wallet"
      search={{ section: "subscriptions" }}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-foreground px-4 py-3.5 text-background",
        "active:scale-[0.99]",
        className,
      )}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-background/15">
        <Crown className="size-5" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold leading-snug">Morph AI obunalari</span>
        <span className="mt-0.5 block text-[11px] font-medium opacity-70">
          Starter · Plus · Pro — tanlang va oching
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 opacity-70" strokeWidth={2.25} />
    </Link>
  );
}
