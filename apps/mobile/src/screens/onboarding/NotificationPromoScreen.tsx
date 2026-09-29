import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeBottom, safeTop } from "../../lib/safe-area";
import { setNotifPromoSeen } from "../../lib/guest";
import { ensureCareNotificationPermission } from "../../lib/care-reminders";
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
  const [busy, setBusy] = useState(false);

  const done = async (request: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (request) {
        await ensureCareNotificationPermission();
      }
      await setNotifPromoSeen();
      onFinish();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: safeTop(insets.top, 24),
          paddingBottom: safeBottom(insets.bottom, 20),
        },
      ]}
    >
      <StatusBar style="dark" />
      <Animated.View entering={FadeInDown} style={styles.bell}>
        <Ionicons name="notifications" size={36} color="#111" />
      </Animated.View>
      <Text style={styles.title}>{t("onboarding.notifTitle")}</Text>
      <Text style={styles.sub}>{t("onboarding.notifSub")}</Text>

      <Pressable
        style={[styles.cta, busy && styles.ctaDisabled]}
        disabled={busy}
        onPress={() => void done(true)}
      >
        <Text style={styles.ctaText}>{t("onboarding.notifEnable")}</Text>
      </Pressable>
      <Pressable style={styles.skip} disabled={busy} onPress={() => void done(false)}>
        <Text style={styles.skipText}>{t("onboarding.notifSkip")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF", paddingHorizontal: scale(24) },
  bell: {
    marginTop: verticalScale(64),
    alignSelf: "center",
    width: scale(88),
    height: scale(88),
    borderRadius: scale(44),
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
    color: "#525252",
  },
  cta: {
    marginTop: "auto",
    backgroundColor: "#111",
    borderRadius: moderateScale(28),
    minHeight: verticalScale(54),
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: { opacity: 0.35 },
  ctaText: { color: "#FFF", fontWeight: "700", fontSize: fontSize(16) },
  skip: { marginTop: verticalScale(12), alignItems: "center", paddingVertical: 12 },
  skipText: { color: "#737373", fontWeight: "600", fontSize: fontSize(15) },
});
