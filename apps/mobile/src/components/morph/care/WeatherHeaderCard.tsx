import { Image, type ImageContentPosition } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import {
  StyleSheet,
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

/**
 * Care hub + Weather sahifalari uchun yagona ob-havo banneri:
 * cover rasm, overflow clip, to‘q gradient, SafeArea padding.
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
  paddingHorizontal = scale(16),
  paddingBottom = verticalScale(16),
  contentPosition = { right: "8%", top: "50%" },
  style,
  lightStatusBar = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const topPad = edgeToEdge ? safeTop(insets.top, topExtra) : topExtra;
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
          paddingHorizontal,
          paddingBottom,
        },
        style,
      ]}
    >
      {lightStatusBar ? <AppStatusBar style="light" /> : null}
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
          "rgba(6,8,14,0.62)",
          "rgba(6,8,14,0.22)",
          "rgba(6,8,14,0.18)",
          "rgba(6,8,14,0.88)",
        ]}
        locations={[0, 0.22, 0.55, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {topLeft || topRight ? (
        <View style={styles.topRow}>
          {topLeft ?? <View />}
          {topRight ?? <View />}
        </View>
      ) : null}
      {children}
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
  image: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2,
    gap: scale(10),
  },
});
