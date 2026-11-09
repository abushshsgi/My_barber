import type { OnboardingGender } from "@/lib/first-visit-onboarding";

export const UNIVERSAL_COPY = {
  title: "Yangi soch turmagingizni hoziroq sinab ko‘ring!",
  lead: "Yangi soch turmagingizni",
  accent: "hoziroq sinab ko‘ring!",
  description:
    "MySaloon AI yordamida erkaklar va ayollar uchun turli soch turmaklarini o‘zingizda ko‘rib, mos uslubni tanlang.",
  points: [
    "Soch turmaklarini sinab ko‘ring",
    "O‘zingizga mos uslubni toping",
    "Natijani do‘stlaringiz bilan ulashing",
  ],
  cta: "Davom etish →",
  skip: "O‘tkazib yuborish",
} as const;

export const TRY_ON_COPY = {
  women: {
    title: "O‘zingizga mos uslubni tanlang!",
    lead: "O‘zingizga mos",
    accent: "uslubni tanlang!",
    description:
      "Turli soch turmaklarini AI yordamida o‘zingizda sinab ko‘ring va eng mosini tanlang.",
  },
  men: {
    title: "Erkaklar uchun yangi soch turmagini sinab ko‘ring!",
    description: "Asl soch turmagi va MySaloon AI natijasini ko‘ring.",
  },
} as const;

export const SHARE_COPY = {
  women: {
    title: "Yangi obrazingizni do‘stlaringizga ko‘rsating!",
    description:
      "AI yordamida yaratilgan yangi soch turmagingizni saqlang va Instagram, Telegram, TikTok yoki boshqa ijtimoiy tarmoqlarda ulashing!",
  },
  men: {
    title: "Yangi soch turmagingizni do‘stlaringizga ko‘rsating!",
    description:
      "AI yordamida yaratilgan yangi soch turmagingizni saqlang va Instagram, Telegram, TikTok yoki boshqa ijtimoiy tarmoqlarda ulashing!",
  },
} as const;

export function slideTitle(index: 0 | 1 | 2, gender: OnboardingGender = "women") {
  if (index === 0) return UNIVERSAL_COPY.title;
  if (index === 1) return TRY_ON_COPY[gender].title;
  return SHARE_COPY[gender].title;
}
