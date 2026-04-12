import { apiFetch } from "@/lib/api";

export type BarberBookingLine = {
  id: number;
  service_name: string;
  price: string;
  duration_minutes?: number;
};

export type BarberBookingRow = {
  id: number;
  status: string;
  start_at: string;
  end_at: string;
  started_at?: string | null;
  customer_name: string;
  customer_phone?: string;
  salon_name?: string | null;
  total_price: string;
  lines: BarberBookingLine[];
  created_at: string;
};

export async function fetchBarberBookings(): Promise<BarberBookingRow[]> {
  const res = await apiFetch("/api/v1/bookings/");
  if (!res.ok) throw new Error("Bronlar yuklanmadi");
  const j = (await res.json()) as { results?: BarberBookingRow[] } | BarberBookingRow[];
  return Array.isArray(j) ? j : j.results || [];
}
