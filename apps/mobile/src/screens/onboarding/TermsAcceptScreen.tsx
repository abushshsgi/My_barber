import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setTermsAccepted } from "../../lib/guest";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = { onFinish: () => void };

export function TermsAcceptScreen({ onFinish }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [accepted, setAccepted] = useState(false);

  const continueNext = async () => {
    if (!accepted) return;
    await setTermsAccepted();
    onFinish();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
      <Animated.Text entering={FadeInDown} style={styles.title}>
        {t("onboarding.termsTitle")}
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(60)} style={styles.body}>
        {t("onboarding.termsBody")}
      </Animated.Text>

      <Pressable
        style={styles.checkRow}
        onPress={() => setAccepted((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
      >
        <View style={[styles.box, accepted && styles.boxOn]}>
          {accepted ? <Text style={styles.check}>✓</Text> : null}
        </View>
        <Text style={styles.checkLabel}>{t("onboarding.acceptRules")}</Text>
      </Pressable>

      <Pressable
        style={[styles.cta, !accepted && styles.ctaOff]}
        disabled={!accepted}
        onPress={() => void continueNext()}
      >
        <Text style={styles.ctaText}>{t("onboarding.continue")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFA", paddingHorizontal: scale(24) },
  title: {
    marginTop: verticalScale(36),
    fontSize: fontSize(28),
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.6,
  },
  body: {
    marginTop: verticalScale(14),
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    color: "#525252",
  },
  checkRow: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
    marginBottom: verticalScale(16),
  },
  box: {
    width: scale(24),
    height: scale(24),
    borderRadius: moderateScale(7),
    borderWidth: 1.5,
    borderColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { backgroundColor: "#111" },
  check: { color: "#FFF", fontWeight: "800", fontSize: 14 },
  checkLabel: { flex: 1, fontSize: fontSize(15), fontWeight: "600", color: "#111" },
  cta: {
    backgroundColor: "#111",
    borderRadius: moderateScale(28),
    minHeight: verticalScale(54),
    alignItems: "center",
    justifyContent: "center",
  },
  ctaOff: { opacity: 0.35 },
  ctaText: { color: "#FFF", fontWeight: "700", fontSize: fontSize(16) },
});
