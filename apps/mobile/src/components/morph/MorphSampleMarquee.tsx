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

export type MorphSampleCard = {
  id: string;
  title: string;
  image: string;
};

const CARD_W = 104;
const CARD_H = 140;
const GAP = 10;

type RowProps = {
  items: MorphSampleCard[];
  direction: "left" | "right";
  durationMs?: number;
  onPress?: (item: MorphSampleCard) => void;
};

function MarqueeRow({ items, direction, durationMs = 42000, onPress }: RowProps) {
  const loop = useMemo(() => {
    if (items.length === 0) return [];
    return [...items, ...items];
  }, [items]);

  const loopWidth = Math.max(1, items.length * (CARD_W + GAP));
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
            style={styles.card}
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
  onPressStyle?: (item: MorphSampleCard) => void;
};

/** Ikki qator: yuqori o'ngga, pastki chapga — uzluksiz marquee. */
export function MorphSampleMarquee({ rowA, rowB, loading, onPressStyle }: Props) {
  if (loading) {
    return (
      <View style={styles.skeletonWrap}>
        {[0, 1].map((row) => (
          <View key={row} style={styles.skeletonRow}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={styles.skeletonCard} />
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
        durationMs={40000}
        onPress={onPressStyle}
      />
      <MarqueeRow
        items={bottom}
        direction="left"
        durationMs={46000}
        onPress={onPressStyle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  clip: { overflow: "hidden" },
  row: { flexDirection: "row", gap: GAP },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 16,
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
    height: 48,
  },
  title: {
    ...morphFont,
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
    color: "rgba(255,255,255,0.92)",
    fontSize: 10,
    fontWeight: "600",
  },
  skeletonWrap: { gap: 10 },
  skeletonRow: { flexDirection: "row", gap: GAP },
  skeletonCard: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
});
