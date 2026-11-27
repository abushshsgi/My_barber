export type GuideCard = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  cover_image_url?: string;
  cover_alt?: string;
  published_at?: string | null;
  author?: string;
  reading_minutes?: number;
};

export function normalizeGuideQuery(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreGuide(row: GuideCard, query: string): number {
  const title = normalizeGuideQuery(row.title);
  const excerpt = normalizeGuideQuery(row.excerpt || "");
  const category = normalizeGuideQuery(row.category || "");
  if (!query) return 1;
  if (title === query) return 100;
  if (title.startsWith(query)) return 80;
  if (title.includes(query)) return 60;
  if (category.includes(query)) return 40;
  if (excerpt.includes(query)) return 20;
  return 0;
}

/** Published rows only. Ranking is exact title, prefix, title, category, then excerpt. */
export function rankGuides(rows: GuideCard[], query: string, category: string): GuideCard[] {
  const needle = normalizeGuideQuery(query);
  const scoped = rows.filter((row) => !category || row.category === category);
  const ranked = scoped
    .map((row) => ({ row, score: scoreGuide(row, needle) }))
    .filter((item) => item.score > 0);
  ranked.sort((a, b) => b.score - a.score || a.row.title.localeCompare(b.row.title));
  return ranked.map((item) => item.row);
}

export function guideCategories(rows: GuideCard[]): string[] {
  return [...new Set(rows.map((row) => row.category).filter(Boolean))].sort();
}
