import type { FaceShapeKey, HairTypeKey } from "@/components/ai-style/ai-style-shared";
import {
  getActiveUserId,
  loadFaceProfileHistory,
  syncFaceProfileHistoryCache,
  upsertFaceProfileHistoryEntry,
  type FaceProfileHistoryEntry,
} from "@/lib/face-profile";
import type { ExplorePersonaId } from "@/lib/explore-personas";
import { toShareImageSource } from "@/lib/media-url";
import { throwFromMorphApiError } from "@/lib/morph-plan-limit";
import { prepareStudioImagePayload } from "@/lib/selfie-image";
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

/** Server va client uchun yagona "yuz yo'q" xabari. */
export const NO_FACE_MESSAGE = "Iltimos yuz shaklini yuboring!";

export function isNoFaceMessage(message: string): boolean {
  return /yuz shaklini yuboring|yuz shakli rasmini yuklang|yuz topilmadi|no face|upload.*face|лицо/i.test(
    message,
  );
}

export async function checkAiStyleFace(image: string): Promise<AiFaceCheckResponse> {
  const res = await apiFetch("/api/v1/ai/face-check/", {
    method: "POST",
    body: JSON.stringify({ image }),
  });
  const body = (await res.json().catch(() => null)) as
    | AiFaceCheckResponse
    | { detail?: string }
    | null;
  if (!res.ok) {
    const detail =
      body && typeof body === "object" && typeof body.detail === "string"
        ? body.detail
        : NO_FACE_MESSAGE;
    throw new Error(isNoFaceMessage(detail) ? NO_FACE_MESSAGE : detail);
  }
  const parsed = (body ?? { has_face: false }) as AiFaceCheckResponse;
  if (!parsed.has_face) {
    throw new Error(
      typeof parsed.detail === "string" && parsed.detail.trim()
        ? isNoFaceMessage(parsed.detail)
          ? NO_FACE_MESSAGE
          : parsed.detail
        : NO_FACE_MESSAGE,
    );
  }
  return parsed;
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

export type TryOnViewId = "front" | "left" | "right" | "back";

export type AiStyleTryOnResponse = {
  preview_image: string;
  style_id: string;
  style_title: string;
  views?: Partial<Record<TryOnViewId, string>>;
};

type AiStyleTryOnJobResponse = {
  job_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  style_id: string;
  style_title: string;
  preview_image?: string;
  views?: Partial<Record<TryOnViewId, string>>;
  detail?: string;
  queue_position?: number;
};

const TRYON_POLL_MS = 2000;
const TRYON_POLL_TIMEOUT_MS = 120_000;
const MULTIVIEW_POLL_TIMEOUT_MS = 240_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollAiStyleTryOnJob(
  jobId: string,
  options?: { timeoutMs?: number },
): Promise<AiStyleTryOnResponse> {
  const timeoutMs = options?.timeoutMs ?? TRYON_POLL_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(TRYON_POLL_MS);
    const job = await apiJson<AiStyleTryOnJobResponse>(`/api/v1/ai/style-tryon/${jobId}/`);
    if (job.status === "completed" && job.preview_image) {
      return {
        preview_image: job.preview_image,
        style_id: job.style_id,
        style_title: job.style_title,
        views: job.views,
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
    | { detail?: string; code?: string }
    | null;

  if (!res.ok) {
    throwFromMorphApiError(res, body, "Rasm yaratishda xatolik");
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

/** Front try-on → left/right/back (foydalanuvchi yuzi 360°). */
export async function generateAiStyleTryOnViews(payload: {
  image: string;
  style_id: string;
}): Promise<AiStyleTryOnResponse> {
  const res = await apiFetch("/api/v1/ai/style-tryon-views/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => null)) as
    | AiStyleTryOnResponse
    | AiStyleTryOnJobResponse
    | { detail?: string; code?: string }
    | null;

  if (!res.ok) {
    throwFromMorphApiError(res, body, "360° ko‘rinishlar yaratilmadi");
  }

  if (
    res.status === 202 &&
    body &&
    typeof body === "object" &&
    "job_id" in body &&
    typeof body.job_id === "string"
  ) {
    return pollAiStyleTryOnJob(body.job_id, { timeoutMs: MULTIVIEW_POLL_TIMEOUT_MS });
  }

  if (
    body &&
    typeof body === "object" &&
    "views" in body &&
    body.views &&
    typeof body.views === "object"
  ) {
    const views = body.views as Partial<Record<TryOnViewId, string>>;
    return {
      preview_image:
        (body as AiStyleTryOnResponse).preview_image ||
        views.front ||
        payload.image,
      style_id: (body as AiStyleTryOnResponse).style_id || payload.style_id,
      style_title: (body as AiStyleTryOnResponse).style_title || "",
      views,
    };
  }

  throw new Error("360° ko‘rinishlar yaratilmadi");
}

export type MorphStudioOption = {
  id: string;
  label_uz: string;
  label_en: string;
  swatch?: string;
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
  // History/gallery: same-origin `/media/…` → absolute. Data URL: 2K → siqiladi (413 oldini olish).
  const imageSource = await prepareStudioImagePayload(toShareImageSource(image));
  const res = await apiFetch("/api/v1/ai/style-studio/", {
    method: "POST",
    body: JSON.stringify({
      image: imageSource,
      preset_id: presetId,
      style_id: meta?.styleId,
      style_title: meta?.styleTitle,
    }),
  });
  const body = (await res.json().catch(() => null)) as
    | MorphStudioEditResponse
    | {
        detail?: string;
        code?: string;
      }
    | null;
  if (!res.ok) {
    if (res.status === 413) {
      throw new Error(
        "Rasm juda katta. Undo qilib qayta urinib ko‘ring yoki asl rasmni tanlang.",
      );
    }
    throwFromMorphApiError(res, body, "Studio tahririda xatolik");
  }
  if (!body || typeof body !== "object" || !("preview_image" in body)) {
    throw new Error("Studio tahririda xatolik");
  }
  const result = body as MorphStudioEditResponse;
  // Keyingi tahrir uchun ham kichik payload saqlaymiz.
  if (result.preview_image?.startsWith("data:")) {
    try {
      result.preview_image = await prepareStudioImagePayload(result.preview_image);
    } catch {
      /* keep original preview */
    }
  }
  return result;
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
  share_page_url?: string;
  sharer_name?: string;
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

/** Ulashish sahifasi ochilganini sanaydi — viral halqa o‘lchovi uchun. */
export async function registerMorphAiLookShareView(shareId: string): Promise<void> {
  await apiJson<void>(`/api/v1/ai/look-share/${encodeURIComponent(shareId)}/view/`, {
    method: "POST",
  });
}

export type MorphAiGenerationApi = {
  id: number;
  style_id: string;
  title: string;
  persona_id: string;
  before_url: string | null;
  after_url: string | null;
  created_at: string;
};

export type SaveMorphAiGenerationPayload = {
  style_id?: string;
  title?: string;
  persona_id?: string;
  before_image?: string;
  after_image: string;
};

export async function fetchMorphAiGenerations(): Promise<MorphAiGenerationApi[]> {
  return apiJson<MorphAiGenerationApi[]>("/api/v1/ai/generations/");
}

export async function saveMorphAiGenerationRemote(
  payload: SaveMorphAiGenerationPayload,
): Promise<MorphAiGenerationApi> {
  return apiJson<MorphAiGenerationApi>("/api/v1/ai/generations/", {
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
    const mapped = entries.map(mapApiHistoryEntry).filter((e) => Boolean(e.photoDataUrl));
    syncFaceProfileHistoryCache(userId, mapped);
    return loadFaceProfileHistory(userId);
  } catch {
    return loadFaceProfileHistory(userId);
  }
}

export async function persistAiStyleHistory(payload: SaveAiStyleHistoryPayload): Promise<void> {
  const userId = getActiveUserId();
  if (!userId) return;
  try {
    const saved = await saveAiStyleHistory(payload);
    upsertFaceProfileHistoryEntry(mapApiHistoryEntry(saved), userId);
  } catch {
    /* local cache already updated */
  }
}

export type BarberMasterCardApi = {
  style_overview: {
    name: string;
    category: string;
    face_shape: string;
  };
  sides_and_back: {
    fade_type: "Skin" | "Low" | "Mid" | "High";
    starting_guard: number;
    transition_guard: number;
    neckline: string;
  };
  top_section: {
    estimated_length_cm: number;
    cutting_technique: "Point cut" | "Blunt";
    texturizing_level: string;
    styling_product: string;
  };
  beard_and_facial_hair: {
    present: boolean;
    style: string;
    cheek_line: string;
    length_mm: number;
  };
  notes_for_barber?: string;
};

export type BarberMasterCardResponse = {
  master_card: BarberMasterCardApi;
  fallback?: boolean;
  detail?: string;
};

export async function generateBarberMasterCard(payload: {
  image: string;
  style_name?: string;
}): Promise<BarberMasterCardResponse> {
  const res = await apiFetch("/api/v1/ai/barber-card/", {
    method: "POST",
    body: JSON.stringify({
      image: payload.image,
      style_name: payload.style_name,
    }),
  });
  const body = (await res.json().catch(() => null)) as
    | BarberMasterCardResponse
    | { detail?: string }
    | null;
  if (!res.ok) {
    throwFromMorphApiError(res, body, "Barber Master Card yaratilmadi.");
  }
  if (!body || typeof body !== "object" || !("master_card" in body) || !body.master_card) {
    throw new Error("Barber Master Card javobi noto'g'ri.");
  }
  return body as BarberMasterCardResponse;
}

export type IngredientAlertType =
  | "comedogenic_warning"
  | "skin_type_mismatch"
  | "drying_alcohol"
  | "fragrance_warning"
  | "irritant_warning"
  | "general_warning";

export type IngredientScanAlert = {
  type: IngredientAlertType | string;
  ingredient: string;
  severity: "low" | "medium" | "high" | string;
  message_uz: string;
};

export type IngredientScanBeneficial = {
  ingredient: string;
  reason_uz: string;
};

export type IngredientScanResponse = {
  product_analysis: {
    safety_score: number;
    verdict: string;
    total_ingredients_count: number;
  };
  ingredients: string[];
  critical_alerts: IngredientScanAlert[];
  beneficial_ingredients: IngredientScanBeneficial[];
};

export async function scanIngredient(image: string): Promise<IngredientScanResponse> {
  const res = await apiFetch("/api/v1/ai/ingredient-scan/", {
    method: "POST",
    body: JSON.stringify({ image }),
  });
  const body = (await res.json().catch(() => null)) as
    | IngredientScanResponse
    | { detail?: string }
    | null;
  if (!res.ok) {
    throwFromMorphApiError(res, body, "Tarkib tahlili muvaffaqiyatsiz.");
  }
  if (!body || typeof body !== "object" || !("product_analysis" in body)) {
    throw new Error("Tarkib tahlili javobi noto'g'ri.");
  }
  return body as IngredientScanResponse;
}
