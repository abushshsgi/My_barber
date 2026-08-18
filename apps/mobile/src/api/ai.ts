import { sanitizeDisplayError } from "../lib/network-error";
import { apiFetch, apiJson } from "./client";

export class MorphPlanLimitError extends Error {
  code = "morph_plan_limit" as const;
  constructor(message: string) {
    super(message);
    this.name = "MorphPlanLimitError";
  }
}

/** Yuz emas rasm yuklanganda foydalanuvchiga ko‘rinadigan yagona matn. */
export const NO_FACE_MESSAGE =
  "Yuzdan boshqa narsa yuklandi. Iltimos, yuz shaklingizni yuboring!";

export class MorphNoFaceError extends Error {
  code = "no_face" as const;
  constructor(message: string = NO_FACE_MESSAGE) {
    super(message);
    this.name = "MorphNoFaceError";
  }
}

export function isNoFaceMessage(message: string): boolean {
  return /yuzdan boshqa|yuz shaklini yuboring|yuz shakli rasmini yuklang|yuz topilmadi|has_face|no face|upload.*face|лицо/i.test(
    message,
  );
}

/** API status prefiksini olib, yuz xatosini bir xil matnga keltiradi. */
export function formatMorphUserError(message: string, fallback: string): string {
  const cleaned = message.replace(/^API\s+\d+:\s*/i, "").trim();
  if (isNoFaceMessage(cleaned) || isNoFaceMessage(message)) {
    return NO_FACE_MESSAGE;
  }
  if (/javobi noto.?g.?ri|chat javob bermadi/i.test(cleaned)) {
    return fallback;
  }
  return sanitizeDisplayError(message) || fallback;
}

function morphErrorDetail(body: unknown, fallback: string): {
  detail: string;
  code?: string;
  noFace: boolean;
} {
  const obj =
    body && typeof body === "object"
      ? (body as {
          detail?: string;
          code?: string;
          message?: string;
          has_face?: boolean;
        })
      : null;
  const detail =
    (obj && typeof obj.detail === "string" && obj.detail) ||
    (obj && typeof obj.message === "string" && obj.message) ||
    fallback;
  const noFace = obj?.has_face === false || isNoFaceMessage(detail);
  return { detail, code: obj?.code, noFace };
}

function throwFromMorphApiError(
  res: Response,
  body: unknown,
  fallback: string,
): never {
  const { detail, code, noFace } = morphErrorDetail(body, fallback);
  if (res.status === 403 && code === "morph_plan_limit") {
    throw new MorphPlanLimitError(detail);
  }
  if (noFace) {
    throw new MorphNoFaceError(NO_FACE_MESSAGE);
  }
  throw new Error(formatMorphUserError(detail, fallback));
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
  hair_color?:
    | "black"
    | "dark_brown"
    | "brown"
    | "light_brown"
    | "blonde"
    | "red"
    | "gray"
    | "other";
  hair_color_hex?: string;
  hair_texture?: "straight" | "wavy" | "curly" | "coily";
  beard?: "none" | "light" | "full";
  face_confidence?: number;
  hair_type_confidence?: number;
  hair_color_confidence?: number;
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
  hair_color_key?: string;
  hair_texture_key?: string;
  beard_key?: string;
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

/** Face-check uchun rasmni kichiklashtirish — Railway/Gemini 502 kamayadi. */
async function shrinkImageForFaceCheck(image: string): Promise<string> {
  if (typeof document === "undefined" || !image.startsWith("data:")) return image;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode"));
      el.src = image;
    });
    const maxEdge = 720;
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    if (scale >= 0.98) return image;
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return image;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return image;
  }
}

export async function checkAiStyleFace(image: string): Promise<AiFaceCheckResponse> {
  const payload = await shrinkImageForFaceCheck(image);
  const res = await apiFetch("/api/v1/ai/face-check/", {
    method: "POST",
    body: JSON.stringify({ image: payload }),
    timeoutMs: 60_000,
  });
  const body = (await res.json().catch(() => null)) as
    | AiFaceCheckResponse
    | { detail?: string; code?: string; has_face?: boolean; error?: string; message?: string }
    | null;
  if (!res.ok) {
    // 429/5xx — yuz yo‘q deb emas, AI band deb tashlaymiz.
    if (res.status === 429 || res.status >= 500) {
      const detail =
        (body && typeof body === "object" && typeof (body as { detail?: string }).detail === "string"
          ? (body as { detail: string }).detail
          : "") ||
        (body && typeof body === "object" && typeof (body as { message?: string }).message === "string"
          ? (body as { message: string }).message
          : "") ||
        (res.status === 429 ? "Too Many Requests" : "Application failed to respond");
      throw new Error(formatMorphUserError(detail, "AI vaqtincha ishlamayapti."));
    }
    throwFromMorphApiError(res, body, NO_FACE_MESSAGE);
  }
  const parsed = (body ?? { has_face: false }) as AiFaceCheckResponse;
  if (!parsed.has_face) {
    throw new MorphNoFaceError(
      formatMorphUserError(parsed.detail || NO_FACE_MESSAGE, NO_FACE_MESSAGE),
    );
  }
  return parsed;
}

export async function analyzeAiStyle(
  image: string,
  audience: "men" | "women" | "unisex" = "men",
): Promise<AiStyleAnalyzeResponse> {
  const payload = await shrinkImageForFaceCheck(image);
  const res = await apiFetch("/api/v1/ai/style-analyze/", {
    method: "POST",
    body: JSON.stringify({ image: payload, audience }),
    timeoutMs: 90_000,
  });
  const body = (await res.json().catch(() => null)) as
    | AiStyleAnalyzeResponse
    | { detail?: string; code?: string }
    | null;
  if (!res.ok) {
    if (res.status === 429 || res.status >= 500) {
      throw new Error(
        formatMorphUserError(
          (body && typeof body === "object" && typeof (body as { detail?: string }).detail === "string"
            ? (body as { detail: string }).detail
            : "") ||
            (res.status === 429 ? "Too Many Requests" : "Application failed to respond"),
          "AI vaqtincha ishlamayapti.",
        ),
      );
    }
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
  const payload = await shrinkImageForFaceCheck(image);
  const res = await apiFetch("/api/v1/ai/style-tryon/", {
    method: "POST",
    body: JSON.stringify({ image: payload, style_id: styleId }),
    timeoutMs: 120_000,
  });
  const body = (await res.json().catch(() => null)) as
    | AiStyleTryOnResponse
    | AiStyleTryOnJobResponse
    | { detail?: string; code?: string }
    | null;

  if (!res.ok) {
    if (res.status === 429 || res.status >= 500) {
      throw new Error(
        formatMorphUserError(
          (body && typeof body === "object" && typeof (body as { detail?: string }).detail === "string"
            ? (body as { detail: string }).detail
            : "") ||
            (res.status === 429 ? "Too Many Requests" : "Application failed to respond"),
          "AI vaqtincha ishlamayapti.",
        ),
      );
    }
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
}): Promise<MorphAiGeneration | null> {
  const { shouldPersistLooksToServer } = await import("../lib/morph-chat-prefs");
  if (!(await shouldPersistLooksToServer())) return null;
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
  hair_color_key?: string;
  hair_texture_key?: string;
  beard_key?: string;
  source: "camera_scan" | "gallery" | "ai_analysis";
  replace_latest?: boolean;
}): Promise<AiStyleHistoryEntry | null> {
  const { shouldPersistLooksToServer } = await import("../lib/morph-chat-prefs");
  if (!(await shouldPersistLooksToServer())) return null;
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

export type MorphChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

export type MorphChatContext = {
  face_shape?: string;
  hair_type?: string;
  hair_texture?: string;
  hair_color?: string;
  beard?: string;
  detected_gender?: string;
  summary_uz?: string;
  preferred_style_title?: string;
  preferred_style_id?: string;
  suggestions?: Array<{ id?: string; title?: string }>;
  reply_lang?: "uz" | "ru";
  reply_style?: "short" | "detailed" | "barber";
  advice_gender?: "male" | "female";
  voice_mode?: boolean;
};

export type MorphChatLimits = {
  period?: "month" | "day";
  token_limit?: number;
  token_used?: number | null;
  token_remaining?: number | null;
  daily_limit: number;
  daily_used: number | null;
  daily_remaining: number | null;
  warn_at?: number;
  should_warn?: boolean;
};

export type MorphChatThreadRemote = {
  id: string;
  db_id?: number;
  title: string;
  preview?: string;
  context?: MorphChatContext | Record<string, unknown>;
  message_count?: number;
  total_tokens?: number;
  total_cost_usd?: string;
  created_at?: string | null;
  updated_at?: string | null;
  messages?: MorphChatMessage[];
};

export type MorphChatSendPayload = {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  context?: MorphChatContext;
  thread_id?: string;
  persist?: boolean;
};

export async function sendMorphChatMessage(
  payload: MorphChatSendPayload,
): Promise<{ reply: string; limits: MorphChatLimits }> {
  const res = await apiFetch("/api/v1/ai/chat/", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 60_000,
  });
  const body = (await res.json().catch(() => null)) as
    | { reply?: string; limits?: MorphChatLimits; detail?: string; code?: string }
    | null;
  if (!res.ok) {
    if (res.status === 403 && body?.code === "morph_plan_limit") {
      throw new MorphPlanLimitError(body.detail ?? "Limit tugadi");
    }
    throwFromMorphApiError(res, body, "Chat javob bermadi");
  }
  if (!body?.reply) {
    throw new Error("Chat javobi noto'g'ri");
  }
  return {
    reply: body.reply,
    limits: body.limits ?? { daily_limit: 10000, daily_used: null, daily_remaining: null },
  };
}

type StreamEvent = {
  delta?: string;
  done?: boolean;
  reply?: string;
  limits?: MorphChatLimits;
  error?: string;
  status?: number;
  detail?: string;
  code?: string;
};

function parseSseBuffer(buffer: string): { events: StreamEvent[]; rest: string } {
  const normalized = buffer.replace(/\r\n/g, "\n");
  const parts = normalized.split("\n\n");
  const rest = parts.pop() ?? "";
  const events: StreamEvent[] = [];
  for (const block of parts) {
    const data = block
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");
    if (!data || data === "[DONE]") continue;
    try {
      const parsed = JSON.parse(data) as StreamEvent;
      if (parsed && typeof parsed === "object") events.push(parsed);
    } catch {
      /* ignore partial json */
    }
  }
  return { events, rest };
}

export async function streamMorphChatMessage(
  payload: MorphChatSendPayload,
  onDelta: (chunk: string) => void,
): Promise<{ reply: string; limits: MorphChatLimits }> {
  const res = await apiFetch("/api/v1/ai/chat/", {
    method: "POST",
    body: JSON.stringify({ ...payload, stream: true }),
    timeoutMs: 90_000,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as StreamEvent | null;
    if (res.status === 403 && body?.code === "morph_plan_limit") {
      throw new MorphPlanLimitError(body.detail ?? "Limit tugadi");
    }
    if (res.status === 406) {
      const fallback = await sendMorphChatMessage(payload);
      onDelta(fallback.reply);
      return fallback;
    }
    throwFromMorphApiError(res, body, "Chat javob bermadi");
  }

  const ctype = (res.headers.get("content-type") || "").toLowerCase();
  if (!ctype.includes("text/event-stream") || !res.body) {
    const body = (await res.json().catch(() => null)) as
      | { reply?: string; limits?: MorphChatLimits }
      | null;
    if (!body?.reply) throw new Error("Chat javobi noto'g'ri");
    onDelta(body.reply);
    return {
      reply: body.reply,
      limits: body.limits ?? { daily_limit: 10000, daily_used: null, daily_remaining: null },
    };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let reply = "";
  let limits: MorphChatLimits = {
    daily_limit: 10000,
    daily_used: null,
    daily_remaining: null,
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseBuffer(buffer);
    buffer = parsed.rest;
    for (const event of parsed.events) {
      if (event.error) {
        if (event.status === 403) throw new MorphPlanLimitError(event.error);
        throw new Error(formatMorphUserError(event.error, "Chat javob bermadi"));
      }
      if (event.delta) {
        reply += event.delta;
        onDelta(event.delta);
      }
      if (event.done) {
        if (event.reply && !reply) {
          reply = event.reply;
          onDelta(event.reply);
        } else if (event.reply) {
          reply = event.reply;
        }
        if (event.limits) limits = event.limits;
      }
    }
  }

  if (!reply.trim()) {
    throw new Error("Chat javobi noto'g'ri");
  }
  return { reply, limits };
}

export async function fetchMorphChatThreads(options?: {
  messages?: boolean;
}): Promise<MorphChatThreadRemote[]> {
  const q = options?.messages ? "?messages=1" : "";
  return apiJson(`/api/v1/ai/chat/threads/${q}`);
}

export async function fetchMorphChatThread(clientId: string): Promise<MorphChatThreadRemote> {
  return apiJson(`/api/v1/ai/chat/threads/${encodeURIComponent(clientId)}/`);
}

export async function syncMorphChatThread(payload: {
  id: string;
  title?: string;
  messages?: MorphChatMessage[];
  context?: MorphChatContext | Record<string, unknown>;
  updated_at?: string;
}): Promise<MorphChatThreadRemote> {
  return apiJson("/api/v1/ai/chat/threads/", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteMorphChatThread(clientId: string): Promise<void> {
  await apiFetch(`/api/v1/ai/chat/threads/${encodeURIComponent(clientId)}/`, {
    method: "DELETE",
  });
}

export async function clearMorphChatThreads(): Promise<{
  ok: boolean;
  deleted: number;
  remaining?: number;
}> {
  const body = await apiJson<{ ok?: boolean; deleted?: number; remaining?: number; detail?: string }>(
    "/api/v1/ai/chat/threads/",
    { method: "DELETE" },
  );
  if (body?.ok === false) {
    throw new Error(body.detail || "Chatlarni o'chirish amalga oshmadi.");
  }
  return {
    ok: true,
    deleted: Number(body?.deleted ?? 0),
    remaining: Number(body?.remaining ?? 0),
  };
}

export type MorphAiPrivacyPrefs = {
  privacy_local_only: boolean;
  save_chat_history: boolean;
  persist_looks: boolean;
  limit_notify: boolean;
  use_tryon_context: boolean;
};

export type MorphAiPrivacyDataCounts = {
  chat_threads: number;
  chat_messages: number;
  looks: number;
  selfies: number;
  shares: number;
};

export type MorphAiPrivacyPayload = {
  prefs: MorphAiPrivacyPrefs;
  limits: MorphChatLimits & { warn_at?: number; should_warn?: boolean };
  data: MorphAiPrivacyDataCounts;
  updated_at?: string | null;
};

export async function fetchMorphAiPrivacy(): Promise<MorphAiPrivacyPayload> {
  return apiJson("/api/v1/ai/privacy/");
}

export async function patchMorphAiPrivacy(
  patch: Partial<MorphAiPrivacyPrefs>,
): Promise<MorphAiPrivacyPayload> {
  return apiJson("/api/v1/ai/privacy/", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteMorphAiPrivacyData(
  kind: "chats" | "looks" | "selfies" | "shares" | "all",
): Promise<MorphAiPrivacyPayload & { ok: boolean; deleted: Record<string, number> }> {
  return apiJson("/api/v1/ai/privacy/data/", {
    method: "DELETE",
    body: JSON.stringify({ kind }),
  });
}

export async function fetchMorphChatLimits(): Promise<MorphChatLimits> {
  return apiJson("/api/v1/ai/chat/limits/");
}

export async function clearMorphAiGenerations(): Promise<void> {
  await apiFetch("/api/v1/ai/generations/", { method: "DELETE" });
}

export async function clearAiStyleHistory(): Promise<void> {
  await apiFetch("/api/v1/ai/style-history/", { method: "DELETE" });
}

export type MorphVoiceGender = "male" | "female";

export type MorphVoiceInfo = {
  id: string;
  name: string;
  gender: MorphVoiceGender;
  style: string;
  gemini_name?: string;
};

export type MorphVoiceCatalog = {
  voices: MorphVoiceInfo[];
  defaults: { male: string; female: string };
};

export async function fetchMorphVoiceCatalog(): Promise<MorphVoiceCatalog> {
  return apiJson<MorphVoiceCatalog>("/api/v1/ai/chat/voice/voices/");
}

export async function transcribeMorphVoice(payload: {
  uri: string;
  blob?: Blob;
  name?: string;
  mime?: string;
  lang?: "auto" | "uz" | "ru";
}): Promise<{ text: string; lang: string }> {
  const mime = payload.mime || payload.blob?.type || "audio/mp4";
  const fd = new FormData();
  const name = payload.name || (mime.includes("webm") ? "speech.webm" : "speech.m4a");
  if (payload.blob) {
    fd.append("audio", payload.blob, name);
  } else if (typeof window !== "undefined" && payload.uri.startsWith("blob:")) {
    const blob = await fetch(payload.uri).then((r) => r.blob());
    fd.append("audio", blob, name);
  } else {
    fd.append("audio", {
      uri: payload.uri,
      name,
      type: mime,
    } as unknown as Blob);
  }
  fd.append("lang", payload.lang || "auto");
  fd.append("mime", mime);
  const res = await apiFetch("/api/v1/ai/chat/voice/transcribe/", {
    method: "POST",
    body: fd,
    timeoutMs: 60_000,
  });
  const body = (await res.json().catch(() => null)) as
    | { text?: string; lang?: string; detail?: string; code?: string }
    | null;
  if (!res.ok) {
    if (res.status === 403 && body?.code === "morph_plan_limit") {
      throw new MorphPlanLimitError(body.detail ?? "Limit tugadi");
    }
    throwFromMorphApiError(res, body, "Ovoz aniqlanmadi");
  }
  const text = (body?.text || "").trim();
  if (!text) throw new Error("Ovoz aniqlanmadi");
  return { text, lang: body?.lang || "uz" };
}

export async function speakMorphVoice(payload: {
  text: string;
  voiceId?: string;
  gender?: MorphVoiceGender;
  lang?: "uz" | "ru" | "auto";
}): Promise<{
  audioBase64: string;
  mime: string;
  voiceId: string;
  voiceName: string;
  spokenText: string;
}> {
  const res = await apiFetch("/api/v1/ai/chat/voice/speak/", {
    method: "POST",
    body: JSON.stringify({
      text: payload.text,
      voice_id: payload.voiceId,
      gender: payload.gender,
      lang: payload.lang && payload.lang !== "auto" ? payload.lang : undefined,
    }),
    timeoutMs: 60_000,
  });
  const body = (await res.json().catch(() => null)) as
    | {
        audio_base64?: string;
        mime?: string;
        voice_id?: string;
        voice_name?: string;
        text?: string;
        detail?: string;
        code?: string;
      }
    | null;
  if (!res.ok) {
    if (res.status === 403 && body?.code === "morph_plan_limit") {
      throw new MorphPlanLimitError(body.detail ?? "Limit tugadi");
    }
    throwFromMorphApiError(res, body, "Ovoz yaratilmadi");
  }
  if (!body?.audio_base64) {
    throw new Error("Ovoz yaratilmadi");
  }
  return {
    audioBase64: body.audio_base64,
    mime: body.mime || "audio/wav",
    voiceId: body.voice_id || payload.voiceId || "",
    voiceName: body.voice_name || "",
    spokenText: body.text || payload.text,
  };
}
