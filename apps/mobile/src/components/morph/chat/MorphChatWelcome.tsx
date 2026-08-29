import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { morphFont } from "../../../theme/morph-font";
import { useMorphAppearance } from "../../../lib/MorphAppearanceContext";
import { ChatAmbientBg } from "./ChatAmbientBg";

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

/** Bo'sh chat — hamburger menyu, marketing matn va composer. */
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
        <View style={styles.headerSpacer} />
        <Pressable
          onPress={onExit}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={exitA11y}
        >
          <Ionicons name="chevron-forward" size={24} color="#F5F5F7" />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Animated.View entering={FadeInDown.duration(320)} style={styles.badgeWrap}>
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={13} color="#737373" />
            <Animated.Text style={styles.aiBadgeText}>Morf AI • Pro Assistant</Animated.Text>
          </View>
        </Animated.View>

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
    backgroundColor: "transparent",
  },
  header: {
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  headerSpacer: { flex: 1 },
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
  badgeWrap: {
    alignItems: "center",
    marginBottom: 16,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.35)",
    shadowColor: "#111111",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 3,
  },
  aiBadgeText: {
    ...morphFont,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "600",
    color: "#737373",
    letterSpacing: 0.3,
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
    color: "#FFFFFF",
    letterSpacing: -0.6,
    textAlign: "center",
  },
  lede: {
    marginTop: 8,
    ...morphFont,
    fontSize: 13,
    lineHeight: 19,
    color: "#A1A1AA",
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
