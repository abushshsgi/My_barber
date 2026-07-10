import { Link } from "@tanstack/react-router";
import { CalendarCheck, Scissors, Star, Store } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AccountDesktopShell } from "@/components/desktop/pages/AccountDesktopShell";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { PageSpotlightEmpty } from "@/components/ui/PageSpotlightEmpty";
import type { ApiReview } from "@/lib/api/types";
import { cn } from "@/lib/utils";

function reviewTitle(review: ApiReview): string {
  return review.salon_name?.trim() || review.service_name?.trim() || "Salon";
}

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
        "border-b border-border/60 px-4 py-5 last:border-b-0 lg:rounded-[24px] lg:border lg:border-border lg:bg-background lg:p-5 lg:shadow-[0_8px_30px_-18px_rgba(0,0,0,0.2)] lg:last:border-b",
        focused && "ring-2 ring-inset ring-foreground lg:ring-2",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold">{reviewTitle(review)}</h3>
          {review.barber_name ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Scissors className="size-3.5 shrink-0" />
              <span className="truncate">{review.barber_name}</span>
            </p>
          ) : null}
          {review.service_name ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Store className="size-3.5 shrink-0" />
              <span className="truncate">{review.service_name}</span>
            </p>
          ) : null}
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {dateLabel}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-0.5 rounded-full bg-surface px-2.5 py-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-3.5 w-3.5",
                  i < review.rating ? "fill-foreground text-foreground" : "text-border",
                )}
                strokeWidth={0}
              />
            ))}
          </div>
          {review.salon_rating ? (
            <span className="text-[10px] font-semibold text-muted-foreground">
              Salon: {review.salon_rating}/5
            </span>
          ) : null}
        </div>
      </div>
      {review.text ? (
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">{review.text}</p>
      ) : null}
      {review.salon_text ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{review.salon_text}</p>
      ) : null}
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
      <div className="space-y-0 lg:grid lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse border-b border-border/60 bg-surface/40 lg:rounded-[24px] lg:border lg:border-border" />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <PageSpotlightEmpty
        borderless
        centered
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
    <div className="lg:grid lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
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
  backTo,
}: {
  reviews: ApiReview[];
  loading: boolean;
  focus?: string;
  backTo: string;
}) {
  const { t } = useTranslation();

  return (
    <ProfileSubpageLayout
      title={t("reviews.title")}
      subtitle={t("reviews.subtitle", { defaultValue: "Tashriflaringizdan keyin qoldirgan baholar." })}
      backTo={backTo}
      strictBack
      flush
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
      backTo="/profile"
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
  backTo,
}: {
  reviews: ApiReview[];
  loading: boolean;
  focus?: string;
  backTo: string;
}) {
  return (
    <DesktopPageSplit
      mobile={<ReviewsMobilePage reviews={reviews} loading={loading} focus={focus} backTo={backTo} />}
      desktop={<ReviewsDesktopPage reviews={reviews} loading={loading} focus={focus} />}
    />
  );
}
