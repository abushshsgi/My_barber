import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMyReviews } from "@/hooks/use-reviews-api";
import { ReviewsPageShell } from "@/components/reviews/ReviewsPageContent";
import { resolveActivityBackTo } from "@/lib/activity-nav";

type ReviewsSearch = { focus?: string; backTo?: string };

export const Route = createFileRoute("/reviews")({
  validateSearch: (search: Record<string, unknown>): ReviewsSearch => ({
    focus: typeof search.focus === "string" ? search.focus : undefined,
    backTo: typeof search.backTo === "string" ? search.backTo : undefined,
  }),
  head: () => ({ meta: [{ title: "Sharhlarim — mysaloon.uz" }] }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const search = Route.useSearch();
  const { focus } = search;
  const backTo = resolveActivityBackTo(search, "/profile");
  const { data: userReviews = [], isLoading } = useMyReviews();

  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(`review-${focus}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focus]);

  return <ReviewsPageShell reviews={userReviews} loading={isLoading} focus={focus} backTo={backTo} />;
}
