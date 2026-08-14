import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchMorphAiGenerations, type MorphAiGeneration } from "../../../api/ai";
import type { MorphChatThread } from "../../../hooks/useMorphChat";

type Props = {
  visible: boolean;
  brand: string;
  newChatLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  libraryLabel: string;
  looksLabel: string;
  newLookLabel: string;
  allLooksLabel: string;
  recentLabel: string;
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
  onNewLook: () => void;
  onAllLooks: () => void;
  onLook: (id: number) => void;
  onProfile: () => void;
  onSettings: () => void;
};

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
  looksLabel,
  newLookLabel,
  allLooksLabel,
  recentLabel,
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
  onNewLook,
  onAllLooks,
  onLook,
  onProfile,
  onSettings,
}: Props) {
  const insets = useSafeAreaInsets();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [looks, setLooks] = useState<MorphAiGeneration[]>([]);

  useEffect(() => {
    if (!visible) {
      setSearchOpen(false);
      setQuery("");
      return;
    }
    let cancelled = false;
    void fetchMorphAiGenerations()
      .then((rows) => {
        if (!cancelled) setLooks(rows.slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setLooks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const recent = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = threads.filter((th) => previewOf(th).length > 0 || th.title);
    if (!q) return rows.slice(0, 12);
    return rows.filter((th) => {
      const hay = `${th.title} ${previewOf(th)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, threads]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <StatusBar style="light" />
        <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" />
        <View style={[styles.drawer, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.header}>
            <Text style={styles.brand}>{brand}</Text>
            <Pressable
              onPress={onClose}
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
              <Pressable onPress={() => { setSearchOpen(false); setQuery(""); }} hitSlop={8}>
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
            <Text style={styles.section}>{looksLabel}</Text>
            <Pressable
              onPress={onNewLook}
              style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.navText}>{newLookLabel}</Text>
            </Pressable>
            {looks.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => onLook(item.id)}
                style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <Ionicons name="document-text-outline" size={18} color="#D4D4D8" />
                <Text style={styles.lookText} numberOfLines={1}>
                  {item.title}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={onAllLooks}
              style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Ionicons name="ellipsis-horizontal" size={18} color="#D4D4D8" />
              <Text style={styles.navMuted}>{allLooksLabel}</Text>
            </Pressable>

            <Text style={[styles.section, styles.sectionGap]}>{recentLabel}</Text>
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
                  <Text style={styles.recentText} numberOfLines={1}>
                    {th.title || previewOf(th)}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>

          <Pressable
            onPress={onProfile}
            style={({ pressed }) => [styles.footer, pressed && styles.pressed]}
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
            <Pressable
              onPress={onSettings}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={settingsA11y}
            >
              <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
            </Pressable>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    zIndex: 2,
    width: "86%",
    maxWidth: 380,
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
  navMuted: {
    flex: 1,
    color: "#A1A1AA",
    fontSize: 15,
    fontWeight: "500",
  },
  lookText: {
    flex: 1,
    color: "#E4E4E7",
    fontSize: 15,
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
  sectionGap: {
    marginTop: 18,
  },
  empty: {
    color: "#71717A",
    fontSize: 14,
    paddingVertical: 8,
  },
  recentRow: {
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  recentActive: {
    backgroundColor: "#1A1A1A",
  },
  recentText: {
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
