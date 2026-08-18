export function pickPlanName(
  plan: { name_uz: string; name_ru?: string; name_en?: string },
  lang: string | undefined,
): string {
  const l = (lang || "ru").slice(0, 2).toLowerCase();
  if (l === "ru") return plan.name_ru || plan.name_uz;
  if (l === "en") return plan.name_en || plan.name_uz;
  return plan.name_uz;
}

export function pickFeatureLabel(
  feature: { label_uz: string; label_ru?: string; label_en?: string },
  lang: string | undefined,
): string {
  const l = (lang || "ru").slice(0, 2).toLowerCase();
  if (l === "ru") return feature.label_ru || feature.label_uz;
  if (l === "en") return feature.label_en || feature.label_uz;
  return feature.label_uz;
}

export function pickLocalizedLabel(
  row: { label_uz?: string; label_ru?: string; label_en?: string } | null | undefined,
  lang: string | undefined,
  fallback = "",
): string {
  if (!row) return fallback;
  const l = (lang || "ru").slice(0, 2).toLowerCase();
  if (l === "ru") return row.label_ru || row.label_uz || fallback;
  if (l === "en") return row.label_en || row.label_uz || fallback;
  return row.label_uz || fallback;
}
