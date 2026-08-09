import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

export type AppToastTone = "error" | "success" | "info";

type Props = {
  message: string;
  tone?: AppToastTone;
  /** ms — 0 = avtomatik yo‘qolmasin (phase o‘zgarguncha turadi) */
  durationMs?: number;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Yuqoridan tushib, biroz turib yo‘qoladigan in-app ogohlantirish.
 */
export function AppToast({
  message,
  tone = "error",
  durationMs = 4200,
  onDismiss,
  style,
}: Props) {
  const translateY = useRef(new Animated.Value(-88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    translateY.setValue(-88);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    if (durationMs <= 0) return;

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -96,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onDismiss?.();
      });
    }, durationMs);

    return () => clearTimeout(timer);
  }, [message, durationMs, onDismiss, opacity, translateY]);

  const icon =
    tone === "success"
      ? "checkmark-circle"
      : tone === "info"
        ? "information-circle"
        : "alert-circle";
  const palette =
    tone === "success"
      ? { bg: "#FFFFFF", fg: "#0A0A0A", icon: "#0A0A0A" }
      : tone === "info"
        ? { bg: "rgba(15,15,15,0.9)", fg: "#FFF", icon: "#FFF" }
        : { bg: "#DC2626", fg: "#FFF", icon: "#FFF" };

  return (
    <Animated.View
      style={[
        styles.wrap,
        { backgroundColor: palette.bg, opacity, transform: [{ translateY }] },
        style,
      ]}
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Ionicons name={icon} size={18} color={palette.icon} />
      <Text style={[styles.text, { color: palette.fg }]} numberOfLines={4}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "stretch",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  text: {
    flex: 1,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: -0.1,
    lineHeight: 18,
  },
});
