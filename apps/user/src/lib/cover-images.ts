import type { Category } from "@/lib/mock-data";

/** Unsplash — barber / salon / beauty (picsum ko‘p muhitda bloklanadi). */
export function unsplashCoverUrl(photoId: string, width = 900, height = 675): string {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
}

/** @deprecated Unsplash fallback ishlatiladi */
export function picsumCoverUrl(seed: string, width = 900, height = 675): string {
  return getSalonCoverUrl(seed, "barber", width, height);
}

const BARBER_PHOTO_IDS = [
  "1503957904860-b89353870476",
  "1492106087820-71f1a00d2b11",
  "1522337360788-8faa13fd3ef7",
  "1585747860715-2ba37e788f70",
  "1621605815971-fbc98d665033",
  "1599356854054-f03d66e2e884",
  "1521590832167-b7c1110bb605",
  "1605497788041-7a4e6300984e",
  "1560066984-138dadb4c035",
  "1633681926022-84c23e8c1109",
] as const;

const BEAUTY_PHOTO_IDS = [
  "1562322140-8baeececf3df",
  "1522336572450-63b25221c137",
  "1515886657611-9f3525b086c9",
  "1487412720507-e7ab37603c6f",
  "1519341450188-fa7adf056118",
  "1524502764237-884916a1e7d3",
  "1517841905240-472988babdf9",
  "1527792820354-dcf1d99a6b1d",
] as const;

const NAILS_PHOTO_IDS = [
  "1604654894617-8170df178cd9",
  "1632345031435-8727f6897c53",
  "1622287163692-834b1f829c9e",
  "1519014819055-aa7182682e75",
] as const;

const SPA_PHOTO_IDS = [
  "1540555700478-4be289fbe638",
  "1519823551278-64d453c4b1e3",
  "1595476104070-2ab726f5a7b5",
  "1582095135526-94af777716df",
] as const;

const ALL_SALON_PHOTO_IDS = [
  ...BARBER_PHOTO_IDS,
  ...BEAUTY_PHOTO_IDS,
  ...NAILS_PHOTO_IDS,
  ...SPA_PHOTO_IDS,
] as const;

function poolForCategory(category?: Category): readonly string[] {
  if (category === "beauty") return BEAUTY_PHOTO_IDS;
  if (category === "nails") return NAILS_PHOTO_IDS;
  if (category === "spa") return SPA_PHOTO_IDS;
  return BARBER_PHOTO_IDS;
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Toshkent mock salonlari — slug bo‘yicha barqaror rasm. */
const MOCK_TASHKENT_COVERS: Record<string, string> = Object.fromEntries(
  Array.from({ length: 50 }, (_, i) => {
    const slug = `mock-tashkent-${String(i + 1).padStart(3, "0")}`;
    const photoId = ALL_SALON_PHOTO_IDS[i % ALL_SALON_PHOTO_IDS.length]!;
    return [slug, unsplashCoverUrl(photoId)];
  }),
);

const SALON_COVERS: Record<string, string> = {
  ...MOCK_TASHKENT_COVERS,
  legacy: unsplashCoverUrl(BARBER_PHOTO_IDS[0]),
  atelier: unsplashCoverUrl(BEAUTY_PHOTO_IDS[0]),
  studiom: unsplashCoverUrl(BARBER_PHOTO_IDS[1]),
  nailhouse: unsplashCoverUrl(NAILS_PHOTO_IDS[0]),
  noir: unsplashCoverUrl(BARBER_PHOTO_IDS[2]),
  glow: unsplashCoverUrl(BEAUTY_PHOTO_IDS[1]),
  abdubarber: unsplashCoverUrl(BARBER_PHOTO_IDS[0]),
  "abdubarber-1": unsplashCoverUrl(BARBER_PHOTO_IDS[1]),
  "abdubarber-2": unsplashCoverUrl(BARBER_PHOTO_IDS[2]),
};

const TREND_SEEDS = [
  "tr1",
  "tr2",
  "tr3",
  "tr4",
  "tr5",
  "tr6",
  "mid-fade",
  "textured-crop",
  "curly-top-fade",
  "beach-waves",
  "blunt-cut",
  "curtain-bangs",
  "highlights",
  "soft-bob",
  "balayage",
] as const;

const TREND_COVERS: Record<string, string> = Object.fromEntries(
  TREND_SEEDS.map((key, i) => [
    key,
    unsplashCoverUrl(ALL_SALON_PHOTO_IDS[i % ALL_SALON_PHOTO_IDS.length]!, 560, 740),
  ]),
);

export function getSalonCoverUrl(
  seed: string,
  category: Category = "barber",
  width = 900,
  height = 675,
): string {
  const known = SALON_COVERS[seed];
  if (known) return known;

  const pool = poolForCategory(category);
  const photoId = pool[hashSeed(seed) % pool.length]!;
  return unsplashCoverUrl(photoId, width, height);
}

export function getTrendCoverUrl(seed: string): string {
  return TREND_COVERS[seed] ?? getSalonCoverUrl(`trend-${seed}`, "beauty", 560, 740);
}

const AI_STYLE_HERO: Record<string, string> = {
  "hero-men": "/ai-style/hero-men.png",
  "hero-women": "/ai-style/hero-women.png",
};

export function getAiStyleHeroUrl(seed: string): string {
  return AI_STYLE_HERO[seed] ?? AI_STYLE_HERO["hero-men"];
}
