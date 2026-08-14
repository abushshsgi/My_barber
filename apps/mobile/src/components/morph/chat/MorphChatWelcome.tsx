import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

type Props = {
  headline: string;
  subtitle: string;
  menuA11y: string;
  onMenu: () => void;
  bottomPad: number;
  composer: ReactNode;
  chips: ReactNode;
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
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: bottomPad }]}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable
          onPress={onMenu}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={menuA11y}
        >
          <Ionicons name="menu" size={22} color="#111111" />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Animated.View entering={FadeInDown.duration(360)} style={styles.copy}>
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.lede}>{subtitle}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(360).delay(80)} style={styles.composer}>
          {composer}
        </Animated.View>

        {chips ? (
          <Animated.View entering={FadeInDown.duration(380).delay(140)} style={styles.chips}>
            {chips}
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#FFFFFF",
  },
  copy: {
    alignItems: "center",
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  headline: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -0.7,
    textAlign: "center",
  },
  lede: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: "#71717A",
    textAlign: "center",
    maxWidth: 340,
  },
  composer: {
    marginTop: 2,
  },
  chips: {
    marginTop: 28,
  },
});
