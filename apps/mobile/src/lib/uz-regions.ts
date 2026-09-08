import type { ImageSourcePropType } from "react-native";

/** O‘zbekiston 12 viloyati + Toshkent + Qoraqalpog‘iston (GPS/label matching). */
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

export type UzRegionMeta = {
  id: UzRegionId;
  labelUz: string;
  /** Label match (kichik harf). */
  match: RegExp;
  /** Taxminiy markaz (GPS fallback). */
  lat: number;
  lon: number;
};

export const UZ_REGIONS: UzRegionMeta[] = [
  {
    id: "tashkent",
    labelUz: "Toshkent",
    match: /toshkent|tashkent|тошкент|ташкент/,
    lat: 41.3111,
    lon: 69.2797,
  },
  {
    id: "andijan",
    labelUz: "Andijon",
    match: /andijon|andijan|андижон/,
    lat: 40.7821,
    lon: 72.3442,
  },
  {
    id: "bukhara",
    labelUz: "Buxoro",
    match: /buxoro|bukhara|бухоро|бухара/,
    lat: 39.7681,
    lon: 64.4556,
  },
  {
    id: "fergana",
    labelUz: "Farg'ona",
    match: /farg.?ona|fergana|фарғона|фергана/,
    lat: 40.3864,
    lon: 71.7864,
  },
  {
    id: "jizzakh",
    labelUz: "Jizzax",
    match: /jizzax|jizzakh|джиззак|жиззах/,
    lat: 40.1158,
    lon: 67.8422,
  },
  {
    id: "kashkadarya",
    labelUz: "Qashqadaryo",
    match: /qashqadaryo|kashkadarya|shahrisabz|қашқадарё|шахрисабз/,
    lat: 38.8606,
    lon: 65.7891,
  },
  {
    id: "navoi",
    labelUz: "Navoiy",
    match: /navoiy|navoi|навои/,
    lat: 40.1039,
    lon: 65.3686,
  },
  {
    id: "namangan",
    labelUz: "Namangan",
    match: /namangan|наманган/,
    lat: 40.9983,
    lon: 71.6726,
  },
  {
    id: "samarkand",
    labelUz: "Samarqand",
    match: /samarqand|samarkand|самарқанд|самарканд/,
    lat: 39.6542,
    lon: 66.9597,
  },
  {
    id: "sirdarya",
    labelUz: "Sirdaryo",
    match: /sirdaryo|sirdarya|syr.?darya|сирдарё/,
    lat: 40.5,
    lon: 68.6667,
  },
  {
    id: "surkhandarya",
    labelUz: "Surxondaryo",
    match: /surxondaryo|surkhandarya|termez|сурхондарё|термез/,
    lat: 37.2242,
    lon: 67.2783,
  },
  {
    id: "khorezm",
    labelUz: "Xorazm",
    match: /xorazm|khorezm|khiva|xiva|хоразм|хива/,
    lat: 41.3775,
    lon: 60.3619,
  },
  {
    id: "karakalpakstan",
    labelUz: "Qoraqalpog'iston",
    match: /qoraqalpo|karakalpak|nukus|қорақалпоқ|нукус/,
    lat: 42.4603,
    lon: 59.6164,
  },
];

/** Mahalliy hero — mashhur joy o‘ng tomonda (UI matn chapda). */
export const UZ_REGION_IMAGES: Record<UzRegionId, ImageSourcePropType> = {
  tashkent: require("../../assets/care/regions/uz-region-tashkent.png"),
  andijan: require("../../assets/care/regions/uz-region-andijan.png"),
  bukhara: require("../../assets/care/regions/uz-region-bukhara.png"),
  fergana: require("../../assets/care/regions/uz-region-fergana.png"),
  jizzakh: require("../../assets/care/regions/uz-region-jizzakh.png"),
  kashkadarya: require("../../assets/care/regions/uz-region-kashkadarya.png"),
  navoi: require("../../assets/care/regions/uz-region-navoi.png"),
  namangan: require("../../assets/care/regions/uz-region-namangan.png"),
  samarkand: require("../../assets/care/regions/uz-region-samarkand.png"),
  sirdarya: require("../../assets/care/regions/uz-region-sirdarya.png"),
  surkhandarya: require("../../assets/care/regions/uz-region-surkhandarya.png"),
  khorezm: require("../../assets/care/regions/uz-region-khorezm.png"),
  karakalpakstan: require("../../assets/care/regions/uz-region-karakalpakstan.png"),
};

export function regionLabel(id: UzRegionId): string {
  return UZ_REGIONS.find((r) => r.id === id)?.labelUz ?? "O'zbekiston";
}

export function resolveUzRegionFromText(
  region?: string | null,
  place?: string | null,
): UzRegionId | null {
  const hay = `${region || ""} ${place || ""}`.toLowerCase();
  if (!hay.trim()) return null;
  for (const row of UZ_REGIONS) {
    if (row.match.test(hay)) return row.id;
  }
  return null;
}

/** Eng yaqin viloyat markazi (GPS). */
export function resolveUzRegionFromCoords(lat: number, lon: number): UzRegionId | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  // O‘zbekiston taxminiy chegarasi
  if (lat < 37 || lat > 45.7 || lon < 55.9 || lon > 73.2) return null;

  let best: UzRegionId | null = null;
  let bestD = Infinity;
  for (const row of UZ_REGIONS) {
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

export function resolveUzRegion(opts: {
  region?: string | null;
  place?: string | null;
  lat?: number | null;
  lon?: number | null;
}): UzRegionId | null {
  const fromText = resolveUzRegionFromText(opts.region, opts.place);
  if (fromText) return fromText;
  if (opts.lat != null && opts.lon != null) {
    return resolveUzRegionFromCoords(opts.lat, opts.lon);
  }
  return null;
}

export function uzRegionImageSource(id: UzRegionId | null | undefined): ImageSourcePropType | null {
  if (!id) return null;
  return UZ_REGION_IMAGES[id] ?? null;
}
