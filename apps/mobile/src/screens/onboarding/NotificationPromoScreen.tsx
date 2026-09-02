import { Ionicons } from "@expo/vector-icons";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setNotifPromoSeen } from "../../lib/guest";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = { onFinish: () => void };

export function NotificationPromoScreen({ onFinish }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const done = async (request: boolean) => {
    if (request && Platform.OS === "android") {
      try {
        // Opens system app notification settings when available.
        await Linking.openSettings();
      } catch {
        /* optional */
      }
    }
    await setNotifPromoSeen();
    onFinish();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
      <Animated.View entering={FadeInDown} style={styles.bell}>
        <Ionicons name="notifications" size={40} color="#111" />
      </Animated.View>
      <Text style={styles.title}>{t("onboarding.notifTitle")}</Text>
      <Text style={styles.sub}>{t("onboarding.notifSub")}</Text>

      <Pressable style={styles.cta} onPress={() => void done(true)}>
        <Text style={styles.ctaText}>{t("onboarding.notifEnable")}</Text>
      </Pressable>
      <Pressable style={styles.skip} onPress={() => void done(false)}>
        <Text style={styles.skipText}>{t("onboarding.notifSkip")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFA", paddingHorizontal: scale(24) },
  bell: {
    marginTop: verticalScale(64),
    alignSelf: "center",
    width: scale(84),
    height: scale(84),
    borderRadius: scale(28),
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(24),
  },
  title: {
    textAlign: "center",
    fontSize: fontSize(28),
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.6,
  },
  sub: {
    marginTop: verticalScale(12),
    textAlign: "center",
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    color: "#737373",
  },
  cta: {
    marginTop: "auto",
    backgroundColor: "#111",
    borderRadius: moderateScale(28),
    minHeight: verticalScale(54),
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: "#FFF", fontWeight: "700", fontSize: fontSize(16) },
  skip: { marginTop: verticalScale(12), alignItems: "center", paddingVertical: 12 },
  skipText: { color: "#737373", fontWeight: "600", fontSize: fontSize(15) },
});
