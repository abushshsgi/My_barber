import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../utils/responsive";

type Props = {
  message?: string;
  onDone?: () => void;
  /** Sequential steps duration total ~2.4s then onDone */
  autoFinishMs?: number;
};

/** Ketma-ket “akkaunt yaratilmoqda” animatsiyasi. */
export function AccountCreatingScreen({
  onDone,
  autoFinishMs = 2800,
}: Props) {
  const { t } = useTranslation();
  const steps = useMemo(() => {
    const raw = t("onboarding.creatingSteps", { returnObjects: true });
    if (Array.isArray(raw)) return raw as string[];
    return [
      "Profil yaratilmoqda",
      "Sozlamalar sinxronlanmoqda",
      "Morph AI tayyorlanmoqda",
      "Deyarli tayyor",
    ];
  }, [t]);
  const [active, setActive] = useState(0);
  const spin = useSharedValue(0);
  const finished = useRef(false);

  useEffect(() => {
    spin.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.linear }),
      -1,
      false,
    );
  }, [spin]);

  useEffect(() => {
    const per = Math.max(450, Math.floor(autoFinishMs / Math.max(steps.length, 1)));
    const timers: ReturnType<typeof setTimeout>[] = [];
    steps.forEach((_, i) => {
      if (i === 0) return;
      timers.push(setTimeout(() => setActive(i), per * i));
    });
    timers.push(
      setTimeout(() => {
        if (finished.current) return;
        finished.current = true;
        onDone?.();
      }, autoFinishMs),
    );
    return () => timers.forEach(clearTimeout);
  }, [autoFinishMs, onDone, steps]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeIn.duration(360)} style={styles.brandBlock}>
        <Animated.View style={[styles.ring, ringStyle]} />
        <Text style={styles.logo}>Mysaloon</Text>
        <Text style={styles.title}>{t("onboarding.creatingTitle")}</Text>
      </Animated.View>

      <View style={styles.steps}>
        {steps.map((label, i) => {
          const on = i <= active;
          const current = i === active;
          return (
            <Animated.View
              key={`${label}-${i}`}
              entering={FadeInDown.delay(i * 80)}
              style={[styles.stepRow, current && styles.stepRowOn]}
            >
              <View style={[styles.bullet, on && styles.bulletOn]}>
                {on ? <Text style={styles.tick}>✓</Text> : null}
              </View>
              <Text style={[styles.stepText, on && styles.stepTextOn]}>{label}</Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    paddingHorizontal: scale(28),
    justifyContent: "center",
  },
  brandBlock: { alignItems: "center", marginBottom: verticalScale(40) },
  ring: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.15)",
    borderTopColor: "#FFF",
    marginBottom: verticalScale(20),
  },
  logo: {
    color: "#FFF",
    fontSize: fontSize(34),
    fontWeight: "900",
    letterSpacing: -1,
  },
  title: {
    marginTop: verticalScale(10),
    color: "rgba(255,255,255,0.65)",
    fontSize: fontSize(15),
    fontWeight: "600",
  },
  steps: { gap: verticalScale(10) },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: moderateScale(16),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(14),
  },
  stepRowOn: { backgroundColor: "rgba(255,255,255,0.1)" },
  bullet: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  bulletOn: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  tick: { color: "#04140A", fontWeight: "800", fontSize: 13 },
  stepText: { color: "rgba(255,255,255,0.45)", fontSize: fontSize(14), fontWeight: "600" },
  stepTextOn: { color: "#FFF" },
});
