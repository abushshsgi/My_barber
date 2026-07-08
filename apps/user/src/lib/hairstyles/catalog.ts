import type { FaceShapeKey, HairTypeKey } from "@/components/ai-style/ai-style-shared";
import {
  getPersonaStyleImageUrl,
  hasPersonaStyleAsset,
  listReadyExplorePersonas,
  type ExplorePersonaId,
} from "@/lib/explore-personas";
import { getTrendCoverUrl } from "@/lib/cover-images";
import type { ApiHairstyle } from "@/lib/api/hairstyles";
import type { Audience, Category } from "@/lib/mock-data";
import type { AudienceFilter } from "@/hooks/use-audience";
import { matchAudience } from "@/hooks/use-audience";

export type HairstyleGalleryItem = {
  view: string;
  label: string;
  url: string;
};

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
  gallery: HairstyleGalleryItem[];
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
    gallery: api.gallery ?? [],
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

/** Katalogda haqiqiy persona rasm fayli mavjud uslublar (home trending / explore strip). */
export function hasCatalogImageAsset(entry: Pick<HairstyleEntry, "audience" | "slug">): boolean {
  if (entry.audience !== "men") return false;
  return listReadyExplorePersonas().some((persona) => hasPersonaStyleAsset(persona.id, entry.slug));
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

/** Trending / explore uchun ko‘rsatiladigan rasm. */
export function resolveCatalogImageUrl(
  entry: Pick<HairstyleEntry, "audience" | "slug" | "imageUrl">,
  personaId?: ExplorePersonaId | null,
): string | null {
  if (entry.audience === "men") {
    if (personaId && hasPersonaStyleAsset(personaId, entry.slug)) {
      return getPersonaStyleImageUrl(personaId, entry.slug);
    }
    const persona = pickCatalogPersonaForSlug(entry.slug, 0, personaId);
    if (persona && hasPersonaStyleAsset(persona, entry.slug)) {
      return getPersonaStyleImageUrl(persona, entry.slug);
    }
    return null;
  }
  const primary = getHairstyleImageUrl(entry);
  return primary || getTrendCoverUrl(entry.slug);
}

export function hasDisplayableHairstyleImage(
  entry: Pick<HairstyleEntry, "audience" | "slug" | "imageUrl">,
): boolean {
  if (entry.audience === "men") return hasCatalogImageAsset(entry);
  return Boolean(getHairstyleImageUrl(entry)) || Boolean(entry.slug);
}

export function getHairstyleImageUrl(entry: Pick<HairstyleEntry, "imageUrl">): string {
  const url = entry.imageUrl?.trim();
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  return url.startsWith("/") ? url : `/${url}`;
}

/** Explore / kartochkalar — yo‘q yoki 404 bo‘lsa barqaror fallback. */
export function getHairstyleDisplayUrl(
  entry: Pick<HairstyleEntry, "imageUrl" | "slug">,
): string {
  const primary = getHairstyleImageUrl(entry);
  return primary || getTrendCoverUrl(entry.slug);
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
