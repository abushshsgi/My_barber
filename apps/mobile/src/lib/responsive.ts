import { useMemo } from "react";
import { useWindowDimensions, PixelRatio } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Floating tab dock balandligi — kontent ostida bo‘sh joy. */
export const TAB_DOCK_CLEARANCE = 84;

/** Dizayn bazasi — iPhone 14 (390×844 logical). */
export const BASE_W = 390;
export const BASE_H = 844;

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Uniform scale — matn/ikonka uchun. */
export function layoutScale(width: number, height: number) {
  const s = Math.min(width / BASE_W, height / BASE_H);
  return clamp(s, 0.72, 1.12);
}

export function rs(size: number, scale: number) {
  return Math.max(1, Math.round(size * scale));
}

/**
 * Bitta ekranga sig‘adigan vertikal byudjet.
 * Floating tab dock ostida joy qoldiradi.
 */
export function screenContentHeight(
  windowHeight: number,
  topInset: number,
  bottomInset = 0,
  dockClearance = TAB_DOCK_CLEARANCE,
) {
  return Math.max(420, windowHeight - topInset - Math.max(bottomInset, 0) - dockClearance);
}

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return useMemo(() => {
    const scale = layoutScale(width, height);
    const contentH = screenContentHeight(height, insets.top, insets.bottom);
    return {
      width,
      height,
      insets,
      scale,
      contentH,
      dockClearance: TAB_DOCK_CLEARANCE,
      rs: (size: number) => rs(size, scale),
      fontScale: PixelRatio.getFontScale(),
    };
  }, [width, height, insets.top, insets.bottom]);
}
