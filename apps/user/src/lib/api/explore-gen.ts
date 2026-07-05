import { apiJson } from "@/lib/api/client";

const SECRET_STORAGE_KEY = "mysaloon.explore-gen.secret";

export type ExploreGenJob = {
  persona_id: string;
  persona_label: string;
  slug: string;
  kind: "reference" | "style";
  relative_path: string;
  public_url: string | null;
  download_path: string;
  exists: boolean;
  output_mode: "public" | "media";
  prompt: string;
};

export type ExploreGenStatus = {
  configured: {
    gemini_api_key: boolean;
    vertex_image: boolean;
    vertex: boolean;
  };
  jobs: ExploreGenJob[];
  total: number;
  existing: number;
  output_mode: "public" | "media";
};

export type ExploreGenResult = {
  status: "created" | "skipped";
  persona_id: string;
  slug: string;
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
  force?: boolean;
}): Promise<ExploreGenResult> {
  return apiJson<ExploreGenResult>("/api/v1/ai/dev/explore-gen/generate/", {
    method: "POST",
    headers: exploreGenHeaders(),
    body: JSON.stringify({
      persona_id: input.personaId,
      slug: input.slug,
      force: input.force ?? false,
    }),
  });
}

export function resolveExploreGenImageUrl(job: ExploreGenJob): string | null {
  if (job.public_url) return job.public_url;
  const secret = readExploreGenSecret();
  if (!secret) return null;
  return `${job.download_path}&key=${encodeURIComponent(secret)}`;
}

export function exploreGenDownloadUrl(job: ExploreGenJob): string {
  const secret = readExploreGenSecret();
  const base = job.download_path;
  return secret ? `${base}${base.includes("?") ? "&" : "?"}key=${encodeURIComponent(secret)}` : base;
}
