import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors } from "../../theme/colors";
import { WELCOME_COLUMNS, type WelcomeTile } from "./welcomeImages";

const GAP = 10;
const RADIUS = 18;
const HEIGHTS = [108, 136, 168] as const;

type ColumnProps = {
  tiles: WelcomeTile[];
  width: number;
  upward: boolean;
  durationMs: number;
  startOffset: number;
};

function columnContentHeight(tiles: WelcomeTile[]): number {
  return tiles.reduce((sum, t) => sum + HEIGHTS[t.size] + GAP, 0);
}

function AnimatedColumn({
  tiles,
  width,
  upward,
  durationMs,
  startOffset,
}: ColumnProps) {
  const loopH = useMemo(() => columnContentHeight(tiles), [tiles]);
  const translateY = useSharedValue(upward ? 0 : -loopH);
  const doubled = useMemo(() => [...tiles, ...tiles], [tiles]);

  useEffect(() => {
    translateY.value = upward ? 0 : -loopH;
    translateY.value = withRepeat(
      withTiming(upward ? -loopH : 0, {
        duration: durationMs,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    return () => cancelAnimation(translateY);
  }, [durationMs, loopH, translateY, upward]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={[styles.colClip, { width }]}>
      <Animated.View style={[{ marginTop: startOffset }, animStyle]}>
        {doubled.map((tile, i) => (
          <View
            key={`${tile.uri}-${i}`}
            style={[
              styles.tile,
              {
                width,
                height: HEIGHTS[tile.size],
                marginBottom: GAP,
              },
            ]}
          >
            <Image
              source={{ uri: tile.uri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              recyclingKey={`${tile.uri}-${i % tiles.length}`}
              transition={0}
              cachePolicy="memory-disk"
            />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

function ColumnSlot({
  index,
  upward,
  durationMs,
  startOffset,
}: {
  index: number;
  upward: boolean;
  durationMs: number;
  startOffset: number;
}) {
  const [width, setWidth] = useState(0);
  const tiles = WELCOME_COLUMNS[index] ?? WELCOME_COLUMNS[0];

  return (
    <View
      style={styles.colFlex}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <AnimatedColumn
          tiles={tiles}
          width={width}
          upward={upward}
          durationMs={durationMs}
          startOffset={startOffset}
        />
      ) : null}
    </View>
  );
}

type Props = {
  height: number;
};

/** Uchta vertikal ustun — uzluksiz yuqoriga / pastga marquee. */
export function AnimatedImageColumns({ height }: Props) {
  return (
    <View style={[styles.root, { height }]}>
      <View style={styles.row}>
        <ColumnSlot index={0} upward durationMs={22000} startOffset={28} />
        <ColumnSlot index={1} upward={false} durationMs={18000} startOffset={-36} />
        <ColumnSlot index={2} upward durationMs={25000} startOffset={12} />
      </View>
      <LinearGradient
        pointerEvents="none"
        colors={["#FFFFFF", "rgba(255,255,255,0)"]}
        style={styles.fadeTop}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(255,255,255,0)", "#FFFFFF"]}
        style={styles.fadeBottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  row: {
    flex: 1,
    flexDirection: "row",
    gap: GAP,
    paddingHorizontal: 2,
  },
  colFlex: { flex: 1, overflow: "hidden" },
  colClip: {
    overflow: "hidden",
    height: "100%",
  },
  tile: {
    borderRadius: RADIUS,
    overflow: "hidden",
    backgroundColor: colors.border,
  },
  fadeTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 28,
  },
  fadeBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
  },
});
