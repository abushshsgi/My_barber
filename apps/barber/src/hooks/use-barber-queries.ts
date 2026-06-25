import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiJson, apiList } from "@/lib/api";

export const barberQueryKeys = {
  all: ["barber"] as const,
  services: () => [...barberQueryKeys.all, "services"] as const,
  bookings: () => [...barberQueryKeys.all, "bookings"] as const,
  clients: (mode: string, salonId: number | null) =>
    [...barberQueryKeys.all, "clients", mode, salonId] as const,
  notifications: () => [...barberQueryKeys.all, "notifications"] as const,
  finance: () => [...barberQueryKeys.all, "finance"] as const,
  reviews: () => [...barberQueryKeys.all, "reviews"] as const,
  analytics: (params: string) => [...barberQueryKeys.all, "analytics", params] as const,
  payouts: () => [...barberQueryKeys.all, "payouts"] as const,
  payoutBalance: () => [...barberQueryKeys.all, "payout-balance"] as const,
  catalogServices: () => [...barberQueryKeys.all, "catalog-services"] as const,
  recommendations: () => [...barberQueryKeys.all, "service-recommendations"] as const,
  onboarding: () => [...barberQueryKeys.all, "onboarding"] as const,
};

export type ApiBarberService = {
  id: number;
  catalog_service: number | null;
  name: string;
  price: string | number;
  duration_minutes: number;
  is_active: boolean;
  image_url?: string | null;
  barber?: number | null;
};

export function useBarberServicesQuery(enabled = true) {
  return useQuery({
    queryKey: barberQueryKeys.services(),
    queryFn: () => apiList<ApiBarberService>("/api/v1/barber/services/"),
    enabled,
    staleTime: 30_000,
  });
}

export function useServiceRecommendationsQuery(enabled = true) {
  return useQuery({
    queryKey: barberQueryKeys.recommendations(),
    queryFn: () =>
      apiJson<
        Array<{
          key: string;
          name: string;
          price: number;
          duration: number;
          reason: string;
          booking_count?: number;
          avg_market_price?: number;
        }>
      >("/api/v1/barber/service-recommendations/"),
    enabled,
    staleTime: 60_000,
  });
}

export function useCatalogServicesQuery(enabled = true) {
  return useQuery({
    queryKey: barberQueryKeys.catalogServices(),
    queryFn: () =>
      apiList<{
        id: number;
        name: string;
        duration_minutes: number;
        image_url?: string | null;
        category_ids: number[];
        category_names: string[];
      }>("/api/v1/barber/catalog-services/"),
    enabled,
    staleTime: 120_000,
  });
}

export function useBarberPayoutsQuery(enabled = true) {
  return useQuery({
    queryKey: barberQueryKeys.payouts(),
    queryFn: () =>
      apiList<{
        id: number;
        period: string;
        amount: string | number;
        status: string;
        reference: string;
        created_at: string;
        paid_at: string | null;
      }>("/api/v1/barber/payouts/"),
    enabled,
    staleTime: 15_000,
  });
}

export function usePayoutBalanceQuery(enabled = true) {
  return useQuery({
    queryKey: barberQueryKeys.payoutBalance(),
    queryFn: () =>
      apiJson<{
        available_balance: string | number;
        pending_payouts: string | number;
        min_withdrawal: string | number;
      }>("/api/v1/barber/payouts/balance/"),
    enabled,
    staleTime: 15_000,
  });
}

export function useBarberAnalyticsQuery(
  params: { start: string; end: string; independent?: boolean; salonId?: number | null },
  enabled = true,
) {
  const qs = new URLSearchParams({ start: params.start, end: params.end });
  if (params.independent) qs.set("independent", "1");
  else if (params.salonId != null) qs.set("salon", String(params.salonId));
  const granularity = "granularity" in params ? (params as { granularity?: string }).granularity : undefined;
  if (granularity) qs.set("granularity", granularity);

  return useQuery({
    queryKey: barberQueryKeys.analytics(qs.toString()),
    queryFn: () =>
      apiJson<{
        revenue: string;
        unique_clients: number;
        new_clients: number;
        returning_clients: number;
        top_services: Array<{ service_name: string; cnt: number }>;
        daily: Array<{ date: string; revenue: string; bookings?: number; clients?: number }>;
        weekly?: Array<{ week: string; revenue: string; bookings: number; clients: number }>;
        monthly?: Array<{ month: string; revenue: string; bookings: number; clients: number }>;
        cancelled_count?: number;
        completed_count?: number;
      }>(`/api/v1/analytics/?${qs}`),
    enabled: enabled && Boolean(params.start && params.end),
    staleTime: 60_000,
  });
}

export function useInvalidateBarberQueries() {
  const qc = useQueryClient();
  return {
    invalidateServices: () => qc.invalidateQueries({ queryKey: barberQueryKeys.services() }),
    invalidateBookings: () => qc.invalidateQueries({ queryKey: barberQueryKeys.bookings() }),
    invalidatePayouts: () => {
      qc.invalidateQueries({ queryKey: barberQueryKeys.payouts() });
      qc.invalidateQueries({ queryKey: barberQueryKeys.payoutBalance() });
    },
    invalidateAll: () => qc.invalidateQueries({ queryKey: barberQueryKeys.all }),
  };
}
