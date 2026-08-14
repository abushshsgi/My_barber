import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { morfMark } from "../../../branding/morf-logo";
import { ChatAmbientBg } from "./ChatAmbientBg";

type Props = {
  greeting: string;
  name: string;
  avatarUrl: string | null;
  initials: string;
  brandLabel: string;
  menuA11y: string;
  onMenu: () => void;
  historyA11y: string;
  onHistory: () => void;
  bottomPad: number;
  composer: ReactNode;
  chips: ReactNode;
};

/** Bo'sh chat — Gemini uslubidagi menyu tugmasi + composer. */
export function MorphChatWelcome({
  greeting,
  name,
  avatarUrl,
  initials,
  brandLabel,
  menuA11y,
  onMenu,
  historyA11y,
  onHistory,
  bottomPad,
  composer,
  chips,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: bottomPad }]}>
      <StatusBar style="dark" />
      <ChatAmbientBg />

      <View style={styles.header}>
        <View style={styles.profile}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={styles.profileText}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onHistory}
          style={({ pressed }) => [styles.historyBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={historyA11y}
        >
          <Ionicons name="time-outline" size={18} color="#1E1B4B" />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Animated.View entering={ZoomIn.duration(420).delay(40)} style={styles.menuWrap}>
          <Pressable
            onPress={onMenu}
            style={({ pressed }) => [styles.menuBtn, pressed && styles.menuPressed]}
            accessibilityRole="button"
            accessibilityLabel={menuA11y}
          >
            <Image source={morfMark} style={styles.mark} contentFit="contain" />
            <Text style={styles.menuLabel}>{brandLabel}</Text>
            <Ionicons name="chevron-down" size={14} color="#6B6685" />
          </Pressable>
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
    backgroundColor: "#F7F3FF",
  },
  header: {
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  profile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
    paddingRight: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EDE9FE",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.9)",
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E1B4B",
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    fontSize: 13,
    color: "#6B6685",
    letterSpacing: -0.1,
  },
  name: {
    marginTop: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#1E1B4B",
    letterSpacing: -0.4,
  },
  historyBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.82)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.08)",
  },
  pressed: {
    opacity: 0.82,
  },
  hero: {
    flex: 1,
    zIndex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    marginTop: -12,
  },
  menuWrap: {
    alignItems: "center",
    marginBottom: 18,
  },
  menuBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingLeft: 8,
    paddingRight: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#EEEEF2",
    shadowColor: "#1E1B4B",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  menuPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  mark: {
    width: 26,
    height: 26,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E1B4B",
    letterSpacing: -0.3,
  },
  composer: {
    marginTop: 2,
  },
  chips: {
    marginTop: 28,
  },
});
