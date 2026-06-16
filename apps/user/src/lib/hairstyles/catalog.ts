import type { FaceShapeKey, HairTypeKey } from "@/components/ai-style/ai-style-shared";
import {
  getPersonaStyleImageUrl,
  hasPersonaStyleAsset,
  listReadyExplorePersonas,
  type ExplorePersonaId,
} from "@/lib/explore-personas";
import type { ApiHairstyle } from "@/lib/api/hairstyles";
import type { Audience, Category } from "@/lib/mock-data";
import type { AudienceFilter } from "@/hooks/use-audience";
import { matchAudience } from "@/hooks/use-audience";

export type HairstyleEntry = {
  id: string;
  slug: string;
  title: string;
  titleUz: string;
  audience: Audience;
  category: Category;
  faceShapes: FaceShapeKey[];
  hairLength: HairTypeKey;
  imageUrl: string;
  descriptionUz: string;
  tags: string[];
};

export function mapApiHairstyle(api: ApiHairstyle): HairstyleEntry {
  return {
    id: api.id,
    slug: api.slug,
    title: api.title,
    titleUz: api.title_uz,
    audience: api.audience,
    category: api.category as Category,
    faceShapes: api.face_shapes,
    hairLength: api.hair_length,
    imageUrl: api.image_url,
    descriptionUz: api.description_uz,
    tags: api.tags,
  };
}

export function filterHairstyles(
  entries: HairstyleEntry[],
  audience?: AudienceFilter,
): HairstyleEntry[] {
  if (!audience || audience === "all") return entries;
  return entries.filter((entry) => matchAudience(entry.audience, audience));
}

const AGE_GROUP_SEGMENT = /^(kids|teen|young|adult|mature)$/;

/** Yosh guruhi bo'yicha yo'l 404 bo'lsa — asosiy katalog yo'liga qaytish. */
export function hairstyleImageFallbacks(imageUrl: string): string[] {
  const parts = imageUrl.split("/").filter(Boolean);
  if (parts.length < 4 || parts[0] !== "hairstyles") return [];
  const audience = parts[1];
  if (audience !== "men" && audience !== "women") return [];
  if (!AGE_GROUP_SEGMENT.test(parts[2] ?? "")) return [];
  const file = parts[parts.length - 1];
  if (!file?.endsWith(".webp")) return [];
  return [`/hairstyles/${audience}/${file}`];
}

/** Asosiy katalogda mavjud ayol uslublari (`public/hairstyles/women/{slug}.webp`). */
export const WOMEN_CATALOG_IMAGE_SLUGS = new Set<string>([
  "soft-bob",
  "long-layers",
  "balayage",
  "pixie-cut",
  "beach-waves",
  "straight-lob",
  "curtain-bangs",
  "shag-cut",
  "braids",
  "updo-bun",
  "blunt-cut",
  "highlights",
]);

export function resolveWomenCatalogImageUrl(slug: string): string {
  return `/hairstyles/women/${slug}.webp`;
}

/** Katalogda haqiqiy rasm fayli mavjud uslublar (home trending / explore strip). */
export function hasCatalogImageAsset(entry: Pick<HairstyleEntry, "audience" | "slug">): boolean {
  if (entry.audience === "men") {
    return listReadyExplorePersonas().some((persona) =>
      hasPersonaStyleAsset(persona.id, entry.slug),
    );
  }
  return WOMEN_CATALOG_IMAGE_SLUGS.has(entry.slug);
}

export function pickCatalogPersonaForSlug(
  slug: string,
  index: number,
  preferred?: ExplorePersonaId | null,
): ExplorePersonaId | null {
  const ready = listReadyExplorePersonas().map((persona) => persona.id);
  const ordered =
    preferred && ready.includes(preferred)
      ? [preferred, ...ready.filter((id) => id !== preferred)]
      : ready;
  const withAsset = ordered.filter((personaId) => hasPersonaStyleAsset(personaId, slug));
  if (!withAsset.length) return null;
  return withAsset[index % withAsset.length]!;
}

/** Trending uchun yechilgan rasm yo‘li — asset bo‘lmasa null. */
export function resolveCatalogImageUrl(
  entry: Pick<HairstyleEntry, "audience" | "slug" | "imageUrl">,
  personaId?: ExplorePersonaId | null,
): string | null {
  if (entry.audience === "men") {
    if (personaId && hasPersonaStyleAsset(personaId, entry.slug)) {
      return getPersonaStyleImageUrl(personaId, entry.slug);
    }
    return null;
  }
  if (WOMEN_CATALOG_IMAGE_SLUGS.has(entry.slug)) {
    return resolveWomenCatalogImageUrl(entry.slug);
  }
  return null;
}

export function getHairstyleImageUrl(entry: Pick<HairstyleEntry, "imageUrl">): string {
  const url = entry.imageUrl?.trim();
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  return url.startsWith("/") ? url : `/${url}`;
}

/** Home / legacy mock-data bilan moslik */
export function toTrendingStyle(entry: HairstyleEntry) {
  return {
    id: entry.id,
    title: entry.titleUz,
    audience: entry.audience,
    category: entry.category,
    seed: entry.slug,
    imageUrl: entry.imageUrl,
  };
}

export type TrendingHairstyle = ReturnType<typeof toTrendingStyle> & {
  personaId?: ExplorePersonaId | null;
};
