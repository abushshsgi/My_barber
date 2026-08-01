import type { TFunction } from "i18next";

/** Morf AI brend konstantalari — story, modal va share matnlari uchun yagona manba. */
export const MORF_AI_INSTAGRAM = "@morf.ai";
export const MORF_AI_INSTAGRAM_URL = "https://instagram.com/morf.ai";
export const MORF_AI_SITE = "mysaloon.uz";
export const MORF_AI_TELEGRAM = "@morfai";

/** Telegram share URL (opens TG share sheet with text + link). */
export function buildTelegramShareUrl(url: string, text: string): string {
  const params = new URLSearchParams({ url, text });
  return `https://t.me/share/url?${params.toString()}`;
}

/** Ism o‘rniga qo‘yiladigan generik qiymatlar — sarlavhaga tushmasin. */
const GENERIC_NAMES = new Set(["foydalanuvchi", "user", "пользователь", "do‘stingiz", "dostingiz"]);

/**
 * Story sarlavhasi uchun toza ism — bo‘sh yoki generik bo‘lsa "" qaytadi.
 */
export function resolveSharerFirstName(raw?: string | null): string {
  const value = (raw || "").trim();
  if (!value) return "";
  if (GENERIC_NAMES.has(value.toLowerCase())) return "";
  const first = value.split(/\s+/)[0] || "";
  if (GENERIC_NAMES.has(first.toLowerCase())) return "";
  return first.length > 18 ? first.slice(0, 18) : first;
}

/** Rotating viral share lines — history + generation share. */
const SHARE_TEXT_KEYS = [
  "aiStylePage.shareLook.shareText",
  "aiStylePage.shareLook.shareTextAlt1",
  "aiStylePage.shareLook.shareTextAlt2",
  "aiStylePage.shareLook.shareTextAlt3",
  "aiStylePage.shareLook.shareTextAlt4",
  "aiStylePage.shareLook.shareTextAlt5",
] as const;

const SHARE_TEXT_FALLBACKS_UZ = [
  "{{style}} — Morf AI da sinab ko‘rdim. Sen ham sinab ko‘r!",
  "{{style}} — yangi lookim! Morf AI da 10 soniyada chiqardi.",
  "Morf AI: {{style}} o‘zimda sinab ko‘rdim. Natija zo‘r — sen ham urinib ko‘r!",
  "{{style}} — do‘stlarim so‘rashyapti. Morf AI da o‘zingda sinab ko‘r!",
  "Selfie + Morf AI = {{style}}. Haqiqiy natija, hoziroq sinab ko‘r!",
  "{{style}} menga yarashdi. Morf AI da seniki qanday chiqadi?",
] as const;

export function pickMorphShareText(t: TFunction, vars: { style: string; name?: string }): string {
  const index = Math.floor(Math.random() * SHARE_TEXT_KEYS.length);
  const key = SHARE_TEXT_KEYS[index]!;
  const fallback = SHARE_TEXT_FALLBACKS_UZ[index] ?? SHARE_TEXT_FALLBACKS_UZ[0]!;
  return t(key, {
    style: vars.style,
    name: vars.name || "",
    defaultValue: fallback,
  });
}

/** Ismli sarlavha variantlari — har ulashishda story boshqacha ko‘rinadi. */
const STORY_HEADLINE_NAMED = [
  { key: "aiStylePage.instagramStory.headlineNamed", fallback: "{{name}} yangi obrazda" },
  {
    key: "aiStylePage.instagramStory.headlineNamedAlt1",
    fallback: "{{name}} sochini yangiladi",
  },
  {
    key: "aiStylePage.instagramStory.headlineNamedAlt2",
    fallback: "{{name}}ning yangi soch stili",
  },
] as const;

const STORY_HEADLINE_ANON = [
  { key: "aiStylePage.instagramStory.headline", fallback: "Yangi obraz — 10 soniyada" },
  { key: "aiStylePage.instagramStory.headlineAlt1", fallback: "Yangi soch stili tayyor" },
] as const;

function pickVariant<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)] ?? list[0]!;
}

/** Story rasmidagi sarlavha — ism bo‘lsa shaxsiy, bo‘lmasa umumiy. */
export function buildStoryHeadline(t: TFunction, vars: { name?: string; style?: string }): string {
  const name = resolveSharerFirstName(vars.name);
  if (name) {
    const variant = pickVariant(STORY_HEADLINE_NAMED);
    return t(variant.key, { name, defaultValue: variant.fallback });
  }
  const variant = pickVariant(STORY_HEADLINE_ANON);
  return t(variant.key, { defaultValue: variant.fallback });
}

/** Story rasmidagi kichik matn — uslub nomi + «Morf AI bilan yaratildi». */
export function buildStorySubline(t: TFunction, style?: string): string {
  const title = (style || "").trim();
  if (title) {
    return t("aiStylePage.instagramStory.sublineStyled", {
      style: title,
      defaultValue: "{{style}} · Morf AI bilan yaratildi",
    });
  }
  return t("aiStylePage.instagramStory.subline", {
    defaultValue: "Morf AI bilan yaratildi",
  });
}

/** Story pastidagi CTA — sayt manzili bilan. */
export function buildStoryCta(t: TFunction): string {
  return t("aiStylePage.instagramStory.storyCtaSite", {
    site: MORF_AI_SITE,
    defaultValue: "O‘zingizda sinab ko‘ring · {{site}}",
  });
}

/** Story sarlavhasi ustidagi qisqa hook. */
export function buildStoryEyebrow(t: TFunction): string {
  return t("aiStylePage.instagramStory.storyEyebrow", {
    defaultValue: "Selfiedan 10 soniyada",
  });
}

/** @morf.ai stikerini qo‘yish uchun ko‘rsatma. */
export function buildStoryMentionHint(t: TFunction): string {
  return t("aiStylePage.instagramStory.mentionHint", {
    defaultValue: "bu yerga belgilang",
  });
}
