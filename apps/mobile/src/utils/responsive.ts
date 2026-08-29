import { useMemo } from "react";
import { Dimensions, PixelRatio, useWindowDimensions } from "react-native";
import { useSafeAreaInsets, type EdgeInsets } from "react-native-safe-area-context";

/**
 * Dizayn bazasi — iPhone 14 (390 × 844 logical pt).
 * Barcha `scale` / `verticalScale` qiymatlari shu maketga nisbatan hisoblanadi.
 */
export const BASE_WIDTH = 390;
export const BASE_HEIGHT = 844;

const raw = Dimensions.get("window");

/**
 * Ilova portret rejimida ishlaydi — landscape'da o'lchamlar almashib
 * ketmasligi uchun kichik qirra doim kenglik deb olinadi.
 */
export const SCREEN_WIDTH = Math.min(raw.width, raw.height);
export const SCREEN_HEIGHT = Math.max(raw.width, raw.height);

/** iPhone SE / iPhone 8 / kichik Samsung A-seriya. */
export const IS_SMALL_DEVICE = SCREEN_HEIGHT < 700;

/** iPhone SE 1-gen (568pt) kabi juda past ekranlar. */
export const IS_TINY_DEVICE = SCREEN_HEIGHT < 640;

/** iPhone 14/15/16 Pro Max, Galaxy S Ultra. */
export const IS_LARGE_DEVICE = SCREEN_HEIGHT >= 900;

/** Galaxy Fold ochiq holati va planshetlar. */
export const IS_TABLET = SCREEN_WIDTH >= 600;

/** Tor ekran — Galaxy S8/S9, iPhone SE (320–360pt). */
export const IS_NARROW_DEVICE = SCREEN_WIDTH < 360;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Pikselga tekislash — yarim-piksel chiziqlar (hairline blur) oldini oladi. */
function round(value: number): number {
  return PixelRatio.roundToNearestPixel(value);
}

/**
 * Gorizontal o'lchov — kenglik, padding, radius, ikonka o'lchamlari uchun.
 * Katta ekranlarda cheksiz o'smasligi uchun koeffitsiyent 0.82…1.15 orasida.
 */
export function scale(size: number): number {
  const factor = clamp(SCREEN_WIDTH / BASE_WIDTH, 0.82, 1.15);
  return round(size * factor);
}

/**
 * Vertikal o'lchov — balandlik, vertikal margin/padding uchun.
 * iPhone SE'da kartalar avtomatik pasayadi, Pro Max'da ortiqcha cho'zilmaydi.
 */
export function verticalScale(size: number): number {
  const factor = clamp(SCREEN_HEIGHT / BASE_HEIGHT, 0.78, 1.12);
  return round(size * factor);
}

/**
 * Yumshoq gorizontal o'lchov — to'liq `scale` juda agressiv bo'lgan joylar
 * (radius, gap, border) uchun. `factor` 0 → o'zgarmaydi, 1 → to'liq scale.
 */
export function moderateScale(size: number, factor = 0.5): number {
  return round(size + (scale(size) - size) * factor);
}

/** Yumshoq vertikal o'lchov. */
export function moderateVerticalScale(size: number, factor = 0.5): number {
  return round(size + (verticalScale(size) - size) * factor);
}

/**
 * Matn o'lchami — ekran kengligi va tizim font scale'iga moslashadi.
 * Foydalanuvchi tizimda ulkan shrift tanlasa ham layout buzilmasligi uchun
 * font scale 1.15 bilan cheklanadi.
 */
export function fontSize(size: number): number {
  const widthFactor = clamp(SCREEN_WIDTH / BASE_WIDTH, 0.85, 1.1);
  const systemFactor = clamp(PixelRatio.getFontScale(), 0.85, 1.15);
  const compact = IS_SMALL_DEVICE ? 0.94 : 1;
  return Math.max(10, round(size * widthFactor * systemFactor * compact));
}

/**
 * Ekran o'lchamiga qarab qiymat tanlash.
 *
 * ```ts
 * const cardHeight = adaptive({ small: 96, base: 132, large: 148 });
 * ```
 */
export function adaptive<T>(options: { small: T; base: T; large?: T }): T {
  if (IS_SMALL_DEVICE) return options.small;
  if (IS_LARGE_DEVICE && options.large !== undefined) return options.large;
  return options.base;
}

/** Kichik ekranda qiymatni foizga qisqartirish (default 20%). */
export function compact(size: number, ratio = 0.8): number {
  return IS_SMALL_DEVICE ? round(size * ratio) : size;
}

/** Ekran balandligining foizi. */
export function heightPercent(percent: number): number {
  return round((SCREEN_HEIGHT * percent) / 100);
}

/** Ekran kengligining foizi. */
export function widthPercent(percent: number): number {
  return round((SCREEN_WIDTH * percent) / 100);
}

/** Floating tab dock balandligi — kontent ostida qoldiriladigan bo'sh joy. */
export const TAB_DOCK_CLEARANCE = IS_SMALL_DEVICE ? 76 : 84;

/** Standart gorizontal chekka. */
export const H_PADDING = IS_NARROW_DEVICE ? scale(14) : scale(18);

/** Vertikal ritm — kichik ekranda avtomatik ixchamlashadi. */
export const spacing = {
  xxs: verticalScale(compact(4)),
  xs: verticalScale(compact(6)),
  sm: verticalScale(compact(10)),
  md: verticalScale(compact(14)),
  lg: verticalScale(compact(20)),
  xl: verticalScale(compact(28)),
} as const;

/** Burchak radiuslari — premium iOS uslubi. */
export const radius = {
  sm: moderateScale(10),
  md: moderateScale(14),
  lg: moderateScale(18),
  xl: moderateScale(24),
  pill: 999,
} as const;

/** Minimal teginish maydoni (Apple HIG 44pt / Material 48dp). */
export const HIT_SLOP_MIN = 44;

/** Media konteynerlari uchun standart nisbatlar. */
export const ASPECT = {
  square: 1,
  portrait: 3 / 4,
  landscape: 4 / 3,
  camera: 3 / 4,
  wide: 16 / 9,
  banner: 2.15,
} as const;

export type ScreenMetrics = {
  width: number;
  height: number;
  insets: EdgeInsets;
  /** Safe area va tab dock ayirilgandan keyin qolgan foydalanish mumkin balandlik. */
  contentHeight: number;
  isSmall: boolean;
  isNarrow: boolean;
  isLarge: boolean;
  isLandscape: boolean;
};

/**
 * Ekranga sig'adigan vertikal byudjet — single-screen dashboard layout uchun.
 * `flex: 1` + `justifyContent: "space-between"` bilan birga ishlatiladi.
 */
export function availableContentHeight(
  windowHeight: number,
  topInset: number,
  bottomInset = 0,
  dockClearance = TAB_DOCK_CLEARANCE,
): number {
  return Math.max(
    360,
    windowHeight - topInset - Math.max(bottomInset, 0) - dockClearance,
  );
}

/**
 * Runtime o'lchovlar — ekran burilishi, split-screen va Fold ochilishida
 * qayta hisoblanadi. Statik konstantalar yetmagan joyda shuni ishlating.
 */
export function useResponsive(dockClearance = TAB_DOCK_CLEARANCE): ScreenMetrics {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(
    () => ({
      width,
      height,
      insets,
      contentHeight: availableContentHeight(
        height,
        insets.top,
        insets.bottom,
        dockClearance,
      ),
      isSmall: height < 700,
      isNarrow: width < 360,
      isLarge: height >= 900,
      isLandscape: width > height,
    }),
    [width, height, insets, dockClearance],
  );
}
