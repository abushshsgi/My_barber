import type { Service } from "@/lib/mock-data";

/** Salon sahifasi: faqat salon katalogi (barberga bog‘lanmagan xizmatlar).
 * Alohida ustalarning shaxsiy xizmatlari bu yerda ko‘rinmaydi — ular bron
 * paytida usta tanlanganda chiqadi. */
export function filterSalonCatalogServices(services: Service[]): Service[] {
  return services.filter((s) => !s.barberId);
}

export type SalonServiceGroup = {
  /** null — salon katalogi (egasi/umumiy); aks holda ustaning ID si. */
  barberId: string | null;
  barberName: string | null;
  services: Service[];
};

/** Salon sahifasi: xizmatlarni usta bo‘yicha guruhlash — avval salon katalogi
 * (barber=null), keyin har bir qo‘shilgan ustaning xizmatlari. */
export function groupSalonServicesByBarber(services: Service[]): SalonServiceGroup[] {
  const catalog: Service[] = [];
  const byBarber = new Map<string, SalonServiceGroup>();
  for (const s of services) {
    if (!s.barberId) {
      catalog.push(s);
      continue;
    }
    const existing = byBarber.get(s.barberId);
    if (existing) {
      existing.services.push(s);
    } else {
      byBarber.set(s.barberId, {
        barberId: s.barberId,
        barberName: s.barberName ?? null,
        services: [s],
      });
    }
  }
  const groups: SalonServiceGroup[] = [];
  if (catalog.length > 0) {
    groups.push({ barberId: null, barberName: null, services: catalog });
  }
  groups.push(...byBarber.values());
  return groups;
}

/** Salon sahifasi: faqat salon egasining xizmatlari (+ legacy umumiy). */
export function filterSalonOwnerServices(services: Service[], ownerId: string | undefined): Service[] {
  if (!ownerId) return services;
  return services.filter((s) => !s.barberId || s.barberId === ownerId);
}

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

/** Kalendarda barber tanlanganida default xizmat (eng qisqa davomiylik). */
export function resolveDefaultServiceIdsForBarber(
  services: Service[],
  barberId: string | null | undefined,
): number[] {
  const scoped = barberId ? filterSalonServicesForBarber(services, barberId) : services;
  if (scoped.length === 0) return [];
  const sorted = [...scoped].sort(
    (a, b) => a.duration - b.duration || Number(a.id) - Number(b.id),
  );
  const id = Number(sorted[0]?.id);
  return Number.isFinite(id) && id > 0 ? [id] : [];
}
