import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiJson, apiList } from "@/lib/api";
import {
  mapApiBooking,
  statusAfterAction,
  type ApiBookingRow,
  type BookingAction,
  type CompleteBookingOptions,
} from "@/lib/map-booking";
import type { Booking } from "@/components/barber/BarberContext";
import {
  readBookingsSnapshot,
  readBookingsSnapshotUpdatedAt,
  writeBookingsSnapshot,
} from "@/lib/barber-snapshot-cache";
import { getBarberWsState } from "@/hooks/use-booking-live-sync";
import { last7DaysIsoParams, rangeToIsoParams } from "@/lib/finance-range";

function barberBookingsNeedLivePolling(list: Booking[] | null | undefined): boolean {
  if (!list?.length) return false;
  return list.some(
    (b) => b.status === "pending" || b.status === "accepted" || b.status === "in_progress",
  );
}

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

export async function fetchBarberBookings(): Promise<Booking[]> {
  const rows = await apiList<ApiBookingRow>("/api/v1/bookings/");
  const mapped = rows.map(mapApiBooking);
  writeBookingsSnapshot(mapped);
  return mapped;
}

export async function fetchBarberBooking(id: string): Promise<Booking> {
  const row = await apiJson<ApiBookingRow>(`/api/v1/bookings/${id}/`);
  return mapApiBooking(row);
}

export function useBarberBookingsQuery(enabled = true) {
  return useQuery({
    queryKey: barberQueryKeys.bookings(),
    queryFn: fetchBarberBookings,
    enabled,
    staleTime: 30_000,
    refetchInterval: (q) => {
      if (!barberBookingsNeedLivePolling(q.state.data)) return false;
      if (getBarberWsState() === "open") return 120_000;
      return 90_000;
    },
    initialData: () => readBookingsSnapshot() ?? undefined,
    initialDataUpdatedAt: readBookingsSnapshotUpdatedAt,
  });
}

export function useBarberBookingQuery(id: string, enabled = true) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: [...barberQueryKeys.bookings(), id] as const,
    queryFn: () => fetchBarberBooking(id),
    enabled: enabled && Boolean(id),
    placeholderData: () => {
      const list = qc.getQueryData<Booking[]>(barberQueryKeys.bookings());
      return list?.find((b) => b.id === id);
    },
    staleTime: 30_000,
    refetchInterval: (q) => {
      if (getBarberWsState() === "open") return false;
      const status = q.state.data?.status;
      if (status === "in_progress") return 30_000;
      if (status === "pending" || status === "accepted") return 60_000;
      return false;
    },
  });
}

export function useBookingActionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
      completeOptions,
    }: {
      id: string;
      action: BookingAction;
      completeOptions?: CompleteBookingOptions;
    }) => {
      if (action === "complete") {
        const rows = qc.getQueryData<Booking[]>(barberQueryKeys.bookings());
        const current = rows?.find((b) => b.id === id);
        if (current?.status === "accepted") {
          const startRes = await apiFetch(`/api/v1/bookings/${id}/start/`, { method: "POST" });
          if (!startRes.ok) {
            const body = await startRes.json().catch(() => ({}));
            const detail =
              typeof body === "object" && body && "detail" in body
                ? String((body as { detail: unknown }).detail)
                : "Xizmatni boshlab bo'lmadi";
            throw new Error(detail);
          }
        }
      }

      let res: Response;
      if (action === "complete" && completeOptions) {
        const hasFile = Boolean(completeOptions.result_image);
        if (hasFile) {
          const fd = new FormData();
          if (completeOptions.early_finish) fd.append("early_finish", "true");
          if (completeOptions.portfolio_allowed) fd.append("portfolio_allowed", "true");
          if (completeOptions.result_image) fd.append("result_image", completeOptions.result_image);
          res = await apiFetch(`/api/v1/bookings/${id}/complete/`, { method: "POST", body: fd });
        } else {
          res = await apiFetch(`/api/v1/bookings/${id}/complete/`, {
            method: "POST",
            body: JSON.stringify({
              early_finish: completeOptions.early_finish ?? false,
              portfolio_allowed: completeOptions.portfolio_allowed ?? false,
            }),
          });
        }
      } else {
        res = await apiFetch(`/api/v1/bookings/${id}/${action}/`, { method: "POST" });
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const detail =
          typeof body === "object" && body && "detail" in body
            ? String((body as { detail: unknown }).detail)
            : "Amal bajarilmadi";
        if (
          action === "accept" &&
          res.status === 400 &&
          detail.toLowerCase().includes("invalid status")
        ) {
          const row = await apiJson<ApiBookingRow>(`/api/v1/bookings/${id}/`);
          return { id, action, booking: mapApiBooking(row) };
        }
        throw new Error(detail);
      }
      const row = (await res.json()) as ApiBookingRow;
      if (action === "complete" || action === "accept" || action === "start") {
        return { id, action, booking: mapApiBooking(row) };
      }
      return { id, action };
    },
    onMutate: async ({ id, action }) => {
      await qc.cancelQueries({ queryKey: barberQueryKeys.bookings() });
      const prev = qc.getQueryData<Booking[]>(barberQueryKeys.bookings());
      const prevDetail = qc.getQueryData<Booking>([...barberQueryKeys.bookings(), id]);
      qc.setQueryData<Booking[]>(barberQueryKeys.bookings(), (old) =>
        (old ?? []).map((b) =>
          b.id === id ? { ...b, status: statusAfterAction(action, b.status) } : b,
        ),
      );
      if (prevDetail) {
        qc.setQueryData<Booking>([...barberQueryKeys.bookings(), id], {
          ...prevDetail,
          status: statusAfterAction(action, prevDetail.status),
        });
      }
      return { prev, prevDetail };
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(barberQueryKeys.bookings(), ctx.prev);
      }
      if (ctx?.prevDetail && vars?.id) {
        qc.setQueryData([...barberQueryKeys.bookings(), vars.id], ctx.prevDetail);
      }
    },
    onSuccess: (data) => {
      if (data?.booking) {
        const mapped = data.booking;
        qc.setQueryData<Booking>([...barberQueryKeys.bookings(), mapped.id], mapped);
        qc.setQueryData<Booking[]>(barberQueryKeys.bookings(), (old) => {
          const next = (old ?? []).map((b) => (b.id === mapped.id ? mapped : b));
          writeBookingsSnapshot(next);
          return next;
        });
      }
    },
    onSettled: (_data, _err, vars) => {
      if (!vars) return;
      if (vars.action === "complete") {
        void qc.invalidateQueries({ queryKey: barberQueryKeys.finance() });
        void qc.invalidateQueries({ queryKey: barberQueryKeys.payoutBalance() });
        void qc.invalidateQueries({ queryKey: [...barberQueryKeys.all, "analytics"] });
      }
      if (_err || vars.action === "reject" || vars.action === "cancel") {
        void qc.invalidateQueries({ queryKey: barberQueryKeys.bookings() });
      }
    },
  });
}

export function useSaveClientImpressionsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bookingId,
      kinds,
    }: {
      bookingId: string;
      kinds: string[];
    }) => {
      return apiJson<{
        kinds: string[];
        customer_impression_stats: Record<string, number>;
      }>(`/api/v1/bookings/${bookingId}/client-impressions/`, {
        method: "POST",
        body: JSON.stringify({ kinds }),
      });
    },
    onSuccess: (data, vars) => {
      qc.setQueryData<Booking>([...barberQueryKeys.bookings(), vars.bookingId], (old) =>
        old
          ? {
              ...old,
              booking_client_impressions: data.kinds,
              customer_impression_stats: data.customer_impression_stats,
            }
          : old,
      );
      qc.setQueryData<Booking[]>(barberQueryKeys.bookings(), (old) =>
        (old ?? []).map((b) =>
          b.id === vars.bookingId
            ? {
                ...b,
                booking_client_impressions: data.kinds,
                customer_impression_stats: data.customer_impression_stats,
              }
            : b,
        ),
      );
    },
  });
}

export function useCheckInByTokenMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { token?: string; short_code?: string }) => {
      const res = await apiFetch("/api/v1/bookings/check-in-by-token/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        let detail =
          typeof body === "object" && body && "detail" in body
            ? String((body as { detail: unknown }).detail)
            : "Check-in bajarilmadi";
        if (res.status === 404) {
          detail = "Kod topilmadi yoki allaqachon ishlatilgan.";
        } else if (res.status === 410) {
          detail = "Bu kod allaqachon ishlatilgan.";
        } else if (res.status === 403) {
          detail = "Bu buyurtma sizga tegishli emas.";
        }
        throw new Error(detail);
      }
      return (await res.json()) as ApiBookingRow;
    },
    onSuccess: (row) => {
      if (row?.id == null) return;
      const mapped = mapApiBooking(row);
      const id = String(row.id);
      qc.setQueryData<Booking>([...barberQueryKeys.bookings(), id], mapped);
      qc.setQueryData<Booking[]>(barberQueryKeys.bookings(), (old) => {
        const next = (old ?? []).map((b) => (b.id === id ? mapped : b));
        writeBookingsSnapshot(next);
        return next;
      });
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
        daily: Array<{
          date: string;
          revenue: string;
          cash_revenue?: string;
          online_revenue?: string;
          bookings?: number;
          clients?: number;
        }>;
        weekly?: Array<{
          week: string;
          revenue: string;
          cash_revenue?: string;
          online_revenue?: string;
          bookings: number;
          clients: number;
        }>;
        monthly?: Array<{
          month: string;
          revenue: string;
          cash_revenue?: string;
          online_revenue?: string;
          bookings: number;
          clients: number;
        }>;
        cancelled_count?: number;
        completed_count?: number;
      }>(`/api/v1/analytics/?${qs}`),
    enabled: enabled && Boolean(params.start && params.end),
    staleTime: 20_000,
    placeholderData: (prev) => prev,
  });
}

export function prefetchBarberBookings(qc: import("@tanstack/react-query").QueryClient) {
  return qc.prefetchQuery({
    queryKey: barberQueryKeys.bookings(),
    queryFn: fetchBarberBookings,
    staleTime: 20_000,
  }).catch(() => undefined);
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
  }).catch(() => undefined);
}

export function prefetchPayoutBalance(qc: import("@tanstack/react-query").QueryClient) {
  return qc.prefetchQuery({
    queryKey: barberQueryKeys.payoutBalance(),
    queryFn: () => apiJson("/api/v1/barber/payouts/balance/"),
    staleTime: 15_000,
  }).catch(() => undefined);
}

export function prefetchBarberPayouts(qc: import("@tanstack/react-query").QueryClient) {
  return qc.prefetchQuery({
    queryKey: barberQueryKeys.payouts(),
    queryFn: () => apiList("/api/v1/barber/payouts/"),
    staleTime: 15_000,
  }).catch(() => undefined);
}

/** Parallel prefetch for earnings page — loader should await this before render. */
export async function prefetchEarningsPage(qc: import("@tanstack/react-query").QueryClient) {
  const defaultRange = rangeToIsoParams("Bugun");
  const chartRange = last7DaysIsoParams();
  await Promise.all([
    prefetchBarberFinance(qc, defaultRange),
    prefetchBarberFinance(qc, chartRange),
    prefetchPayoutBalance(qc),
    prefetchBarberPayouts(qc),
  ]);
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
  }).catch(() => undefined);
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
