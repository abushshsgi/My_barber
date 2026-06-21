import { useState } from "react";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Review, SalonRatingSummary } from "@/lib/mock-data";
import { SalonLaurel, formatSalonRating } from "@/components/salon/SalonLaurel";
import { SalonReviewsList } from "@/components/salon/SalonReviewsList";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const PREVIEW_COUNT = 4;

function DistributionBars({ summary }: { summary: SalonRatingSummary }) {
  const maxCount = Math.max(...Object.values(summary.distribution).map(Number), 1);

  return (
    <div className="space-y-2.5">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = Number(summary.distribution[String(star)] ?? 0);
        const width = `${Math.round((count / maxCount) * 100)}%`;
        return (
          <div key={star} className="flex items-center gap-3 text-sm">
            <span className="w-3 font-medium tabular-nums">{star}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-foreground/90 transition-all" style={{ width }} />
            </div>
            <span className="w-8 text-right text-xs text-muted-foreground tabular-nums">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export function SalonReviewsSection({
  summary,
  reviews,
  isMock = false,
}: {
  summary: SalonRatingSummary | null;
  reviews: Review[];
  isMock?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!summary || summary.reviewCount === 0 || !reviews.length) return null;

  const preview = reviews.slice(0, PREVIEW_COUNT);
  const showGuestBadge = summary.isGuestFavorite || summary.ratingAvg >= 4.5;

  return (
    <div className="space-y-8">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border px-6 py-10 text-center",
          "bg-gradient-to-b from-muted/40 via-background to-background",
        )}
      >
        <div className="mx-auto flex max-w-lg flex-col items-center">
          <div className="flex items-center justify-center gap-3 sm:gap-5">
            <SalonLaurel className="h-14 w-8 sm:h-16 sm:w-9" />
            <span className="text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl">
              {formatSalonRating(summary.ratingAvg, i18n.language)}
            </span>
            <SalonLaurel className="h-14 w-8 sm:h-16 sm:w-9" mirrored />
          </div>

          {showGuestBadge ? (
            <h3 className="mt-5 text-xl font-bold tracking-tight sm:text-2xl">
              {t("salon.reviews.guestFavorite")}
            </h3>
          ) : (
            <h3 className="mt-5 text-xl font-bold tracking-tight">
              {t("salon.reviews.ratingTitle", { defaultValue: "Mehmonlar bahosi" })}
            </h3>
          )}

          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {t("salon.reviews.guestFavoriteDesc")}
          </p>

          <p className="mt-2 text-xs text-muted-foreground">
            {t("salon.reviews.count", { count: summary.reviewCount })}
            {isMock ? (
              <span className="ml-1.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                demo
              </span>
            ) : null}
          </p>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-6 text-sm font-semibold underline underline-offset-4 transition-opacity hover:opacity-70"
          >
            {t("salon.reviews.showAllRatings")}
          </button>
        </div>
      </div>

      {summary.highlights.length > 0 ? (
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
          {summary.highlights.map((h) => (
            <div
              key={h.code}
              className="min-w-[128px] shrink-0 rounded-xl border border-border bg-background px-4 py-3 shadow-sm"
            >
              <p className="text-xs text-muted-foreground">{h.label}</p>
              <div className="mt-1 flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-foreground" />
                <span className="text-lg font-bold tabular-nums">{h.score.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <SalonReviewsList reviews={preview} compact />

      {reviews.length > PREVIEW_COUNT ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-xl border border-border bg-muted/30 py-3.5 text-sm font-semibold transition-colors hover:bg-muted/60"
        >
          {t("salon.reviews.showAllReviews", { count: reviews.length })}
        </button>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-left text-xl font-semibold">
              {t("salon.reviews.allRatingsTitle")}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-center gap-4 py-2">
            <SalonLaurel className="h-12 w-7" />
            <span className="text-4xl font-semibold tabular-nums">
              {formatSalonRating(summary.ratingAvg, i18n.language)}
            </span>
            <SalonLaurel className="h-12 w-7" mirrored />
          </div>

          <DistributionBars summary={summary} />

          <div className="mt-6 border-t border-border pt-6">
            <SalonReviewsList reviews={reviews} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
