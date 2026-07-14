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

/** Preview URL — inline (attachment emas). */
export function resolveAssetsStudioPreviewUrl(item: AssetsStudioItem): string | null {
  if (!item.download_path && !item.public_url) return null;
  const secret = readExploreGenSecret();
  if (item.download_path) {
    const base = item.download_path;
    const withSecret = secret
      ? `${base}${base.includes("?") ? "&" : "?"}key=${encodeURIComponent(secret)}`
      : base;
    return withSecret;
  }
  return item.public_url;
}

export function resolveAssetsStudioDownloadUrl(item: AssetsStudioItem): string | null {
  const preview = resolveAssetsStudioPreviewUrl(item);
  if (!preview) return null;
  return `${preview}${preview.includes("?") ? "&" : "?"}download=1`;
}

/** Auth header bilan blob — <img> uchun ishonchli preview. */
export async function fetchAssetsStudioBlobUrl(item: AssetsStudioItem): Promise<string> {
  const url = resolveAssetsStudioPreviewUrl(item);
  if (!url) throw new Error("URL yo'q");
  const res = await fetch(url, { headers: exploreGenHeaders() });
  if (!res.ok) throw new Error(`Rasm yuklanmadi (${res.status})`);
  const blob = await res.blob();
  if (!blob.type.startsWith("image/") && blob.size < 32) {
    throw new Error("Server rasm emas javob qaytardi");
  }
  return URL.createObjectURL(blob);
}

export async function downloadAssetsStudioItem(item: AssetsStudioItem): Promise<void> {
  const url = resolveAssetsStudioDownloadUrl(item) || resolveAssetsStudioPreviewUrl(item);
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

/** Logo uchun tez paste o'rniga bir bosishda. */
export const LOGO_PROMPT_PRESETS: Array<{ id: string; label: string; prompt: string }> = [
  {
    id: "s-mono",
    label: "S monogram",
    prompt:
      'mysaloon logo, square app icon. Minimal geometric monogram letter "S" made from two clean hair-fade curves (subtle barber cue, not literal scissors). Deep charcoal #1A1A1A symbol on warm sand/cream background #F3EDE4. Ultra clean, flat vector style, generous padding, high contrast, crisp at 64px. No people, no photos, no 3D gloss, no purple neon, no extra words.',
  },
  {
    id: "wordmark",
    label: "Wordmark",
    prompt:
      'mysaloon wordmark logo, square composition. Lowercase custom sans wordmark "mysaloon" only, bold modern geometric type, optical kerning. Charcoal letters on soft ivory background. Optional tiny abstract S mark above the word. Flat vector, centered, lots of padding, readable at small size. No tagline, no people, no clipart scissors, no gradient rainbow, no mockup.',
  },
  {
    id: "icon",
    label: "Icon only",
    prompt:
      "App icon for mysaloon. Bold simple mark only: abstract S + soft circular badge. Full-bleed square, 10% safe margin from edges. Two colors max: charcoal and cream OR charcoal and muted olive. Flat, chunky shapes, no thin lines, no text, no photo. Looks clear at 48px.",
  },
  {
    id: "premium",
    label: "Premium qora",
    prompt:
      'Luxury-minimal mysaloon brand mark. Black square canvas, cream monogram "MS" interlocking, very thin elegant geometry but still legible small. No ornament, no glitter, no serif drama. Centered, vector flat, printing ready.',
  },
  {
    id: "fresh",
    label: "Yashil fresh",
    prompt:
      'Fresh urban grooming logo for mysaloon Uzbekistan. Soft mint-green circle badge with charcoal abstract S inside. Modern, friendly, not childish. Flat vector, square icon, clean edges, no people, no scissors photo, no text except optional tiny "mysaloon" under mark if still crisp.',
  },
];
