import type { FaceShapeKey, HairTypeKey } from "@/components/ai-style/ai-style-shared";
import type { AgeGroup } from "@/lib/age-groups";
import type { ExplorePersonaId } from "@/lib/explore-personas";
import { loadFaceProfile, loadFaceProfileHistory } from "@/lib/face-profile";
import type { HairstyleEntry } from "@/lib/hairstyles/catalog";
import {
  hasCatalogImageAsset,
  pickCatalogPersonaForSlug,
  resolveCatalogImageUrl,
  toTrendingStyle,
  type TrendingHairstyle,
} from "@/lib/hairstyles/catalog";

const HAIR_LENGTH_ORDER: Record<HairTypeKey, number> = { short: 0, medium: 1, long: 2 };
const DEFAULT_FACE: FaceShapeKey = "oval";
const DEFAULT_HAIR: HairTypeKey = "medium";
const TRENDING_LIMIT = 6;

export type TrendingContext = {
  faceShape?: FaceShapeKey | null;
  hairType?: HairTypeKey | null;
  ageGroup?: AgeGroup | null;
  preferredPersonaId?: ExplorePersonaId | null;
  limit?: number;
};

/** Content-based score — backend `score_hairstyle` bilan mos. */
export function scoreHairstyleForTrending(
  entry: HairstyleEntry,
  ctx: Pick<TrendingContext, "faceShape" | "hairType">,
): number {
  const faceShape = ctx.faceShape ?? DEFAULT_FACE;
  const hairType = ctx.hairType ?? DEFAULT_HAIR;
  let score = 0;

  if (entry.faceShapes.includes(faceShape)) score += 30;

  const styleLen = entry.hairLength;
  if (styleLen === hairType) {
    score += 20;
  } else {
    const diff = Math.abs(HAIR_LENGTH_ORDER[styleLen] - HAIR_LENGTH_ORDER[hairType]);
    if (diff === 1) score += 8;
    else if (diff === 2) score += 2;
  }

  return score;
}

/** Kategoriya xilma-xilligi: bir xil category ketma-ket takrorlanmasin. */
function pickDiverseStyles(ranked: HairstyleEntry[], limit: number): HairstyleEntry[] {
  const picked: HairstyleEntry[] = [];
  const usedCategories = new Set<string>();

  for (const entry of ranked) {
    if (picked.length >= limit) break;
    if (usedCategories.has(entry.category)) continue;
    picked.push(entry);
    usedCategories.add(entry.category);
  }

  for (const entry of ranked) {
    if (picked.length >= limit) break;
    if (picked.some((p) => p.id === entry.id)) continue;
    picked.push(entry);
  }

  return picked;
}

export function readTrendingFaceHints(): Pick<TrendingContext, "faceShape" | "hairType"> {
  const profile = loadFaceProfile();
  if (profile) {
    return { faceShape: profile.faceShapeKey, hairType: profile.hairTypeKey };
  }
  const latest = loadFaceProfileHistory()[0];
  return { faceShape: latest?.faceShapeKey, hairType: latest?.hairTypeKey };
}

/**
 * Trending strip tavsiyasi:
 * 1) Content-based scoring (yuz shakli + soch uzunligi)
 * 2) Kategoriya bo‘yicha xilma-xillik
 * 3) Erkaklar uchun har slot — boshqa persona (turli odamlar, turli uslublar)
 */
export function pickTrendingStyles(
  entries: HairstyleEntry[],
  ctx: TrendingContext = {},
): TrendingHairstyle[] {
  const limit = ctx.limit ?? TRENDING_LIMIT;
  const pool = entries.filter(hasCatalogImageAsset);
  if (!pool.length) return [];

  const ranked = [...pool].sort((a, b) => {
    const scoreA = scoreHairstyleForTrending(a, ctx);
    const scoreB = scoreHairstyleForTrending(b, ctx);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.slug.localeCompare(b.slug);
  });

  const diverse = pickDiverseStyles(ranked, limit);

  return diverse.flatMap((entry, index) => {
    const personaId =
      entry.audience === "men"
        ? pickCatalogPersonaForSlug(entry.slug, index, ctx.preferredPersonaId)
        : null;
    const imageUrl = resolveCatalogImageUrl(entry, personaId);
    if (!imageUrl) return [];
    return [{ ...toTrendingStyle(entry), personaId, imageUrl }];
  });
}
