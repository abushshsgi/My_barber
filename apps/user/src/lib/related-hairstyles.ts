export type RelatedStyle = {
  id: string;
  category: string;
  hairLength: string;
  audience: string;
  tags: string[];
};

export function lengthCategoryPath(length: string): string | null {
  if (length === "short") return "/explore/category/short-haircuts";
  if (length === "medium") return "/explore/category/medium-haircuts";
  if (length === "long") return "/explore/category/long-haircuts";
  return null;
}

/** Same category, then length, then audience, then shared tags. Stable id order. */
export function rankRelatedHairstyles<T extends RelatedStyle>(
  current: T,
  all: T[],
  limit = 4,
): T[] {
  const ranked = all
    .filter((item) => item.id !== current.id)
    .map((item) => {
      const shared = item.tags.filter((tag) => current.tags.includes(tag)).length;
      const score =
        (item.category && item.category === current.category ? 4 : 0) +
        (item.hairLength && item.hairLength === current.hairLength ? 2 : 0) +
        (item.audience && item.audience === current.audience ? 1 : 0) +
        shared;
      return { item, score };
    })
    .filter((row) => row.score > 0);
  ranked.sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
  return ranked.slice(0, limit).map((row) => row.item);
}
