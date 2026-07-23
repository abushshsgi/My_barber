import type { TFunction } from "i18next";

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

export function pickMorphShareText(
  t: TFunction,
  vars: { style: string; name?: string },
): string {
  const index = Math.floor(Math.random() * SHARE_TEXT_KEYS.length);
  const key = SHARE_TEXT_KEYS[index]!;
  const fallback = SHARE_TEXT_FALLBACKS_UZ[index] ?? SHARE_TEXT_FALLBACKS_UZ[0]!;
  return t(key, {
    style: vars.style,
    name: vars.name || "",
    defaultValue: fallback,
  });
}
