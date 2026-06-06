import { apiJson } from "./client";
import type { ApiUser } from "./types";

export async function fetchMe(): Promise<ApiUser> {
  return apiJson<ApiUser>("/api/v1/users/me/");
}

export async function updateMe(data: Partial<Pick<ApiUser, "full_name" | "phone">>): Promise<ApiUser> {
  return apiJson<ApiUser>("/api/v1/users/me/", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export type RegionOption = { value: string; label: string };

export async function fetchRegions(): Promise<RegionOption[]> {
  return apiJson<RegionOption[]>("/api/v1/regions/");
}
