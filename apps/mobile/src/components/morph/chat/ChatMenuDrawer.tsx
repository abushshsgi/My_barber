import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MorphChatThread } from "../../../hooks/useMorphChat";

type Props = {
  visible: boolean;
  brand: string;
  newChatLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  libraryLabel: string;
  historyLabel: string;
  emptyLabel: string;
  settingsA11y: string;
  profileName: string;
  avatarUrl: string | null;
  initials: string;
  threads: MorphChatThread[];
  activeThreadId: string | null;
  onClose: () => void;
  onNewChat: () => void;
  onSelectThread: (id: string) => void;
  onLibrary: () => void;
  onProfile: () => void;
  onSettings: () => void;
};

const DRAWER_MS = 280;
const EASE = Easing.out(Easing.cubic);
const SCREEN_W = Dimensions.get("window").width;
const DRAWER_W = Math.min(SCREEN_W * 0.86, 380);

function previewOf(thread: MorphChatThread): string {
  const last = [...thread.messages].reverse().find((m) => m.id !== "welcome");
  return (last?.content || thread.title || "").trim();
}

export function ChatMenuDrawer({
  visible,
  brand,
  newChatLabel,
  searchLabel,
  searchPlaceholder,
  libraryLabel,
  historyLabel,
  emptyLabel,
  settingsA11y,
  profileName,
  avatarUrl,
  initials,
  threads,
  activeThreadId,
  onClose,
  onNewChat,
  onSelectThread,
  onLibrary,
  onProfile,
  onSettings,
}: Props) {
  const insets = useSafeAreaInsets();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(visible);

  const progress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, { duration: DRAWER_MS, easing: EASE });
      return;
    }
    if (!mounted) return;
    progress.value = withTiming(0, { duration: DRAWER_MS, easing: EASE }, (finished) => {
      if (finished) runOnJS(setMounted)(false);
    });
  }, [visible, mounted, progress]);

  const recent = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = threads.filter((th) => previewOf(th).length > 0);
    if (!q) return rows.slice(0, 40);
    return rows.filter((th) => {
      const hay = `${th.title} ${previewOf(th)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, threads]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - progress.value) * -DRAWER_W }],
  }));

  const requestClose = () => {
    if (!visible) return;
    onClose();
  };

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={requestClose}>
      <View style={styles.root} pointerEvents="box-none">
        <StatusBar style="light" />
        <Animated.View style={[styles.scrimFill, scrimStyle]}>
          <Pressable style={styles.scrim} onPress={requestClose} accessibilityRole="button" />
        </Animated.View>
        <Animated.View
          style={[
            styles.drawer,
            drawerStyle,
            { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8, width: DRAWER_W },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.brand}>{brand}</Text>
            <Pressable
              onPress={requestClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          <Pressable
            onPress={onNewChat}
            style={({ pressed }) => [styles.newChat, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Ionicons name="create-outline" size={18} color="#FFFFFF" />
            <Text style={styles.newChatText}>{newChatLabel}</Text>
          </Pressable>

          {searchOpen ? (
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#A1A1AA" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={searchPlaceholder}
                placeholderTextColor="#71717A"
                style={styles.searchInput}
                autoFocus
              />
              <Pressable
                onPress={() => {
                  setSearchOpen(false);
                  setQuery("");
                }}
                hitSlop={8}
              >
                <Ionicons name="close" size={16} color="#A1A1AA" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setSearchOpen(true)}
              style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Ionicons name="search" size={20} color="#FFFFFF" />
              <Text style={styles.navText}>{searchLabel}</Text>
            </Pressable>
          )}

          <Pressable
            onPress={onLibrary}
            style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Ionicons name="grid-outline" size={20} color="#FFFFFF" />
            <Text style={styles.navText}>{libraryLabel}</Text>
          </Pressable>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.section}>{historyLabel}</Text>
            {recent.length === 0 ? (
              <Text style={styles.empty}>{emptyLabel}</Text>
            ) : (
              recent.map((th) => (
                <Pressable
                  key={th.id}
                  onPress={() => onSelectThread(th.id)}
                  style={({ pressed }) => [
                    styles.recentRow,
                    th.id === activeThreadId && styles.recentActive,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={16}
                    color={th.id === activeThreadId ? "#FFFFFF" : "#A1A1AA"}
                  />
                  <Text style={styles.recentText} numberOfLines={1}>
                    {th.title || previewOf(th)}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={onProfile}
              style={({ pressed }) => [styles.footerProfile, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              <Text style={styles.footerName} numberOfLines={1}>
                {profileName}
              </Text>
            </Pressable>
            <Pressable
              onPress={onSettings}
              hitSlop={10}
              style={({ pressed }) => [styles.settingsBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={settingsA11y}
            >
              <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
  },
  scrimFill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  scrim: {
    flex: 1,
  },
  drawer: {
    zIndex: 2,
    maxWidth: 380,
    height: "100%",
    backgroundColor: "#000000",
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  brand: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.72,
  },
  newChat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "flex-start",
    backgroundColor: "#2A2A2A",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginBottom: 10,
  },
  newChatText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
  },
  navText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 6,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    paddingVertical: 0,
  },
  scroll: {
    flex: 1,
    marginTop: 8,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  section: {
    marginTop: 10,
    marginBottom: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#A1A1AA",
    letterSpacing: 0.2,
  },
  empty: {
    color: "#71717A",
    fontSize: 14,
    paddingVertical: 8,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  recentActive: {
    backgroundColor: "#1A1A1A",
  },
  recentText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#27272A",
  },
  footerProfile: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2A2A2A",
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  footerName: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
