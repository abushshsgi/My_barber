import { apiJson } from "./client";

export type SkinType = "dry" | "oily" | "combination" | "normal";
export type SkinSensitivity = "low" | "medium" | "high";

export type SkinProfile = {
  skin_type: SkinType | "";
  acne_prone: boolean;
  sensitivity: SkinSensitivity | "";
  complete: boolean;
  completed_at: string | null;
  updated_at: string | null;
};

export type SkinProfileUpdate = {
  skin_type: SkinType;
  acne_prone: boolean;
  sensitivity: SkinSensitivity;
};

export async function fetchSkinProfile(): Promise<SkinProfile> {
  return apiJson<SkinProfile>("/api/v1/users/me/skin-profile/");
}

export async function updateSkinProfile(body: SkinProfileUpdate): Promise<SkinProfile> {
  return apiJson<SkinProfile>("/api/v1/users/me/skin-profile/", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
