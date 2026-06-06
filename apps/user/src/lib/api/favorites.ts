import { apiJson } from "./client";
import type { ApiFavoriteRow, ApiFavoritesList } from "./types";

export async function fetchFavoriteSalons(): Promise<ApiFavoritesList> {
  return apiJson<ApiFavoritesList>("/api/v1/favorites/salons/");
}

export async function addFavoriteSalon(salonId: number): Promise<ApiFavoriteRow> {
  return apiJson<ApiFavoriteRow>("/api/v1/favorites/salons/", {
    method: "POST",
    body: JSON.stringify({ salon: salonId }),
  });
}

export async function removeFavoriteSalon(salonId: number): Promise<void> {
  await apiJson<void>(`/api/v1/favorites/salons/${salonId}/`, { method: "DELETE" });
}
