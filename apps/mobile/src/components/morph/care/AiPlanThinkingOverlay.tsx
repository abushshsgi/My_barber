import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { morphFont } from "../../../theme/morph-font";
import { fontSize, moderateScale, scale, verticalScale } from "../../../utils/responsive";

export type AiScanProduct = {
  id: number | string;
  name: string;
  image?: string | null;
};

type Props = {
  appending?: boolean;
  products?: AiScanProduct[];
};

const STEP_MS = 1500;
const CARD_H = verticalScale(92);

const STEP_KEYS = ["scan", "texture", "match", "write"] as const;

/** Qorong‘i glassmorphism — mahsulot skaneri va monoton progress. Reset/blink yo‘q. */
export function AiPlanThinkingOverlay({ appending, products }: Props) {
  const { t } = useTranslation();
  const [stepIdx, setStepIdx] = useState(0);
  const [productIdx, setProductIdx] = useState(0);

  const glow = useSharedValue(0);
  const beam = useSharedValue(0);
  const progress = useSharedValue(0);
  const copyOp = useSharedValue(1);
  const cardOp = useSharedValue(1);

  const labels = useMemo(
    () => [
      t("care.routine.aiAnimScan", { defaultValue: "Mahsulotlaringiz o‘qilmoqda…" }),
      t("care.routine.aiAnimTexture", { defaultValue: "Soch tuzilmasi tahlil qilinmoqda…" }),
      t("care.routine.aiAnimMatch", { defaultValue: "Soch holatiga moslash…" }),
      t("care.routine.aiAnimWrite", { defaultValue: "Shaxsiy reja yozilmoqda…" }),
    ],
    [t],
  );

  const list = products?.length ? products : [];
  const product = list.length ? list[productIdx % list.length] : null;

  useEffect(() => {
    glow.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    beam.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.linear }),
      -1,
      false,
    );
    progress.value = withTiming(0.96, {
      duration: STEP_KEYS.length * STEP_MS + 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [beam, glow, progress]);

  useEffect(() => {
    const tick = setInterval(() => {
      setStepIdx((i) => (i + 1) % STEP_KEYS.length);
      setProductIdx((i) => i + 1);
    }, STEP_MS);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    copyOp.value = 0.35;
    copyOp.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [copyOp, stepIdx]);

  useEffect(() => {
    cardOp.value = 0.45;
    cardOp.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [cardOp, productIdx]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.45, 0.95]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.92, 1.08]) }],
  }));

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(glow.value, [0, 1], [1, 1.05]) }],
  }));

  const beamStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(beam.value, [0, 1], [-8, CARD_H]) }],
    opacity: interpolate(beam.value, [0, 0.08, 0.88, 1], [0, 0.95, 0.95, 0]),
  }));

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.max(0.04, progress.value) }],
  }));

  const copyStyle = useAnimatedStyle(() => ({ opacity: copyOp.value }));
  const cardStyle = useAnimatedStyle(() => ({ opacity: cardOp.value }));

  return (
    <View style={styles.root} accessibilityRole="progressbar">
      <LinearGradient
        colors={["rgba(99,102,241,0.28)", "rgba(2,6,23,0)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
        style={styles.wash}
        pointerEvents="none"
      />

      <View style={styles.stage}>
        <Animated.View style={[styles.glow, glowStyle]} />
        <Animated.View style={[styles.core, coreStyle]}>
          <Ionicons name="sparkles" size={26} color="#E0E7FF" />
        </Animated.View>
      </View>

      <Text style={styles.eyebrow}>
        {appending
          ? t("care.routine.aiPlanAppending")
          : t("care.routine.aiPlanLoading")}
      </Text>
      <Text style={styles.title}>
        {t("care.routine.aiAnimTitle", { defaultValue: "AI reja tuzmoqda" })}
      </Text>
      <Animated.Text style={[styles.sub, copyStyle]}>{labels[stepIdx]}</Animated.Text>

      <View style={styles.scanner}>
        <Animated.View style={[styles.scannerInner, cardStyle]}>
          {product?.image ? (
            <Image
              source={{ uri: product.image }}
              style={styles.thumb}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={0}
              recyclingKey={`scan-${product.id}`}
            />
          ) : (
            <View style={[styles.thumb, styles.thumbPh]}>
              <Ionicons name="flask-outline" size={22} color="#C7D2FE" />
            </View>
          )}
          <View style={styles.scannerCopy}>
            <Text style={styles.scannerKicker}>
              {t("care.routine.aiAnimScanning", { defaultValue: "Skaner" })}
            </Text>
            <Text style={styles.scannerName} numberOfLines={2}>
              {product?.name ||
                t("care.routine.aiAnimNoProduct", { defaultValue: "Soch profilingiz" })}
            </Text>
          </View>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.beam, beamStyle]}>
          <LinearGradient
            colors={["rgba(129,140,248,0)", "rgba(165,180,252,0.95)", "rgba(129,140,248,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>

      <View style={styles.steps}>
        {STEP_KEYS.map((key, i) => {
          const on = i === stepIdx;
          const done = i < stepIdx;
          return (
            <View key={key} style={[styles.stepPill, on && styles.stepPillOn, done && styles.stepPillDone]} />
          );
        })}
      </View>

      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barStyle]} />
      </View>
      <Text style={styles.hint}>
        {t("care.routine.aiThinkingHint", {
          defaultValue: "AI o‘ylamoqda — reja tayyor bo‘lguncha kuting",
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: verticalScale(8),
    borderRadius: moderateScale(24),
    backgroundColor: "#020617",
    paddingVertical: verticalScale(26),
    paddingHorizontal: scale(18),
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(165,180,252,0.22)",
  },
  wash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: verticalScale(160),
  },
  stage: {
    width: scale(88),
    height: scale(88),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(8),
  },
  glow: {
    position: "absolute",
    width: scale(88),
    height: scale(88),
    borderRadius: scale(44),
    backgroundColor: "rgba(99,102,241,0.35)",
  },
  core: {
    width: scale(58),
    height: scale(58),
    borderRadius: scale(29),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(49,46,129,0.92)",
    borderWidth: 1,
    borderColor: "rgba(199,210,254,0.45)",
  },
  eyebrow: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#A5B4FC",
    textAlign: "center",
  },
  title: {
    ...morphFont,
    marginTop: verticalScale(4),
    fontSize: fontSize(18),
    fontWeight: "800",
    color: "#F8FAFC",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  sub: {
    ...morphFont,
    marginTop: verticalScale(6),
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: "rgba(226,232,240,0.78)",
    textAlign: "center",
    minHeight: fontSize(36),
  },
  scanner: {
    marginTop: verticalScale(8),
    width: "100%",
    height: CARD_H,
    borderRadius: moderateScale(18),
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  scannerInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
    paddingHorizontal: scale(12),
  },
  thumb: {
    width: scale(56),
    height: scale(56),
    borderRadius: moderateScale(14),
    backgroundColor: "#1E1B4B",
  },
  thumbPh: {
    alignItems: "center",
    justifyContent: "center",
  },
  scannerCopy: { flex: 1, minWidth: 0 },
  scannerKicker: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#A5B4FC",
  },
  scannerName: {
    ...morphFont,
    marginTop: 2,
    fontSize: fontSize(15),
    fontWeight: "700",
    color: "#F8FAFC",
  },
  beam: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
    top: 0,
  },
  steps: {
    flexDirection: "row",
    gap: moderateScale(8),
    marginTop: verticalScale(14),
  },
  stepPill: {
    width: scale(28),
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  stepPillOn: { backgroundColor: "#A5B4FC" },
  stepPillDone: { backgroundColor: "#4F46E5" },
  barTrack: {
    marginTop: verticalScale(12),
    width: "100%",
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    width: "100%",
    borderRadius: 999,
    backgroundColor: "#818CF8",
    transformOrigin: "left",
  },
  hint: {
    ...morphFont,
    fontSize: fontSize(11),
    color: "rgba(226,232,240,0.55)",
    textAlign: "center",
    marginTop: verticalScale(8),
  },
});
