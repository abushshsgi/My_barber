import type { FaceShapeKey, HairTypeKey } from "@/components/ai-style/ai-style-shared";
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

export function getHairstyleImageUrl(entry: Pick<HairstyleEntry, "imageUrl">): string {
  return entry.imageUrl;
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

export type TrendingHairstyle = ReturnType<typeof toTrendingStyle>;
