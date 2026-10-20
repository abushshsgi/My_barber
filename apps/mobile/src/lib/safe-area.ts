import { Platform, StatusBar as RNStatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Global SafeArea standartlari — barcha screen / Modal / sheet uchun.
 * Android edge-to-edge + Modal ichida insets ba’zan 0 keladi; fallback majburiy.
 */

export const SAFE_BOTTOM_MIN = 16;
export const SAFE_TOP_MIN = 8;
/**
 * Samsung / Redmi 3-tugmali nav (overlay / Expo Go).
 * `position: relative` native buildda oyna allaqachon yuqorida — insetga ishonamiz.
 */
export const ANDROID_NAV_MIN = 52;

/** Notch / status bar ostidagi yuqori padding. */
export function safeTop(insetsTop: number, extra = 12): number {
  // Zamonaviy Android (punch-hole / notch) qurilmalarida status bar 40-48dp gacha bo'ladi.
  // RNStatusBar.currentHeight ba'zan 24dp (eski standart) qaytaradi, shuning uchun minimal chegara 42dp qilinadi.
  const androidFallback =
    Platform.OS === "android" ? Math.max(RNStatusBar.currentHeight ?? 0, 42) : 0;
  const iosFallback = Platform.OS === "ios" && insetsTop < 20 ? 47 : 0;
  return Math.max(insetsTop, androidFallback, iosFallback, SAFE_TOP_MIN) + extra;
}

/**
 * System nav / home indicator uchun pastki padding.
 * Kontent telefon navigation bar ORQASIDA emas — USTIDA turadi.
 * Android: inset juda kichik bo‘lsa (overlay) — majburiy nav balandligi.
 */
export function safeBottom(insetsBottom: number, extra = 12): number {
  const androidMin =
    Platform.OS === "android" && insetsBottom < 16 ? ANDROID_NAV_MIN : 0;
  const iosMin = Platform.OS === "ios" && insetsBottom < 8 ? 20 : 0;
  return Math.max(insetsBottom, androidMin, iosMin, SAFE_BOTTOM_MIN) + extra;
}

/** Footer/CTA — extra siz system nav balandligi. */
export function safeBottomPad(insetsBottom: number): number {
  const androidMin =
    Platform.OS === "android" && insetsBottom < 16 ? ANDROID_NAV_MIN : 0;
  return Math.max(insetsBottom, androidMin, SAFE_BOTTOM_MIN);
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
