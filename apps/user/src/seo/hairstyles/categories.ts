import type { HairstyleSeoSource } from "./image-seo";
import type { SeoLocale } from "../constants";

export type ExploreCategoryId =
  | "mens-haircuts"
  | "womens-haircuts"
  | "short-haircuts"
  | "medium-haircuts"
  | "long-haircuts"
  | "curly-hairstyles"
  | "fade-haircuts"
  | "classic-hairstyles"
  | "modern-hairstyles";

export type ExploreCategoryDef = {
  id: ExploreCategoryId;
  uzPath: string;
  minStyles: number;
  match: (row: HairstyleSeoSource) => boolean;
  copy: Record<
    SeoLocale,
    { title: string; description: string; h1: string; intro: string; keywords: string }
  >;
  priority: number;
};

function slugOrTags(row: HairstyleSeoSource, pattern: RegExp): boolean {
  const tags = (row.tags ?? []).join(" ");
  return pattern.test(`${row.slug} ${tags}`);
}

export const EXPLORE_CATEGORIES: ExploreCategoryDef[] = [
  {
    id: "mens-haircuts",
    uzPath: "/explore/category/mens-haircuts",
    minStyles: 3,
    match: (r) => r.audience === "men",
    priority: 0.72,
    copy: {
      uz: {
        title: "Erkaklar soch turmaklari — katalog | mysaloon.uz",
        description:
          "Erkaklar uchun qisqa, o‘rta va uzun soch turmaklari. Har bir modelni Morf AI try-on bilan sinab ko‘ring.",
        h1: "Erkaklar soch turmaklari",
        intro: "Fade, crop, curly va klassik erkak uslublari — barchasi bitta katalogda.",
        keywords: "erkak soch turmagi, erkaklar soch turmaklari, barber, fade",
      },
      ru: {
        title: "Мужские стрижки — каталог | mysaloon.uz",
        description: "Каталог мужских стрижек: fade, crop, curly и классика. Примерьте в Morf AI.",
        h1: "Мужские стрижки",
        intro: "Актуальные мужские укладки с виртуальной примеркой на селфи.",
        keywords: "мужские стрижки, fade, барбер",
      },
      en: {
        title: "Men's haircuts — catalog | mysaloon.uz",
        description:
          "Men's haircut catalog: fades, crops, curls, and classics. Virtual try-on with Morf AI.",
        h1: "Men's haircuts",
        intro: "Browse men's styles and preview each cut on your selfie.",
        keywords: "mens haircuts, fade, barber catalog",
      },
    },
  },
  {
    id: "womens-haircuts",
    uzPath: "/explore/category/womens-haircuts",
    minStyles: 3,
    match: (r) => r.audience === "women",
    priority: 0.72,
    copy: {
      uz: {
        title: "Ayollar soch turmaklari — katalog | mysaloon.uz",
        description:
          "Ayollar uchun bob, pixie, balayage va boshqa zamonaviy uslublar. Morf AI bilan sinab ko‘ring.",
        h1: "Ayollar soch turmaklari",
        intro: "Uzunlik va tekstura bo‘yicha ayollar uslublarini tanlang.",
        keywords: "ayol soch turmagi, ayollar soch turmaklari, bob, balayage",
      },
      ru: {
        title: "Женские стрижки — каталог | mysaloon.uz",
        description:
          "Женские стрижки и укладки: bob, pixie, balayage. Виртуальная примерка Morf AI.",
        h1: "Женские стрижки",
        intro: "Подбор женских стрижек по длине и текстуре волос.",
        keywords: "женские стрижки, bob, balayage",
      },
      en: {
        title: "Women's hairstyles — catalog | mysaloon.uz",
        description: "Women's cuts and styles: bob, pixie, balayage, layers. Try on with Morf AI.",
        h1: "Women's hairstyles",
        intro: "Explore women's styles by length and texture.",
        keywords: "womens hairstyles, bob, balayage",
      },
    },
  },
  {
    id: "short-haircuts",
    uzPath: "/explore/category/short-haircuts",
    minStyles: 3,
    match: (r) => r.hair_length === "short",
    priority: 0.68,
    copy: {
      uz: {
        title: "Qisqa soch turmaklari | mysaloon.uz",
        description: "Qisqa erkak va ayol soch turmaklari — crop, fade, pixie va boshqalar.",
        h1: "Qisqa soch turmaklari",
        intro: "Qisqa uzunlikdagi modellarni katalogdan tanlang va try-on qiling.",
        keywords: "qisqa soch turmagi, crop, fade, pixie",
      },
      ru: {
        title: "Короткие стрижки | mysaloon.uz",
        description: "Короткие мужские и женские стрижки в каталоге MySaloon.",
        h1: "Короткие стрижки",
        intro: "Короткие модели с примеркой в Morf AI.",
        keywords: "короткие стрижки, crop",
      },
      en: {
        title: "Short haircuts | mysaloon.uz",
        description: "Short men's and women's haircuts in the MySaloon catalog.",
        h1: "Short haircuts",
        intro: "Short-length models with Morf AI try-on.",
        keywords: "short haircuts, crop fade",
      },
    },
  },
  {
    id: "medium-haircuts",
    uzPath: "/explore/category/medium-haircuts",
    minStyles: 3,
    match: (r) => r.hair_length === "medium",
    priority: 0.66,
    copy: {
      uz: {
        title: "O‘rta uzunlikdagi soch turmaklari | mysaloon.uz",
        description: "O‘rta uzunlik — eng ko‘p tanlanadigan erkak va ayol uslublari.",
        h1: "O‘rta uzunlikdagi soch turmaklari",
        intro: "Layered, wolf cut va o‘rta crop uslublarini sinab ko‘ring.",
        keywords: "o'rta soch turmagi, medium haircut",
      },
      ru: {
        title: "Стрижки средней длины | mysaloon.uz",
        description: "Средняя длина волос — популярные мужские и женские модели.",
        h1: "Стрижки средней длины",
        intro: "Слои, wolf cut и текстурные crop.",
        keywords: "средняя длина, стрижка",
      },
      en: {
        title: "Medium-length haircuts | mysaloon.uz",
        description: "Medium-length men's and women's styles in the catalog.",
        h1: "Medium-length haircuts",
        intro: "Layers, wolf cuts, and textured crops.",
        keywords: "medium haircut, layered",
      },
    },
  },
  {
    id: "long-haircuts",
    uzPath: "/explore/category/long-haircuts",
    minStyles: 3,
    match: (r) => r.hair_length === "long",
    priority: 0.64,
    copy: {
      uz: {
        title: "Uzun soch turmaklari | mysaloon.uz",
        description: "Uzun soch uchun erkak va ayol uslublari — curly flow, long layers.",
        h1: "Uzun soch turmaklari",
        intro: "Uzun modellarni katalogdan ko‘ring va Morf AI da sinab ko‘ring.",
        keywords: "uzun soch turmagi, long hair men women",
      },
      ru: {
        title: "Длинные стрижки и укладки | mysaloon.uz",
        description: "Длинные причёски для мужчин и женщин в каталоге.",
        h1: "Длинные стрижки",
        intro: "Длинные модели с виртуальной примеркой.",
        keywords: "длинные волосы, стрижка",
      },
      en: {
        title: "Long hairstyles | mysaloon.uz",
        description: "Long men's and women's hairstyles in the MySaloon catalog.",
        h1: "Long hairstyles",
        intro: "Long-length styles with Morf AI preview.",
        keywords: "long hairstyle, layers",
      },
    },
  },
  {
    id: "curly-hairstyles",
    uzPath: "/explore/category/curly-hairstyles",
    minStyles: 3,
    match: (r) => slugOrTags(r, /curly|curl|afro|jingalak/i),
    priority: 0.67,
    copy: {
      uz: {
        title: "Jingalak soch turmaklari | mysaloon.uz",
        description: "Jingalak va to‘lqinli sochlar uchun erkak va ayol uslublari.",
        h1: "Jingalak soch turmaklari",
        intro: "Curly fade, wolf cut va tabiiy jingalak uslublar.",
        keywords: "jingalak soch, curly haircut, curly fade",
      },
      ru: {
        title: "Стрижки для кудрявых волос | mysaloon.uz",
        description: "Кудрявые и волнистые укладки в каталоге MySaloon.",
        h1: "Кудрявые причёски",
        intro: "Fade, wolf cut и натуральные кудри.",
        keywords: "кудрявые волосы, curly fade",
      },
      en: {
        title: "Curly hairstyles | mysaloon.uz",
        description: "Curly and wavy haircuts for men and women.",
        h1: "Curly hairstyles",
        intro: "Curly fades, wolf cuts, and natural texture styles.",
        keywords: "curly haircut, wavy hair",
      },
    },
  },
  {
    id: "fade-haircuts",
    uzPath: "/explore/category/fade-haircuts",
    minStyles: 3,
    match: (r) => slugOrTags(r, /fade|taper|skin-fade/i),
    priority: 0.7,
    copy: {
      uz: {
        title: "Fade soch turmaklari | mysaloon.uz",
        description: "Low, mid va high fade — barber katalogidagi eng mashhur erkak uslublari.",
        h1: "Fade soch turmaklari",
        intro: "Skin fade, drop fade va taper uslublarini sinab ko‘ring.",
        keywords: "fade, low fade, mid fade, high fade, taper",
      },
      ru: {
        title: "Fade стрижки | mysaloon.uz",
        description: "Low, mid и high fade в каталоге барбер-стилей.",
        h1: "Fade стрижки",
        intro: "Skin fade, drop fade и taper.",
        keywords: "fade стрижка, taper fade",
      },
      en: {
        title: "Fade haircuts | mysaloon.uz",
        description: "Low, mid, and high fade barber styles in the catalog.",
        h1: "Fade haircuts",
        intro: "Skin fade, drop fade, and taper cuts.",
        keywords: "fade haircut, taper fade, skin fade",
      },
    },
  },
  {
    id: "classic-hairstyles",
    uzPath: "/explore/category/classic-hairstyles",
    minStyles: 3,
    match: (r) =>
      slugOrTags(r, /classic|side-part|slick|ivy|pompadour|caesar|taper-cut/i) &&
      !slugOrTags(r, /modern-mullet|wolf/i),
    priority: 0.62,
    copy: {
      uz: {
        title: "Klassik soch turmaklari | mysaloon.uz",
        description: "Slick back, side part, pompadour va boshqa klassik erkak uslublari.",
        h1: "Klassik soch turmaklari",
        intro: "Vaqt sinovidan o‘tgan klassik turmaklar.",
        keywords: "klassik soch turmagi, slick back, side part",
      },
      ru: {
        title: "Классические стрижки | mysaloon.uz",
        description: "Классические мужские стрижки: side part, slick back, pompadour.",
        h1: "Классические стрижки",
        intro: "Проверенные классические модели.",
        keywords: "классическая стрижка, side part",
      },
      en: {
        title: "Classic hairstyles | mysaloon.uz",
        description: "Classic men's cuts: slick back, side part, pompadour.",
        h1: "Classic hairstyles",
        intro: "Timeless classic barber styles.",
        keywords: "classic haircut, slick back",
      },
    },
  },
  {
    id: "modern-hairstyles",
    uzPath: "/explore/category/modern-hairstyles",
    minStyles: 3,
    match: (r) => slugOrTags(r, /textured|crop|fringe|quiff|mullet|wolf|two-block|disconnected/i),
    priority: 0.65,
    copy: {
      uz: {
        title: "Zamonaviy soch turmaklari | mysaloon.uz",
        description: "Textured crop, wolf cut, French crop va boshqa trend uslublar.",
        h1: "Zamonaviy soch turmaklari",
        intro: "Trend barber va beauty uslublarini katalogdan tanlang.",
        keywords: "zamonaviy soch turmagi, textured crop, wolf cut",
      },
      ru: {
        title: "Современные стрижки | mysaloon.uz",
        description: "Textured crop, wolf cut и другие трендовые модели.",
        h1: "Современные стрижки",
        intro: "Трендовые стрижки с try-on.",
        keywords: "современная стрижка, textured crop",
      },
      en: {
        title: "Modern hairstyles | mysaloon.uz",
        description: "Textured crop, wolf cut, and trending catalog styles.",
        h1: "Modern hairstyles",
        intro: "Trending cuts with Morf AI preview.",
        keywords: "modern haircut, textured crop, wolf cut",
      },
    },
  },
];

export function resolveExploreCategoryPath(pathname: string): ExploreCategoryDef | null {
  const norm = pathname.replace(/\/+$/, "") || "/";
  return EXPLORE_CATEGORIES.find((c) => c.uzPath === norm) ?? null;
}

export function indexableCategories(rows: HairstyleSeoSource[]): ExploreCategoryDef[] {
  return EXPLORE_CATEGORIES.filter((cat) => rows.filter(cat.match).length >= cat.minStyles);
}
