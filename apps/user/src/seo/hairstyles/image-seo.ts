import { SITE_ORIGIN } from "../constants";
import type { SeoLocale } from "../constants";

export type HairstyleSeoSource = {
  id: string;
  slug: string;
  title: string;
  title_uz?: string;
  audience: "men" | "women";
  hair_length: "short" | "medium" | "long";
  image_url?: string;
  description_uz?: string;
  tags?: string[];
};

export type HairstyleImageSeo = {
  filename: string;
  imageUrl: string;
  width: number;
  height: number;
  alt: Record<SeoLocale, string>;
  caption: Record<SeoLocale, string>;
  description: Record<SeoLocale, string>;
  pageTitle: Record<SeoLocale, string>;
  metaDescription: Record<SeoLocale, string>;
  modelName: string;
};

const IMAGE_WIDTH = 768;
const IMAGE_HEIGHT = 1024;

type OverrideCopy = Partial<{
  altUz: string;
  altRu: string;
  altEn: string;
  captionUz: string;
  captionRu: string;
  captionEn: string;
}>;

/** Slug bo‘yicha qo‘lda yozilgan, noyob ALT/caption (qolganlari shablon bilan). */
const STYLE_OVERRIDES: Record<string, OverrideCopy> = {
  "textured-crop": {
    altUz: "Textured Crop — teksturali qisqa erkaklar soch turmagi.",
    altRu: "Мужская стрижка Textured Crop с текстурированными короткими волосами.",
    altEn: "Textured Crop men's haircut with short textured hair.",
    captionUz: "Textured Crop — zamonaviy tekstura va qisqa uzunlik.",
    captionRu: "Textured Crop — современная текстура и короткая длина.",
    captionEn: "Textured Crop — modern texture with a short length.",
  },
  "low-fade": {
    altUz: "Low Taper Fade — past fade bilan qisqa erkaklar soch turmagi.",
    altRu: "Низкий fade (low taper) — короткая мужская стрижка с плавным переходом.",
    altEn: "Low fade men's haircut with a subtle taper at the sides.",
    captionUz: "Low fade — yonlar yumshoq o‘tish bilan toza kontur.",
    captionRu: "Low fade — аккуратный контур с мягким переходом по бокам.",
    captionEn: "Low fade — clean contour with a soft side taper.",
  },
  "french-crop": {
    altUz: "French Crop — qisqa ponyak va teksturali erkaklar soch turmagi.",
    altRu: "French Crop — короткая мужская стрижка с текстурной чёлкой.",
    altEn: "French Crop men's haircut with a short textured fringe.",
    captionUz: "French Crop — oldingi qisqa qirqilgan ponyak va tekstura.",
    captionRu: "French Crop — короткая чёлка и текстура на макушке.",
    captionEn: "French Crop — short forward fringe with textured top.",
  },
  "mid-fade": {
    altUz: "Mid Fade — o‘rta balandlikdagi fade bilan erkaklar soch turmagi.",
    altRu: "Mid Fade — мужская стрижка со средним fade по бокам.",
    altEn: "Mid fade men's haircut with a mid-level side transition.",
  },
  "buzz-cut": {
    altUz: "Buzz Cut — juda qisqa erkaklar soch turmagi.",
    altRu: "Buzz Cut — очень короткая мужская стрижка.",
    altEn: "Buzz Cut — ultra-short men's haircut.",
  },
  "pixie-cut": {
    altUz: "Pixie Cut — qisqa ayollar soch turmagi.",
    altRu: "Pixie Cut — короткая женская стрижка.",
    altEn: "Pixie Cut — short women's haircut.",
  },
  balayage: {
    altUz: "Balayage — tabiiy rang o‘tishi bilan ayollar soch uslubi.",
    altRu: "Balayage — женское окрашивание с плавным переходом цвета.",
    altEn: "Balayage women's hairstyle with natural color depth.",
  },
};

function absoluteCatalogImageUrl(imageUrl: string | undefined): string {
  const raw = imageUrl?.trim() ?? "";
  if (!raw) return `${SITE_ORIGIN}/brand-logo.png`;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    const catalog = raw.match(/^https?:\/\/[^/]+\/(hairstyles\/(?:men|women)\/.+)$/i);
    if (catalog) return `${SITE_ORIGIN}/${catalog[1]}`;
    const mediaCatalog = raw.match(/^https?:\/\/[^/]+\/media\/(hairstyles\/(?:men|women)\/.+)$/i);
    if (mediaCatalog) return `${SITE_ORIGIN}/${mediaCatalog[1]}`;
    return raw;
  }
  if (raw.startsWith("/hairstyles/")) return `${SITE_ORIGIN}${raw}`;
  if (raw.startsWith("/media/hairstyles/")) return `${SITE_ORIGIN}${raw.replace(/^\/media/, "")}`;
  if (raw.startsWith("/")) return `${SITE_ORIGIN}${raw}`;
  return `${SITE_ORIGIN}/${raw.replace(/^\/+/, "")}`;
}

export function seoImageFilename(slug: string, audience: "men" | "women"): string {
  const aud = audience === "men" ? "mens" : "womens";
  return `${slug}-${aud}-hairstyle.webp`;
}

function tagTexturePhrase(tags: string[], slug: string, locale: SeoLocale): string {
  const hay = `${slug} ${tags.join(" ")}`.toLowerCase();
  const curly = /curly|curl|jingalak|afro|shag/.test(hay);
  const fade = /fade|taper|skin-fade|undercut/.test(hay);
  const textured = /textured|messy|quiff|crop|fringe|layers/.test(hay);
  const classic = /classic|side-part|slick|ivy|pompadour|caesar/.test(hay);
  if (locale === "uz") {
    if (curly) return "jingalak";
    if (fade) return "fade";
    if (textured) return "teksturali";
    if (classic) return "klassik";
    return "zamonaviy";
  }
  if (locale === "ru") {
    if (curly) return "кудрявая";
    if (fade) return "fade";
    if (textured) return "текстурная";
    if (classic) return "классическая";
    return "современная";
  }
  if (curly) return "curly";
  if (fade) return "fade";
  if (textured) return "textured";
  if (classic) return "classic";
  return "modern";
}

function lengthPhrase(length: string, locale: SeoLocale): string {
  if (locale === "uz") {
    if (length === "short") return "qisqa";
    if (length === "long") return "uzun";
    return "o‘rta uzunlikdagi";
  }
  if (locale === "ru") {
    if (length === "short") return "короткая";
    if (length === "long") return "длинная";
    return "средняя";
  }
  if (length === "short") return "short";
  if (length === "long") return "long";
  return "medium-length";
}

function audiencePhrase(audience: "men" | "women", locale: SeoLocale): string {
  if (locale === "uz") return audience === "men" ? "erkaklar" : "ayollar";
  if (locale === "ru") return audience === "men" ? "мужская" : "женская";
  return audience === "men" ? "men's" : "women's";
}

function displayTitle(row: HairstyleSeoSource, locale: SeoLocale): string {
  if (locale === "uz") return (row.title_uz ?? row.title).trim();
  return row.title.trim();
}

function buildAlt(row: HairstyleSeoSource, locale: SeoLocale): string {
  const override = STYLE_OVERRIDES[row.slug];
  if (locale === "uz" && override?.altUz) return override.altUz;
  if (locale === "ru" && override?.altRu) return override.altRu;
  if (locale === "en" && override?.altEn) return override.altEn;

  const title = displayTitle(row, locale);
  const tags = row.tags ?? [];
  const texture = tagTexturePhrase(tags, row.slug, locale);
  const length = lengthPhrase(row.hair_length, locale);
  const aud = audiencePhrase(row.audience, locale);

  if (locale === "uz") {
    return `${title} — ${texture} ${length} ${aud} soch turmagi.`;
  }
  if (locale === "ru") {
    return `${length.charAt(0).toUpperCase() + length.slice(1)} ${aud} стрижка ${title} (${texture}).`;
  }
  return `${title} ${aud} haircut, ${length} ${texture} hair.`;
}

function buildCaption(row: HairstyleSeoSource, locale: SeoLocale): string {
  const override = STYLE_OVERRIDES[row.slug];
  if (locale === "uz" && override?.captionUz) return override.captionUz;
  if (locale === "ru" && override?.captionRu) return override.captionRu;
  if (locale === "en" && override?.captionEn) return override.captionEn;

  const title = displayTitle(row, locale);
  const desc = row.description_uz?.trim();
  if (locale === "uz" && desc)
    return `${title} — ${desc.split(/[.!?]/)[0]?.trim() ?? desc}`.slice(0, 220);
  if (locale === "ru") {
    return `${title} — виртуально примерьте в Morf AI на mysaloon.uz.`;
  }
  return `${title} — preview this cut with Morf AI try-on on mysaloon.uz.`;
}

function buildMetaDescription(row: HairstyleSeoSource, locale: SeoLocale): string {
  const title = displayTitle(row, locale);
  const length = lengthPhrase(row.hair_length, locale);
  const aud = audiencePhrase(row.audience, locale);
  if (locale === "uz") {
    const base =
      row.description_uz?.trim() ||
      `${title} haqiqiy ko‘rinishi, ${length} ${aud} soch uslubi. Morf AI bilan virtual sinab ko‘ring.`;
    return base.length <= 160 ? base : `${base.slice(0, 157)}…`;
  }
  if (locale === "ru") {
    const base = `${title}: ${length} ${aud} стрижка. Примерьте на селфи в Morf AI.`;
    return base.length <= 160 ? base : `${base.slice(0, 157)}…`;
  }
  const base = `${title}: ${length} ${aud} hairstyle. Try it on your selfie with Morf AI.`;
  return base.length <= 160 ? base : `${base.slice(0, 157)}…`;
}

function buildPageTitle(row: HairstyleSeoSource, locale: SeoLocale): string {
  const title = displayTitle(row, locale);
  if (locale === "uz") return `${title} — soch uslubi | Morf AI | mysaloon.uz`;
  if (locale === "ru") return `${title} — стрижка | Morf AI | mysaloon.uz`;
  return `${title} — hairstyle | Morf AI | mysaloon.uz`;
}

export function buildHairstyleImageSeo(row: HairstyleSeoSource): HairstyleImageSeo {
  const imageUrl = absoluteCatalogImageUrl(row.image_url);
  return {
    filename: seoImageFilename(row.slug, row.audience),
    imageUrl,
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    alt: {
      uz: buildAlt(row, "uz"),
      ru: buildAlt(row, "ru"),
      en: buildAlt(row, "en"),
    },
    caption: {
      uz: buildCaption(row, "uz"),
      ru: buildCaption(row, "ru"),
      en: buildCaption(row, "en"),
    },
    description: {
      uz: row.description_uz?.trim() || buildCaption(row, "uz"),
      ru: buildCaption(row, "ru"),
      en: buildCaption(row, "en"),
    },
    pageTitle: {
      uz: buildPageTitle(row, "uz"),
      ru: buildPageTitle(row, "ru"),
      en: buildPageTitle(row, "en"),
    },
    metaDescription: {
      uz: buildMetaDescription(row, "uz"),
      ru: buildMetaDescription(row, "ru"),
      en: buildMetaDescription(row, "en"),
    },
    modelName: displayTitle(row, "uz"),
  };
}

export function hairstylePassesSitemapGate(row: HairstyleSeoSource): boolean {
  const id = row.id?.trim() || row.slug?.trim();
  if (!id) return false;
  const hasImage = Boolean(row.image_url?.trim());
  const hasDesc = Boolean(row.description_uz?.trim());
  const hasTags = Boolean(row.tags?.length);
  return hasImage && (hasDesc || hasTags);
}
