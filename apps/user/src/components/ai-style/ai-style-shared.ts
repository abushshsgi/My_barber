import type { Audience } from "@/lib/mock-data";
import { salons, trendingStyles } from "@/lib/mock-data";
import { matchAudience } from "@/hooks/use-audience";

export type FaceShapeKey = "oval" | "round" | "square";
export type HairTypeKey = "short" | "medium" | "long";

export interface AiSuggestion {
  id: string;
  title: string;
  match: number;
  seed: string;
  reasonKey: string;
  barberName: string;
  salonId: string;
  salonName: string;
}

export interface AiAnalysisResult {
  faceShapeKey: FaceShapeKey;
  hairTypeKey: HairTypeKey;
  suggestions: AiSuggestion[];
}

const MATCH_SCORES = [94, 88, 82] as const;

const REASON_KEYS: Record<string, string> = {
  t1: "aiStylePage.reasons.t1",
  t2: "aiStylePage.reasons.t2",
  t3: "aiStylePage.reasons.t3",
  t4: "aiStylePage.reasons.t4",
  t5: "aiStylePage.reasons.t5",
  t6: "aiStylePage.reasons.t6",
};

/** Bej + qora — uslub preview gradient. */
export function styleCoverGradient(seed: string) {
  const n = seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const light = 0.9 + (n % 6) * 0.012;
  const dark = 0.12 + (n % 5) * 0.02;
  return `linear-gradient(145deg, oklch(${light} 0.016 85) 0%, oklch(${dark} 0 0) 100%)`;
}

function pickSalonForStyle(audience: Audience, category: string) {
  return (
    salons.find((s) => matchAudience(s.audience, audience) && s.category === category) ??
    salons.find((s) => matchAudience(s.audience, audience)) ??
    salons[0]
  );
}

export function buildAnalysis(audience: Audience): AiAnalysisResult {
  const styles = trendingStyles.filter((s) => matchAudience(s.audience, audience)).slice(0, 3);
  const faceShapeKey: FaceShapeKey = audience === "women" ? "oval" : "square";
  const hairTypeKey: HairTypeKey =
    audience === "women" ? "medium" : audience === "men" ? "short" : "medium";

  const suggestions: AiSuggestion[] = styles.map((style, index) => {
    const salon = pickSalonForStyle(audience, style.category);
    const barber = salon.staff[index % salon.staff.length] ?? salon.staff[0];
    return {
      id: style.id,
      title: style.title,
      match: MATCH_SCORES[index] ?? 80,
      seed: style.seed,
      reasonKey: REASON_KEYS[style.id] ?? "aiStylePage.reasons.default",
      barberName: barber.name,
      salonId: salon.id,
      salonName: salon.name,
    };
  });

  return { faceShapeKey, hairTypeKey, suggestions };
}

export const ANALYZE_MS = 1800;
