import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, interpolateColor, useAnimatedStyle } from "react-native-reanimated";
import { morphFont } from "../../../theme/morph-font";
import { useMorphAppearance } from "../../../lib/MorphAppearanceContext";
import { ChatAmbientBg, useWelcomeBgCycle } from "./ChatAmbientBg";

type Props = {
  headline: string;
  subtitle: string;
  menuA11y: string;
  onMenu: () => void;
  bottomPad: number;
  composer: ReactNode;
  chips: ReactNode;
  notice?: ReactNode;
};

/** Bo'sh chat — hamburger menyu, marketing matn va composer. */
export function MorphChatWelcome({
  headline,
  subtitle,
  menuA11y,
  onMenu,
  bottomPad,
  composer,
  chips,
  notice,
}: Props) {
  const insets = useSafeAreaInsets();
  const { fs } = useMorphAppearance();
  const cycle = useWelcomeBgCycle();
  const bottomSafe = Math.max(insets.bottom, 10);

  const headlineStyle = useAnimatedStyle(() => ({
    color: interpolateColor(cycle.value, [0, 1], ["#FFFFFF", "#C8C8C8"]),
  }));
  const ledeStyle = useAnimatedStyle(() => ({
    color: interpolateColor(cycle.value, [0, 1], ["#F5F5F5", "#A3A3A3"]),
  }));

  return (
    <View style={styles.root}>
      <ChatAmbientBg cycle={cycle} />
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={onMenu}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={menuA11y}
        >
          <Ionicons name="menu" size={22} color="#8E8E93" />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Animated.View entering={FadeInDown.duration(360)} style={styles.copy}>
          <Animated.Text
            style={[styles.headline, { fontSize: fs(26), lineHeight: fs(32) }, headlineStyle]}
          >
            {headline}
          </Animated.Text>
          <Animated.Text
            style={[styles.lede, { fontSize: fs(13), lineHeight: fs(19) }, ledeStyle]}
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
    backgroundColor: "transparent",
  },
  header: {
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
    paddingHorizontal: 22,
    backgroundColor: "transparent",
  },
  copy: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  headline: {
    ...morphFont,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "600",
    color: "#111111",
    letterSpacing: -0.6,
    textAlign: "center",
  },
  lede: {
    marginTop: 8,
    ...morphFont,
    fontSize: 13,
    lineHeight: 19,
    color: "#71717A",
    textAlign: "center",
    maxWidth: 340,
  },
  notice: {
    marginHorizontal: -6,
    marginBottom: 12,
  },
  composer: {
    marginTop: 2,
  },
  chips: {
    marginBottom: 12,
  },
  dock: {
    zIndex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
