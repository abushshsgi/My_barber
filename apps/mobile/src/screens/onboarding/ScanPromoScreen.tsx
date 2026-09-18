import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setScanPromoSeen } from "../../lib/guest";
import { colors } from "../../theme/colors";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = { onFinish: () => void };

const TIP_KEYS = ["scanTip1", "scanTip2", "scanTip3"] as const;
const TIP_ICONS: Array<keyof typeof Ionicons.glyphMap> = [
  "sunny-outline",
  "person-outline",
  "glasses-outline",
];

export function ScanPromoScreen({ onFinish }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + verticalScale(12),
          paddingBottom: insets.bottom + verticalScale(16),
        },
      ]}
    >
      {/* Soft hero — illustrated face frame, not a centered purple blob */}
      <Animated.View entering={FadeIn.duration(420)} style={styles.heroPane}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>Morph AI</Text>
        </View>

        <View style={styles.frameWrap}>
          <View style={styles.frameOuter}>
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
            <View style={styles.faceSilhouette}>
              <Ionicons name="scan-outline" size={scale(36)} color={colors.fg} />
            </View>
          </View>
          <View style={styles.stepRow}>
            {[1, 2, 3].map((n) => (
              <View key={n} style={styles.stepPill}>
                <Text style={styles.stepPillText}>{n}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>

      {/* Bottom sheet–style Soft Paper card */}
      <Animated.View entering={FadeInUp.delay(80).duration(480)} style={styles.sheet}>
        <View style={styles.sheetHandle} />

        <Animated.Text entering={FadeInDown.delay(120)} style={styles.title}>
          {t("onboarding.scanTitle")}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(160)} style={styles.sub}>
          {t("onboarding.scanSub")}
        </Animated.Text>

        <View style={styles.tipList}>
          {TIP_KEYS.map((key, i) => (
            <Animated.View
              key={key}
              entering={FadeInDown.delay(200 + i * 60)}
              style={styles.tipRow}
            >
              <View style={styles.tipIcon}>
                <Ionicons name={TIP_ICONS[i]} size={18} color={colors.fg} />
              </View>
              <Text style={styles.tipText}>{t(`onboarding.${key}`)}</Text>
            </Animated.View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={() => {
            void setScanPromoSeen().then(onFinish);
          }}
        >
          <Text style={styles.ctaText}>{t("onboarding.scanCta")}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const CORNER = moderateScale(18);
const CORNER_W = moderateScale(22);
const CORNER_H = 2.5;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: scale(16),
    justifyContent: "space-between",
  },
  heroPane: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: verticalScale(220),
    paddingVertical: verticalScale(12),
  },
  heroBadge: {
    alignSelf: "flex-start",
    marginBottom: verticalScale(20),
    marginLeft: scale(8),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: moderateScale(999),
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  heroBadgeText: {
    fontSize: fontSize(11),
    fontWeight: "700",
    letterSpacing: 0.4,
    color: colors.muted,
    textTransform: "uppercase",
  },
  frameWrap: {
    alignItems: "center",
    gap: verticalScale(18),
  },
  frameOuter: {
    width: scale(168),
    height: scale(210),
    borderRadius: moderateScale(28),
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cornerTL: {
    position: "absolute",
    top: scale(14),
    left: scale(14),
    width: CORNER_W,
    height: CORNER,
    borderTopWidth: CORNER_H,
    borderLeftWidth: CORNER_H,
    borderColor: colors.fg,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    position: "absolute",
    top: scale(14),
    right: scale(14),
    width: CORNER_W,
    height: CORNER,
    borderTopWidth: CORNER_H,
    borderRightWidth: CORNER_H,
    borderColor: colors.fg,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    position: "absolute",
    bottom: scale(14),
    left: scale(14),
    width: CORNER_W,
    height: CORNER,
    borderBottomWidth: CORNER_H,
    borderLeftWidth: CORNER_H,
    borderColor: colors.fg,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    position: "absolute",
    bottom: scale(14),
    right: scale(14),
    width: CORNER_W,
    height: CORNER,
    borderBottomWidth: CORNER_H,
    borderRightWidth: CORNER_H,
    borderColor: colors.fg,
    borderBottomRightRadius: 4,
  },
  faceSilhouette: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    backgroundColor: colors.promo,
    alignItems: "center",
    justifyContent: "center",
  },
  stepRow: {
    flexDirection: "row",
    gap: scale(8),
  },
  stepPill: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepPillText: {
    fontSize: fontSize(12),
    fontWeight: "700",
    color: colors.fg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(28),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: scale(22),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(18),
  },
  sheetHandle: {
    alignSelf: "center",
    width: scale(36),
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(17,17,17,0.12)",
    marginBottom: verticalScale(16),
  },
  title: {
    fontSize: fontSize(26),
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.5,
  },
  sub: {
    marginTop: verticalScale(8),
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    color: colors.muted,
  },
  tipList: {
    marginTop: verticalScale(18),
    gap: verticalScale(10),
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
    backgroundColor: colors.bg,
    borderRadius: moderateScale(16),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(12),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tipIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: moderateScale(12),
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tipText: {
    flex: 1,
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    fontWeight: "500",
    color: colors.fg,
  },
  cta: {
    marginTop: verticalScale(20),
    backgroundColor: colors.fg,
    borderRadius: moderateScale(28),
    minHeight: verticalScale(54),
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPressed: { opacity: 0.88 },
  ctaText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: fontSize(16),
  },
});
