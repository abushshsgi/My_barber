import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSalonPortfolio, fetchSalonRatingSummary, fetchSalonStaff } from "@/lib/api/salons";
import { fetchSalonReviews } from "@/lib/api/reviews";
import { mapReview } from "@/lib/mappers/review";
import { mapRatingSummary, mapStaffToBarber } from "@/lib/mappers/salon";
import { mergeRatingSummary } from "@/lib/salon-rating-summary";
import { useSalonDetail } from "@/hooks/use-salons";
import { useRecommendContext } from "@/hooks/use-recommend-context";
import { matchBarberGender, useAudience } from "@/hooks/use-audience";
import { haversineKm } from "@/lib/recommendations";
import i18n from "@/i18n/config";

export function useSalonPage(id: string) {
  const detail = useSalonDetail(id);
  const ctx = useRecommendContext();
  const { audience } = useAudience();
  const lang = i18n.language?.split("-")[0] ?? "uz";
  const detailReady = Boolean(detail.data);

  const staffRaw = useQuery({
    queryKey: ["salons", id, "staff", audience],
    queryFn: () =>
      fetchSalonStaff(id, audience === "all" ? undefined : { audience }),
    enabled: detailReady,
    staleTime: 60_000,
  });

  const staffMapped = useMemo(() => {
    const rows = Array.isArray(staffRaw.data) ? staffRaw.data : [];
    const services = detail.data?.services ?? [];
    return rows
      .map((r) => mapStaffToBarber(r, id, services))
      .filter((b) => matchBarberGender(b.gender, audience));
  }, [staffRaw.data, detail.data?.services, id, audience]);

  const reviews = useQuery({
    queryKey: ["reviews", "salon", id],
    queryFn: async () => (await fetchSalonReviews(id)).map(mapReview),
    enabled: detailReady,
    retry: 1,
    staleTime: 60_000,
  });

  const portfolio = useQuery({
    queryKey: ["salons", id, "portfolio"],
    queryFn: async () => {
      const rows = await fetchSalonPortfolio(id);
      return rows.map((r) => r.image).filter(Boolean) as string[];
    },
    enabled: detailReady,
    staleTime: 60_000,
  });

  const ratingSummary = useQuery({
    queryKey: ["salons", id, "rating-summary", lang],
    queryFn: async () => {
      try {
        return mapRatingSummary(await fetchSalonRatingSummary(id, lang));
      } catch {
        return null;
      }
    },
    enabled: detailReady,
    retry: false,
    staleTime: 60_000,
  });

  const apiReviews = reviews.data ?? [];
  const base = detail.data;
  const resolvedReviews = apiReviews;

  const resolvedSummary = base
    ? mergeRatingSummary(ratingSummary.data, resolvedReviews, base.rating, lang)
    : null;

  const salon = useMemo(() => {
    if (!base) return null;
    let distanceKm = base.distanceKm || 0;
    if (
      base.lat &&
      base.lng &&
      ctx.lat != null &&
      ctx.lng != null &&
      Number.isFinite(ctx.lat) &&
      Number.isFinite(ctx.lng)
    ) {
      distanceKm = Math.round(haversineKm(ctx.lat, ctx.lng, base.lat, base.lng) * 10) / 10;
    }
    return {
      ...base,
      distanceKm,
      staff: staffMapped,
      reviews: resolvedReviews,
      portfolio: (() => {
        const gallery = base.portfolio ?? [];
        const work = (portfolio.data ?? [])
          .map((u) => u?.trim())
          .filter(Boolean) as string[];
        const merged = [...gallery, ...work];
        return merged.filter((url, i, arr) => arr.indexOf(url) === i);
      })(),
      ratingSummary: resolvedSummary,
    };
  }, [base, staffMapped, resolvedReviews, portfolio.data, resolvedSummary, ctx.lat, ctx.lng]);

  return {
    salon,
    reviewsAreMock: false,
    isLoading: detail.isLoading,
    error: detail.error ?? staffRaw.error,
  };
}
