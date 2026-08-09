import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pexelsPhotoUrl } from "../../api/media";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import type { MorphStackParamList } from "../../navigation/MorphStack";

type Props = NativeStackScreenProps<MorphStackParamList, "MorphWelcome">;

const HERO_URI = pexelsPhotoUrl(3998445, 1400);

/**
 * Try-on birinchi kirish — marketing hero (Get Started).
 */
export function MorphWelcomeScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();

  const enter = useSharedValue(0);
  const pulse = useSharedValue(0);
  const chevron = useSharedValue(0);
  const backScale = useSharedValue(1);
  const ctaScale = useSharedValue(1);

  useEffect(() => {
    enter.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    chevron.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 700, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [chevron, enter, pulse]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: interpolate(enter.value, [0, 1], [36, 0]) }],
  }));

  const ctaGlowStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: ctaScale.value * interpolate(pulse.value, [0, 1], [1, 1.06]) },
    ],
    shadowOpacity: interpolate(pulse.value, [0, 1], [0.15, 0.35]),
  }));

  const backAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: backScale.value }],
    opacity: interpolate(enter.value, [0, 1], [0.4, 1]),
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    opacity: interpolate(chevron.value, [0, 1], [0.35, 1]),
    transform: [{ translateX: interpolate(chevron.value, [0, 1], [0, 6]) }],
  }));

  const onBack = () => {
    backScale.value = withSequence(
      withSpring(0.86, { damping: 12 }),
      withSpring(1, { damping: 10 }),
    );
    const parent = navigation.getParent();
    if (parent?.canGoBack()) {
      parent.goBack();
      return;
    }
    parent?.navigate("Home" as never);
  };

  const onGetStarted = () => {
    ctaScale.value = withSequence(
      withSpring(0.9, { damping: 14 }),
      withSpring(1.05, { damping: 10 }),
      withSpring(1, { damping: 12 }),
    );
    navigation.navigate("MorphGuide");
  };

  return (
    <View style={styles.root}>
      <Image
        source={{ uri: HERO_URI }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={400}
      />
      <LinearGradient
        colors={["rgba(20,12,8,0.15)", "rgba(18,10,6,0.55)", "rgba(12,8,6,0.92)"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.sheet,
          cardStyle,
          { paddingBottom: Math.max(insets.bottom, 14) + 8 },
        ]}
      >
        <View style={styles.glass}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Morf AI</Text>
          </View>
          <Text style={styles.title}>
            Look yaratish{"\n"}
            <Text style={styles.titleEm}>AI BILAN</Text>
          </Text>
          <Text style={styles.sub}>
            Selfie yuklang — Morf AI yuz shaklingizga mos soch uslublarini bir necha
            soniyada yaratadi.
          </Text>
        </View>

        <View style={styles.bar}>
          <Animated.View style={backAnimStyle}>
            <Pressable
              style={styles.backBtn}
              onPress={onBack}
              accessibilityLabel="Orqaga"
            >
              <Ionicons name="arrow-back" size={18} color="#FFF" />
            </Pressable>
          </Animated.View>

          <Pressable
            style={styles.ctaRow}
            onPress={onGetStarted}
            accessibilityLabel="Get Started"
          >
            <Animated.View style={[styles.ctaCircle, ctaGlowStyle]}>
              <Ionicons name="arrow-forward" size={20} color="#1A120E" />
            </Animated.View>
            <Text style={styles.ctaLabel}>Get Started</Text>
            <Animated.View style={[styles.chevrons, chevronStyle]}>
              <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.7)" />
              <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.55)" />
              <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.4)" />
            </Animated.View>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#1A120E" },
  sheet: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    gap: 14,
  },
  glass: {
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 26,
    backgroundColor: "rgba(42, 28, 20, 0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
    gap: 10,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.35)",
  },
  badgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  title: {
    color: "#FFF",
    fontSize: 30,
    fontWeight: "600",
    letterSpacing: -0.6,
    lineHeight: 36,
  },
  titleEm: { fontWeight: "800", letterSpacing: 0.5 },
  sub: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    maxWidth: 320,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 64,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(28, 18, 14, 0.92)",
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ctaCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FFF",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 4,
  },
  ctaLabel: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  chevrons: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    marginRight: 4,
  },
});
