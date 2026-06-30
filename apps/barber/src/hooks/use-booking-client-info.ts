import { useMemo } from "react";
import { useBarberContext, type Booking } from "@/components/barber/BarberContext";

export type BookingClientInfo = {
  /** Yakunlangan tashriflar soni (mavjud bo'lsa). */
  visits?: number;
  /** Clients sahifasida qidirish uchun query (ism/telefon). */
  query?: string;
};

/**
 * Booking'dagi `customer_id` bo'yicha mijoz profilini topadi va
 * tashrif soni hamda profil linki uchun query qaytaradi.
 */
export function useBookingClientInfo(
  booking: Pick<Booking, "customer_id" | "client" | "client_phone"> | null | undefined,
): BookingClientInfo {
  const { clients } = useBarberContext();

  return useMemo(() => {
    if (!booking) return {};
    const match = booking.customer_id
      ? clients.find((c) => c.id === booking.customer_id)
      : undefined;
    const query = match?.name || booking.client || booking.client_phone || undefined;
    return {
      visits: match ? match.visits : undefined,
      query: query?.trim() || undefined,
    };
  }, [booking, clients]);
}
