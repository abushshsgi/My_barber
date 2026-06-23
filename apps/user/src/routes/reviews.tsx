import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMyReviews } from "@/hooks/use-reviews-api";
import { ReviewsPageShell } from "@/components/reviews/ReviewsPageContent";

type ReviewsSearch = { focus?: string };

export const Route = createFileRoute("/reviews")({
  validateSearch: (search: Record<string, unknown>): ReviewsSearch => ({
    focus: typeof search.focus === "string" ? search.focus : undefined,
  }),
  head: () => ({ meta: [{ title: "Sharhlarim — mysaloon.uz" }] }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const { focus } = Route.useSearch();
  const { data: userReviews = [], isLoading } = useMyReviews();

  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(`review-${focus}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focus]);

  return <ReviewsPageShell reviews={userReviews} loading={isLoading} focus={focus} />;
}
