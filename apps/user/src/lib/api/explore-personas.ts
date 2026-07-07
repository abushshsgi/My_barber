import type { ExplorePersonaId } from "@/lib/explore-personas";
import { apiJson } from "./client";

export type ApiExplorePersona = {
  id: ExplorePersonaId;
  label: string;
  code: string;
  description?: string;
  reference_url: string;
};

export async function fetchExplorePersonas(): Promise<ApiExplorePersona[]> {
  return apiJson<ApiExplorePersona[]>("/api/v1/explore/personas/");
}
