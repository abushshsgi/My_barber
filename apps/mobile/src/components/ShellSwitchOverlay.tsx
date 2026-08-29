import { Image } from "expo-image";
import { useEffect } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { morfMarkWhite } from "../branding/morf-logo";
import type { AppShell } from "../lib/app-shell";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../utils/responsive";

const mysaloonIcon = require("../../assets/icon.png");

type Props = {
  visible: boolean;
  target: AppShell | null;
};

/** MySaloon ↔ Morf AI — to‘liq ekran qora loading. */
export function ShellSwitchOverlay({ visible, target }: Props) {
  const pulse = useSharedValue(1);
  const fade = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      fade.value = 0;
      return;
    }
    fade.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [visible, fade, pulse]);

  const rootAnim = useAnimatedStyle(() => ({
    opacity: fade.value,
  }));

  const logoAnim = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  if (!visible || !target) return null;

  const toMorph = target === "morph";

  return (
    <Modal visible animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.root, rootAnim]}>
        <Animated.View style={[styles.logoWrap, logoAnim]}>
          {toMorph ? (
            <Image source={morfMarkWhite} style={styles.logo} contentFit="contain" />
          ) : (
            <Image source={mysaloonIcon} style={styles.appIcon} contentFit="cover" />
          )}
        </Animated.View>
        <Text style={styles.title}>{toMorph ? "Morf AI" : "MySaloon"}</Text>
        <Text style={styles.sub}>Yuklanmoqda…</Text>
        <ActivityIndicator color="#FFF" style={styles.spinner} size="large" />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(32),
  },
  logoWrap: {
    width: scale(88),
    height: scale(88),
    borderRadius: moderateScale(44),
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(18),
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.14)",
  },
  logo: {
    width: scale(44),
    height: scale(44),
  },
  appIcon: {
    width: scale(84),
    height: scale(84),
    borderRadius: moderateScale(42),
  },
  title: {
    color: "#FFF",
    fontSize: fontSize(26),
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  sub: {
    marginTop: verticalScale(8),
    color: "rgba(255,255,255,0.55)",
    fontSize: fontSize(15),
    fontWeight: "600",
  },
  spinner: {
    marginTop: verticalScale(28),
  },
});
