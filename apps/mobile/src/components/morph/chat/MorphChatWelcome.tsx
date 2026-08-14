import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatAmbientBg } from "./ChatAmbientBg";

type Props = {
  greeting: string;
  name: string;
  avatarUrl: string | null;
  initials: string;
  headline: string;
  subtitle: string;
  historyA11y: string;
  onHistory: () => void;
  bottomPad: number;
  children: ReactNode;
};

/** Bo'sh chat — yengil AI landing. */
export function MorphChatWelcome({
  greeting,
  name,
  avatarUrl,
  initials,
  headline,
  subtitle,
  historyA11y,
  onHistory,
  bottomPad,
  children,
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
        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.composer}>{children}</View>
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
    marginTop: -28,
  },
  headline: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    color: "#1E1B4B",
    textAlign: "center",
    letterSpacing: -1.1,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: "#6B6685",
    textAlign: "center",
    paddingHorizontal: 10,
  },
  composer: {
    marginTop: 24,
  },
});
