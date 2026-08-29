import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { morphFont } from "../../theme/morph-font";
import {
  ASPECT,
  IS_SMALL_DEVICE,
  fontSize,
  moderateScale,
  radius,
  verticalScale,
} from "../../utils/responsive";

export type MorphSampleCard = {
  id: string;
  title: string;
  image: string;
};

/** Kartochka nisbati — balandlik berilsa kenglik shundan hosil bo'ladi. */
const CARD_ASPECT = ASPECT.portrait;
const DEFAULT_CARD_H = verticalScale(IS_SMALL_DEVICE ? 108 : 140);
const GAP = moderateScale(10);

type CardSize = { width: number; height: number };

function cardSize(height: number): CardSize {
  return { width: Math.round(height * CARD_ASPECT), height };
}

type RowProps = {
  items: MorphSampleCard[];
  direction: "left" | "right";
  size: CardSize;
  durationMs?: number;
  onPress?: (item: MorphSampleCard) => void;
};

function MarqueeRow({ items, direction, size, durationMs = 42000, onPress }: RowProps) {
  const loop = useMemo(() => {
    if (items.length === 0) return [];
    return [...items, ...items];
  }, [items]);

  const loopWidth = Math.max(1, items.length * (size.width + GAP));
  const translateX = useSharedValue(direction === "left" ? 0 : -loopWidth);

  useEffect(() => {
    if (items.length < 2) return;
    translateX.value = direction === "left" ? 0 : -loopWidth;
    translateX.value = withRepeat(
      withTiming(direction === "left" ? -loopWidth : 0, {
        duration: durationMs,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    return () => cancelAnimation(translateX);
  }, [direction, durationMs, items.length, loopWidth, translateX]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (items.length === 0) return null;

  return (
    <View style={styles.clip}>
      <Animated.View style={[styles.row, animStyle]}>
        {loop.map((entry, i) => (
          <Pressable
            key={`${entry.id}-${i}`}
            style={[styles.card, size]}
            onPress={() => onPress?.(entry)}
          >
            <Image
              source={{ uri: entry.image }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              recyclingKey={entry.id}
              transition={200}
              cachePolicy="memory-disk"
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.75)"]}
              style={styles.fade}
            />
            <Text style={styles.title} numberOfLines={1}>
              {entry.title}
            </Text>
          </Pressable>
        ))}
      </Animated.View>
    </View>
  );
}

type Props = {
  rowA: MorphSampleCard[];
  rowB: MorphSampleCard[];
  loading?: boolean;
  /**
   * Bitta kartochka balandligi. Ota-sahifa qolgan bo'sh joydan hisoblab
   * uzatadi — shunda blok hech qachon ekrandan chiqib ketmaydi.
   */
  cardHeight?: number;
  onPressStyle?: (item: MorphSampleCard) => void;
};

/** Ikki qator: yuqori o'ngga, pastki chapga — uzluksiz marquee. */
export function MorphSampleMarquee({
  rowA,
  rowB,
  loading,
  cardHeight = DEFAULT_CARD_H,
  onPressStyle,
}: Props) {
  const size = cardSize(Math.max(72, Math.round(cardHeight)));

  if (loading) {
    return (
      <View style={styles.skeletonWrap}>
        {[0, 1].map((row) => (
          <View key={row} style={styles.skeletonRow}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={[styles.skeletonCard, size]} />
            ))}
          </View>
        ))}
      </View>
    );
  }

  const top = rowA.length >= 3 ? rowA : [...rowA, ...rowB].slice(0, 8);
  const bottom =
    rowB.length >= 3 ? rowB : [...rowB, ...rowA].reverse().slice(0, 8);

  return (
    <View style={styles.wrap}>
      <MarqueeRow
        items={top}
        direction="right"
        size={size}
        durationMs={40000}
        onPress={onPressStyle}
      />
      <MarqueeRow
        items={bottom}
        direction="left"
        size={size}
        durationMs={46000}
        onPress={onPressStyle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: GAP, overflow: "hidden" },
  clip: { overflow: "hidden" },
  row: { flexDirection: "row", gap: GAP },
  card: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
  },
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "34%",
  },
  title: {
    ...morphFont,
    position: "absolute",
    left: moderateScale(8),
    right: moderateScale(8),
    bottom: moderateScale(8),
    color: "rgba(255,255,255,0.92)",
    fontSize: fontSize(10),
    fontWeight: "600",
  },
  skeletonWrap: { gap: GAP, overflow: "hidden" },
  skeletonRow: { flexDirection: "row", gap: GAP },
  skeletonCard: {
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
});
