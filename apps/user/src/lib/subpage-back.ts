/** Safe internal return path from ?backTo= query (settings sub-flows). */
export function parseSubpageBackTo(search: Record<string, unknown>, fallback = "/profile"): string {
  const backTo = search.backTo;
  if (typeof backTo !== "string" || !backTo.startsWith("/")) return fallback;
  if (backTo.startsWith("//")) return fallback;
  return backTo;
}
