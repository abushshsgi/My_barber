import { apiJson } from "@/lib/api/client";

import type { ExploreViewId } from "@/lib/explore-views";

const SECRET_STORAGE_KEY = "mysaloon.explore-gen.secret";

export type ExploreGenJob = {
  persona_id: string;
  persona_label: string;
  slug: string;
  view: ExploreViewId;
  view_label: string;
  kind: "reference" | "style";
  relative_path: string;
  public_url: string | null;
  download_path: string;
  exists: boolean;
  published: boolean;
  live_url: string | null;
  output_mode: "public" | "media";
  asset_version?: number;
  explore_anchors?: Record<string, boolean>;
  prompt: string;
};

export type ExploreGenStatus = {
  configured: {
    gemini_api_key: boolean;
    studio_image: boolean;
    provider: "studio" | "vertex" | null;
    vertex: boolean;
  };
  jobs: ExploreGenJob[];
  total: number;
  existing: number;
  output_mode: "public" | "media";
  views: Array<{ id: ExploreViewId; label: string }>;
  persona_labels?: Record<string, string>;
  scope?: { persona_ids: string[]; views: ExploreViewId[] };
};

export type ExploreGenResult = {
  status: "created" | "skipped";
  persona_id: string;
  slug: string;
  view: ExploreViewId;
  relative_path: string;
  public_url: string | null;
  download_path: string;
  output_mode: "public" | "media";
  method?: string;
  elapsed_ms?: number;
  message?: string;
  prompt?: string;
};

export function readExploreGenSecret(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(SECRET_STORAGE_KEY)?.trim() ?? "";
}

export function saveExploreGenSecret(value: string): void {
  sessionStorage.setItem(SECRET_STORAGE_KEY, value.trim());
}

export function clearExploreGenSecret(): void {
  sessionStorage.removeItem(SECRET_STORAGE_KEY);
}

function exploreGenHeaders(): HeadersInit {
  const secret = readExploreGenSecret();
  return secret ? { "X-Explore-Gen-Secret": secret } : {};
}

export { exploreGenHeaders };

export async function fetchExploreGenStatus(): Promise<ExploreGenStatus> {
  const secret = readExploreGenSecret();
  const url = secret
    ? `/api/v1/ai/dev/explore-gen/?key=${encodeURIComponent(secret)}`
    : "/api/v1/ai/dev/explore-gen/";
  return apiJson<ExploreGenStatus>(url, {
    headers: exploreGenHeaders(),
  });
}

export async function generateExploreAsset(input: {
  personaId: string;
  slug: string;
  view?: ExploreViewId;
  force?: boolean;
}): Promise<ExploreGenResult> {
  const secret = readExploreGenSecret();
  const url = secret
    ? `/api/v1/ai/dev/explore-gen/generate/?key=${encodeURIComponent(secret)}`
    : "/api/v1/ai/dev/explore-gen/generate/";
  return apiJson<ExploreGenResult>(url, {
    method: "POST",
    headers: exploreGenHeaders(),
    body: JSON.stringify({
      persona_id: input.personaId,
      slug: input.slug,
      view: input.view ?? "front",
      force: input.force ?? false,
    }),
  });
}

export async function publishExploreAsset(input: {
  personaId: string;
  slug: string;
  view?: ExploreViewId;
}): Promise<ExploreGenPublishResult> {
  const secret = readExploreGenSecret();
  const url = secret
    ? `/api/v1/ai/dev/explore-gen/publish/?key=${encodeURIComponent(secret)}`
    : "/api/v1/ai/dev/explore-gen/publish/";
  return apiJson<ExploreGenPublishResult>(url, {
    method: "POST",
    headers: exploreGenHeaders(),
    body: JSON.stringify({
      persona_id: input.personaId,
      slug: input.slug,
      view: input.view ?? "front",
    }),
  });
}

export async function publishExplorePersona(input: {
  personaId: string;
}): Promise<ExploreGenPublishPersonaResult> {
  const secret = readExploreGenSecret();
  const url = secret
    ? `/api/v1/ai/dev/explore-gen/publish/?key=${encodeURIComponent(secret)}`
    : "/api/v1/ai/dev/explore-gen/publish/";
  return apiJson<ExploreGenPublishPersonaResult>(url, {
    method: "POST",
    headers: exploreGenHeaders(),
    body: JSON.stringify({
      persona_id: input.personaId,
      all: true,
    }),
  });
}

export async function setExplorePersonaLabel(input: {
  personaId: string;
  label: string;
}): Promise<{ persona_id: string; label: string }> {
  const secret = readExploreGenSecret();
  const url = secret
    ? `/api/v1/ai/dev/explore-gen/persona-label/?key=${encodeURIComponent(secret)}`
    : "/api/v1/ai/dev/explore-gen/persona-label/";
  return apiJson(url, {
    method: "POST",
    headers: exploreGenHeaders(),
    body: JSON.stringify({
      persona_id: input.personaId,
      label: input.label,
    }),
  });
}

export type ExploreGenPublishResult = {
  persona_id: string;
  slug: string;
  view: ExploreViewId;
  published: boolean;
  relative_path: string;
  public_url: string | null;
  live_url: string;
  published_at: string;
};

export type ExploreGenPublishPersonaResult = {
  persona_id: string;
  count: number;
  items: ExploreGenPublishResult[];
};

export function resolveExploreGenImageUrl(job: ExploreGenJob): string | null {
  if (job.live_url) return job.live_url;
  if (job.public_url) return job.public_url;
  const secret = readExploreGenSecret();
  if (!secret) return null;
  return `${job.download_path}&key=${encodeURIComponent(secret)}`;
}

export function exploreGenDownloadFilename(
  job: Pick<ExploreGenJob, "persona_id" | "slug" | "view">,
): string {
  const suffix = job.view === "front" ? job.slug : `${job.slug}__${job.view}`;
  return `${job.persona_id}-${suffix}.webp`;
}

export function exploreGenDownloadUrl(job: ExploreGenJob): string {
  const secret = readExploreGenSecret();
  const base = job.download_path;
  return secret ? `${base}${base.includes("?") ? "&" : "?"}key=${encodeURIComponent(secret)}` : base;
}

export async function downloadExploreGenAsset(job: ExploreGenJob): Promise<void> {
  const url = exploreGenDownloadUrl(job);
  const res = await fetch(url, { headers: exploreGenHeaders() });
  if (!res.ok) {
    throw new Error(`Yuklab olish xato (${res.status})`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = exploreGenDownloadFilename(job);
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
