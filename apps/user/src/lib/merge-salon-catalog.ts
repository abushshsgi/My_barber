import type { Salon } from "@/lib/mock-data";

/** Yaqin atrofdagi va to'liq katalog ro'yxatini birlashtirish — yangi salonlar yo'qolmasin. */
export function mergeSalonCatalogSources(nearby: Salon[], list: Salon[]): Salon[] {
  if (!nearby.length) return list;
  if (!list.length) return nearby;
  const nearbyIds = new Set(nearby.map((s) => s.id));
  const merged = [...nearby];
  for (const salon of list) {
    if (!nearbyIds.has(salon.id)) merged.push(salon);
  }
  return merged;
}
