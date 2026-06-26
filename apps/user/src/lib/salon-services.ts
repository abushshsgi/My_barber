import type { Service } from "@/lib/mock-data";

/** Tanlangan barber uchun salon xizmatlari (backend bilan bir xil qoida). */
export function filterSalonServicesForBarber(services: Service[], barberId: string): Service[] {
  if (!barberId) return services;
  return services.filter((s) => !s.barberId || s.barberId === barberId);
}

/** Default: avval salon egasi, keyin bron qilinadigan birinchi usta. */
export function resolveDefaultSalonBarberId(
  staff: { id: string; role: string; isBookable?: boolean }[],
): string | null {
  const owner = staff.find((s) => s.role === "Salon egasi" || s.role === "owner");
  const bookable = staff.find((s) => s.isBookable !== false);
  return owner?.id ?? bookable?.id ?? staff[0]?.id ?? null;
}
