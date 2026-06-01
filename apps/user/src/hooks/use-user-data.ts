import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addFavoriteSalon,
  cancelBooking,
  createBooking,
  fetchBookingAvailability,
  fetchBookings,
  fetchFavoriteSalons,
  fetchNotifications,
  fetchSalonBatch,
  fetchSalonDetail,
  fetchSalonPortfolio,
  fetchSalonReviews,
  fetchSalons,
  fetchSalonStaff,
  getUserAccessToken,
  markAllNotificationsRead,
  markNotificationRead,
  removeFavoriteSalon,
} from "@/lib/user-api";
import {
  bookingToViewModel,
  salonDetailToViewModel,
  salonListToViewModel,
} from "@/lib/api-adapters";
import { salons as mockSalons, bookings as mockBookings } from "@/lib/mock-data";

const staleTime = 60_000;

function useMockFallback(): boolean {
  return import.meta.env.DEV && (import.meta.env.VITE_USE_MOCK_FALLBACK ?? "1") !== "0";
}

export function useSalons(query = "") {
  const allowFallback = useMockFallback();
  return useQuery({
    queryKey: ["user", "salons", query],
    staleTime,
    queryFn: async () => {
      try {
        const rows = await fetchSalons(query);
        return {
          salons: rows.map(salonListToViewModel),
          fallback: false,
          error: null as string | null,
        };
      } catch (error) {
        if (!allowFallback) throw error;
        const message = error instanceof Error ? error.message : "Salonlar yuklanmadi.";
        const q = query.trim().toLowerCase();
        return {
          salons: mockSalons.filter((salon) => !q || salon.name.toLowerCase().includes(q)),
          fallback: true,
          error: message,
        };
      }
    },
  });
}

export function useSalon(id: string) {
  const allowFallback = useMockFallback();
  return useQuery({
    queryKey: ["user", "salon", id],
    staleTime,
    queryFn: async () => {
      try {
        const [detail, staff, reviews, portfolio] = await Promise.all([
          fetchSalonDetail(id),
          fetchSalonStaff(id).catch(() => []),
          fetchSalonReviews(id).catch(() => []),
          fetchSalonPortfolio(id).catch(() => []),
        ]);
        return {
          salon: salonDetailToViewModel(detail, staff, reviews, portfolio),
          fallback: false,
          error: null as string | null,
        };
      } catch (error) {
        if (!allowFallback) throw error;
        const message = error instanceof Error ? error.message : "Salon yuklanmadi.";
        return {
          salon: mockSalons.find((salon) => salon.id === id) ?? mockSalons[0],
          fallback: true,
          error: message,
        };
      }
    },
  });
}

export function useBookings() {
  const allowFallback = useMockFallback();
  return useQuery({
    queryKey: ["user", "bookings"],
    staleTime: 30_000,
    enabled: Boolean(getUserAccessToken()) || allowFallback,
    queryFn: async () => {
      if (!getUserAccessToken()) {
        return { bookings: allowFallback ? mockBookings : [], fallback: allowFallback, error: null as string | null };
      }
      try {
        const rows = await fetchBookings();
        return { bookings: rows.map(bookingToViewModel), fallback: false, error: null as string | null };
      } catch (error) {
        if (!allowFallback) throw error;
        const message = error instanceof Error ? error.message : "Bronlar yuklanmadi.";
        return { bookings: mockBookings, fallback: true, error: message };
      }
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelBooking(id),
    onSuccess: async () => {
      toast.success("Bron bekor qilindi");
      await queryClient.invalidateQueries({ queryKey: ["user", "bookings"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Bron bekor qilinmadi"),
  });
}

export function useBookingAvailability(input: {
  salon: string;
  barber: string | null;
  date: string;
  serviceIds: string[];
}) {
  return useQuery({
    queryKey: ["user", "availability", input],
    enabled: Boolean(input.barber && input.serviceIds.length),
    staleTime: 20_000,
    queryFn: () =>
      fetchBookingAvailability({
        salon: input.salon,
        barber: input.barber || "",
        date: input.date,
        serviceIds: input.serviceIds,
      }),
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBooking,
    onSuccess: async () => {
      toast.success("Bron yaratildi", { description: "Sartarosh tasdig'ini kuting." });
      await queryClient.invalidateQueries({ queryKey: ["user", "bookings"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Bron yaratilmadi"),
  });
}

export function useFavoriteSalonIds() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["user", "favorite-salons"],
    staleTime: 30_000,
    queryFn: fetchFavoriteSalons,
  });

  const ids = (query.data || []).map((row) => String(row.salon));
  const toggleMutation = useMutation({
    mutationFn: async (salonId: string) => {
      if (ids.includes(salonId)) {
        await removeFavoriteSalon(salonId);
        return "removed" as const;
      }
      await addFavoriteSalon(salonId);
      return "added" as const;
    },
    onSuccess: async (result) => {
      toast.success(result === "added" ? "Sevimliga qo'shildi" : "Sevimlidan olindi");
      await queryClient.invalidateQueries({ queryKey: ["user", "favorite-salons"] });
      await queryClient.invalidateQueries({ queryKey: ["user", "favorite-salon-details"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Sevimlilar yangilanmadi"),
  });

  return {
    ids,
    isLoading: query.isLoading,
    isFav: (id: string) => ids.includes(id),
    toggle: (id: string) => toggleMutation.mutate(id),
    canSync: Boolean(getUserAccessToken()),
  };
}

export function useFavoriteSalons() {
  const favoriteQuery = useQuery({
    queryKey: ["user", "favorite-salons"],
    staleTime: 30_000,
    queryFn: fetchFavoriteSalons,
  });
  const ids = (favoriteQuery.data || []).map((row) => String(row.salon));

  return useQuery({
    queryKey: ["user", "favorite-salon-details", ids],
    enabled: ids.length > 0,
    staleTime,
    queryFn: async () => {
      const rows = await fetchSalonBatch(ids);
      return rows.map(salonListToViewModel);
    },
  });
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["user", "notifications"],
    staleTime: 20_000,
    queryFn: fetchNotifications,
  });

  const markOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["user", "notifications"] }),
  });

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["user", "notifications"] }),
  });

  return {
    ...query,
    unreadCount: (query.data || []).filter((n) => !n.read_at).length,
    markOne: (id: string) => markOne.mutate(id),
    markAll: () => markAll.mutate(),
  };
}
