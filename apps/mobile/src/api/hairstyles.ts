import { apiJson, qs } from "./client";

export type ApiHairstyle = {
  id: string;
  slug: string;
  title: string;
  title_uz: string;
  audience: "men" | "women";
  category: string;
  image_url: string;
  description_uz?: string;
  tags?: string[];
  sort_order?: number;
};

export async function fetchHairstyles(
  audience: "men" | "women" = "men",
): Promise<ApiHairstyle[]> {
  return apiJson<ApiHairstyle[]>(
    `/api/v1/hairstyles/${qs({ audience })}`,
  );
}
