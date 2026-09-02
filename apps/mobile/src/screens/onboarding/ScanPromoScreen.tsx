import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setScanPromoSeen } from "../../lib/guest";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = { onFinish: () => void };

export function ScanPromoScreen({ onFinish }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <Animated.View entering={ZoomIn.duration(480)} style={styles.hero}>
        <Ionicons name="scan" size={64} color="#FFF" />
      </Animated.View>
      <Animated.Text entering={FadeInDown.delay(80)} style={styles.title}>
        {t("onboarding.scanTitle")}
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(140)} style={styles.sub}>
        {t("onboarding.scanSub")}
      </Animated.Text>
      <Pressable
        style={styles.cta}
        onPress={() => {
          void setScanPromoSeen().then(onFinish);
        }}
      >
        <Text style={styles.ctaText}>{t("onboarding.scanCta")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    paddingHorizontal: scale(24),
    justifyContent: "center",
  },
  hero: {
    alignSelf: "center",
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: "#6D28D9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(28),
  },
  title: {
    textAlign: "center",
    color: "#FFF",
    fontSize: fontSize(28),
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  sub: {
    marginTop: verticalScale(12),
    textAlign: "center",
    color: "rgba(255,255,255,0.7)",
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
  },
  cta: {
    marginTop: verticalScale(36),
    backgroundColor: "#FFF",
    borderRadius: moderateScale(28),
    minHeight: verticalScale(54),
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: "#111", fontWeight: "700", fontSize: fontSize(16) },
});
