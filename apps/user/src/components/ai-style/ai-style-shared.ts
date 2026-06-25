import type { AiStyleAnalyzeResponse } from "@/lib/api/ai";
import type { Audience } from "@/lib/mock-data";

export type FaceShapeKey = "oval" | "round" | "square";
export type HairTypeKey = "short" | "medium" | "long";

export interface AiSuggestion {
  id: string;
  title: string;
  match: number;
  seed: string;
  imageUrl?: string;
  reason?: string;
  reasonKey?: string;
  barberName: string;
  salonId: string;
  salonName: string;
}

export interface AiAnalysisResult {
  faceShapeKey: FaceShapeKey;
  hairTypeKey: HairTypeKey;
  summaryUz?: string;
  suggestions: AiSuggestion[];
}

export function styleCoverGradient(seed: string) {
  const n = seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const light = 0.9 + (n % 6) * 0.012;
  const dark = 0.12 + (n % 5) * 0.02;
  return `linear-gradient(145deg, oklch(${light} 0.016 85) 0%, oklch(${dark} 0 0) 100%)`;
}

export const ANALYZE_MS = 1800;

export function mapAiStyleResponse(data: AiStyleAnalyzeResponse): AiAnalysisResult {
  return {
    faceShapeKey: data.face_shape,
    hairTypeKey: data.hair_type,
    summaryUz: data.summary_uz,
    suggestions: data.suggestions.map((s) => ({
      id: s.id,
      title: s.title,
      match: s.match,
      seed: s.seed,
      imageUrl: s.image_url,
      reason: s.reason_uz,
      barberName: s.barber_name ?? "—",
      salonId: s.salon_id != null ? String(s.salon_id) : "",
      salonName: s.salon_name ?? "—",
    })),
  };
}
