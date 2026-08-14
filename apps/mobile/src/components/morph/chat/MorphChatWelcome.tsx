import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

/** Bo'sh chat — rasm uslubidagi yengil landing. */
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
          <Ionicons name="bag-handle-outline" size={20} color="#111111" />
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
    backgroundColor: "#F5F4F2",
  },
  header: {
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8E7E4",
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    fontSize: 13,
    color: "#8A8A8E",
    letterSpacing: -0.1,
  },
  name: {
    marginTop: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -0.4,
  },
  historyBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pressed: {
    opacity: 0.82,
  },
  hero: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    marginTop: -36,
  },
  headline: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    color: "#111111",
    textAlign: "center",
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: "#8A8A8E",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  composer: {
    marginTop: 28,
  },
});
