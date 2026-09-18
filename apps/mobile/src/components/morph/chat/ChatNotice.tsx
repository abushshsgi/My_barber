import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { morphFont } from "../../../theme/morph-font";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../../utils/responsive";

type Tone = "error" | "warning" | "upgrade";

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

/** Chat composer ustidagi yumshoq xato / ogohlantirish / obuna kartasi. */
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
    tone === "upgrade"
      ? {
          bg: "#111111",
          border: "rgba(255,255,255,0.1)",
          iconBg: "rgba(255,255,255,0.12)",
          icon: "#FFFFFF" as const,
          iconName: "sparkles" as const,
          title: "#FFFFFF",
          message: "rgba(255,255,255,0.72)",
          ctaBg: "#FFFFFF",
          ctaFg: "#111111",
          ctaIcon: "arrow-forward" as const,
          close: "rgba(255,255,255,0.55)",
        }
      : tone === "warning"
        ? {
            bg: "#FFFBEB",
            border: "#F5E6C8",
            iconBg: "#FEF3C7",
            icon: "#92400E" as const,
            iconName: "warning" as const,
            title: "#111111",
            message: "#78716C",
            ctaBg: "#111111",
            ctaFg: "#FFFFFF",
            ctaIcon: "refresh" as const,
            close: "#A8A29E",
          }
        : {
            bg: "#FAFAFA",
            border: "#E4E4E7",
            iconBg: "#FEE2E2",
            icon: "#B91C1C" as const,
            iconName: "alert-circle" as const,
            title: "#111111",
            message: "#52525B",
            ctaBg: "#111111",
            ctaFg: "#FFFFFF",
            ctaIcon: "refresh" as const,
            close: "#71717A",
          };

  return (
    <Animated.View
      entering={FadeInUp.duration(240)}
      style={[
        styles.wrap,
        tone === "upgrade" && styles.wrapUpgrade,
        { backgroundColor: palette.bg, borderColor: palette.border },
        style,
      ]}
      accessibilityRole="alert"
    >
      <View style={styles.topRow}>
        {tone !== "upgrade" ? (
          <View style={[styles.iconWrap, { backgroundColor: palette.iconBg }]}>
            <Ionicons name={palette.iconName} size={18} color={palette.icon} />
          </View>
        ) : null}
        <View style={styles.copy}>
          <Text style={[styles.title, { color: palette.title }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[styles.message, { color: palette.message }]}>{message}</Text>
        </View>
        <Pressable
          onPress={onDismiss}
          hitSlop={10}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={dismissA11y}
        >
          <Ionicons name="close" size={16} color={palette.close} />
        </Pressable>
      </View>

      {retryLabel && onRetry ? (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: palette.ctaBg },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
        >
          <Text style={[styles.ctaText, { color: palette.ctaFg }]}>{retryLabel}</Text>
          <Ionicons name={palette.ctaIcon} size={16} color={palette.ctaFg} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: scale(16),
    marginBottom: verticalScale(10),
    paddingHorizontal: scale(14),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(12),
    borderRadius: moderateScale(18),
    borderWidth: 1,
    gap: moderateScale(12),
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  wrapUpgrade: {
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: moderateScale(10),
  },
  iconWrap: {
    width: scale(34),
    height: scale(34),
    borderRadius: moderateScale(12),
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: moderateScale(4),
    paddingTop: verticalScale(1),
  },
  title: {
    ...morphFont,
    fontSize: fontSize(14),
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  message: {
    ...morphFont,
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
  },
  cta: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(8),
    minHeight: verticalScale(40),
    paddingHorizontal: scale(16),
    borderRadius: moderateScale(12),
  },
  ctaText: {
    ...morphFont,
    fontSize: fontSize(14),
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  close: {
    width: scale(28),
    height: scale(28),
    borderRadius: moderateScale(14),
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.78,
  },
});
