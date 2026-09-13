import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeBottom, safeTop } from "../../../lib/safe-area";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { NativeBackButton } from "../../ui/NativeBackButton";
import { morphFont } from "../../../theme/morph-font";
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

/** Bo'sh chat — dark welcome, input birinchi e'tibor. */
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
  const { fs, colors: pal } = useMorphAppearance();

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <ChatAmbientBg />
      <StatusBar style={pal.status} />

      <View style={[styles.header, { paddingTop: safeTop(insets.top, 16) }]}>
        <Pressable
          onPress={onMenu}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={menuA11y}
          hitSlop={8}
        >
          <Ionicons name="menu" size={22} color={pal.fg} />
        </Pressable>
        <View style={styles.headerSpacer} />
        <NativeBackButton
          onPress={onExit}
          forward
          accessibilityLabel={exitA11y}
        />
      </View>

      <View style={styles.hero}>
        <Animated.View entering={FadeInDown.duration(360).delay(60)} style={styles.copy}>
          <Animated.View entering={FadeIn.duration(420).delay(40)} style={styles.badge}>
            <Ionicons name="sparkles" size={12} color="#FFFFFF" />
            <Text style={styles.badgeText}>Morf AI</Text>
          </Animated.View>
          <Animated.Text
            style={[
              styles.headline,
              { color: pal.fg, fontSize: fs(28), lineHeight: fs(34) },
            ]}
          >
            {headline}
          </Animated.Text>
          <View style={styles.accentLine} />
          <Animated.Text
            style={[
              styles.lede,
              { color: pal.muted, fontSize: fs(13.5), lineHeight: fs(20) },
            ]}
          >
            {subtitle}
          </Animated.Text>
        </Animated.View>
      </View>

      <View style={[styles.dock, { paddingBottom: bottomPad }]}>
        {notice ? (
          <Animated.View entering={FadeInDown.duration(320)} style={styles.notice}>
            {notice}
          </Animated.View>
        ) : null}
        {chips ? (
          <Animated.View entering={FadeInDown.duration(380).delay(100)} style={styles.chips}>
            {chips}
          </Animated.View>
        ) : null}
        <Animated.View entering={FadeInDown.duration(420).delay(40)} style={styles.composer}>
          {composer}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
  },
  headerSpacer: { flex: 1 },
  headerBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(20),
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
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(6),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    marginBottom: verticalScale(14),
  },
  badgeText: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  headline: {
    ...morphFont,
    fontSize: fontSize(28),
    lineHeight: fontSize(34),
    fontWeight: "700",
    letterSpacing: -0.7,
    textAlign: "center",
  },
  accentLine: {
    marginTop: verticalScale(12),
    width: scale(42),
    height: verticalScale(3),
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  lede: {
    marginTop: verticalScale(12),
    ...morphFont,
    fontSize: fontSize(13),
    lineHeight: fontSize(19),
    textAlign: "center",
    maxWidth: scale(340),
  },
  notice: {
    marginBottom: verticalScale(10),
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
