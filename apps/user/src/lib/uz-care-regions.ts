export type UzRegionId =
  | "tashkent"
  | "andijan"
  | "bukhara"
  | "fergana"
  | "jizzakh"
  | "kashkadarya"
  | "navoi"
  | "namangan"
  | "samarkand"
  | "sirdarya"
  | "surkhandarya"
  | "khorezm"
  | "karakalpakstan";

const REGIONS: Array<{ id: UzRegionId; match: RegExp; lat: number; lon: number }> = [
  { id: "tashkent", match: /toshkent|tashkent|тошкент|ташкент/, lat: 41.3111, lon: 69.2797 },
  { id: "andijan", match: /andijon|andijan|андижон/, lat: 40.7821, lon: 72.3442 },
  { id: "bukhara", match: /buxoro|bukhara|бухоро|бухара/, lat: 39.7681, lon: 64.4556 },
  { id: "fergana", match: /farg.?ona|fergana|фарғона|фергана/, lat: 40.3864, lon: 71.7864 },
  { id: "jizzakh", match: /jizzax|jizzakh|джиззак|жиззах/, lat: 40.1158, lon: 67.8422 },
  { id: "kashkadarya", match: /qashqadaryo|kashkadarya|shahrisabz|қашқадарё/, lat: 38.8606, lon: 65.7891 },
  { id: "navoi", match: /navoiy|navoi|навои/, lat: 40.1039, lon: 65.3686 },
  { id: "namangan", match: /namangan|наманган/, lat: 40.9983, lon: 71.6726 },
  { id: "samarkand", match: /samarqand|samarkand|самарқанд|самарканд/, lat: 39.6542, lon: 66.9597 },
  { id: "sirdarya", match: /sirdaryo|sirdarya|syr.?darya|сирдарё/, lat: 40.5, lon: 68.6667 },
  { id: "surkhandarya", match: /surxondaryo|surkhandarya|termez|сурхондарё/, lat: 37.2242, lon: 67.2783 },
  { id: "khorezm", match: /xorazm|khorezm|khiva|xiva|хоразм|хива/, lat: 41.3775, lon: 60.3619 },
  { id: "karakalpakstan", match: /qoraqalpo|karakalpak|nukus|қорақалпоқ|нукус/, lat: 42.4603, lon: 59.6164 },
];

export function resolveUzRegion(opts: {
  region?: string | null;
  place?: string | null;
  lat?: number | null;
  lon?: number | null;
}): UzRegionId | null {
  const hay = `${opts.region || ""} ${opts.place || ""}`.toLowerCase();
  if (hay.trim()) {
    for (const row of REGIONS) {
      if (row.match.test(hay)) return row.id;
    }
  }
  const lat = opts.lat;
  const lon = opts.lon;
  if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < 37 || lat > 45.7 || lon < 55.9 || lon > 73.2) return null;
  let best: UzRegionId | null = null;
  let bestD = Infinity;
  for (const row of REGIONS) {
    const dLat = lat - row.lat;
    const dLon = (lon - row.lon) * Math.cos((lat * Math.PI) / 180);
    const d = dLat * dLat + dLon * dLon;
    if (d < bestD) {
      bestD = d;
      best = row.id;
    }
  }
  return best;
}

export const UZ_REGION_OPTIONS: Array<{ id: UzRegionId; label: string }> = [
  { id: "tashkent", label: "Toshkent" },
  { id: "andijan", label: "Andijon" },
  { id: "bukhara", label: "Buxoro" },
  { id: "fergana", label: "Farg‘ona" },
  { id: "jizzakh", label: "Jizzax" },
  { id: "kashkadarya", label: "Qashqadaryo" },
  { id: "navoi", label: "Navoiy" },
  { id: "namangan", label: "Namangan" },
  { id: "samarkand", label: "Samarqand" },
  { id: "sirdarya", label: "Sirdaryo" },
  { id: "surkhandarya", label: "Surxondaryo" },
  { id: "khorezm", label: "Xorazm" },
  { id: "karakalpakstan", label: "Qoraqalpog‘iston" },
];

export function regionLabel(id: string | null | undefined): string {
  return UZ_REGION_OPTIONS.find((row) => row.id === id)?.label || "Shahar";
}

export function uzRegionImage(id: string | null | undefined): string | null {
  if (!id || !REGIONS.some((row) => row.id === id)) return null;
  return `/care/regions/uz-region-${id}.png`;
}
