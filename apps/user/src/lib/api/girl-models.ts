import { apiJson } from "@/lib/api/client";
import { exploreGenHeaders, readExploreGenSecret } from "@/lib/api/explore-gen";

export type GirlModelLook = {
  id: string;
  label: string;
  code: string;
  summary: string;
};

export type GirlModelSlot = {
  id: string;
  label: string;
  code: string;
  published: boolean;
  live_url: string | null;
};

export type GirlModelItem = {
  id: string;
  look_id: string;
  look_label: string;
  code: string;
  width: number;
  height: number;
  relative_path: string;
  prompt: string;
  prompt_extra: string;
  liked: boolean;
  published_persona_id: string | null;
  model?: string;
  created_at: string;
  elapsed_ms?: number;
  exists: boolean;
  download_path: string;
  slot_label?: string;
};

export type GirlModelsStatus = {
  configured: boolean;
  model: string;
  looks: GirlModelLook[];
  slots: GirlModelSlot[];
  items: GirlModelItem[];
  total: number;
  liked_count: number;
};

function withKey(path: string): string {
  const secret = readExploreGenSecret();
  if (!secret) return path;
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}key=${encodeURIComponent(secret)}`;
}

export async function fetchGirlModelsStatus(params?: {
  lookId?: string;
  likedOnly?: boolean;
}): Promise<GirlModelsStatus> {
  const sp = new URLSearchParams();
  if (params?.lookId) sp.set("look_id", params.lookId);
  if (params?.likedOnly) sp.set("liked", "1");
  const qs = sp.toString();
  const base = `/api/v1/ai/dev/explore-gen/girls/${qs ? `?${qs}` : ""}`;
  return apiJson<GirlModelsStatus>(withKey(base), { headers: exploreGenHeaders() });
}

export async function generateGirlModel(input: {
  lookId: string;
  promptExtra?: string;
}): Promise<{ status: string; item: GirlModelItem }> {
  return apiJson(withKey("/api/v1/ai/dev/explore-gen/girls/generate/"), {
    method: "POST",
    headers: exploreGenHeaders(),
    body: JSON.stringify({
      look_id: input.lookId,
      prompt_extra: input.promptExtra ?? "",
    }),
  });
}

export async function likeGirlModel(input: {
  id: string;
  liked: boolean;
}): Promise<{ item: GirlModelItem }> {
  return apiJson(withKey("/api/v1/ai/dev/explore-gen/girls/like/"), {
    method: "POST",
    headers: exploreGenHeaders(),
    body: JSON.stringify(input),
  });
}

export async function publishGirlModel(input: {
  id: string;
  personaId: string;
  label?: string;
}): Promise<{ item: GirlModelItem }> {
  return apiJson(withKey("/api/v1/ai/dev/explore-gen/girls/publish/"), {
    method: "POST",
    headers: exploreGenHeaders(),
    body: JSON.stringify({
      id: input.id,
      persona_id: input.personaId,
      label: input.label ?? "",
    }),
  });
}

export function resolveGirlModelPreviewUrl(item: GirlModelItem): string | null {
  if (!item.download_path) return null;
  const secret = readExploreGenSecret();
  const base = item.download_path;
  return secret
    ? `${base}${base.includes("?") ? "&" : "?"}key=${encodeURIComponent(secret)}`
    : base;
}

export async function fetchGirlModelBlobUrl(item: GirlModelItem): Promise<string> {
  const url = resolveGirlModelPreviewUrl(item);
  if (!url) throw new Error("URL yo'q");
  const res = await fetch(url, { headers: exploreGenHeaders() });
  if (!res.ok) throw new Error(`Rasm yuklanmadi (${res.status})`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
