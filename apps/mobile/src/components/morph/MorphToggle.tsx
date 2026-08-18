import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useMorphAppearance } from "../../lib/MorphAppearanceContext";

type Props = {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

const TRACK_W = 51;
const TRACK_H = 31;
const THUMB = 27;
const PAD = 2;
const TRAVEL = TRACK_W - THUMB - PAD * 2;

/** iOS 18 uslubidagi pill toggle — Morph AI sozlamalari uchun. */
export function MorphToggle({ value, onChange, disabled }: Props) {
  const { colors: pal } = useMorphAppearance();
  const progress = useSharedValue(value ? 1 : 0);
  const offColor = pal.track;

  useEffect(() => {
    progress.value = withSpring(value ? 1 : 0, {
      damping: 18,
      stiffness: 240,
      mass: 0.65,
    });
  }, [progress, value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [offColor, "#34C759"]),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: PAD + progress.value * TRAVEL }],
  }));

  return (
    <Pressable
      disabled={disabled}
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: Boolean(disabled) }}
      hitSlop={6}
      style={disabled && styles.disabled}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <View pointerEvents="none" style={styles.inset} />
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    justifyContent: "center",
  },
  inset: {
    ...StyleSheet.absoluteFill,
    borderRadius: TRACK_H / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.22)",
  },
  thumb: {
    position: "absolute",
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: "#FFFFFF",
    shadowOpacity: 0,
    elevation: 0,
  },
  disabled: {
    opacity: 0.4,
  },
});
