import { Ionicons } from "@expo/vector-icons";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
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

const C = {
  bg: "#07080C",
  card: "#121620",
  fg: "#F4F6FB",
  muted: "#9AA3B5",
  accent: "#2EE6A8",
  accentDim: "rgba(46, 230, 168, 0.16)",
} as const;

export function NotificationPromoScreen({ onFinish }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const done = async (request: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (request) {
        const granted = await ensureCareNotificationPermission();
        // Android 13+: ruxsat rad etilsa yoki so‘rov ishlamasa — sozlamalar.
        if (!granted && Platform.OS === "android") {
          try {
            await Linking.openSettings();
          } catch {
            /* optional */
          }
        }
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
      <Animated.View entering={FadeInDown} style={styles.bell}>
        <Ionicons name="notifications" size={36} color={C.accent} />
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
  root: { flex: 1, backgroundColor: C.bg, paddingHorizontal: scale(24) },
  bell: {
    marginTop: verticalScale(64),
    alignSelf: "center",
    width: scale(88),
    height: scale(88),
    borderRadius: scale(28),
    backgroundColor: C.accentDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(24),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(46,230,168,0.35)",
  },
  title: {
    textAlign: "center",
    fontSize: fontSize(28),
    fontWeight: "800",
    color: C.fg,
    letterSpacing: -0.6,
  },
  sub: {
    marginTop: verticalScale(12),
    textAlign: "center",
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    color: C.muted,
  },
  cta: {
    marginTop: "auto",
    backgroundColor: C.accent,
    borderRadius: moderateScale(18),
    minHeight: verticalScale(54),
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: "#04140F", fontWeight: "800", fontSize: fontSize(16) },
  skip: { marginTop: verticalScale(12), alignItems: "center", paddingVertical: 12 },
  skipText: { color: C.muted, fontWeight: "600", fontSize: fontSize(15) },
});
