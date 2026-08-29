import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../../utils/responsive";

type Tone = "error" | "warning";

type Props = {
  title: string;
  message: string;
  retryLabel?: string;
  dismissA11y: string;
  tone?: Tone;
  onRetry?: () => void;
  onDismiss: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Chat composer ustidagi yumshoq xato/ogohlantirish — Gemini uslubi. */
export function ChatNotice({
  title,
  message,
  retryLabel,
  dismissA11y,
  tone = "error",
  onRetry,
  onDismiss,
  style,
}: Props) {
  const palette =
    tone === "warning"
      ? {
          bg: "#FFFBEB",
          border: "#E5E5E5",
          iconBg: "#FEF3C7",
          icon: "#111111" as const,
          iconName: "warning" as const,
        }
      : {
          bg: "#FAFAFA",
          border: "#E4E4E7",
          iconBg: "#FEE2E2",
          icon: "#B91C1C" as const,
          iconName: "alert-circle" as const,
        };

  return (
    <Animated.View
      entering={FadeInUp.duration(220)}
      style={[styles.wrap, { backgroundColor: palette.bg, borderColor: palette.border }, style]}
      accessibilityRole="alert"
    >
      <View style={[styles.iconWrap, { backgroundColor: palette.iconBg }]}>
        <Ionicons name={palette.iconName} size={18} color={palette.icon} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        {retryLabel && onRetry ? (
          <Pressable
            onPress={onRetry}
            style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={14} color="#111111" />
            <Text style={styles.retryText}>{retryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        onPress={onDismiss}
        hitSlop={10}
        style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={dismissA11y}
      >
        <Ionicons name="close" size={16} color="#71717A" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: moderateScale(10),
    marginHorizontal: scale(16),
    marginBottom: verticalScale(10),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(16),
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  iconWrap: {
    width: scale(28),
    height: scale(28),
    borderRadius: moderateScale(14),
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: moderateScale(4),
  },
  title: {
    fontSize: fontSize(14),
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -0.2,
  },
  message: {
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: "#52525B",
  },
  retry: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(5),
    marginTop: verticalScale(6),
    minHeight: verticalScale(32),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E4E7",
  },
  retryText: {
    fontSize: fontSize(13),
    fontWeight: "600",
    color: "#111111",
  },
  close: {
    width: scale(32),
    height: scale(32),
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.72,
  },
});
