import type { Review, SalonRatingSummary } from "@/lib/mock-data";

function pickLang(lang?: string): "uz" | "ru" | "en" {
  const code = (lang || "uz").split("-")[0].toLowerCase();
  return code === "ru" || code === "en" ? code : "uz";
}

export function deriveRatingSummaryFromReviews(
  reviews: Review[],
  fallbackRating = 0,
): SalonRatingSummary | null {
  if (!reviews.length) return null;

  const distribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  let sum = 0;
  for (const r of reviews) {
    const key = String(Math.min(5, Math.max(1, Math.round(r.rating))));
    distribution[key] = (distribution[key] ?? 0) + 1;
    sum += r.rating;
  }
  const ratingAvg = Math.round((sum / reviews.length) * 100) / 100;
  const reviewCount = reviews.length;
  const isGuestFavorite = ratingAvg >= 4.8 && reviewCount >= 10;

  const offsets = [0.05, 0.0, -0.02, 0.03];
  const labels = ["cleanliness", "service", "masters", "atmosphere"];
  const highlightLabels: Record<string, Record<string, string>> = {
    cleanliness: { uz: "Tozalik", ru: "Чистота", en: "Cleanliness" },
    service: { uz: "Xizmat", ru: "Сервис", en: "Service" },
    masters: { uz: "Ustalar", ru: "Мастера", en: "Masters" },
    atmosphere: { uz: "Atmosfera", ru: "Атмосфера", en: "Atmosphere" },
  };

  const highlights = labels.map((code, i) => ({
    code,
    label: highlightLabels[code]?.uz ?? code,
    score: Math.min(5, Math.round((ratingAvg + offsets[i % offsets.length]) * 10) / 10),
    count: Math.max(1, Math.floor(reviewCount / 4)),
  }));

  return {
    ratingAvg: ratingAvg || fallbackRating,
    reviewCount,
    isGuestFavorite,
    distribution,
    highlights,
  };
}

export function mergeRatingSummary(
  api: SalonRatingSummary | null | undefined,
  reviews: Review[],
  salonRating: number,
  lang = "uz",
): SalonRatingSummary | null {
  if (api && api.reviewCount > 0) {
    const l = pickLang(lang);
    if (l !== "uz" && api.highlights.length) {
      const map: Record<string, Record<string, string>> = {
        cleanliness: { uz: "Tozalik", ru: "Чистота", en: "Cleanliness" },
        service: { uz: "Xizmat", ru: "Сервис", en: "Service" },
        masters: { uz: "Ustalar", ru: "Мастера", en: "Masters" },
        atmosphere: { uz: "Atmosfera", ru: "Атмосфера", en: "Atmosphere" },
      };
      return {
        ...api,
        highlights: api.highlights.map((h) => {
          const base = map[h.code.split(":")[0]];
          return base ? { ...h, label: base[l] ?? h.label } : h;
        }),
      };
    }
    return api;
  }
  const derived = deriveRatingSummaryFromReviews(reviews, salonRating);
  if (!derived) return null;
  const l = pickLang(lang);
  const map: Record<string, Record<string, string>> = {
    cleanliness: { uz: "Tozalik", ru: "Чистота", en: "Cleanliness" },
    service: { uz: "Xizmat", ru: "Сервис", en: "Service" },
    masters: { uz: "Ustalar", ru: "Мастера", en: "Masters" },
    atmosphere: { uz: "Atmosfera", ru: "Атмосфера", en: "Atmosphere" },
  };
  return {
    ...derived,
    highlights: derived.highlights.map((h) => ({
      ...h,
      label: map[h.code]?.[l] ?? h.label,
    })),
  };
}
