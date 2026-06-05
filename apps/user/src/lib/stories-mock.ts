import { salons } from "@/lib/mock-data";

export interface StorySlide {
  id: string;
  headline: string;
  body: string;
  cta?: string;
  hue: number;
  durationMs: number;
}

export interface SalonStory {
  salonId: string;
  salonName: string;
  avatarSeed: string;
  unseen: boolean;
  slides: StorySlide[];
}

export const salonStories: SalonStory[] = salons.slice(0, 6).map((s, i) => ({
  salonId: s.id,
  salonName: s.name,
  avatarSeed: s.coverSeed,
  unseen: i < 4,
  slides: [
    {
      id: `${s.id}-1`,
      headline: i % 2 === 0 ? "Bugungi slotlar ochiq" : "Yangi mavsum kolleksiyasi",
      body: i % 2 === 0 ? "Bugun 14:00 dan boshlab bo'sh vaqtlar mavjud." : "Trend uslublar va maxsus chegirmalar faqat story orqali.",
      cta: "Band qilish",
      hue: (Number(s.id) * 55 + 20) % 360,
      durationMs: 5200,
    },
    {
      id: `${s.id}-2`,
      headline: "Ustalar ish jarayonida",
      body: `${s.staff[0]?.name ?? "Jamoa"} yangi look bilan qaytmoqda — natijani ko'ring.`,
      hue: (Number(s.id) * 55 + 90) % 360,
      durationMs: 4800,
    },
    {
      id: `${s.id}-3`,
      headline: s.rating >= 4.8 ? "⭐ Top reyting" : "Mijozlar fikri",
      body: `${s.rating} reyting · ${s.reviewCount}+ sharh. ${shortAddress(s.address)}`,
      cta: "Salonni ko'rish",
      hue: (Number(s.id) * 55 + 160) % 360,
      durationMs: 5000,
    },
  ],
}));

function shortAddress(address: string) {
  return address.split(",")[0] ?? address;
}

export function getStoryBySalonId(salonId: string) {
  return salonStories.find((s) => s.salonId === salonId);
}

export function getStoryIndex(salonId: string) {
  return salonStories.findIndex((s) => s.salonId === salonId);
}
