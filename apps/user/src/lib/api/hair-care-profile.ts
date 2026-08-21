import { apiJson } from "./client";

export type HairCondition = "oily" | "dry" | "normal" | "damaged";
export type HairTexture = "straight" | "wavy" | "curly";
export type HairColorStatus = "natural" | "colored" | "bleached";

export type HairCareProfile = {
  condition: HairCondition | "";
  texture: HairTexture | "";
  color_status: HairColorStatus | "";
  complete: boolean;
  completed_at: string | null;
  updated_at: string | null;
};

export type HairCareProfileUpdate = {
  condition: HairCondition;
  texture: HairTexture;
  color_status: HairColorStatus;
};

export async function fetchHairCareProfile(): Promise<HairCareProfile> {
  return apiJson<HairCareProfile>("/api/v1/users/me/hair-care-profile/");
}

export async function updateHairCareProfile(
  body: HairCareProfileUpdate,
): Promise<HairCareProfile> {
  return apiJson<HairCareProfile>("/api/v1/users/me/hair-care-profile/", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
