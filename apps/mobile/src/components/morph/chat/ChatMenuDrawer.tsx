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

import { morphFont } from "../../../theme/morph-font";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../../utils/responsive";

const MENU = {
  bg: "#FAFAFA",
  card: "#FFFFFF",
  line: "rgba(17,17,17,0.12)",
  fg: "#111111",
  muted: "#737373",
  soft: "#F0F0F0",
  track: "#E5E5E5",
} as const;

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
  tryOnLabel?: string;
  careLabel?: string;
  mysaloonLabel?: string;
  onTryOn?: () => void;
  onCare?: () => void;
  onMysaloon?: () => void;
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
  tryOnLabel,
  careLabel,
  mysaloonLabel,
  onTryOn,
  onCare,
  onMysaloon,
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
    if (!q) return rows.slice(0, 200);
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
        <StatusBar style="dark" />
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
              <Ionicons name="close" size={18} color={MENU.fg} />
            </Pressable>
          </View>

          <Pressable
            onPress={onNewChat}
            style={({ pressed }) => [styles.newChat, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Ionicons name="create-outline" size={18} color={MENU.fg} />
            <Text style={styles.newChatText}>{newChatLabel}</Text>
          </Pressable>

          {searchOpen ? (
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={MENU.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={searchPlaceholder}
                placeholderTextColor={MENU.muted}
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
                <Ionicons name="close" size={16} color={MENU.muted} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setSearchOpen(true)}
              style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Ionicons name="search" size={20} color={MENU.fg} />
              <Text style={styles.navText}>{searchLabel}</Text>
            </Pressable>
          )}

          <Pressable
            onPress={onLibrary}
            style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Ionicons name="grid-outline" size={20} color={MENU.fg} />
            <Text style={styles.navText}>{libraryLabel}</Text>
          </Pressable>

          {onTryOn && tryOnLabel ? (
            <Pressable
              onPress={onTryOn}
              style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Ionicons name="sparkles-outline" size={20} color={MENU.fg} />
              <Text style={styles.navText}>{tryOnLabel}</Text>
            </Pressable>
          ) : null}

          {onCare && careLabel ? (
            <Pressable
              onPress={onCare}
              style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Ionicons name="water-outline" size={20} color={MENU.fg} />
              <Text style={styles.navText}>{careLabel}</Text>
            </Pressable>
          ) : null}

          {onMysaloon && mysaloonLabel ? (
            <Pressable
              onPress={onMysaloon}
              style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Ionicons name="storefront-outline" size={20} color={MENU.fg} />
              <Text style={styles.navText}>{mysaloonLabel}</Text>
            </Pressable>
          ) : null}

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
                    color={th.id === activeThreadId ? MENU.fg : MENU.muted}
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
              <Ionicons name="settings-outline" size={20} color={MENU.fg} />
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
    backgroundColor: "rgba(17,17,17,0.28)",
  },
  scrim: {
    flex: 1,
  },
  drawer: {
    zIndex: 2,
    maxWidth: scale(380),
    height: "100%",
    backgroundColor: MENU.bg,
    paddingHorizontal: scale(18),
    borderRightWidth: 1,
    borderRightColor: MENU.line,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(18),
  },
  brand: {
    ...morphFont,
    fontSize: fontSize(18),
    fontWeight: "700",
    color: MENU.fg,
    letterSpacing: -0.4,
  },
  closeBtn: {
    width: scale(38),
    height: scale(38),
    borderRadius: moderateScale(19),
    backgroundColor: MENU.card,
    borderWidth: 1,
    borderColor: MENU.line,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.75,
  },
  newChat: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    alignSelf: "stretch",
    justifyContent: "center",
    backgroundColor: MENU.card,
    borderWidth: 1,
    borderColor: MENU.fg,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(18),
    marginBottom: verticalScale(12),
  },
  newChatText: {
    ...morphFont,
    color: MENU.fg,
    fontSize: fontSize(14),
    fontWeight: "600",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(14),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(8),
    borderRadius: moderateScale(14),
  },
  navText: {
    ...morphFont,
    flex: 1,
    color: MENU.fg,
    fontSize: fontSize(14),
    fontWeight: "500",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    backgroundColor: MENU.card,
    borderWidth: 1,
    borderColor: MENU.line,
    borderRadius: moderateScale(16),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    marginVertical: verticalScale(6),
  },
  searchInput: {
    ...morphFont,
    flex: 1,
    color: MENU.fg,
    fontSize: fontSize(14),
    paddingVertical: 0,
  },
  scroll: {
    flex: 1,
    marginTop: verticalScale(8),
  },
  scrollContent: {
    paddingBottom: verticalScale(16),
  },
  section: {
    marginTop: verticalScale(12),
    marginBottom: verticalScale(6),
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "700",
    color: MENU.muted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  empty: {
    ...morphFont,
    color: MENU.muted,
    fontSize: fontSize(13),
    paddingVertical: verticalScale(10),
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(12),
    borderRadius: moderateScale(14),
    marginBottom: verticalScale(4),
  },
  recentActive: {
    backgroundColor: MENU.card,
    borderWidth: 1,
    borderColor: MENU.line,
  },
  recentText: {
    ...morphFont,
    flex: 1,
    color: MENU.fg,
    fontSize: fontSize(13.5),
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
    paddingTop: verticalScale(14),
    borderTopWidth: 1,
    borderTopColor: MENU.line,
  },
  footerProfile: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
  },
  settingsBtn: {
    width: scale(36),
    height: scale(36),
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: scale(36),
    height: scale(36),
    borderRadius: moderateScale(18),
    backgroundColor: MENU.soft,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...morphFont,
    color: MENU.fg,
    fontSize: fontSize(11),
    fontWeight: "700",
  },
  footerName: {
    ...morphFont,
    flex: 1,
    color: MENU.fg,
    fontSize: fontSize(13),
    fontWeight: "600",
  },
});
