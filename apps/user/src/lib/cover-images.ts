import type { Category } from "@/lib/mock-data";

const PLACEHOLDER_SALON = "/placeholder-salon.svg";

/** API yoki tashqi Pexels URL ni same-origin proxy yo‘liga aylantiradi. */
export function normalizeCoverUrl(url: string | null | undefined): string | null {
  const raw = url?.trim();
  if (!raw) return null;
  const match = raw.match(/images\.pexels\.com\/photos\/(\d+)/);
  if (match) return `/covers/pexels/${match[1]}?w=900`;
  return raw;
}

/** Salon kartochkasi uchun — faqat API URL yoki placeholder. */
export function resolveCoverUrl(
  apiUrl: string | null | undefined,
  _seed?: string,
  _category?: Category,
): string {
  const resolved = normalizeCoverUrl(apiUrl?.trim() ?? "") ?? "";
  if (!resolved || resolved.endsWith("/media/")) {
    return PLACEHOLDER_SALON;
  }
  return resolved;
}

/** @deprecated resolveCoverUrl yoki PLACEHOLDER_SALON ishlating */
export function getSalonCoverUrl(
  _seed?: string,
  _category?: Category,
  _width = 900,
  _height = 675,
): string {
  return PLACEHOLDER_SALON;
}

const TREND_SEEDS = [
  "tr1", "tr2", "tr3", "tr4", "tr5", "tr6",
  "mid-fade", "textured-crop", "curly-top-fade", "beach-waves", "blunt-cut",
  "curtain-bangs", "highlights", "soft-bob", "balayage",
] as const;

const TREND_PHOTO_IDS = [
  3992859, 2523210, 3992860, 2866115, 1453001, 3992862,
  3992863, 3992864, 3992865, 3992866, 3992867, 3992868,
  3992869, 3992870, 3992871,
] as const;

export function pexelsCoverUrl(photoId: number, width = 560): string {
  const w = width >= 800 ? 1200 : 800;
  return `/covers/pexels/${photoId}?w=${w}`;
}

const TREND_COVERS: Record<string, string> = Object.fromEntries(
  TREND_SEEDS.map((key, i) => [
    key,
    pexelsCoverUrl(TREND_PHOTO_IDS[i % TREND_PHOTO_IDS.length]!, 560),
  ]),
);

export function getCategoryCoverUrl(_category: Category, _width = 900): string {
  return PLACEHOLDER_SALON;
}

export function getTrendCoverUrl(seed: string): string {
  return TREND_COVERS[seed] ?? PLACEHOLDER_SALON;
}

const AI_STYLE_HERO: Record<string, string> = {
  "hero-men": "/ai-style/hero-men.png",
  "hero-women": "/ai-style/hero-women.png",
};

export function getAiStyleHeroUrl(seed: string): string {
  return AI_STYLE_HERO[seed] ?? AI_STYLE_HERO["hero-men"];
}
