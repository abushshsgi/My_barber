import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
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

/** Morph AI — timZ / dark neon accent (Soft Paper emas). */
const C = {
  bg: "#07080C",
  bgMid: "#0E121A",
  card: "rgba(18, 22, 32, 0.92)",
  line: "rgba(255,255,255,0.1)",
  fg: "#F4F6FB",
  muted: "#9AA3B5",
  accent: "#2EE6A8",
  accentDim: "rgba(46, 230, 168, 0.18)",
  accentGlow: "rgba(46, 230, 168, 0.35)",
} as const;

const TIP_KEYS = ["scanTip1", "scanTip2", "scanTip3"] as const;
const TIP_ICONS: Array<keyof typeof Ionicons.glyphMap> = [
  "sunny",
  "eye",
  "glasses",
];

export function ScanPromoScreen({ onFinish }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1100 }),
        withTiming(1, { duration: 1100 }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.55 + (pulse.value - 1) * 4,
  }));

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[C.bg, C.bgMid, "#0A1620"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.glowOrb, styles.glowTop]} />
      <View style={[styles.glowOrb, styles.glowBottom]} />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + verticalScale(10),
            paddingBottom: insets.bottom + verticalScale(14),
          },
        ]}
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.topRow}>
          <View style={styles.brandChip}>
            <View style={styles.brandDot} />
            <Text style={styles.brandText}>Morph AI</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(60).duration(500)} style={styles.hero}>
          <Animated.View style={[styles.pulseRing, ringStyle]} />
          <View style={styles.frame}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            <LinearGradient
              colors={["rgba(46,230,168,0.12)", "transparent", "rgba(46,230,168,0.08)"]}
              style={styles.frameInner}
            >
              <View style={styles.scanBadge}>
                <Ionicons name="scan" size={scale(28)} color={C.accent} />
              </View>
              <Text style={styles.frameHint}>FACE LOCK</Text>
            </LinearGradient>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(100).duration(480)} style={styles.sheet}>
          <View style={styles.sheetAccent} />
          <Text style={styles.kicker}>{t("onboarding.scanTitle")}</Text>
          <Text style={styles.sub}>{t("onboarding.scanSub")}</Text>

          <View style={styles.tipList}>
            {TIP_KEYS.map((key, i) => (
              <Animated.View
                key={key}
                entering={FadeInDown.delay(160 + i * 70)}
                style={styles.tipRow}
              >
                <View style={styles.tipIcon}>
                  <Ionicons name={TIP_ICONS[i]} size={17} color={C.accent} />
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
            <LinearGradient
              colors={[C.accent, "#1BC48A"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.ctaGrad}
            >
              <Text style={styles.ctaText}>{t("onboarding.scanCta")}</Text>
              <Ionicons name="arrow-forward" size={18} color="#04140F" />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const CORNER = moderateScale(20);
const CORNER_T = 2.5;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: {
    flex: 1,
    paddingHorizontal: scale(18),
    justifyContent: "space-between",
  },
  glowOrb: {
    position: "absolute",
    width: scale(220),
    height: scale(220),
    borderRadius: scale(110),
    backgroundColor: C.accentGlow,
  },
  glowTop: { top: -scale(40), right: -scale(60), opacity: 0.35 },
  glowBottom: { bottom: scale(80), left: -scale(80), opacity: 0.2 },
  topRow: { flexDirection: "row", alignItems: "center" },
  brandChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(7),
    borderRadius: moderateScale(999),
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  brandDot: {
    width: scale(7),
    height: scale(7),
    borderRadius: scale(4),
    backgroundColor: C.accent,
  },
  brandText: {
    color: C.fg,
    fontSize: fontSize(12),
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  hero: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: verticalScale(240),
  },
  pulseRing: {
    position: "absolute",
    width: scale(210),
    height: scale(250),
    borderRadius: moderateScale(36),
    borderWidth: 1.5,
    borderColor: C.accent,
  },
  frame: {
    width: scale(176),
    height: scale(220),
    borderRadius: moderateScale(28),
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  frameInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: verticalScale(10),
  },
  scanBadge: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(20),
    backgroundColor: C.accentDim,
    alignItems: "center",
    justifyContent: "center",
  },
  frameHint: {
    color: C.accent,
    fontSize: fontSize(10),
    fontWeight: "800",
    letterSpacing: 2,
  },
  corner: {
    position: "absolute",
    width: CORNER,
    height: CORNER,
    borderColor: C.accent,
    zIndex: 2,
  },
  tl: {
    top: scale(12),
    left: scale(12),
    borderTopWidth: CORNER_T,
    borderLeftWidth: CORNER_T,
    borderTopLeftRadius: 6,
  },
  tr: {
    top: scale(12),
    right: scale(12),
    borderTopWidth: CORNER_T,
    borderRightWidth: CORNER_T,
    borderTopRightRadius: 6,
  },
  bl: {
    bottom: scale(12),
    left: scale(12),
    borderBottomWidth: CORNER_T,
    borderLeftWidth: CORNER_T,
    borderBottomLeftRadius: 6,
  },
  br: {
    bottom: scale(12),
    right: scale(12),
    borderBottomWidth: CORNER_T,
    borderRightWidth: CORNER_T,
    borderBottomRightRadius: 6,
  },
  sheet: {
    borderRadius: moderateScale(28),
    backgroundColor: C.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(22),
    paddingBottom: verticalScale(18),
    overflow: "hidden",
  },
  sheetAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: C.accent,
    opacity: 0.85,
  },
  kicker: {
    color: C.fg,
    fontSize: fontSize(26),
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  sub: {
    marginTop: verticalScale(8),
    color: C.muted,
    fontSize: fontSize(14),
    lineHeight: fontSize(21),
  },
  tipList: { marginTop: verticalScale(18), gap: verticalScale(10) },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(12),
    borderRadius: moderateScale(16),
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  tipIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(12),
    backgroundColor: C.accentDim,
    alignItems: "center",
    justifyContent: "center",
  },
  tipText: {
    flex: 1,
    color: C.fg,
    fontSize: fontSize(13),
    fontWeight: "600",
    lineHeight: fontSize(18),
  },
  cta: {
    marginTop: verticalScale(20),
    borderRadius: moderateScale(18),
    overflow: "hidden",
  },
  ctaPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  ctaGrad: {
    minHeight: verticalScale(54),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    paddingHorizontal: scale(18),
  },
  ctaText: {
    color: "#04140F",
    fontSize: fontSize(16),
    fontWeight: "800",
  },
});
