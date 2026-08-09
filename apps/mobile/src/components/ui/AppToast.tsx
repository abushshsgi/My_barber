import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

export type AppToastTone = "error" | "success" | "info";

type Props = {
  message: string;
  tone?: AppToastTone;
  /** ms — 0 = avtomatik yo‘qolmasin */
  durationMs?: number;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Yuqoridan tushib, biroz turib yo‘qoladigan in-app ogohlantirish.
 * Web Sonner o‘rniga — faqat React Native.
 */
export function AppToast({
  message,
  tone = "error",
  durationMs = 4200,
  onDismiss,
  style,
}: Props) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    translateY.setValue(-80);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 360,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();

    if (durationMs <= 0) return;

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -90,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onDismiss?.();
      });
    }, durationMs);

    return () => clearTimeout(timer);
  }, [message, durationMs, onDismiss, opacity, translateY]);

  const icon =
    tone === "success" ? "checkmark-circle" : tone === "info" ? "information-circle" : "alert-circle";
  const palette =
    tone === "success"
      ? { bg: "#F4F4F4", fg: "#0A0A0A", icon: "#0A0A0A" }
      : tone === "info"
        ? { bg: "rgba(15,15,15,0.88)", fg: "#FFF", icon: "#FFF" }
        : { bg: "#DC2626", fg: "#FFF", icon: "#FFF" };

  return (
    <Animated.View
      style={[
        styles.wrap,
        { backgroundColor: palette.bg, opacity, transform: [{ translateY }] },
        style,
      ]}
      pointerEvents="none"
    >
      <Ionicons name={icon} size={18} color={palette.icon} />
      <Text style={[styles.text, { color: palette.fg }]} numberOfLines={3}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "center",
    maxWidth: "94%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  text: {
    flexShrink: 1,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: -0.1,
  },
});
