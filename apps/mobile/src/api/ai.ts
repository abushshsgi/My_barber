import { apiFetch, apiJson } from "./client";

export class MorphPlanLimitError extends Error {
  code = "morph_plan_limit" as const;
  constructor(message: string) {
    super(message);
    this.name = "MorphPlanLimitError";
  }
}

function throwFromMorphApiError(
  res: Response,
  body: unknown,
  fallback: string,
): never {
  const obj =
    body && typeof body === "object"
      ? (body as { detail?: string; code?: string; message?: string })
      : null;
  const detail =
    (obj && typeof obj.detail === "string" && obj.detail) ||
    (obj && typeof obj.message === "string" && obj.message) ||
    fallback;
  if (res.status === 403 && obj?.code === "morph_plan_limit") {
    throw new MorphPlanLimitError(detail);
  }
  throw new Error(detail.startsWith("API ") ? detail : `API ${res.status}: ${detail}`);
}

export type AiStyleSuggestion = {
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
  suggestions: AiStyleSuggestion[];
};

export type AiFaceCheckResponse = {
  has_face: boolean;
  detail?: string;
};

export type AiStyleTryOnResponse = {
  preview_image: string;
  style_id: string;
  style_title: string;
  views?: Partial<Record<"front" | "left" | "right" | "back", string>>;
};

type AiStyleTryOnJobResponse = {
  job_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  style_id: string;
  style_title: string;
  preview_image?: string;
  views?: AiStyleTryOnResponse["views"];
  detail?: string;
};

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

export type MorphStudioEditResponse = {
  preview_image: string;
  preset_id: string;
  preset_label: string;
  style_id: string;
  style_title: string;
};

export type MorphAiGeneration = {
  id: number;
  style_id: string;
  title: string;
  persona_id: string;
  before_url: string | null;
  after_url: string | null;
  created_at: string;
};

export type AiStyleHistoryEntry = {
  id: number;
  photo_url: string | null;
  face_shape_key: string;
  hair_type_key: string;
  source: "camera_scan" | "gallery" | "ai_analysis";
  scanned_at: string;
};

export type MorphAiLookShare = {
  id: string;
  style_id: string;
  title: string;
  before_url: string | null;
  after_url: string | null;
  share_page_url?: string;
  created_at: string;
};

const TRYON_POLL_MS = 2000;
const TRYON_POLL_TIMEOUT_MS = 120_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollTryOnJob(jobId: string): Promise<AiStyleTryOnResponse> {
  const deadline = Date.now() + TRYON_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(TRYON_POLL_MS);
    const job = await apiJson<AiStyleTryOnJobResponse>(
      `/api/v1/ai/style-tryon/${jobId}/`,
    );
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

export async function checkAiStyleFace(image: string): Promise<AiFaceCheckResponse> {
  const res = await apiFetch("/api/v1/ai/face-check/", {
    method: "POST",
    body: JSON.stringify({ image }),
    timeoutMs: 60_000,
  });
  const body = (await res.json().catch(() => null)) as
    | AiFaceCheckResponse
    | { detail?: string; code?: string }
    | null;
  if (!res.ok) {
    throwFromMorphApiError(res, body, "Yuz topilmadi. Boshqa rasm yuklang.");
  }
  return (body ?? { has_face: false }) as AiFaceCheckResponse;
}

export async function analyzeAiStyle(
  image: string,
  audience: "men" | "women" | "unisex" = "men",
): Promise<AiStyleAnalyzeResponse> {
  const res = await apiFetch("/api/v1/ai/style-analyze/", {
    method: "POST",
    body: JSON.stringify({ image, audience }),
    timeoutMs: 90_000,
  });
  const body = (await res.json().catch(() => null)) as
    | AiStyleAnalyzeResponse
    | { detail?: string; code?: string }
    | null;
  if (!res.ok) {
    throwFromMorphApiError(res, body, "Tahlil muvaffaqiyatsiz");
  }
  if (!body || !("suggestions" in body)) {
    throw new Error("Tahlil javobi noto'g'ri");
  }
  return body as AiStyleAnalyzeResponse;
}

export async function generateAiStyleTryOn(
  image: string,
  styleId: string,
): Promise<AiStyleTryOnResponse> {
  const res = await apiFetch("/api/v1/ai/style-tryon/", {
    method: "POST",
    body: JSON.stringify({ image, style_id: styleId }),
    timeoutMs: 120_000,
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
    return pollTryOnJob(body.job_id);
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

export async function fetchMorphStudioCatalog(): Promise<{
  categories: MorphStudioCategory[];
}> {
  return apiJson("/api/v1/ai/style-studio/catalog/");
}

export async function generateMorphStudioEdit(
  image: string,
  presetId: string,
  meta?: { styleId?: string; styleTitle?: string },
): Promise<MorphStudioEditResponse> {
  const res = await apiFetch("/api/v1/ai/style-studio/", {
    method: "POST",
    body: JSON.stringify({
      image,
      preset_id: presetId,
      style_id: meta?.styleId,
      style_title: meta?.styleTitle,
    }),
    timeoutMs: 120_000,
  });
  const body = (await res.json().catch(() => null)) as
    | MorphStudioEditResponse
    | { detail?: string; code?: string }
    | null;
  if (!res.ok) {
    if (res.status === 413) {
      throw new Error("Rasm juda katta. Kichikroq rasm yuklang.");
    }
    throwFromMorphApiError(res, body, "Studio tahririda xatolik");
  }
  if (!body || !("preview_image" in body)) {
    throw new Error("Studio tahririda xatolik");
  }
  return body as MorphStudioEditResponse;
}

export async function fetchMorphAiGenerations(): Promise<MorphAiGeneration[]> {
  return apiJson("/api/v1/ai/generations/");
}

export async function saveMorphAiGeneration(payload: {
  style_id?: string;
  title?: string;
  persona_id?: string;
  before_image?: string;
  after_image: string;
}): Promise<MorphAiGeneration> {
  return apiJson("/api/v1/ai/generations/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchAiStyleHistory(): Promise<AiStyleHistoryEntry[]> {
  return apiJson("/api/v1/ai/style-history/");
}

export async function saveAiStyleHistory(payload: {
  image?: string;
  face_shape_key?: string;
  hair_type_key?: string;
  source: "camera_scan" | "gallery" | "ai_analysis";
  replace_latest?: boolean;
}): Promise<AiStyleHistoryEntry> {
  return apiJson("/api/v1/ai/style-history/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createMorphAiLookShare(payload: {
  style_id?: string;
  title?: string;
  before_image?: string;
  after_image: string;
}): Promise<MorphAiLookShare> {
  return apiJson("/api/v1/ai/look-share/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchCareAccess(): Promise<{ allowed: boolean; detail?: string }> {
  return apiJson("/api/v1/subscriptions/care-access/");
}
