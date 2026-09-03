import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { morphFont } from "../../../theme/morph-font";
import { SOFT_PAPER } from "../../../theme/morph-appearance";
import { useMorphAppearance } from "../../../lib/MorphAppearanceContext";
import { ChatAmbientBg } from "./ChatAmbientBg";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../../utils/responsive";

type Props = {
  headline: string;
  subtitle: string;
  menuA11y: string;
  onMenu: () => void;
  onExit: () => void;
  exitA11y: string;
  bottomPad: number;
  composer: ReactNode;
  chips: ReactNode;
  notice?: ReactNode;
};

/** Bo'sh chat — Soft Paper welcome. */
export function MorphChatWelcome({
  headline,
  subtitle,
  menuA11y,
  onMenu,
  onExit,
  exitA11y,
  bottomPad,
  composer,
  chips,
  notice,
}: Props) {
  const insets = useSafeAreaInsets();
  const { fs } = useMorphAppearance();

  return (
    <View style={styles.root}>
      <ChatAmbientBg />
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable
          onPress={onMenu}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={menuA11y}
        >
          <Ionicons name="menu" size={22} color={SOFT_PAPER.fg} />
        </Pressable>
        <View style={styles.headerSpacer} />
        <Pressable
          onPress={onExit}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={exitA11y}
        >
          <Ionicons name="chevron-forward" size={24} color={SOFT_PAPER.fg} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Animated.View entering={FadeInDown.duration(360).delay(60)} style={styles.copy}>
          <Animated.Text
            style={[styles.headline, { fontSize: fs(27), lineHeight: fs(34) }]}
          >
            {headline}
          </Animated.Text>
          <Animated.Text
            style={[styles.lede, { fontSize: fs(13.5), lineHeight: fs(20) }]}
          >
            {subtitle}
          </Animated.Text>
        </Animated.View>

        {notice ? <View style={styles.notice}>{notice}</View> : null}
      </View>

      <View style={[styles.dock, { paddingBottom: bottomPad }]}>
        {chips ? (
          <Animated.View entering={FadeInDown.duration(380).delay(80)} style={styles.chips}>
            {chips}
          </Animated.View>
        ) : null}
        <Animated.View entering={FadeInDown.duration(360).delay(40)} style={styles.composer}>
          {composer}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SOFT_PAPER.bg,
  },
  header: {
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
  },
  headerSpacer: { flex: 1 },
  headerBtn: {
    width: scale(42),
    height: scale(42),
    borderRadius: moderateScale(21),
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.82,
  },
  hero: {
    flex: 1,
    zIndex: 1,
    justifyContent: "center",
    paddingHorizontal: scale(22),
    backgroundColor: "transparent",
  },
  copy: {
    alignItems: "center",
    paddingHorizontal: scale(8),
  },
  headline: {
    ...morphFont,
    fontSize: fontSize(26),
    lineHeight: fontSize(32),
    fontWeight: "600",
    color: SOFT_PAPER.fg,
    letterSpacing: -0.6,
    textAlign: "center",
  },
  lede: {
    marginTop: verticalScale(8),
    ...morphFont,
    fontSize: fontSize(13),
    lineHeight: fontSize(19),
    color: SOFT_PAPER.muted,
    textAlign: "center",
    maxWidth: scale(340),
  },
  notice: {
    marginHorizontal: -scale(6),
    marginBottom: verticalScale(12),
  },
  composer: {
    marginTop: verticalScale(2),
  },
  chips: {
    marginBottom: verticalScale(12),
  },
  dock: {
    zIndex: 1,
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(8),
  },
});
