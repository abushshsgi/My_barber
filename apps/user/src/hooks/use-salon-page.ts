import { useQuery } from "@tanstack/react-query";
import { fetchSalonPortfolio, fetchSalonRatingSummary, fetchSalonStaff } from "@/lib/api/salons";
import { fetchSalonReviews } from "@/lib/api/reviews";
import { mapReview } from "@/lib/mappers/review";
import { authQueryEnabled } from "@/lib/auth-query";
import { mapRatingSummary, mapStaffToBarber } from "@/lib/mappers/salon";
import { mergeRatingSummary } from "@/lib/salon-rating-summary";
import { useSalonDetail } from "@/hooks/use-salons";
import i18n from "@/i18n/config";

export function useSalonPage(id: string) {
  const detail = useSalonDetail(id);
  const lang = i18n.language?.split("-")[0] ?? "uz";

  const staff = useQuery({
    queryKey: ["salons", id, "staff"],
    queryFn: async () => {
      const rows = await fetchSalonStaff(id);
      const serviceIds = detail.data?.services.map((s) => s.id) ?? [];
      return rows.map((r) => mapStaffToBarber(r, id, serviceIds));
    },
    enabled: authQueryEnabled(Boolean(id) && Boolean(detail.data)),
  });

  const reviews = useQuery({
    queryKey: ["reviews", "salon", id],
    queryFn: async () => (await fetchSalonReviews(id)).map(mapReview),
    enabled: Boolean(id),
    retry: 1,
    staleTime: 60_000,
  });

  const portfolio = useQuery({
    queryKey: ["salons", id, "portfolio"],
    queryFn: async () => {
      const rows = await fetchSalonPortfolio(id);
      return rows.map((r) => r.image).filter(Boolean) as string[];
    },
    enabled: authQueryEnabled(Boolean(id)),
  });

  const ratingSummary = useQuery({
    queryKey: ["salons", id, "rating-summary", lang],
    queryFn: async () => mapRatingSummary(await fetchSalonRatingSummary(id, lang)),
    enabled: Boolean(id),
    retry: 1,
    staleTime: 60_000,
  });

  const apiReviews = reviews.data ?? [];
  const base = detail.data;
  const resolvedReviews = apiReviews;

  const resolvedSummary = base
    ? mergeRatingSummary(ratingSummary.data, resolvedReviews, base.rating, lang)
    : null;

  const salon = base
    ? {
        ...base,
        staff: staff.data ?? [],
        reviews: resolvedReviews,
        portfolio: portfolio.data?.length ? portfolio.data : base.portfolio,
        ratingSummary: resolvedSummary,
      }
    : null;

  return {
    salon,
    reviewsAreMock: false,
    isLoading: detail.isLoading,
    error: detail.error,
  };
}
