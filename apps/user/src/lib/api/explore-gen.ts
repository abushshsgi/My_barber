import { apiFetch } from "@/lib/api/client";

export type ExploreGenJob = {
  persona_id: string;
  persona_label: string;
  slug: string;
  kind: "reference" | "style";
  relative_path: string;
  public_url: string;
  exists: boolean;
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
};

export type ExploreGenResult = {
  status: "created" | "skipped";
  persona_id: string;
  slug: string;
  relative_path: string;
  public_url: string;
  method?: string;
  elapsed_ms?: number;
  message?: string;
  prompt?: string;
};

export async function fetchExploreGenStatus(): Promise<ExploreGenStatus> {
  return apiFetch<ExploreGenStatus>("/ai/dev/explore-gen/");
}

export async function generateExploreAsset(input: {
  personaId: string;
  slug: string;
  force?: boolean;
}): Promise<ExploreGenResult> {
  return apiFetch<ExploreGenResult>("/ai/dev/explore-gen/generate/", {
    method: "POST",
    body: JSON.stringify({
      persona_id: input.personaId,
      slug: input.slug,
      force: input.force ?? false,
    }),
  });
}
