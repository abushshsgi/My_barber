import type { Category } from "@/lib/mock-data";

const MOCK_SALON_COUNT = 250;

/** Barqaror fallback — Pexels CDN da doim mavjud. */
export const PEXELS_FALLBACK_PHOTO_ID = 3992860;

/** Pexels CDN — same-origin proxy orqali (ORB/CORS muammosiz). */
export function pexelsCoverUrl(photoId: number, width = 900): string {
  const w = width >= 800 ? 1200 : 800;
  return `/covers/pexels/${photoId}?w=${w}`;
}

/** API yoki tashqi Pexels URL ni same-origin proxy yo‘liga aylantiradi. */
export function normalizeCoverUrl(url: string | null | undefined): string | null {
  const raw = url?.trim();
  if (!raw) return null;
  const match = raw.match(/images\.pexels\.com\/photos\/(\d+)/);
  if (match) return pexelsCoverUrl(Number(match[1]));
  return raw;
}

export function pexelsFallbackCoverUrl(width = 900): string {
  return pexelsCoverUrl(PEXELS_FALLBACK_PHOTO_ID, width);
}

/** @deprecated Pexels fallback ishlatiladi */
export function pixabayCoverUrl(baseUrl: string, width = 900): string {
  return pexelsCoverUrl(BARBER_PHOTO_IDS[0]!, width);
}

/** @deprecated Pexels fallback ishlatiladi */
export function unsplashCoverUrl(_photoId: string, width = 900, _height = 675): string {
  return pexelsCoverUrl(BARBER_PHOTO_IDS[0]!, width);
}

/** @deprecated Pexels fallback ishlatiladi */
export function picsumCoverUrl(seed: string, width = 900, height = 675): string {
  return getSalonCoverUrl(seed, "barber", width, height);
}

const BARBER_PHOTO_IDS = [
  3992859, 3992860, 3992862, 3992863, 3992864, 3992865, 3992866, 3992867, 3992868, 3992869,
  3992870, 3992871, 3992872, 3992873, 3992874, 3992875, 3992876, 3992877, 3992878, 3992879,
  3992880, 3992881, 3992883, 3992884, 3992885, 3992886, 3992887, 3992889, 3992891, 3992892,
  3992893, 3992894, 3992895, 3992896, 3992897, 3992898, 3992901, 3992902, 3992904, 3992907,
  3992910, 3992911, 3992912, 3992913, 3992914, 3992915, 3992916, 3992917, 3992918, 3992919,
  3992923, 3992924, 3992925, 3992926, 3992927, 3992928, 3992929, 3992930, 3992931, 3992932,
  3992933, 3992934, 3992935, 3992936, 3992937, 3992938, 3998414, 3998375, 3998377, 3993447,
  3993448, 3993449, 1319460, 1319461, 3272361, 769779, 3785147, 1560862,
] as const;

const BEAUTY_PHOTO_IDS = [
  2523210, 2523235, 2523240, 2523250, 2523255, 2523260, 2523265, 2523270, 2523290, 2523295,
  2523300, 2523305, 2523315, 2523320, 2537564, 834280, 2521943, 3288365, 4564265, 4564260,
  4666064, 4043096, 2676392, 6964536, 5200392,
] as const;

const NAILS_PHOTO_IDS = [
  2866115, 2866116, 2866117, 2866118, 2866119, 2866120, 2866121, 2866123, 2866124, 2866126,
  2866127, 2866128, 2866129, 1677561, 2688470, 9283145,
] as const;

const SPA_PHOTO_IDS = [
  1453001, 1453005, 1453015, 1453025, 1453030, 1453055, 1453060, 1453065, 1453070, 335965,
  1884166, 936549, 567021, 4108085, 5132408, 5382251,
] as const;

const ALL_SALON_PHOTO_IDS = [
  ...BARBER_PHOTO_IDS,
  ...BEAUTY_PHOTO_IDS,
  ...NAILS_PHOTO_IDS,
  ...SPA_PHOTO_IDS,
] as const;

function poolForCategory(category?: Category): readonly number[] {
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

/** Toshkent mock salonlari — slug bo'yicha barqaror Pexels rasm (250 ta). */
const MOCK_TASHKENT_COVERS: Record<string, string> = Object.fromEntries(
  Array.from({ length: MOCK_SALON_COUNT }, (_, i) => {
    const slug = `mock-tashkent-${String(i + 1).padStart(3, "0")}`;
    const kinds: Category[] = ["barber", "barber", "barber", "beauty", "nails", "spa"];
    const kind = kinds[i % kinds.length] ?? "barber";
    const pool = poolForCategory(kind);
    const photoId = pool[i % pool.length]!;
    return [slug, pexelsCoverUrl(photoId)];
  }),
);

const SALON_COVERS: Record<string, string> = {
  ...MOCK_TASHKENT_COVERS,
  legacy: pexelsCoverUrl(BARBER_PHOTO_IDS[0]!),
  atelier: pexelsCoverUrl(BEAUTY_PHOTO_IDS[0]!),
  studiom: pexelsCoverUrl(BARBER_PHOTO_IDS[1]!),
  nailhouse: pexelsCoverUrl(NAILS_PHOTO_IDS[0]!),
  noir: pexelsCoverUrl(BARBER_PHOTO_IDS[2]!),
  glow: pexelsCoverUrl(BEAUTY_PHOTO_IDS[1]!),
  abdubarber: pexelsCoverUrl(BARBER_PHOTO_IDS[0]),
  "abdubarber-1": pexelsCoverUrl(BARBER_PHOTO_IDS[1]),
  "abdubarber-2": pexelsCoverUrl(BARBER_PHOTO_IDS[2]),
};

const TREND_SEEDS = [
  "tr1", "tr2", "tr3", "tr4", "tr5", "tr6",
  "mid-fade", "textured-crop", "curly-top-fade", "beach-waves", "blunt-cut",
  "curtain-bangs", "highlights", "soft-bob", "balayage",
] as const;

const TREND_COVERS: Record<string, string> = Object.fromEntries(
  TREND_SEEDS.map((key, i) => [
    key,
    pexelsCoverUrl(ALL_SALON_PHOTO_IDS[i % ALL_SALON_PHOTO_IDS.length]!, 560),
  ]),
);

export function getSalonCoverUrl(
  seed: string,
  category: Category = "barber",
  width = 900,
  _height = 675,
): string {
  const known = SALON_COVERS[seed];
  if (known) return known;

  const pool = poolForCategory(category);
  const photoId = pool[hashSeed(seed) % pool.length]!;
  return pexelsCoverUrl(photoId, width);
}

/** API cover_image — Pexels mock URL larini seed asosida almashtiradi. */
export function resolveCoverUrl(
  apiUrl: string | null | undefined,
  seed: string,
  category: Category = "barber",
): string {
  const resolved = normalizeCoverUrl(apiUrl?.trim() ?? "") ?? "";
  if (!resolved || resolved.includes("picsum.photos") || resolved.endsWith("/media/")) {
    return getSalonCoverUrl(seed, category);
  }
  return resolved;
}

export function getCategoryCoverUrl(category: Category, width = 900): string {
  const pool = poolForCategory(category);
  return pexelsCoverUrl(pool[0]!, width);
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
