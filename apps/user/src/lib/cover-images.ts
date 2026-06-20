/** Barqaror demo rasmlar — picsum.photos (Unsplash ID ko‘p hollarda 404). */

export function picsumCoverUrl(seed: string, width = 900, height = 675): string {
  const safe = encodeURIComponent(
    seed.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "salon",
  );
  return `https://picsum.photos/seed/${safe}/${width}/${height}`;
}

/** Toshkent mock salonlari — har slug uchun barqaror rasm. */
const MOCK_TASHKENT_COVERS: Record<string, string> = Object.fromEntries(
  Array.from({ length: 50 }, (_, i) => {
    const slug = `mock-tashkent-${String(i + 1).padStart(3, "0")}`;
    return [slug, picsumCoverUrl(slug, 900, 675)];
  }),
);

const SALON_COVERS: Record<string, string> = {
  ...MOCK_TASHKENT_COVERS,
  legacy: picsumCoverUrl("salon-legacy"),
  atelier: picsumCoverUrl("salon-atelier"),
  studiom: picsumCoverUrl("salon-studiom"),
  nailhouse: picsumCoverUrl("salon-nailhouse"),
  noir: picsumCoverUrl("salon-noir"),
  glow: picsumCoverUrl("salon-glow"),
};

const MOCK_SALON_POOL: readonly string[] = Array.from({ length: 12 }, (_, i) =>
  picsumCoverUrl(`salon-pool-${i}`),
);

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
  TREND_SEEDS.map((key) => [key, picsumCoverUrl(`trend-${key}`, 560, 740)]),
);

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getSalonCoverUrl(seed: string): string {
  const known = SALON_COVERS[seed];
  if (known) return known;
  const idx = hashSeed(seed) % MOCK_SALON_POOL.length;
  return MOCK_SALON_POOL[idx]!;
}

export function getTrendCoverUrl(seed: string): string {
  return TREND_COVERS[seed] ?? picsumCoverUrl(`trend-${seed}`, 560, 740);
}

const AI_STYLE_HERO: Record<string, string> = {
  "hero-men": "/ai-style/hero-men.png",
  "hero-women": "/ai-style/hero-women.png",
};

export function getAiStyleHeroUrl(seed: string): string {
  return AI_STYLE_HERO[seed] ?? AI_STYLE_HERO["hero-men"];
}
