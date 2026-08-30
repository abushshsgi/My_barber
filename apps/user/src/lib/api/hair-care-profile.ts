import { apiJson } from "./client";

export type HairCondition = "oily" | "dry" | "normal" | "damaged";
export type HairTexture = "straight" | "wavy" | "curly";
export type HairColorStatus = "natural" | "colored" | "bleached";

export type HairScalp = "oily" | "dry" | "normal" | "sensitive";
export type HairConcern =
  | "dandruff"
  | "hair_loss"
  | "frizz"
  | "breakage"
  | "color_fade"
  | "itch"
  | "split_ends";

export type HairCareProfile = {
  condition: HairCondition | "";
  texture: HairTexture | "";
  color_status: HairColorStatus | "";
  scalp?: HairScalp | "";
  concerns?: HairConcern[];
  complete: boolean;
  completed_at: string | null;
  updated_at: string | null;
};

export type HairCareProfileUpdate = {
  condition: HairCondition;
  texture: HairTexture;
  color_status: HairColorStatus;
  scalp?: HairScalp;
  concerns?: HairConcern[];
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
