import { PixelRatio, useWindowDimensions } from "react-native";

export const H_PAD = 16;
export const CARD_GAP = 12;

/** Banner aspect — web home bilan bir xil. */
export const BANNER_ASPECT = 2.15;

/** Salon / usta cover — 4:3. */
export const CARD_MEDIA_ASPECT = 4 / 3;

/** Web: `min(88vw, 22rem)` ≈ ekranning ~78–88%. */
export function listingCardWidth(windowWidth: number): number {
  const ideal = Math.min(windowWidth * 0.72, 300);
  const minW = Math.min(200, windowWidth * 0.55);
  return Math.max(minW, Math.round(ideal));
}

export function bannerWidth(windowWidth: number): number {
  return Math.max(0, windowWidth - H_PAD * 2);
}

/** Yuklash uchun physical pixel kengligi (2x/3x). */
export function imageRequestWidth(layoutWidth: number, max = 1600): number {
  const px = Math.ceil(layoutWidth * PixelRatio.get());
  const stepped = Math.ceil(px / 100) * 100;
  return Math.min(Math.max(stepped, 320), max);
}

/**
 * Matn o‘lchami — kichik telefonlarda biroz mayda, katta ekranda ortiqcha o‘smaydi.
 * Base 390pt (iPhone 14) ga nisbatan; umumiy 8% kichikroq.
 */
export function scaleFont(size: number, windowWidth?: number): number {
  const w = windowWidth ?? 390;
  const scale = Math.min(Math.max(w / 390, 0.82), 1.02);
  return Math.max(10, Math.round(size * scale * 0.92));
}

export function useHomeLayout() {
  const { width, height } = useWindowDimensions();
  const bannerW = bannerWidth(width);
  const cardW = listingCardWidth(width);
  const fs = (n: number) => scaleFont(n, width);
  return {
    windowWidth: width,
    windowHeight: height,
    bannerW,
    bannerH: Math.min(bannerW / BANNER_ASPECT, height * 0.22),
    cardW,
    cardGap: CARD_GAP,
    hPad: H_PAD,
    bannerImageW: imageRequestWidth(bannerW),
    cardImageW: imageRequestWidth(cardW),
    fs,
    isCompact: width < 360,
  };
}
