import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setAppGender, type AppGender } from "../../lib/guest";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = {
  onFinish: (gender: AppGender) => void;
  onBack?: () => void;
};

export function GenderSelectScreen({ onFinish, onBack }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const pick = async (gender: AppGender) => {
    await setAppGender(gender);
    onFinish(gender);
  };

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <StatusBar style="dark" />
      {onBack ? (
        <Pressable onPress={onBack} style={styles.backBtn} accessibilityRole="button" hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="#111" />
        </Pressable>
      ) : (
        <View style={styles.backSpacer} />
      )}
      <Animated.Text entering={FadeInDown.duration(400)} style={styles.title}>
        {t("onboarding.genderTitle")}
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(80)} style={styles.sub}>
        {t("onboarding.genderSub")}
      </Animated.Text>

      <Animated.View entering={FadeInUp.delay(120)} style={styles.row}>
        <Pressable style={styles.card} onPress={() => void pick("male")}>
          <View style={[styles.icon, { backgroundColor: "#EEF2FF" }]}>
            <Ionicons name="man" size={36} color="#3730A3" />
          </View>
          <Text style={styles.label}>{t("onboarding.male")}</Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => void pick("female")}>
          <View style={[styles.icon, { backgroundColor: "#FDF2F8" }]}>
            <Ionicons name="woman" size={36} color="#9D174D" />
          </View>
          <Text style={styles.label}>{t("onboarding.female")}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF", paddingHorizontal: scale(24) },
  backBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(14),
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(8),
  },
  backSpacer: { height: verticalScale(12) },
  title: {
    fontSize: fontSize(28),
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.6,
    marginTop: verticalScale(16),
  },
  sub: {
    marginTop: verticalScale(10),
    fontSize: fontSize(15),
    color: "#737373",
    lineHeight: fontSize(22),
  },
  row: {
    flexDirection: "row",
    gap: scale(12),
    marginTop: verticalScale(48),
  },
  card: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: moderateScale(24),
    paddingVertical: verticalScale(28),
    paddingHorizontal: scale(14),
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    gap: verticalScale(14),
  },
  icon: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: fontSize(17), fontWeight: "700", color: "#111" },
});
