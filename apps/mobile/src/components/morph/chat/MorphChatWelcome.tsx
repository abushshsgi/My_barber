import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeInDown,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { morphFont } from "../../../theme/morph-font";
import { useMorphAppearance } from "../../../lib/MorphAppearanceContext";
import { ChatAmbientBg } from "./ChatAmbientBg";

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
  const { colors: pal, fs, theme } = useMorphAppearance();
  const ink = useSharedValue(0);

  useEffect(() => {
    ink.value = 0;
    ink.value = withDelay(
      220,
      withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }),
    );
  }, [headline, ink, subtitle]);

  const headlineStyle = useAnimatedStyle(() => ({
    color: interpolateColor(ink.value, [0, 1], ["#FFFFFF", theme === "light" ? "#111111" : "#F5F5F7"]),
  }));
  const ledeStyle = useAnimatedStyle(() => ({
    color: interpolateColor(ink.value, [0, 1], ["#FFFFFF", theme === "light" ? "#3A3A3A" : "#A1A1A6"]),
  }));

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: bottomPad }]}>
      <ChatAmbientBg />
      <StatusBar style={pal.status} />

      <View style={styles.header}>
        <Pressable
          onPress={onMenu}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={menuA11y}
        >
          <Ionicons name="menu" size={22} color={pal.fg} />
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
    marginBottom: 28,
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
    marginTop: 28,
  },
});
