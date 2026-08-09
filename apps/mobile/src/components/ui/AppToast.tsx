import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

export type AppToastTone = "error" | "success" | "info" | "loading";

type Props = {
  message: string;
  tone?: AppToastTone;
  /** ms — 0 = avtomatik yo‘qolmasin */
  durationMs?: number;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
};

type Palette = {
  bg: string;
  border: string;
  fg: string;
  iconBg: string;
  icon: string;
};

function tonePalette(tone: AppToastTone): Palette {
  switch (tone) {
    case "success":
      return {
        bg: "#FFFFFF",
        border: "rgba(10,10,10,0.08)",
        fg: "#0A0A0A",
        iconBg: "#0A0A0A",
        icon: "#FFFFFF",
      };
    case "error":
      return {
        bg: "#FFF5F5",
        border: "rgba(185,28,28,0.18)",
        fg: "#7F1D1D",
        iconBg: "#DC2626",
        icon: "#FFFFFF",
      };
    case "loading":
    case "info":
    default:
      return {
        bg: "#FFFFFF",
        border: "rgba(10,10,10,0.08)",
        fg: "#0A0A0A",
        iconBg: "#F2F2F2",
        icon: "#0A0A0A",
      };
  }
}

/**
 * Yuqoridan tushib, biroz turib yo‘qoladigan ixcham in-app ogohlantirish.
 */
export function AppToast({
  message,
  tone = "error",
  durationMs = 4200,
  onDismiss,
  style,
}: Props) {
  const translateY = useRef(new Animated.Value(-72)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const palette = tonePalette(tone);

  useEffect(() => {
    translateY.setValue(-72);
    opacity.setValue(0);
    scale.setValue(0.96);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        friction: 9,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    if (durationMs <= 0) return;

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -64,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.96,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onDismiss?.();
      });
    }, durationMs);

    return () => clearTimeout(timer);
  }, [message, durationMs, onDismiss, opacity, scale, translateY]);

  const iconName =
    tone === "success"
      ? "checkmark"
      : tone === "error"
        ? "alert"
        : "information";

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity,
          transform: [{ translateY }, { scale }],
        },
        style,
      ]}
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.iconWrap, { backgroundColor: palette.iconBg }]}>
        {tone === "loading" ? (
          <ActivityIndicator size="small" color={palette.icon} />
        ) : (
          <Ionicons name={iconName} size={14} color={palette.icon} />
        )}
      </View>
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
    gap: 10,
    alignSelf: "center",
    maxWidth: "92%",
    paddingLeft: 10,
    paddingRight: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth * 2,
    shadowColor: "#0A0A0A",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flexShrink: 1,
    fontWeight: "600",
    fontSize: 13.5,
    letterSpacing: -0.2,
    lineHeight: 18,
  },
});
