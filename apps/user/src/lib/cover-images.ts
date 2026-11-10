import type { Category } from "@/lib/mock-data";
import { resolveMediaUrl } from "@/lib/media-url";

const PLACEHOLDER_SALON = "/placeholder-salon.svg";

const CATEGORY_PHOTOS: Record<Category, number> = {
  barber: 3992859,
  beauty: 3738349,
  nails: 4968391,
};

/** API yoki tashqi Pexels URL ni appda yuklanadigan URL ga aylantiradi. */
export function normalizeCoverUrl(url: string | null | undefined): string | null {
  const raw = url?.trim();
  if (!raw) return null;
  return resolveMediaUrl(raw) ?? raw;
}

function isStockCoverUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes("/covers/pexels/") || u.includes("images.pexels.com") || u.includes("picsum.photos")
  );
}

/** Salon cover — faqat neytral placeholder (stock/demo yo‘q). */
export function getSalonCoverUrl(_seed?: string, _category?: Category, _width = 900): string {
  return PLACEHOLDER_SALON;
}

/**
 * Salon kartochkasi — faqat haqiqiy API media.
 * Bo‘sh yoki stock URL bo‘lsa placeholder (Pexels/demo yo‘q).
 */
export function resolveCoverUrl(
  apiUrl: string | null | undefined,
  _seed?: string,
  _category?: Category,
): string {
  const raw = apiUrl?.trim() ?? "";
  if (!raw || isStockCoverUrl(raw)) {
    return PLACEHOLDER_SALON;
  }
  const normalized = resolveMediaUrl(raw) ?? raw;
  if (isStockCoverUrl(normalized)) {
    return PLACEHOLDER_SALON;
  }
  if (normalized.startsWith("/media/") && normalized.length > "/media/".length) {
    return resolveMediaUrl(normalized) ?? PLACEHOLDER_SALON;
  }
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }
  if (normalized.startsWith("/")) {
    return resolveMediaUrl(normalized) ?? normalized;
  }
  return PLACEHOLDER_SALON;
}

const TREND_SEEDS = [
  "tr1",
  "tr2",
  "tr3",
  "tr4",
  "tr5",
  "tr6",
  "old-money-loose-curl",
  "old-money-soft-wave",
  "old-money-defined-curl",
  "beach-waves",
  "blunt-cut",
  "curtain-bangs",
  "highlights",
  "soft-bob",
  "balayage",
] as const;

const TREND_PHOTO_IDS = [
  3992859, 2523210, 3992860, 2866115, 1453001, 3992862, 3992863, 3992864, 3992865, 3992866, 3992867,
  3992868, 3992869, 3992870, 3992871,
] as const;

function pexelsWidthBucket(width: number): number {
  if (width <= 480) return 480;
  if (width <= 640) return 640;
  if (width <= 720) return 720;
  if (width <= 960) return 960;
  return 1200;
}

export function pexelsCoverUrl(photoId: number, width = 560): string {
  const w = pexelsWidthBucket(width);
  return resolveMediaUrl(`/covers/pexels/${photoId}?w=${w}`) ?? `/covers/pexels/${photoId}?w=${w}`;
}

const PEXELS_WIDTHS = [480, 640, 720, 960, 1200] as const;

export function pexelsCoverSrcSet(photoId: number): string {
  return PEXELS_WIDTHS.map((w) => `${pexelsCoverUrl(photoId, w)} ${w}w`).join(", ");
}

const TREND_COVERS: Record<string, string> = Object.fromEntries(
  TREND_SEEDS.map((key, i) => [
    key,
    pexelsCoverUrl(TREND_PHOTO_IDS[i % TREND_PHOTO_IDS.length]!, 560),
  ]),
);

export function getCategoryCoverUrl(category: Category, width = 900): string {
  return pexelsCoverUrl(CATEGORY_PHOTOS[category], width);
}

export function getTrendCoverUrl(seed: string): string {
  return TREND_COVERS[seed] ?? getSalonCoverUrl(seed);
}

const AI_STYLE_HERO: Record<string, string> = {
  "hero-men": "/ai-style/hero-men.png",
  "hero-women": "/ai-style/hero-women.png",
};

export function getAiStyleHeroUrl(seed: string, width = 720): string {
  const w = width >= 1000 ? 1080 : 720;
  if (seed === "hero-women") return `/ai-style/hero-women-${w}.webp`;
  if (seed === "hero-men") return `/ai-style/hero-men-${w}.webp`;
  return `/ai-style/hero-men-${w}.webp`;
}

export function getAiStyleHeroSrcSet(seed: string): string {
  const base = seed === "hero-women" ? "hero-women" : "hero-men";
  return `/ai-style/${base}-720.webp 720w, /ai-style/${base}-1080.webp 1080w`;
}

export { PLACEHOLDER_SALON };
