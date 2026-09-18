import { Image, type ImageContentPosition } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppStatusBar, safeTop } from "../../ui/AppStatusBar";
import { scale, verticalScale } from "../../../utils/responsive";

type Props = {
  source: ImageSourcePropType;
  /** Banner balandligi (safe area ichidagi kontent zonasi). edgeToEdge da tepaga insets qo‘shiladi. */
  height: number;
  children?: ReactNode;
  topLeft?: ReactNode;
  topRight?: ReactNode;
  /** Rasm status bar ostiga chiqadi; chrome `safeTop` bilan pastga suriladi. */
  edgeToEdge?: boolean;
  /** safeTop ga qo‘shimcha (default 8). */
  topExtra?: number;
  borderRadius?: number;
  paddingHorizontal?: number;
  paddingBottom?: number;
  contentPosition?: ImageContentPosition;
  style?: StyleProp<ViewStyle>;
  /** Status bar oq ikonlar (fon rasmi ustida). */
  lightStatusBar?: boolean;
};

/** Ekran + banner radiusiga qarab chrome inset — chip/back chet/burchakka yopishmasin. */
function autoChromePadX(width: number, borderRadius: number, override?: number): number {
  const byWidth =
    width < 360 ? scale(18) : width < 400 ? scale(20) : width < 480 ? scale(22) : scale(24);
  // Rounded corner ichida vizual bo‘shliq — radiusning ~55% i qo‘shimcha.
  const byRadius = Math.ceil(borderRadius * 0.55);
  const floor = Math.max(byWidth, byRadius, scale(16));
  if (override == null) return floor;
  return Math.max(override, floor);
}

function autoChromePadTop(
  edgeToEdge: boolean,
  insetsTop: number,
  topExtra: number,
  borderRadius: number,
): number {
  const floor = Math.max(scale(14), Math.ceil(borderRadius * 0.45));
  if (edgeToEdge) {
    return safeTop(insetsTop, Math.max(topExtra, floor));
  }
  return Math.max(topExtra, floor);
}

/**
 * Care hub + Weather sahifalari uchun yagona ob-havo banneri:
 * cover rasm konteynerni to‘liq to‘ldiradi; chrome avtomatik responsive inset.
 */
export function WeatherHeaderCard({
  source,
  height,
  children,
  topLeft,
  topRight,
  edgeToEdge = true,
  topExtra = 8,
  borderRadius = 0,
  paddingHorizontal,
  paddingBottom = verticalScale(16),
  contentPosition = "center",
  style,
  lightStatusBar = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const padX = autoChromePadX(width, borderRadius, paddingHorizontal);
  const topPad = autoChromePadTop(edgeToEdge, insets.top, topExtra, borderRadius);
  const totalHeight = edgeToEdge ? height + topPad : height;

  return (
    <View
      style={[
        styles.root,
        {
          height: totalHeight,
          width: "100%",
          borderRadius,
          paddingTop: topPad,
          paddingHorizontal: padX,
          paddingBottom,
        },
        style,
      ]}
    >
      {lightStatusBar ? <AppStatusBar style="light" /> : null}
      <View style={styles.media} pointerEvents="none">
        <Image
          source={source}
          style={styles.image}
          contentFit="cover"
          contentPosition={contentPosition}
          cachePolicy="memory-disk"
          priority="high"
          transition={0}
        />
        <LinearGradient
          colors={[
            "rgba(6,8,14,0.55)",
            "rgba(6,8,14,0.18)",
            "rgba(6,8,14,0.28)",
            "rgba(6,8,14,0.72)",
          ]}
          locations={[0, 0.28, 0.62, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
      {topLeft || topRight ? (
        <View style={styles.topRow}>
          <View style={styles.topSlotStart}>{topLeft ?? null}</View>
          <View style={styles.topSlotEnd}>{topRight ?? null}</View>
        </View>
      ) : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#0B1220",
    justifyContent: "space-between",
    alignSelf: "stretch",
  },
  media: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    zIndex: 2,
    gap: scale(12),
    width: "100%",
  },
  topSlotStart: {
    flexShrink: 0,
    alignItems: "flex-start",
  },
  topSlotEnd: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    alignItems: "flex-end",
    paddingLeft: scale(8),
  },
  body: {
    zIndex: 2,
    width: "100%",
  },
});
