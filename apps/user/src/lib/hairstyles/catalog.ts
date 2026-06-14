import type { FaceShapeKey, HairTypeKey } from "@/components/ai-style/ai-style-shared";
import type { ExplorePersonaId } from "@/lib/explore-personas";
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
