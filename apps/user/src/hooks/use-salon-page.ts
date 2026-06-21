import { useQuery } from "@tanstack/react-query";
import { fetchSalonPortfolio, fetchSalonRatingSummary, fetchSalonStaff } from "@/lib/api/salons";
import { fetchSalonReviews } from "@/lib/api/reviews";
import { mapReview } from "@/lib/mappers/review";
import { authQueryEnabled } from "@/lib/auth-query";
import { mapRatingSummary, mapStaffToBarber } from "@/lib/mappers/salon";
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
    enabled: authQueryEnabled(Boolean(id)),
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
    enabled: authQueryEnabled(Boolean(id)),
  });

  const salon = detail.data
    ? {
        ...detail.data,
        staff: staff.data ?? [],
        reviews: reviews.data ?? [],
        portfolio: portfolio.data?.length ? portfolio.data : detail.data.portfolio,
        ratingSummary: ratingSummary.data ?? null,
      }
    : null;

  return {
    salon,
    isLoading: detail.isLoading,
    error: detail.error,
  };
}
