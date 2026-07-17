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

type AiStyleTryOnJobResponse = {
  job_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  style_id: string;
  style_title: string;
  preview_image?: string;
  detail?: string;
  queue_position?: number;
};

const TRYON_POLL_MS = 2000;
const TRYON_POLL_TIMEOUT_MS = 120_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollAiStyleTryOnJob(jobId: string): Promise<AiStyleTryOnResponse> {
  const deadline = Date.now() + TRYON_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(TRYON_POLL_MS);
    const job = await apiJson<AiStyleTryOnJobResponse>(`/api/v1/ai/style-tryon/${jobId}/`);
    if (job.status === "completed" && job.preview_image) {
      return {
        preview_image: job.preview_image,
        style_id: job.style_id,
        style_title: job.style_title,
      };
    }
    if (job.status === "failed") {
      throw new Error(job.detail ?? "Rasm yaratishda xatolik");
    }
  }
  throw new Error("Rasm yaratish juda uzoq davom etdi. Qayta urinib ko'ring.");
}

export async function generateAiStyleTryOn(
  image: string,
  styleId: string,
  personaId?: ExplorePersonaId,
): Promise<AiStyleTryOnResponse> {
  const res = await apiFetch("/api/v1/ai/style-tryon/", {
    method: "POST",
    body: JSON.stringify({ image, style_id: styleId, persona: personaId }),
  });
  const body = (await res.json().catch(() => null)) as
    | AiStyleTryOnResponse
    | AiStyleTryOnJobResponse
    | { detail?: string }
    | null;

  if (!res.ok) {
    const detail =
      body && typeof body === "object" && typeof body.detail === "string"
        ? body.detail
        : "Rasm yaratishda xatolik";
    throw new Error(detail);
  }

  if (
    res.status === 202 &&
    body &&
    typeof body === "object" &&
    "job_id" in body &&
    typeof body.job_id === "string"
  ) {
    return pollAiStyleTryOnJob(body.job_id);
  }

  if (
    body &&
    typeof body === "object" &&
    "preview_image" in body &&
    typeof body.preview_image === "string"
  ) {
    return body as AiStyleTryOnResponse;
  }

  throw new Error("Rasm yaratishda xatolik");
}

export type MorphStudioOption = {
  id: string;
  label_uz: string;
  label_en: string;
};

export type MorphStudioCategory = {
  id: string;
  label_uz: string;
  label_en: string;
  options: MorphStudioOption[];
};

export type MorphStudioCatalogResponse = {
  categories: MorphStudioCategory[];
};

export type MorphStudioEditResponse = {
  preview_image: string;
  preset_id: string;
  preset_label: string;
  style_id: string;
  style_title: string;
};

export async function fetchMorphStudioCatalog(): Promise<MorphStudioCatalogResponse> {
  return apiJson<MorphStudioCatalogResponse>("/api/v1/ai/style-studio/catalog/");
}

export async function generateMorphStudioEdit(
  image: string,
  presetId: string,
  meta?: { styleId?: string; styleTitle?: string },
): Promise<MorphStudioEditResponse> {
  return apiJson<MorphStudioEditResponse>("/api/v1/ai/style-studio/", {
    method: "POST",
    body: JSON.stringify({
      image,
      preset_id: presetId,
      style_id: meta?.styleId,
      style_title: meta?.styleTitle,
    }),
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

export type MorphAiLookShareApi = {
  id: string;
  style_id: string;
  title: string;
  before_url: string | null;
  after_url: string | null;
  created_at: string;
};

export type CreateMorphAiLookSharePayload = {
  style_id?: string;
  title?: string;
  before_image?: string;
  after_image: string;
};

export async function createMorphAiLookShare(
  payload: CreateMorphAiLookSharePayload,
): Promise<MorphAiLookShareApi> {
  return apiJson<MorphAiLookShareApi>("/api/v1/ai/look-share/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchMorphAiLookShare(shareId: string): Promise<MorphAiLookShareApi> {
  return apiJson<MorphAiLookShareApi>(`/api/v1/ai/look-share/${encodeURIComponent(shareId)}/`);
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
