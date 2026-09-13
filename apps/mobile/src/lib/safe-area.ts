import { Platform, StatusBar as RNStatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Global SafeArea standartlari — barcha screen / Modal / sheet uchun.
 * Android edge-to-edge + Modal ichida insets ba’zan 0 keladi; fallback majburiy.
 */

export const SAFE_BOTTOM_MIN = 16;
export const SAFE_TOP_MIN = 8;

/** Notch / status bar ostidagi yuqori padding. */
export function safeTop(insetsTop: number, extra = 10): number {
  const androidFallback =
    Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 28) : 0;
  const iosFallback = Platform.OS === "ios" && insetsTop < 20 ? 47 : 0;
  return Math.max(insetsTop, androidFallback, iosFallback, SAFE_TOP_MIN) + extra;
}

/**
 * System nav / home indicator uchun pastki padding.
 * 3-tugmali Android bar va gesture bar uchun `Math.max(insets.bottom, 16)` + extra.
 */
export function safeBottom(insetsBottom: number, extra = 12): number {
  const androidMin = Platform.OS === "android" ? 24 : 0;
  const iosMin = Platform.OS === "ios" && insetsBottom < 8 ? 20 : 0;
  return Math.max(insetsBottom, androidMin, iosMin, SAFE_BOTTOM_MIN) + extra;
}

/** Footer/CTA — faqat `Math.max(insets.bottom, 16)` (extra yo‘q). */
export function safeBottomPad(insetsBottom: number): number {
  return Math.max(insetsBottom, SAFE_BOTTOM_MIN);
}

/** Screen / Modal ichida bir xil pad qiymatlari. */
export function useSafePads(opts?: { topExtra?: number; bottomExtra?: number }) {
  const insets = useSafeAreaInsets();
  const topExtra = opts?.topExtra ?? 10;
  const bottomExtra = opts?.bottomExtra ?? 12;
  return {
    insets,
    top: safeTop(insets.top, topExtra),
    bottom: safeBottom(insets.bottom, bottomExtra),
    /** Extra siz pastki (Math.max(bottom, 16)). */
    bottomPad: safeBottomPad(insets.bottom),
    left: insets.left,
    right: insets.right,
  };
}
