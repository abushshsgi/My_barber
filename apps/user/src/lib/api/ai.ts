import type { FaceShapeKey, HairTypeKey } from "@/components/ai-style/ai-style-shared";
import {
  getActiveUserId,
  loadFaceProfileHistory,
  syncFaceProfileHistoryCache,
  type FaceProfileHistoryEntry,
} from "@/lib/face-profile";
import type { ExplorePersonaId } from "@/lib/explore-personas";
import { apiFetch, apiJson } from "./client";

export type AiStyleSuggestionApi = {
  id: string;
  title: string;
  match: number;
  reason_uz: string;
  category: string;
  seed: string;
  image_url: string;
  salon_id: number | null;
  salon_name: string | null;
  barber_name: string | null;
};

export type AiStyleAnalyzeResponse = {
  face_shape: "oval" | "round" | "square";
  hair_type: "short" | "medium" | "long";
  summary_uz: string;
  detected_gender?: "male" | "female" | "unclear";
  suggestions: AiStyleSuggestionApi[];
};

export type AiFaceCheckResponse = {
  has_face: boolean;
  detail?: string;
};

export async function checkAiStyleFace(image: string): Promise<AiFaceCheckResponse> {
  const res = await apiFetch("/api/v1/ai/face-check/", {
    method: "POST",
    body: JSON.stringify({ image }),
  });
  const body = (await res.json().catch(() => null)) as AiFaceCheckResponse | { detail?: string } | null;
  if (!res.ok) {
    const detail =
      body && typeof body === "object" && typeof body.detail === "string"
        ? body.detail
        : "Iltimos, yuz shakli rasmini yuklang.";
    throw new Error(detail);
  }
  return (body ?? { has_face: false }) as AiFaceCheckResponse;
}

export type AiFaceHint = {
  shape: "oval" | "round" | "square";
  width_to_height?: number;
  jaw_to_forehead?: number;
  source?: "camera_scan" | "ai_analysis";
};

export async function analyzeAiStyle(
  image: string,
  audience: "men" | "women" | "unisex",
  faceHint?: AiFaceHint | null,
  personaId?: ExplorePersonaId,
): Promise<AiStyleAnalyzeResponse> {
  return apiJson<AiStyleAnalyzeResponse>("/api/v1/ai/style-analyze/", {
    method: "POST",
    body: JSON.stringify({
      image,
      audience,
      face_hint: faceHint ?? undefined,
      persona: personaId,
    }),
  });
}

export type AiStyleTryOnResponse = {
  preview_image: string;
  style_id: string;
  style_title: string;
};

export async function generateAiStyleTryOn(
  image: string,
  styleId: string,
  personaId?: ExplorePersonaId,
): Promise<AiStyleTryOnResponse> {
  return apiJson<AiStyleTryOnResponse>("/api/v1/ai/style-tryon/", {
    method: "POST",
    body: JSON.stringify({ image, style_id: styleId, persona: personaId }),
  });
}

export type AiStyleHistoryEntryApi = {
  id: number;
  photo_url: string | null;
  face_shape_key: string;
  hair_type_key: string;
  source: "camera_scan" | "gallery" | "ai_analysis";
  scanned_at: string;
};

export type SaveAiStyleHistoryPayload = {
  image?: string;
  face_shape_key?: string;
  hair_type_key?: string;
  source: "camera_scan" | "gallery" | "ai_analysis";
  replace_latest?: boolean;
};

export async function fetchAiStyleHistory(): Promise<AiStyleHistoryEntryApi[]> {
  return apiJson<AiStyleHistoryEntryApi[]>("/api/v1/ai/style-history/");
}

export async function saveAiStyleHistory(
  payload: SaveAiStyleHistoryPayload,
): Promise<AiStyleHistoryEntryApi> {
  return apiJson<AiStyleHistoryEntryApi>("/api/v1/ai/style-history/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function mapApiHistoryEntry(entry: AiStyleHistoryEntryApi): FaceProfileHistoryEntry {
  return {
    id: String(entry.id),
    photoDataUrl: entry.photo_url ?? "",
    faceShapeKey: (entry.face_shape_key || undefined) as FaceShapeKey | undefined,
    hairTypeKey: (entry.hair_type_key || undefined) as HairTypeKey | undefined,
    scannedAt: entry.scanned_at,
    source: entry.source,
  };
}

export async function refreshAiStyleHistoryCache(): Promise<FaceProfileHistoryEntry[]> {
  const userId = getActiveUserId();
  if (!userId) return loadFaceProfileHistory();
  try {
    const entries = await fetchAiStyleHistory();
    const mapped = entries.map(mapApiHistoryEntry);
    syncFaceProfileHistoryCache(userId, mapped);
    return mapped;
  } catch {
    return loadFaceProfileHistory(userId);
  }
}

export async function persistAiStyleHistory(
  payload: SaveAiStyleHistoryPayload,
): Promise<void> {
  const userId = getActiveUserId();
  if (!userId) return;
  try {
    await saveAiStyleHistory(payload);
    await refreshAiStyleHistoryCache();
  } catch {
    /* local cache already updated */
  }
}
