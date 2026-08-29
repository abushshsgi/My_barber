import { PixelRatio } from "react-native";
import {
  BASE_WIDTH,
  IS_SMALL_DEVICE,
  clamp,
  fontSize,
  moderateScale,
  scale,
  useResponsive,
  verticalScale,
} from "../utils/responsive";

export const H_PAD = scale(16);
export const CARD_GAP = moderateScale(12);

/** Banner aspect — web home bilan bir xil. */
export const BANNER_ASPECT = 2.15;

/** Salon / usta cover — 4:3. */
export const CARD_MEDIA_ASPECT = 4 / 3;

/** `ListingCard` matn bloki (sarlavha + meta + narx) balandligi. */
export const CARD_BODY_HEIGHT = verticalScale(IS_SMALL_DEVICE ? 58 : 64);

/**
 * Home dagi chrome elementlarining taxminiy balandliklari — ikki qatorli
 * karta zonasi uchun qolgan joyni hisoblashda ishlatiladi.
 */
const HOME_CHROME = {
  header: verticalScale(60),
  categories: verticalScale(46),
  sectionHeader: verticalScale(36),
  gaps: verticalScale(IS_SMALL_DEVICE ? 24 : 40),
} as const;

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
 * Umumiy 8% kichikroq — Home dagi zich tipografiya uchun.
 * `windowWidth` berilsa (orientatsiya o‘zgarishi) shu kenglikka moslashadi.
 */
export function scaleFont(size: number, windowWidth?: number): number {
  if (windowWidth == null) return Math.max(10, Math.round(fontSize(size) * 0.92));
  const factor = clamp(windowWidth / BASE_WIDTH, 0.82, 1.02);
  return Math.max(10, Math.round(size * factor * 0.92));
}

/**
 * Home layout — banner va kartalar balandligi qolgan vertikal joydan
 * hisoblanadi, shuning uchun sahifa hech qanday telefonda scroll talab qilmaydi.
 */
export function useHomeLayout() {
  const { width, height, contentHeight, isSmall } = useResponsive();

  const bannerW = bannerWidth(width);
  const bannerH = Math.min(bannerW / BANNER_ASPECT, height * (isSmall ? 0.17 : 0.22));

  const chrome =
    HOME_CHROME.header +
    bannerH +
    HOME_CHROME.categories +
    HOME_CHROME.sectionHeader * 2 +
    HOME_CHROME.gaps;

  /** Ikki gorizontal qator uchun qolgan balandlik. */
  const rowHeight = Math.max(verticalScale(150), (contentHeight - chrome) / 2);

  /** Kartochka kengligi — 4:3 media + matn bloki qatorga sig'ishi shart. */
  const cardWByHeight = (rowHeight - CARD_BODY_HEIGHT) * CARD_MEDIA_ASPECT;
  const cardW = Math.round(
    clamp(Math.min(listingCardWidth(width), cardWByHeight), 148, 320),
  );

  return {
    windowWidth: width,
    windowHeight: height,
    contentHeight,
    bannerW,
    bannerH,
    cardW,
    rowHeight,
    cardGap: CARD_GAP,
    hPad: H_PAD,
    bannerImageW: imageRequestWidth(bannerW),
    cardImageW: imageRequestWidth(cardW),
    fs: scaleFont,
    isCompact: width < 360,
    isSmall,
  };
}
