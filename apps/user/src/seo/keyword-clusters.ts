export type KeywordClusterRow = {
  entity_type: "model" | "category" | "article" | "service";
  entity_id: string;
  locale: "uz" | "ru" | "en";
  primary_keyword: string;
  secondary_keywords: string;
  search_intent: string;
  monthly_volume_note: string;
  competition_note: string;
};

/** CSV eksport uchun statik klasterlar (hajm — taxmin; GSC/planner bilan tasdiqlash kerak). */
export const KEYWORD_CLUSTERS: KeywordClusterRow[] = [
  {
    entity_type: "service",
    entity_id: "morf-ai-try-on",
    locale: "uz",
    primary_keyword: "soch turmagi sinab ko'rish",
    secondary_keywords: "virtual try on, selfie soch, morf ai",
    search_intent: "transactional",
    monthly_volume_note: "estimate: medium",
    competition_note: "estimate: medium",
  },
  {
    entity_type: "category",
    entity_id: "mens-haircuts",
    locale: "uz",
    primary_keyword: "erkaklar soch turmaklari",
    secondary_keywords: "erkak soch turmagi, barber uslublari",
    search_intent: "informational",
    monthly_volume_note: "estimate: medium-high",
    competition_note: "estimate: medium",
  },
  {
    entity_type: "category",
    entity_id: "womens-haircuts",
    locale: "uz",
    primary_keyword: "ayollar soch turmaklari",
    secondary_keywords: "ayol soch turmagi, bob pixie",
    search_intent: "informational",
    monthly_volume_note: "estimate: medium",
    competition_note: "estimate: medium",
  },
  {
    entity_type: "model",
    entity_id: "men-textured-crop",
    locale: "uz",
    primary_keyword: "textured crop soch turmagi",
    secondary_keywords: "textured crop erkak, crop haircut",
    search_intent: "informational",
    monthly_volume_note: "estimate: low-medium",
    competition_note: "estimate: low",
  },
  {
    entity_type: "model",
    entity_id: "men-low-fade",
    locale: "en",
    primary_keyword: "low taper fade",
    secondary_keywords: "low fade men, taper fade haircut",
    search_intent: "informational",
    monthly_volume_note: "estimate: high",
    competition_note: "estimate: high",
  },
  {
    entity_type: "model",
    entity_id: "men-french-crop",
    locale: "ru",
    primary_keyword: "French Crop стрижка",
    secondary_keywords: "французский кроп, мужская стрижка",
    search_intent: "informational",
    monthly_volume_note: "estimate: medium",
    competition_note: "estimate: medium",
  },
  {
    entity_type: "article",
    entity_id: "shampun-tarkibini-tekshirish",
    locale: "uz",
    primary_keyword: "shampun tarkibi skaner",
    secondary_keywords: "ingredient skaner, hair advisor",
    search_intent: "transactional",
    monthly_volume_note: "estimate: low",
    competition_note: "estimate: low",
  },
  {
    entity_type: "service",
    entity_id: "booking",
    locale: "uz",
    primary_keyword: "sartaroshxona bron qilish toshkent",
    secondary_keywords: "salon online yozilish, barber band qilish",
    search_intent: "transactional",
    monthly_volume_note: "estimate: medium",
    competition_note: "estimate: medium",
  },
];

export function keywordClustersToCsv(rows: KeywordClusterRow[] = KEYWORD_CLUSTERS): string {
  const header =
    "entity_type,entity_id,locale,primary_keyword,secondary_keywords,search_intent,monthly_volume_note,competition_note";
  const body = rows.map((r) =>
    [
      r.entity_type,
      r.entity_id,
      r.locale,
      csvEscape(r.primary_keyword),
      csvEscape(r.secondary_keywords),
      r.search_intent,
      csvEscape(r.monthly_volume_note),
      csvEscape(r.competition_note),
    ].join(","),
  );
  return [header, ...body].join("\n");
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
