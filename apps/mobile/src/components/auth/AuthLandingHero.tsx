import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GoogleGlyph } from "../GoogleGlyph";
import { LoginHeroIllustration } from "../welcome/LoginHeroIllustration";
import { colors } from "../../theme/colors";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = {
  title: string;
  subtitle: string;
  googleLabel: string;
  phoneLabel: string;
  onGoogle: () => void;
  onPhone: () => void;
  googleWaiting: boolean;
  extra?: ReactNode;
};

export function AuthLandingHero({
  title,
  subtitle,
  googleLabel,
  phoneLabel,
  onGoogle,
  onPhone,
  googleWaiting,
  extra,
}: Props) {
  return (
    <View style={styles.wrap}>
      <LoginHeroIllustration size={scale(236)} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{subtitle}</Text>
      <View style={styles.progressTrack}>
        <View style={styles.progressFill} />
      </View>
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.googleBtn,
            googleWaiting && styles.disabled,
            pressed && !googleWaiting && styles.pressed,
          ]}
          onPress={onGoogle}
          disabled={googleWaiting}
          accessibilityRole="button"
          accessibilityLabel={googleLabel}
        >
          <GoogleGlyph size={20} />
          <Text style={styles.googleText}>{googleLabel}</Text>
          {googleWaiting ? <ActivityIndicator color={colors.muted} /> : null}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.phoneBtn, pressed && styles.pressed]}
          onPress={onPhone}
          accessibilityRole="button"
          accessibilityLabel={phoneLabel}
        >
          <Ionicons name="call" size={18} color={colors.forest} />
          <Text style={styles.phoneText}>{phoneLabel}</Text>
        </Pressable>
      </View>
      {extra ? <View style={styles.extra}>{extra}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingHorizontal: scale(8),
  },
  title: {
    marginTop: verticalScale(8),
    fontSize: fontSize(28),
    lineHeight: fontSize(34),
    fontWeight: "800",
    color: colors.forest,
    textAlign: "center",
    letterSpacing: -0.6,
  },
  sub: {
    marginTop: verticalScale(10),
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    color: colors.muted,
    textAlign: "center",
    maxWidth: scale(300),
    paddingHorizontal: scale(8),
  },
  progressTrack: {
    alignSelf: "stretch",
    height: verticalScale(5),
    borderRadius: moderateScale(999),
    backgroundColor: "#EEF6E0",
    marginTop: verticalScale(22),
    marginBottom: verticalScale(22),
    overflow: "hidden",
  },
  progressFill: {
    width: "42%",
    height: "100%",
    borderRadius: moderateScale(999),
    backgroundColor: colors.lime,
  },
  actions: {
    alignSelf: "stretch",
    gap: moderateScale(12),
  },
  googleBtn: {
    minHeight: verticalScale(56),
    borderRadius: moderateScale(28),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(10),
    paddingHorizontal: scale(20),
  },
  googleText: {
    fontSize: fontSize(16),
    fontWeight: "700",
    color: colors.fg,
  },
  phoneBtn: {
    minHeight: verticalScale(56),
    borderRadius: moderateScale(28),
    backgroundColor: colors.lime,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(10),
    paddingHorizontal: scale(20),
  },
  phoneText: {
    fontSize: fontSize(16),
    fontWeight: "800",
    color: colors.forest,
  },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  extra: {
    alignSelf: "stretch",
    width: "100%",
  },
});
