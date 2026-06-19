import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMyReviews } from "@/hooks/use-reviews-api";
import { ProfileSubpageCard, ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

type ReviewsSearch = { focus?: string };

export const Route = createFileRoute("/reviews")({
  validateSearch: (search: Record<string, unknown>): ReviewsSearch => ({
    focus: typeof search.focus === "string" ? search.focus : undefined,
  }),
  head: () => ({ meta: [{ title: "Sharhlarim — mysaloon.uz" }] }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const { t } = useTranslation();
  const { focus } = Route.useSearch();
  const { data: userReviews = [], isLoading } = useMyReviews();

  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(`review-${focus}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focus]);

  return (
    <ProfileSubpageLayout title={t("reviews.title")}>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : userReviews.length === 0 ? (
          <EmptyState
            icon={<Star className="h-7 w-7" />}
            title={t("reviews.empty")}
            description={t("reviews.emptyHint")}
            action={
              <Link to="/bookings" className="rounded-2xl bg-foreground px-5 py-3 text-sm font-bold text-background">
                {t("bookings.title")}
              </Link>
            }
          />
        ) : (
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {userReviews.map((r) => (
              <ProfileSubpageCard
                key={r.id}
                id={`review-${r.id}`}
                className={cn(focus === String(r.id) && "ring-2 ring-foreground")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold">{r.author_name}</h3>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn("h-3.5 w-3.5", i < r.rating ? "fill-foreground" : "text-border")}
                        strokeWidth={0}
                      />
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed">{r.text}</p>
                <p className="mt-2 text-[11px] font-bold text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("uz-UZ", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </ProfileSubpageCard>
            ))}
          </div>
        )}
    </ProfileSubpageLayout>
  );
}
