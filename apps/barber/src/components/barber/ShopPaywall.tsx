import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { shopPlanLabel } from "@/hooks/use-shop-subscription";
import type { ShopPlanCode } from "@/lib/shop-subscription";
import { cn } from "@/lib/utils";

export function ShopPaywall({
  title = "Bu bo'lim obuna talab qiladi",
  description = "Joriy tarifda bu funksiya yo'q yoki obuna faol emas. Tarifni yangilang.",
  requiredPlan,
  className,
}: {
  title?: string;
  description?: string;
  requiredPlan?: ShopPlanCode | string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card p-8 sm:p-10 text-center shadow-card",
        "animate-in fade-in zoom-in-95 duration-500",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-100/40 via-transparent to-stone-100/50"
      />
      <div className="relative mx-auto flex size-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-md">
        <Lock className="size-6" />
      </div>
      <h2 className="relative mt-5 font-heading text-xl font-semibold">{title}</h2>
      <p className="relative mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
        {description}
        {requiredPlan ? (
          <>
            {" "}
            Tavsiya: <strong>{shopPlanLabel(requiredPlan)}</strong>.
          </>
        ) : null}
      </p>
      <Link
        to="/barber/subscription"
        className="relative mt-6 inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
      >
        <Sparkles className="size-4" />
        Tariflarni ko'rish
      </Link>
    </div>
  );
}
