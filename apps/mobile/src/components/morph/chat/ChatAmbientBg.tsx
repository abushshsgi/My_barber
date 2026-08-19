import { useEffect } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useMorphAppearance } from "../../../lib/MorphAppearanceContext";

type BlobSpec = {
  color: string;
  size: number;
  left: number;
  top: number;
  dx: number;
  dy: number;
  duration: number;
};

function DriftBlob({
  color,
  size,
  left,
  top,
  dx,
  dy,
  duration,
}: BlobSpec) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withRepeat(
      withTiming(1, {
        duration,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [duration, p]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(p.value, [0, 1], [0, dx]) },
      { translateY: interpolate(p.value, [0, 1], [0, dy]) },
      { scale: interpolate(p.value, [0, 1], [1, 1.22]) },
    ],
    opacity: interpolate(p.value, [0, 0.5, 1], [0.55, 0.95, 0.62]),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.blob,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left,
          top,
          backgroundColor: color,
          ...Platform.select({
            web: { boxShadow: `0 0 ${Math.round(size * 0.42)}px ${Math.round(size * 0.22)}px ${color}` },
            default: {},
          }),
        },
        style,
      ]}
    />
  );
}

/** Gemini uslubidagi sekin oqadigan rangli gradient fon. */
export function ChatAmbientBg() {
  const { colors: pal, theme } = useMorphAppearance();
  const { width, height } = useWindowDimensions();
  const dark = theme === "dark";

  const blobs: BlobSpec[] = [
    {
      color: dark ? "rgba(66,133,244,0.42)" : "rgba(66,133,244,0.28)",
      size: Math.max(280, width * 0.78),
      left: -width * 0.22,
      top: -height * 0.08,
      dx: width * 0.18,
      dy: height * 0.1,
      duration: 16000,
    },
    {
      color: dark ? "rgba(168,85,247,0.38)" : "rgba(192,132,252,0.26)",
      size: Math.max(240, width * 0.7),
      left: width * 0.28,
      top: height * 0.08,
      dx: -width * 0.16,
      dy: height * 0.12,
      duration: 19000,
    },
    {
      color: dark ? "rgba(20,184,166,0.32)" : "rgba(45,212,191,0.22)",
      size: Math.max(220, width * 0.62),
      left: width * 0.08,
      top: height * 0.42,
      dx: width * 0.14,
      dy: -height * 0.1,
      duration: 21000,
    },
    {
      color: dark ? "rgba(236,72,153,0.22)" : "rgba(244,114,182,0.18)",
      size: Math.max(200, width * 0.55),
      left: width * 0.42,
      top: height * 0.58,
      dx: -width * 0.12,
      dy: -height * 0.08,
      duration: 24000,
    },
  ];

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: pal.bg }]}>
      {blobs.map((blob, i) => (
        <DriftBlob key={i} {...blob} />
      ))}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: dark ? "rgba(12,12,14,0.42)" : "rgba(238,239,243,0.38)" },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
  },
});
