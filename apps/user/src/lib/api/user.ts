import { apiJson } from "./client";
import type { ApiUser } from "./types";

export async function fetchMe(): Promise<ApiUser> {
  return apiJson<ApiUser>("/api/v1/users/me/");
}

export type UpdateMePayload = Partial<
  Pick<
    ApiUser,
    | "first_name"
    | "last_name"
    | "full_name"
    | "phone"
    | "region"
    | "birth_year"
    | "latitude"
    | "longitude"
    | "onboarding_completed"
  >
>;

export async function updateMe(data: UpdateMePayload): Promise<ApiUser> {
  return apiJson<ApiUser>("/api/v1/users/me/", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function uploadMyAvatar(file: File): Promise<ApiUser> {
  const body = new FormData();
  body.append("avatar", file);
  return apiJson<ApiUser>("/api/v1/users/me/", { method: "PATCH", body });
}

/** POST /api/v1/users/me/delete/ — ilova bilan bir xil: hisob hozir o‘chadi. */
export async function deleteMyAccount(): Promise<{ ok: boolean; code: string }> {
  return apiJson("/api/v1/users/me/delete/", { method: "POST" });
}

export async function clearMyAvatar(): Promise<ApiUser> {
  return apiJson<ApiUser>("/api/v1/users/me/", {
    method: "PATCH",
    body: JSON.stringify({ avatar: null }),
  });
}

export type RegionOption = { value: string; label: string };

export async function fetchRegions(): Promise<RegionOption[]> {
  return apiJson<RegionOption[]>("/api/v1/regions/");
}
