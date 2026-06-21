import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SalonRatingSummary } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function SalonReviewsSummary({ summary }: { summary: SalonRatingSummary | null }) {
  const { t } = useTranslation();

  if (!summary || summary.reviewCount === 0) return null;

  const maxCount = Math.max(...Object.values(summary.distribution).map(Number), 1);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {summary.isGuestFavorite ? (
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              {t("salon.reviews.guestFavorite")}
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <span className="text-5xl font-bold tabular-nums leading-none">{summary.ratingAvg.toFixed(2)}</span>
            <Star className="mb-1 h-6 w-6 fill-foreground text-foreground" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("salon.reviews.count", { count: summary.reviewCount })}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = Number(summary.distribution[String(star)] ?? 0);
          const width = `${Math.round((count / maxCount) * 100)}%`;
          return (
            <div key={star} className="flex items-center gap-3 text-sm">
              <span className="w-3 font-medium tabular-nums">{star}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-foreground transition-all" style={{ width }} />
              </div>
              <span className="w-6 text-right text-xs text-muted-foreground tabular-nums">{count}</span>
            </div>
          );
        })}
      </div>

      {summary.highlights.length > 0 ? (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {summary.highlights.map((h) => (
            <div
              key={h.code}
              className={cn(
                "shrink-0 rounded-2xl border border-border px-4 py-3",
                "min-w-[140px]",
              )}
            >
              <p className="text-xs text-muted-foreground">{h.label}</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{h.score.toFixed(1)}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
