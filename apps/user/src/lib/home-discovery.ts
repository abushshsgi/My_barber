import type { BarberDiscovery } from "@/lib/mappers/barber";
import type { Salon } from "@/lib/mock-data";

export type HomeDiscoveryItem =
  | { type: "salon"; salon: Salon }
  | { type: "barber"; barber: BarberDiscovery };

/** Salon va ustalarni bir qatorda aralash ko'rsatish. */
export function buildMixedDiscoveryItems(
  salons: Salon[],
  barbers: BarberDiscovery[],
  limit = 14,
): HomeDiscoveryItem[] {
  const items: HomeDiscoveryItem[] = [];
  const pairs = Math.max(salons.length, barbers.length);
  for (let i = 0; i < pairs && items.length < limit; i += 1) {
    if (i < salons.length) items.push({ type: "salon", salon: salons[i]! });
    if (items.length >= limit) break;
    if (i < barbers.length) items.push({ type: "barber", barber: barbers[i]! });
  }
  return items;
}
