import { Link } from "@tanstack/react-router";
import { CalendarCheck, MessageSquareQuote, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AccountDesktopShell } from "@/components/desktop/pages/AccountDesktopShell";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { PageSpotlightEmpty } from "@/components/ui/PageSpotlightEmpty";
import type { ApiReview } from "@/lib/api/types";
import { cn } from "@/lib/utils";

function ReviewCard({ review, focused }: { review: ApiReview; focused?: boolean }) {
  const dateLabel = new Date(review.created_at).toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article
      id={`review-${review.id}`}
      className={cn(
        "relative overflow-hidden rounded-[24px] border border-border bg-background p-5 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.2)] transition-shadow hover:shadow-[0_14px_40px_-18px_rgba(0,0,0,0.22)]",
        focused && "ring-2 ring-foreground",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface">
            <MessageSquareQuote className="h-5 w-5 text-foreground" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-foreground">{review.author_name}</h3>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {dateLabel}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-surface px-2.5 py-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn("h-3.5 w-3.5", i < review.rating ? "fill-foreground text-foreground" : "text-border")}
              strokeWidth={0}
            />
          ))}
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-foreground/90">{review.text}</p>
    </article>
  );
}

function ReviewsBody({
  reviews,
  loading,
  focus,
}: {
  reviews: ApiReview[];
  loading: boolean;
  focus?: string;
}) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-[24px] bg-surface" />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <PageSpotlightEmpty
        icon={Star}
        tone="cool"
        title={t("reviews.empty")}
        description={t("reviews.emptyHint")}
        action={
          <Link
            to="/bookings"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-3.5 text-sm font-bold text-background transition-transform active:scale-[0.98] hover:opacity-95"
          >
            <CalendarCheck className="h-4 w-4" />
            {t("reviews.emptyAction", { defaultValue: "Buyurtmalarga o'tish" })}
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {reviews.map((r) => (
        <ReviewCard key={r.id} review={r} focused={focus === String(r.id)} />
      ))}
    </div>
  );
}

export function ReviewsMobilePage({
  reviews,
  loading,
  focus,
}: {
  reviews: ApiReview[];
  loading: boolean;
  focus?: string;
}) {
  const { t } = useTranslation();

  return (
    <ProfileSubpageLayout
      title={t("reviews.title")}
      subtitle={t("reviews.subtitle", { defaultValue: "Tashriflaringizdan keyin qoldirgan baholar." })}
    >
      <ReviewsBody reviews={reviews} loading={loading} focus={focus} />
    </ProfileSubpageLayout>
  );
}

export function ReviewsDesktopPage({
  reviews,
  loading,
  focus,
}: {
  reviews: ApiReview[];
  loading: boolean;
  focus?: string;
}) {
  const { t } = useTranslation();

  return (
    <AccountDesktopShell
      wide
      bare
      title={t("reviews.title")}
      subtitle={t("reviews.subtitle", { defaultValue: "Tashriflaringizdan keyin qoldirgan baholar." })}
    >
      <ReviewsBody reviews={reviews} loading={loading} focus={focus} />
    </AccountDesktopShell>
  );
}

export function ReviewsPageShell({
  reviews,
  loading,
  focus,
}: {
  reviews: ApiReview[];
  loading: boolean;
  focus?: string;
}) {
  return (
    <DesktopPageSplit
      mobile={<ReviewsMobilePage reviews={reviews} loading={loading} focus={focus} />}
      desktop={<ReviewsDesktopPage reviews={reviews} loading={loading} focus={focus} />}
    />
  );
}
