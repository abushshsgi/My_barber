import type { Category } from "@/lib/mock-data";

/** Pixabay CDN — sartarosh, go'zallik, tirnoq, spa (Unsplash/picsum o'rniga). */
export function pixabayCoverUrl(baseUrl: string, width = 900): string {
  const size = width >= 800 ? 1280 : 640;
  return baseUrl.replace(/_\d+\.jpg$/i, `_${size}.jpg`);
}

/** @deprecated Pixabay fallback ishlatiladi */
export function unsplashCoverUrl(_photoId: string, width = 900, _height = 675): string {
  return pixabayCoverUrl(BARBER_COVERS[0]!, width);
}

/** @deprecated Pixabay fallback ishlatiladi */
export function picsumCoverUrl(seed: string, width = 900, height = 675): string {
  return getSalonCoverUrl(seed, "barber", width, height);
}

const BARBER_COVERS = [
  "https://cdn.pixabay.com/photo/2021/11/15/11/00/barber-shop-6797761_640.jpg",
  "https://cdn.pixabay.com/photo/2017/05/26/10/25/barber-2345701_640.jpg",
  "https://cdn.pixabay.com/photo/2022/05/28/02/25/barber-shop-7226341_640.jpg",
  "https://cdn.pixabay.com/photo/2017/05/07/11/46/barber-2292168_640.jpg",
  "https://cdn.pixabay.com/photo/2015/11/01/19/43/barber-1017457_640.jpg",
  "https://cdn.pixabay.com/photo/2021/11/15/11/50/electric-shaver-6797899_640.jpg",
  "https://cdn.pixabay.com/photo/2015/10/26/20/41/haircut-1007882_640.jpg",
  "https://cdn.pixabay.com/photo/2021/11/23/13/40/barber-6818702_640.jpg",
  "https://cdn.pixabay.com/photo/2021/11/15/11/55/haircut-6797912_640.jpg",
  "https://cdn.pixabay.com/photo/2021/11/23/13/39/barber-6818690_640.jpg",
] as const;

const BEAUTY_COVERS = [
  "https://cdn.pixabay.com/photo/2017/08/24/11/12/makeup-2676392_640.jpg",
  "https://cdn.pixabay.com/photo/2019/12/01/18/04/hairdresser-4666064_640.jpg",
  "https://cdn.pixabay.com/photo/2019/03/08/20/17/beauty-salon-4043096_640.jpg",
  "https://cdn.pixabay.com/photo/2017/07/25/10/37/woman-2537564_640.jpg",
  "https://cdn.pixabay.com/photo/2015/07/07/11/36/haircut-834280_640.jpg",
  "https://cdn.pixabay.com/photo/2017/07/20/10/51/beauty-salon-2521943_640.jpg",
  "https://cdn.pixabay.com/photo/2015/11/27/02/24/solarium-1064815_640.jpg",
  "https://cdn.pixabay.com/photo/2014/12/15/14/00/beauty-saloon-569111_640.jpg",
] as const;

const NAILS_COVERS = [
  "https://cdn.pixabay.com/photo/2020/08/30/14/57/beautician-5529805_640.jpg",
  "https://cdn.pixabay.com/photo/2017/08/06/00/41/people-2587157_640.jpg",
  "https://cdn.pixabay.com/photo/2015/07/28/22/00/nails-865082_640.jpg",
  "https://cdn.pixabay.com/photo/2016/09/18/09/02/nail-polish-1677561_640.jpg",
] as const;

const SPA_COVERS = [
  "https://cdn.pixabay.com/photo/2014/05/02/12/41/candle-335965_640.jpg",
  "https://cdn.pixabay.com/photo/2016/12/05/15/46/salt-1884166_640.jpg",
  "https://cdn.pixabay.com/photo/2018/02/09/15/00/woman-3141766_640.jpg",
  "https://cdn.pixabay.com/photo/2014/12/13/18/27/woman-567021_640.jpg",
] as const;

const ALL_SALON_COVERS = [
  ...BARBER_COVERS,
  ...BEAUTY_COVERS,
  ...NAILS_COVERS,
  ...SPA_COVERS,
] as const;

function poolForCategory(category?: Category): readonly string[] {
  if (category === "beauty") return BEAUTY_COVERS;
  if (category === "nails") return NAILS_COVERS;
  if (category === "spa") return SPA_COVERS;
  return BARBER_COVERS;
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Toshkent mock salonlari — slug bo'yicha barqaror rasm. */
const MOCK_TASHKENT_COVERS: Record<string, string> = Object.fromEntries(
  Array.from({ length: 50 }, (_, i) => {
    const slug = `mock-tashkent-${String(i + 1).padStart(3, "0")}`;
    const base = ALL_SALON_COVERS[i % ALL_SALON_COVERS.length]!;
    return [slug, pixabayCoverUrl(base)];
  }),
);

const SALON_COVERS: Record<string, string> = {
  ...MOCK_TASHKENT_COVERS,
  legacy: pixabayCoverUrl(BARBER_COVERS[0]),
  atelier: pixabayCoverUrl(BEAUTY_COVERS[0]),
  studiom: pixabayCoverUrl(BARBER_COVERS[1]),
  nailhouse: pixabayCoverUrl(NAILS_COVERS[0]),
  noir: pixabayCoverUrl(BARBER_COVERS[2]),
  glow: pixabayCoverUrl(BEAUTY_COVERS[1]),
  abdubarber: pixabayCoverUrl(BARBER_COVERS[0]),
  "abdubarber-1": pixabayCoverUrl(BARBER_COVERS[1]),
  "abdubarber-2": pixabayCoverUrl(BARBER_COVERS[2]),
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
    pixabayCoverUrl(ALL_SALON_COVERS[i % ALL_SALON_COVERS.length]!, 560),
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
  const base = pool[hashSeed(seed) % pool.length]!;
  return pixabayCoverUrl(base, width);
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
