import { apiJson } from "@/lib/api/client";
import {
  exploreGenHeaders,
  readExploreGenSecret,
} from "@/lib/api/explore-gen";

export type AssetsStudioTemplate = {
  id: string;
  label: string;
  category: string;
  audience: string;
  description: string;
  aspect_ratio: string;
  width: number;
  height: number;
  suggested_use: string;
  default_prompt: string;
};

export type AssetsStudioItem = {
  id: string;
  template_id: string;
  template_label: string;
  category: string;
  audience: string;
  aspect_ratio: string;
  width: number;
  height: number;
  relative_path: string;
  prompt: string;
  prompt_extra: string;
  selected: boolean;
  created_at: string;
  method?: string;
  elapsed_ms?: number;
  exists: boolean;
  public_url: string | null;
  download_path: string;
};

export type AssetsStudioStatus = {
  configured: {
    gemini_api_key: boolean;
    provider: string | null;
    image_generation: boolean;
  };
  templates: AssetsStudioTemplate[];
  items: AssetsStudioItem[];
  total: number;
  selected_count: number;
};

function withKey(path: string): string {
  const secret = readExploreGenSecret();
  if (!secret) return path;
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}key=${encodeURIComponent(secret)}`;
}

export async function fetchAssetsStudioStatus(params?: {
  templateId?: string;
  selectedOnly?: boolean;
}): Promise<AssetsStudioStatus> {
  const sp = new URLSearchParams();
  if (params?.templateId) sp.set("template_id", params.templateId);
  if (params?.selectedOnly) sp.set("selected", "1");
  const qs = sp.toString();
  const base = `/api/v1/ai/dev/explore-gen/assets/${qs ? `?${qs}` : ""}`;
  return apiJson<AssetsStudioStatus>(withKey(base), {
    headers: exploreGenHeaders(),
  });
}

export async function generateAssetsStudioItem(input: {
  templateId: string;
  promptExtra?: string;
  aspectRatio?: string;
}): Promise<{ status: string; item: AssetsStudioItem }> {
  return apiJson(withKey("/api/v1/ai/dev/explore-gen/assets/generate/"), {
    method: "POST",
    headers: exploreGenHeaders(),
    body: JSON.stringify({
      template_id: input.templateId,
      prompt_extra: input.promptExtra ?? "",
      aspect_ratio: input.aspectRatio || undefined,
    }),
  });
}

export async function selectAssetsStudioItem(input: {
  id: string;
  selected: boolean;
}): Promise<{ item: AssetsStudioItem }> {
  return apiJson(withKey("/api/v1/ai/dev/explore-gen/assets/select/"), {
    method: "POST",
    headers: exploreGenHeaders(),
    body: JSON.stringify({ id: input.id, selected: input.selected }),
  });
}

export function resolveAssetsStudioImageUrl(item: AssetsStudioItem): string | null {
  const secret = readExploreGenSecret();
  if (secret && item.download_path) {
    return `${item.download_path}${item.download_path.includes("?") ? "&" : "?"}key=${encodeURIComponent(secret)}`;
  }
  return item.public_url || item.download_path || null;
}

export async function downloadAssetsStudioItem(item: AssetsStudioItem): Promise<void> {
  const url = resolveAssetsStudioImageUrl(item);
  if (!url) throw new Error("URL yo'q");
  const res = await fetch(url, { headers: exploreGenHeaders() });
  if (!res.ok) throw new Error(`Yuklab olish xato (${res.status})`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `${item.template_id}-${item.id}.webp`;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
