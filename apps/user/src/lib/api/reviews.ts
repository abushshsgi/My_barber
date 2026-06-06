import { apiJson } from "./client";
import type { ApiReview } from "./types";

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function fetchMyReviews(): Promise<ApiReview[]> {
  return apiJson<ApiReview[]>(`/api/v1/reviews/${qs({ mine: 1 })}`);
}

export async function fetchSalonReviews(salonId: string | number): Promise<ApiReview[]> {
  return apiJson<ApiReview[]>(`/api/v1/reviews/${qs({ salon: salonId })}`);
}

export type CreateReviewPayload = {
  booking: number;
  rating: number;
  text: string;
};

export async function createReview(data: CreateReviewPayload): Promise<ApiReview> {
  return apiJson<ApiReview>("/api/v1/reviews/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
