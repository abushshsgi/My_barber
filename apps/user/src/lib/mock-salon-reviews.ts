import type { Review, Salon, SalonRatingSummary } from "@/lib/mock-data";

const MOCK_TEXTS = {
  uz: [
    "Juda yaxshi xizmat, ustalar professional!",
    "Toza va qulay muhit, yana kelaman.",
    "Vaqtida qabul qilishdi, natijadan mamnunman.",
    "Narx-sifat nisbati a'lo.",
    "Do'stlarga tavsiya qilaman.",
    "Kutish zonasi qulay, choy ham bor edi.",
    "Soch olish juda sifatli bo'ldi.",
    "Yaxshi, lekin biroz kutishga to'g'ri keldi.",
  ],
  ru: [
    "Отличный сервис, мастера профессионалы!",
    "Чисто и уютно, приду ещё.",
    "Приняли вовремя, результатом доволен.",
    "Отличное соотношение цены и качества.",
    "Рекомендую друзьям.",
    "Удобная зона ожидания.",
    "Стрижка получилась на высоте.",
    "Хорошо, но пришлось немного подождать.",
  ],
  en: [
    "Excellent service, very professional staff!",
    "Clean and cozy — I'll come again.",
    "On time and great results.",
    "Great value for the price.",
    "Highly recommend to friends.",
    "Comfortable waiting area.",
    "The haircut turned out great.",
    "Good overall, but a short wait.",
  ],
};

const MOCK_NAMES = {
  uz: ["Sardor", "Dilshod", "Malika", "Jasur", "Timur", "Aziza", "Bobur", "Nilufar"],
  ru: ["Алексей", "Мария", "Дмитрий", "Анна", "Игорь", "Елена", "Сергей", "Ольга"],
  en: ["Alex", "Maria", "David", "Emma", "James", "Sophie", "Michael", "Olivia"],
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickLang(lang?: string): "uz" | "ru" | "en" {
  const code = (lang || "uz").split("-")[0].toLowerCase();
  return code === "ru" || code === "en" ? code : "uz";
}

export function mockSalonReviews(
  salon: Pick<Salon, "id" | "name" | "rating" | "reviewCount">,
  lang = "uz",
): Review[] {
  const l = pickLang(lang);
  const texts = MOCK_TEXTS[l];
  const names = MOCK_NAMES[l];
  const seed = hash(salon.id);
  const count = Math.min(Math.max(salon.reviewCount || 8, 6), 12);
  const baseRating = salon.rating > 0 ? salon.rating : 4.85;

  return Array.from({ length: count }, (_, i) => {
    const n = (seed + i * 17) % names.length;
    const t = (seed + i * 13) % texts.length;
    const ratingRoll = (seed + i * 7) % 100;
    let rating = 5;
    if (ratingRoll > 88) rating = 4;
    else if (ratingRoll > 96) rating = 3;
    if (baseRating >= 4.8 && rating < 4) rating = 4;

    const daysAgo = 2 + ((seed + i * 3) % 45);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    return {
      id: `mock-${salon.id}-${i}`,
      author: names[n],
      rating,
      text: texts[t],
      date: date.toLocaleDateString(l === "ru" ? "ru-RU" : l === "en" ? "en-US" : "uz-UZ"),
    };
  });
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
