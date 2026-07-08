import type { FaceShapeKey, HairTypeKey } from "@/components/ai-style/ai-style-shared";
import type { AgeGroup } from "@/lib/age-groups";
import type { ExplorePersonaId } from "@/lib/explore-personas";
import { apiJson } from "./client";

export type ApiHairstyleGalleryItem = {
  view: string;
  label: string;
  url: string;
};

export type ApiHairstyle = {
  id: string;
  slug: string;
  title: string;
  title_uz: string;
  audience: "men" | "women";
  category: string;
  face_shapes: FaceShapeKey[];
  hair_length: HairTypeKey;
  image_url: string;
  gallery?: ApiHairstyleGalleryItem[];
  description_uz: string;
  tags: string[];
  age_groups: AgeGroup[];
  sort_order: number;
};

export async function fetchHairstyles(
  audience?: "men" | "women",
  ageGroup?: AgeGroup | null,
  personaId?: ExplorePersonaId,
): Promise<ApiHairstyle[]> {
  const params = new URLSearchParams();
  if (audience) params.set("audience", audience);
  if (ageGroup) params.set("age_group", ageGroup);
  if (personaId) params.set("persona", personaId);
  const query = params.toString();
  return apiJson<ApiHairstyle[]>(`/api/v1/hairstyles/${query ? `?${query}` : ""}`);
}

export async function fetchHairstyleById(
  styleId: string,
  ageGroup?: AgeGroup | null,
  personaId?: ExplorePersonaId,
): Promise<ApiHairstyle> {
  const params = new URLSearchParams();
  if (ageGroup) params.set("age_group", ageGroup);
  if (personaId) params.set("persona", personaId);
  const query = params.toString();
  return apiJson<ApiHairstyle>(`/api/v1/hairstyles/${encodeURIComponent(styleId)}/${query ? `?${query}` : ""}`);
}
