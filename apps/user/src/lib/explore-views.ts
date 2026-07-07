export const EXPLORE_VIEW_IDS = ["front", "left", "right", "back"] as const;

export type ExploreViewId = (typeof EXPLORE_VIEW_IDS)[number];

export const EXPLORE_VIEW_LABELS: Record<ExploreViewId, string> = {
  front: "Old",
  left: "Chap",
  right: "O'ng",
  back: "Orqa",
};

export function normalizeExploreView(value: string | null | undefined): ExploreViewId {
  const raw = (value ?? "front").trim().toLowerCase();
  if (raw === "old" || raw === "front") return "front";
  if (raw === "chap" || raw === "left") return "left";
  if (raw === "ong" || raw === "right") return "right";
  if (raw === "orqa" || raw === "back") return "back";
  return "front";
}

export function viewsForJobSlug(slug: string): readonly ExploreViewId[] {
  if (slug === "reference") return ["front"];
  return EXPLORE_VIEW_IDS;
}
