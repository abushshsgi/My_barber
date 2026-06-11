import type { FaceShapeKey, HairTypeKey } from "@/components/ai-style/ai-style-shared";
import type { Audience, Category } from "@/lib/mock-data";
import type { AudienceFilter } from "@/hooks/use-audience";
import { matchAudience } from "@/hooks/use-audience";

export type HairstyleEntry = {
  id: string;
  slug: string;
  title: string;
  titleUz: string;
  audience: Audience;
  category: Category;
  faceShapes: FaceShapeKey[];
  hairLength: HairTypeKey;
  imageUrl: string;
  descriptionUz: string;
  tags: string[];
};

type StyleDef = {
  slug: string;
  title: string;
  titleUz: string;
  faceShapes: FaceShapeKey[];
  hairLength: HairTypeKey;
  descriptionUz: string;
  tags: string[];
};

const MEN_STYLES: StyleDef[] = [
  {
    slug: "mid-fade",
    title: "Mid Fade",
    titleUz: "Mid Fade",
    faceShapes: ["oval", "square", "round"],
    hairLength: "short",
    descriptionUz: "O'rta balandlikdagi fade — yuz konturini yumshatadi, zamonaviy va toza ko'rinish.",
    tags: ["fade", "modern", "barber"],
  },
  {
    slug: "low-fade",
    title: "Low Fade",
    titleUz: "Low Fade",
    faceShapes: ["oval", "square"],
    hairLength: "short",
    descriptionUz: "Past fade — tabiiy o'tish, kundalik parvarish oson.",
    tags: ["fade", "classic"],
  },
  {
    slug: "skin-fade",
    title: "Skin Fade",
    titleUz: "Skin Fade",
    faceShapes: ["oval", "square"],
    hairLength: "short",
    descriptionUz: "Zero fade — keskin siluet, jasur va zamonaviy uslub.",
    tags: ["fade", "bold"],
  },
  {
    slug: "buzz-cut",
    title: "Buzz Cut",
    titleUz: "Buzz Cut",
    faceShapes: ["oval", "square", "round"],
    hairLength: "short",
    descriptionUz: "Qisqa va amaliy — minimal parvarish, sportiv ko'rinish.",
    tags: ["short", "minimal"],
  },
  {
    slug: "textured-crop",
    title: "Textured Crop",
    titleUz: "Textured Crop",
    faceShapes: ["oval", "round"],
    hairLength: "short",
    descriptionUz: "Teksturali crop — hajm tepada, yonlar qisqa, yosh va zamonaviy.",
    tags: ["crop", "textured", "modern"],
  },
  {
    slug: "pompadour",
    title: "Pompadour",
    titleUz: "Pompadour",
    faceShapes: ["oval", "square"],
    hairLength: "medium",
    descriptionUz: "Tepada hajm — klassik va nafis, burchak yuz uchun ajoyib balans.",
    tags: ["volume", "classic"],
  },
  {
    slug: "undercut",
    title: "Undercut",
    titleUz: "Undercut",
    faceShapes: ["oval", "square"],
    hairLength: "medium",
    descriptionUz: "Yonlar qisqa, tepa uzunroq — kontrastli zamonaviy uslub.",
    tags: ["undercut", "contrast"],
  },
  {
    slug: "side-part",
    title: "Classic Side Part",
    titleUz: "Klassik side part",
    faceShapes: ["oval", "square", "round"],
    hairLength: "short",
    descriptionUz: "Klassik yon chiziq — doimiy trend, rasmiy va kundalik uchun mos.",
    tags: ["classic", "neat"],
  },
  {
    slug: "french-crop",
    title: "French Crop",
    titleUz: "French Crop",
    faceShapes: ["oval", "round", "square"],
    hairLength: "short",
    descriptionUz: "Qisqa old chiziq — yosh ko'rinish, oson ushlash.",
    tags: ["crop", "fringe"],
  },
  {
    slug: "slick-back",
    title: "Slick Back",
    titleUz: "Slick Back",
    faceShapes: ["oval", "square"],
    hairLength: "medium",
    descriptionUz: "Orqaga taralgan soch — nafis va ishonchli ko'rinish.",
    tags: ["slick", "formal"],
  },
  {
    slug: "curly-top-fade",
    title: "Curly Top Fade",
    titleUz: "Curly Top Fade",
    faceShapes: ["oval", "round"],
    hairLength: "medium",
    descriptionUz: "Tepada jingalak soch + fade yonlar — tabiiy hajm va struktura.",
    tags: ["curly", "fade"],
  },
  {
    slug: "modern-mullet",
    title: "Modern Mullet",
    titleUz: "Modern Mullet",
    faceShapes: ["oval", "square"],
    hairLength: "long",
    descriptionUz: "Zamonaviy mullet — old qisqa, orqa uzunroq, trend uslub.",
    tags: ["mullet", "trend"],
  },
];

const WOMEN_STYLES: StyleDef[] = [
  {
    slug: "soft-bob",
    title: "Soft Bob",
    titleUz: "Soft Bob",
    faceShapes: ["oval", "round", "square"],
    hairLength: "medium",
    descriptionUz: "Yumshoq bob — yuz ramkasini chiroyli beradi, har qanday vaziyatga mos.",
    tags: ["bob", "soft"],
  },
  {
    slug: "long-layers",
    title: "Long Layers",
    titleUz: "Uzun qatlamlar",
    faceShapes: ["oval", "round"],
    hairLength: "long",
    descriptionUz: "Uzun qatlamlar — hajm va harakat, yuzni uzaytiradi.",
    tags: ["layers", "long"],
  },
  {
    slug: "balayage",
    title: "Balayage",
    titleUz: "Balayage",
    faceShapes: ["oval", "square", "round"],
    hairLength: "long",
    descriptionUz: "Tabiiy rang o'tishlari — yorug'lik va chuqurlik muvozanati.",
    tags: ["color", "balayage"],
  },
  {
    slug: "pixie-cut",
    title: "Pixie Cut",
    titleUz: "Pixie Cut",
    faceShapes: ["oval", "square"],
    hairLength: "short",
    descriptionUz: "Qisqa pixie — jasur va zamonaviy, yuz xususiyatlarini ta'kidlaydi.",
    tags: ["short", "pixie"],
  },
  {
    slug: "beach-waves",
    title: "Beach Waves",
    titleUz: "Beach Waves",
    faceShapes: ["oval", "round"],
    hairLength: "medium",
    descriptionUz: "Tabiiy to'lqinlar — yengil va romantik ko'rinish.",
    tags: ["waves", "casual"],
  },
  {
    slug: "straight-lob",
    title: "Straight Lob",
    titleUz: "Straight Lob",
    faceShapes: ["oval", "round", "square"],
    hairLength: "medium",
    descriptionUz: "To'g'ri lob — zamonaviy va silliq, yuz shaklini muvozanatlaydi.",
    tags: ["lob", "straight"],
  },
  {
    slug: "curtain-bangs",
    title: "Curtain Bangs",
    titleUz: "Curtain Bangs",
    faceShapes: ["oval", "round", "square"],
    hairLength: "medium",
    descriptionUz: "Parda bang — yuzni yumshatadi, trend va universal uslub.",
    tags: ["bangs", "trend"],
  },
  {
    slug: "shag-cut",
    title: "Shag Cut",
    titleUz: "Shag Cut",
    faceShapes: ["oval", "round"],
    hairLength: "medium",
    descriptionUz: "Qatlamlangan shag — hajm va tekstura, 70-yillar zamonaviy talqini.",
    tags: ["shag", "layers"],
  },
  {
    slug: "braids",
    title: "Braids",
    titleUz: "O'rilmalar",
    faceShapes: ["oval", "square", "round"],
    hairLength: "long",
    descriptionUz: "O'rilmalar — amaliy va nafis, maxsus kunlar uchun ajoyib tanlov.",
    tags: ["braids", "styled"],
  },
  {
    slug: "updo-bun",
    title: "Updo Bun",
    titleUz: "Updo / Bun",
    faceShapes: ["oval", "square", "round"],
    hairLength: "medium",
    descriptionUz: "Yig'ilgan soch — toza va nafis, bayram va rasmiy tadbirlar uchun.",
    tags: ["updo", "elegant"],
  },
  {
    slug: "blunt-cut",
    title: "Blunt Cut",
    titleUz: "Blunt Cut",
    faceShapes: ["oval", "round"],
    hairLength: "medium",
    descriptionUz: "To'g'ri kesim — aniq chegaralar, zamonaviy minimalist ko'rinish.",
    tags: ["blunt", "clean"],
  },
  {
    slug: "highlights",
    title: "Highlights",
    titleUz: "Highlights",
    faceShapes: ["oval", "square", "round"],
    hairLength: "medium",
    descriptionUz: "Yorug'lik streaklari — yuzni yoritadi, hajm illuziyasi beradi.",
    tags: ["color", "highlights"],
  },
];

function buildEntry(audience: "men" | "women", def: StyleDef): HairstyleEntry {
  const category: Category = audience === "men" ? "barber" : "beauty";
  return {
    id: `${audience}-${def.slug}`,
    slug: def.slug,
    title: def.title,
    titleUz: def.titleUz,
    audience,
    category,
    faceShapes: def.faceShapes,
    hairLength: def.hairLength,
    imageUrl: `/hairstyles/${audience}/${def.slug}.webp`,
    descriptionUz: def.descriptionUz,
    tags: def.tags,
  };
}

export const HAIRSTYLE_CATALOG: HairstyleEntry[] = [
  ...MEN_STYLES.map((s) => buildEntry("men", s)),
  ...WOMEN_STYLES.map((s) => buildEntry("women", s)),
];

export function getHairstyleById(id: string): HairstyleEntry | undefined {
  return HAIRSTYLE_CATALOG.find((e) => e.id === id);
}

export function listHairstyles(audience?: AudienceFilter): HairstyleEntry[] {
  if (!audience || audience === "all") return HAIRSTYLE_CATALOG;
  return HAIRSTYLE_CATALOG.filter((e) => matchAudience(e.audience, audience));
}

export function getHairstyleImageUrl(entry: HairstyleEntry): string {
  return entry.imageUrl;
}

/** Home / legacy mock-data bilan moslik */
export function toTrendingStyle(entry: HairstyleEntry) {
  return {
    id: entry.id,
    title: entry.titleUz,
    audience: entry.audience,
    category: entry.category,
    seed: entry.slug,
    imageUrl: entry.imageUrl,
  };
}

export type TrendingHairstyle = ReturnType<typeof toTrendingStyle>;
