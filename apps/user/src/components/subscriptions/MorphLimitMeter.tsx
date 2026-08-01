import { Link } from "@tanstack/react-router";
import { useSubscriptionMe } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";

/** Compact Morph AI usage meter for Morph home / explore. */
export function MorphLimitMeter({
  className,
  tone = "auto",
}: {
  className?: string;
  /** Force OLED styling on Morph home (independent of app theme). */
  tone?: "auto" | "oled";
}) {
  const meQ = useSubscriptionMe();
  const me = meQ.data;
  if (!me?.has_active) return null;

  const used = me.usage.morph_ai_used;
  const limit = me.usage.morph_ai_limit;
  if (limit <= 0) return null;

  const remaining = me.usage.morph_ai_remaining;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const low = remaining <= Math.max(1, Math.floor(limit * 0.2));
  const oled = tone === "oled";

  return (
    <div
      className={cn(
        "rounded-2xl border px-3.5 py-3",
        oled
          ? low
            ? "border-[#CA8A04]/35 bg-[#CA8A04]/10"
            : "border-white/10 bg-white/[0.04]"
          : low
            ? "border-amber-500/35 bg-amber-500/10"
            : "border-border bg-card",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
        <span
          className={cn(
            "uppercase tracking-[0.14em]",
            oled ? "text-white/45" : "text-muted-foreground",
          )}
        >
          Morph AI
        </span>
        <span className={cn("tabular-nums", oled ? "text-white" : "text-foreground")}>
          {remaining}/{limit} qoldi
        </span>
      </div>
      <div className={cn("mt-2 h-1.5 overflow-hidden rounded-full", oled ? "bg-white/10" : "bg-muted")}>
        <div
          className={cn("h-full rounded-full", oled ? "bg-[#CA8A04]" : "bg-foreground")}
          style={{ width: `${pct}%` }}
        />
      </div>
      {low ? (
        <Link
          to="/wallet"
          search={{ section: "subscriptions", plan: "plus", returnTo: "/ai-style" }}
          className={cn(
            "mt-2 inline-flex text-[11px] font-bold underline-offset-2 hover:underline",
            oled ? "text-[#CA8A04]" : "text-foreground",
          )}
        >
          Limit tugayapti — Plus ga o‘ting
        </Link>
      ) : null}
    </div>
  );
}
