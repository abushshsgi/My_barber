import { PixelRatio, useWindowDimensions } from "react-native";

export const H_PAD = 16;
export const CARD_GAP = 12;

/** Banner aspect — web home bilan bir xil. */
export const BANNER_ASPECT = 2.15;

/** Salon / usta cover — 4:3. */
export const CARD_MEDIA_ASPECT = 4 / 3;

/** Web: `min(88vw, 22rem)` ≈ ekranning ~78–88%. */
export function listingCardWidth(windowWidth: number): number {
  const ideal = Math.min(windowWidth * 0.78, 352);
  const minW = 240;
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

export function useHomeLayout() {
  const { width, height } = useWindowDimensions();
  const bannerW = bannerWidth(width);
  const cardW = listingCardWidth(width);
  return {
    windowWidth: width,
    windowHeight: height,
    bannerW,
    bannerH: bannerW / BANNER_ASPECT,
    cardW,
    cardGap: CARD_GAP,
    hPad: H_PAD,
    bannerImageW: imageRequestWidth(bannerW),
    cardImageW: imageRequestWidth(cardW),
  };
}
