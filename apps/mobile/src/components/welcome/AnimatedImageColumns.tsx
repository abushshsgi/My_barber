import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo } from "react";
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

type Props = {
  height: number;
  /** Aniq kenglik — FlatList / web da onLayout 0 bo'lib qolmasin. */
  width: number;
};

/** Uchta vertikal ustun — uzluksiz yuqoriga / pastga marquee. */
export function AnimatedImageColumns({ height, width }: Props) {
  const colW = Math.max(40, Math.floor((width - GAP * 2) / 3));

  if (width < 60 || height < 80) return null;

  return (
    <View style={[styles.root, { height, width }]}>
      <View style={styles.row}>
        <AnimatedColumn
          tiles={WELCOME_COLUMNS[0]}
          width={colW}
          upward
          durationMs={22000}
          startOffset={28}
        />
        <AnimatedColumn
          tiles={WELCOME_COLUMNS[1]}
          width={colW}
          upward={false}
          durationMs={18000}
          startOffset={-36}
        />
        <AnimatedColumn
          tiles={WELCOME_COLUMNS[2]}
          width={colW}
          upward
          durationMs={25000}
          startOffset={12}
        />
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
    alignSelf: "center",
  },
  row: {
    flex: 1,
    flexDirection: "row",
    gap: GAP,
  },
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
