import { API_BASE } from "./config";

const PEXELS_RE = /images\.pexels\.com\/photos\/(\d+)/i;

/** RN uchun absolyut media URL. */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  const raw = path?.trim();
  if (!raw) return null;

  const pexels = raw.match(PEXELS_RE);
  if (pexels) {
    return `https://images.pexels.com/photos/${pexels[1]}/pexels-photo-${pexels[1]}.jpeg?auto=compress&cs=tinysrgb&w=900`;
  }

  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) {
    return raw;
  }

  if (raw.startsWith("/")) {
    return `${API_BASE}${raw}`;
  }

  if (raw.startsWith("media/")) {
    return `${API_BASE}/${raw}`;
  }

  return `${API_BASE}/${raw}`;
}

export function pexelsPhotoUrl(photoId: number, width = 900): string {
  return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
}
