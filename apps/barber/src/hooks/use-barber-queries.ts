import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiJson, apiList } from "@/lib/api";
import {
  mapApiBooking,
  statusAfterAction,
  type ApiBookingRow,
  type BookingAction,
} from "@/lib/map-booking";
import type { Booking } from "@/components/barber/BarberContext";

export const barberQueryKeys = {
  all: ["barber"] as const,
  services: () => [...barberQueryKeys.all, "services"] as const,
  servicesScope: (apiBase: string) => [...barberQueryKeys.all, "services", apiBase] as const,
  bookings: () => [...barberQueryKeys.all, "bookings"] as const,
  clients: (mode: string, salonId: number | null) =>
    [...barberQueryKeys.all, "clients", mode, salonId] as const,
  notifications: () => [...barberQueryKeys.all, "notifications"] as const,
  finance: () => [...barberQueryKeys.all, "finance"] as const,
  financeRange: (start: string, end: string) =>
    [...barberQueryKeys.finance(), start, end] as const,
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

export function useBarberBookingsQuery(enabled = true) {
  return useQuery({
    queryKey: barberQueryKeys.bookings(),
    queryFn: async () => {
      const rows = await apiList<ApiBookingRow>("/api/v1/bookings/");
      return rows.map(mapApiBooking);
    },
    enabled,
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
}

export function useBookingActionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: BookingAction }) => {
      const res = await apiFetch(`/api/v1/bookings/${id}/${action}/`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const detail =
          typeof body === "object" && body && "detail" in body
            ? String((body as { detail: unknown }).detail)
            : "Amal bajarilmadi";
        throw new Error(detail);
      }
      return { id, action };
    },
    onMutate: async ({ id, action }) => {
      await qc.cancelQueries({ queryKey: barberQueryKeys.bookings() });
      const prev = qc.getQueryData<Booking[]>(barberQueryKeys.bookings());
      qc.setQueryData<Booking[]>(barberQueryKeys.bookings(), (old) =>
        (old ?? []).map((b) =>
          b.id === id ? { ...b, status: statusAfterAction(action, b.status) } : b,
        ),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(barberQueryKeys.bookings(), ctx.prev);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: barberQueryKeys.bookings() });
      void qc.invalidateQueries({ queryKey: barberQueryKeys.finance() });
      void qc.invalidateQueries({ queryKey: barberQueryKeys.payoutBalance() });
      void qc.invalidateQueries({ queryKey: [...barberQueryKeys.all, "analytics"] });
    },
  });
}

export function useBarberServicesQuery(enabled = true) {
  return useQuery({
    queryKey: barberQueryKeys.services(),
    queryFn: () => apiList<ApiBarberService>("/api/v1/barber/services/"),
    enabled,
    staleTime: 60_000,
    gcTime: 300_000,
    placeholderData: (prev) => prev,
  });
}

export function useScopedServicesQuery(apiBase: string, enabled = true) {
  return useQuery({
    queryKey: barberQueryKeys.servicesScope(apiBase),
    queryFn: () => apiList<ApiBarberService>(`${apiBase}/`),
    enabled: enabled && Boolean(apiBase),
    staleTime: 60_000,
    gcTime: 300_000,
    placeholderData: (prev) => prev,
  });
}

export type ApiServiceRecommendation = {
  kind: string;
  title: string;
  description: string;
  action_label: string;
  service_id?: number;
  suggested_price?: string;
  suggested_duration_minutes?: number;
  suggested_service?: {
    name: string;
    price: string;
    duration_minutes: number;
  };
};

export type ApiCatalogService = {
  id: number;
  name: string;
  description: string;
  image_url: string;
  duration_minutes: number;
  category_ids: number[];
  category_names: string[];
  sort_order: number;
  index: number;
};

export function useServiceRecommendationsQuery(enabled = true) {
  return useQuery({
    queryKey: barberQueryKeys.recommendations(),
    queryFn: () => apiList<ApiServiceRecommendation>("/api/v1/barber/service-recommendations/"),
    enabled,
    staleTime: 120_000,
    gcTime: 600_000,
    placeholderData: (prev) => prev,
  });
}

export function useCatalogServicesQuery(enabled = true) {
  return useQuery({
    queryKey: barberQueryKeys.catalogServices(),
    queryFn: () => apiList<ApiCatalogService>("/api/v1/barber/catalog-services/"),
    enabled,
    staleTime: 300_000,
    gcTime: 600_000,
    placeholderData: (prev) => prev,
  });
}

export function useBarberFinanceQuery(
  params: { start: string; end: string },
  enabled = true,
) {
  const qs = new URLSearchParams({ start: params.start, end: params.end });
  return useQuery({
    queryKey: barberQueryKeys.financeRange(params.start, params.end),
    queryFn: () =>
      apiJson<{
        income_total: string | number;
        cash_total?: string | number;
        online_total?: string | number;
        total_income?: string | number;
        cash_count?: number;
        online_count?: number;
        expense_total: string | number;
        net_total: string | number;
        all_time_net_total?: string | number;
        transactions: Array<{
          id: string;
          date: string;
          client: string;
          service: string;
          amount: string | number;
          kind: string;
          status: string;
          payment_method?: string | null;
        }>;
        daily: Array<{ date: string; revenue: string | number; bookings: number }>;
      }>(`/api/v1/barber/finance/summary/?${qs}`),
    enabled: enabled && Boolean(params.start && params.end),
    staleTime: 20_000,
    placeholderData: (prev) => prev,
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
    placeholderData: (prev) => prev,
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
    placeholderData: (prev) => prev,
  });
}

export function useBarberAnalyticsQuery(
  params: {
    start: string;
    end: string;
    barberMe?: boolean;
    independent?: boolean;
    salonId?: number | null;
  },
  enabled = true,
) {
  const qs = new URLSearchParams({ start: params.start, end: params.end });
  if (params.barberMe) qs.set("barber", "me");
  else if (params.independent) qs.set("independent", "1");
  else if (params.salonId != null) qs.set("salon", String(params.salonId));
  const granularity = "granularity" in params ? (params as { granularity?: string }).granularity : undefined;
  if (granularity) qs.set("granularity", granularity);

  return useQuery({
    queryKey: barberQueryKeys.analytics(qs.toString()),
    queryFn: () =>
      apiJson<{
        revenue: string;
        cash_total?: string;
        online_total?: string;
        total_income?: string;
        cash_count?: number;
        online_count?: number;
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
    staleTime: 20_000,
    placeholderData: (prev) => prev,
  });
}

export function prefetchBarberFinance(
  qc: import("@tanstack/react-query").QueryClient,
  params: { start: string; end: string },
) {
  const qs = new URLSearchParams({ start: params.start, end: params.end });
  return qc.prefetchQuery({
    queryKey: barberQueryKeys.financeRange(params.start, params.end),
    queryFn: () =>
      apiJson(`/api/v1/barber/finance/summary/?${qs}`),
    staleTime: 20_000,
  });
}

export function prefetchPayoutBalance(qc: import("@tanstack/react-query").QueryClient) {
  return qc.prefetchQuery({
    queryKey: barberQueryKeys.payoutBalance(),
    queryFn: () => apiJson("/api/v1/barber/payouts/balance/"),
    staleTime: 15_000,
  });
}

export function prefetchBarberAnalytics(
  qc: import("@tanstack/react-query").QueryClient,
  params: { start: string; end: string },
) {
  const qs = new URLSearchParams({ start: params.start, end: params.end, barber: "me" });
  return qc.prefetchQuery({
    queryKey: barberQueryKeys.analytics(qs.toString()),
    queryFn: () => apiJson(`/api/v1/analytics/?${qs}`),
    staleTime: 20_000,
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
    invalidateFinance: () => qc.invalidateQueries({ queryKey: barberQueryKeys.finance() }),
    invalidateAnalytics: () =>
      qc.invalidateQueries({ queryKey: [...barberQueryKeys.all, "analytics"] }),
    invalidateAll: () => qc.invalidateQueries({ queryKey: barberQueryKeys.all }),
  };
}
