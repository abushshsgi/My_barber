import { CLIENT_IMPRESSION_OPTIONS, normalizeImpressionStats } from "@/lib/client-impressions";
import { cn } from "@/lib/utils";

type Props = {
  stats?: Record<string, number> | null;
  className?: string;
  size?: "sm" | "md";
};

/** Sartarosh belgilagan mijoz ifodalari (faqat joriy sartarosh). */
export function ClientImpressionBadges({ stats, className, size = "sm" }: Props) {
  const normalized = normalizeImpressionStats(stats);
  const items = CLIENT_IMPRESSION_OPTIONS.filter((opt) => (normalized[opt.kind] ?? 0) > 0);
  if (!items.length) return null;

  const iconClass = size === "md" ? "size-5" : "size-4";
  const badgeClass = size === "md" ? "h-9 min-w-9 px-2" : "h-7 min-w-7 px-1.5";

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {items.map(({ kind, icon: Icon }) => (
        <span
          key={kind}
          title={`${normalized[kind]} marta`}
          className={cn(
            "inline-flex items-center justify-center gap-1 rounded-full border border-border bg-muted/60 text-foreground",
            badgeClass,
          )}
        >
          <Icon className={iconClass} strokeWidth={1.75} />
          <span className="text-[10px] font-bold tabular-nums">{normalized[kind]}</span>
        </span>
      ))}
    </div>
  );
}
