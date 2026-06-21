import type { ApiReview } from "@/lib/api/types";
import type { Review } from "@/lib/mock-data";
import { resolveMediaUrl } from "@/lib/media-url";

export function mapReview(api: ApiReview): Review {
  return {
    id: String(api.id),
    author: api.author_name,
    rating: api.rating,
    text: api.text,
    date: new Date(api.created_at).toLocaleDateString("uz-UZ"),
    photo: resolveMediaUrl(api.photo) ?? undefined,
  };
}

export function mapUserReview(api: ApiReview & { salon_name?: string; barber_name?: string }) {
  return {
    id: String(api.id),
    salonId: "",
    salonName: api.salon_name ?? "",
    barberName: api.barber_name ?? "",
    rating: api.rating,
    text: api.text,
    date: new Date(api.created_at).toLocaleDateString("uz-UZ"),
  };
}
