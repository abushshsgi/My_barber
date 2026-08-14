import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  headline: string;
  ctaLabel: string;
  onStart: () => void;
};

/** Birinchi kirish — soft lavender + bubble marketing. */
export function MorphChatWelcome({ headline, ctaLabel, onStart }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(28)).current;
  const ctaOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rise, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(ctaOp, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [ctaOp, fade, rise]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#EDE4FF", "#F3E8FF", "#FCE7F3", "#FDF2F8"]}
        locations={[0, 0.35, 0.72, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Soft bubbles — rasm uslubi */}
      <View
        pointerEvents="none"
        style={[
          styles.bubble,
          {
            width: width * 0.72,
            height: width * 0.72,
            borderRadius: width * 0.36,
            top: height * 0.06,
            left: -width * 0.18,
            backgroundColor: "rgba(244, 163, 176, 0.42)",
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.bubble,
          {
            width: width * 0.58,
            height: width * 0.58,
            borderRadius: width * 0.29,
            top: height * 0.18,
            right: -width * 0.16,
            backgroundColor: "rgba(233, 180, 220, 0.38)",
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.bubble,
          {
            width: width * 0.45,
            height: width * 0.45,
            borderRadius: width * 0.225,
            top: height * 0.38,
            left: width * 0.22,
            backgroundColor: "rgba(196, 181, 253, 0.35)",
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.bubble,
          {
            width: width * 0.34,
            height: width * 0.34,
            borderRadius: width * 0.17,
            bottom: height * 0.28,
            right: width * 0.08,
            backgroundColor: "rgba(251, 207, 232, 0.5)",
          },
        ]}
      />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 48,
            paddingBottom: Math.max(insets.bottom, 16) + 88,
          },
        ]}
      >
        <Animated.View
          style={{
            opacity: fade,
            transform: [{ translateY: rise }],
            flex: 1,
            justifyContent: "flex-end",
            paddingBottom: 36,
          }}
        >
          <Text style={styles.brand}>MORF AI</Text>
          <Text style={styles.headline}>{headline}</Text>
        </Animated.View>

        <Animated.View style={{ opacity: ctaOp }}>
          <Pressable
            onPress={onStart}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
          >
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#EDE4FF",
  },
  bubble: {
    position: "absolute",
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },
  brand: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2.4,
    color: "rgba(45, 27, 78, 0.45)",
    marginBottom: 14,
  },
  headline: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: "#1F1635",
    textTransform: "uppercase",
  },
  cta: {
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6B21A8",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  ctaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F1635",
    letterSpacing: -0.2,
  },
});
