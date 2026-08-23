import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  /** true — API chaqiruvi ketmoqda */
  creating?: boolean;
  error?: string | null;
};

/** Yangi foydalanuvchi — carousel o‘rniga chiroyli «yaratilmoqda» UI. */
export function WalletCreatingScreen({ creating = true, error }: Props) {
  const insets = useSafeAreaInsets();
  const pulse = useSharedValue(1);
  const ring = useSharedValue(0.4);
  const fade = useSharedValue(0);
  const check = useSharedValue(0);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 780, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 780, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    ring.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }),
        withTiming(0.35, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [fade, pulse, ring]);

  useEffect(() => {
    if (!creating && !error) {
      check.value = withDelay(80, withTiming(1, { duration: 360 }));
    }
  }, [creating, error, check]);

  const logoAnim = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: fade.value,
  }));

  const ringAnim = useAnimatedStyle(() => ({
    opacity: 1 - ring.value,
    transform: [{ scale: 0.7 + ring.value * 0.55 }],
  }));

  const checkAnim = useAnimatedStyle(() => ({
    opacity: check.value,
    transform: [{ scale: 0.6 + check.value * 0.4 }],
  }));

  return (
    <LinearGradient
      colors={["#5B4ED6", "#6E5EF0", "#8574FF"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.orbA} />
      <View style={styles.orbB} />

      <View style={styles.stage}>
        <Animated.View style={[styles.ring, ringAnim]} />
        <Animated.View style={[styles.logoWrap, logoAnim]}>
          <Ionicons name="wallet" size={42} color="#5B4ED6" />
        </Animated.View>
        {!creating && !error ? (
          <Animated.View style={[styles.checkBadge, checkAnim]}>
            <Ionicons name="checkmark" size={16} color="#FFF" />
          </Animated.View>
        ) : null}
      </View>

      <Text style={styles.title}>
        {error
          ? "Hamyon ochilmadi"
          : creating
            ? "Hamyoningiz yaratilmoqda"
            : "Hamyon tayyor!"}
      </Text>
      <Text style={styles.sub}>
        {error
          ? error
          : creating
            ? "Raqam berilmoqda va karta chiqarilmoqda…"
            : "Balans va rekvizitlar tayyor."}
      </Text>

      {creating ? (
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotOn]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  orbA: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  orbB: {
    position: "absolute",
    bottom: 80,
    left: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  stage: {
    width: 148,
    height: 148,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 74,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.55)",
  },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  checkBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFF",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  sub: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
    maxWidth: 280,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    marginTop: 28,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  dotOn: {
    backgroundColor: "#FFF",
    width: 18,
  },
});
