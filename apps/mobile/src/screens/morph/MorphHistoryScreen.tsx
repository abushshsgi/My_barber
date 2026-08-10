import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchMorphAiGenerations,
  type MorphAiGeneration,
} from "../../api/ai";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { shareMorphLook } from "../../lib/morph-share";
import { useMorphSession } from "../../lib/morph-session";
import type { MorphStackParamList } from "../../navigation/MorphStack";
import { scaleFont } from "../../theme/layout";

type Props = NativeStackScreenProps<MorphStackParamList, "MorphHistory">;
type ViewMode = "after" | "before" | "split";

async function downloadImage(url: string, title: string): Promise<void> {
  const safeName = `${(title || "morph-look").replace(/[^\w\-]+/g, "_").slice(0, 40)}.jpg`;

  if (Platform.OS === "web" && typeof document !== "undefined") {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = safeName;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      return;
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
  }

  await Share.share({
    url,
    message: `${title} — Morf AI`,
    title: safeName,
  });
}

export function MorphHistoryScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const fs = (n: number) => scaleFont(n, width);
  const session = useMorphSession();
  const [items, setItems] = useState<MorphAiGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MorphAiGeneration | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("after");
  const [busyAction, setBusyAction] = useState<"share" | "download" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchMorphAiGenerations();
      setItems(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tarix yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openItem = useCallback((item: MorphAiGeneration) => {
    setSelected(item);
    setViewMode(item.after_url ? "after" : "before");
  }, []);

  const closeSheet = useCallback(() => {
    setSelected(null);
    setBusyAction(null);
  }, []);

  const activeUrl =
    viewMode === "before"
      ? selected?.before_url || selected?.after_url
      : selected?.after_url || selected?.before_url;

  const hasBefore = !!selected?.before_url;
  const hasAfter = !!selected?.after_url;
  const canCompare = hasBefore && hasAfter;

  const onShare = useCallback(async () => {
    if (!selected) return;
    const image = selected.after_url || selected.before_url;
    if (!image) return;
    setBusyAction("share");
    try {
      await shareMorphLook({
        styleId: selected.style_id || String(selected.id),
        title: selected.title || "Morf AI look",
        previewImage: image,
      });
    } catch (err) {
      Alert.alert("Ulashib bo‘lmadi", err instanceof Error ? err.message : "Xato");
    } finally {
      setBusyAction(null);
    }
  }, [selected]);

  const onDownload = useCallback(async () => {
    const url = selected?.after_url || selected?.before_url;
    if (!url || !selected) return;
    setBusyAction("download");
    try {
      await downloadImage(url, selected.title || "morph-look");
    } catch (err) {
      Alert.alert("Yuklab bo‘lmadi", err instanceof Error ? err.message : "Xato");
    } finally {
      setBusyAction(null);
    }
  }, [selected]);

  const openStudio = useCallback(() => {
    if (!selected?.after_url && !selected?.before_url) return;
    if (selected.after_url) {
      session.setTryOn(selected.after_url, selected.style_id, selected.title);
    }
    if (selected.before_url) {
      session.setSelfie(selected.before_url);
    }
    closeSheet();
    navigation.navigate("MorphStudio");
  }, [closeSheet, navigation, selected, session]);

  const colW = (width - 16 * 2 - 10) / 2;
  const sheetImgH = Math.min(width - 32, 420);

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </Pressable>
        <Text style={[styles.topTitle, { fontSize: fs(16) }]}>
          Saqlangan va yaratilgan
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#FFF" />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.err}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => void load()}>
            <Text style={styles.retryText}>Qayta</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Hali try-on yo‘q</Text>
          <Text style={styles.emptySub}>
            Yangi look yarating — bu yerda saqlanadi.
          </Text>
          <Pressable
            style={styles.retry}
            onPress={() => navigation.navigate("MorphCapture")}
          >
            <Text style={styles.retryText}>Boshlash</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={() => void load()}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, { width: colW }]}
              onPress={() => openItem(item)}
            >
              <View style={styles.cardImgWrap}>
                <Image
                  source={{ uri: item.after_url || item.before_url || undefined }}
                  style={styles.img}
                  contentFit="cover"
                />
                {item.before_url && item.after_url ? (
                  <View style={styles.cardBadge}>
                    <Text style={styles.cardBadgeText}>Oldin/Keyin</Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[styles.cardTitle, { fontSize: fs(12) }]}
                numberOfLines={1}
              >
                {item.title || item.style_id}
              </Text>
            </Pressable>
          )}
        />
      )}

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={closeSheet}>
        <View style={styles.modal}>
          <Pressable style={styles.modalBg} onPress={closeSheet} />
          <View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.sheetTop}>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {selected?.title || selected?.style_id || "Look"}
              </Text>
              <View style={styles.sheetTopActions}>
                <Pressable
                  style={styles.utilIconBtn}
                  onPress={() => void onDownload()}
                  disabled={!!busyAction || !activeUrl}
                  accessibilityLabel="Yuklab olish"
                >
                  {busyAction === "download" ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Ionicons name="download-outline" size={18} color="#FFF" />
                  )}
                </Pressable>
                <Pressable
                  style={styles.utilIconBtn}
                  onPress={() => void onShare()}
                  disabled={!!busyAction || !activeUrl}
                  accessibilityLabel="Ulashish"
                >
                  {busyAction === "share" ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Ionicons name="share-outline" size={18} color="#FFF" />
                  )}
                </Pressable>
                <Pressable
                  style={styles.utilIconBtn}
                  onPress={closeSheet}
                  accessibilityLabel="Yopish"
                >
                  <Ionicons name="close" size={18} color="#FFF" />
                </Pressable>
              </View>
            </View>

            {canCompare ? (
              <View style={styles.modeRow}>
                {(
                  [
                    { key: "before", label: "Oldin" },
                    { key: "after", label: "Keyin" },
                    { key: "split", label: "Ikkalasi" },
                  ] as const
                ).map((m) => {
                  const on = viewMode === m.key;
                  return (
                    <Pressable
                      key={m.key}
                      style={[styles.modeChip, on && styles.modeChipOn]}
                      onPress={() => setViewMode(m.key)}
                    >
                      <Text style={[styles.modeChipText, on && styles.modeChipTextOn]}>
                        {m.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {viewMode === "split" && canCompare ? (
              <View style={[styles.splitRow, { height: sheetImgH * 0.72 }]}>
                <View style={styles.splitCol}>
                  <Image
                    source={{ uri: selected!.before_url! }}
                    style={styles.splitImg}
                    contentFit="cover"
                  />
                  <View style={styles.splitLabel}>
                    <Text style={styles.splitLabelText}>Oldin</Text>
                  </View>
                </View>
                <View style={styles.splitCol}>
                  <Image
                    source={{ uri: selected!.after_url! }}
                    style={styles.splitImg}
                    contentFit="cover"
                  />
                  <View style={styles.splitLabel}>
                    <Text style={styles.splitLabelText}>Keyin</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={[styles.previewWrap, { height: sheetImgH * 0.78 }]}>
                {activeUrl ? (
                  <Image
                    source={{ uri: activeUrl }}
                    style={styles.sheetImg}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.previewEmpty}>
                    <Ionicons name="image-outline" size={28} color="rgba(255,255,255,0.35)" />
                  </View>
                )}
                {canCompare ? (
                  <View style={styles.previewBadge}>
                    <Text style={styles.previewBadgeText}>
                      {viewMode === "before" ? "Oldin" : "Keyin"}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {canCompare && viewMode !== "split" ? (
              <Text style={styles.hint}>
                Oldin / Keyin / Ikkalasi — taqqoslash uchun
              </Text>
            ) : null}

            <View style={styles.sheetActions}>
              <Pressable style={styles.sheetBtn} onPress={openStudio}>
                <Ionicons name="color-palette-outline" size={18} color="#050505" />
                <Text style={styles.sheetBtnText}>Studio ga</Text>
              </Pressable>
              <Pressable
                style={[styles.sheetBtn, styles.sheetBtnGhost]}
                onPress={closeSheet}
              >
                <Text style={[styles.sheetBtnText, styles.sheetBtnGhostText]}>
                  Yopish
                </Text>
              </Pressable>
            </View>

            <View style={styles.bottomUtils}>
              <Pressable
                style={styles.bottomUtil}
                onPress={() => void onDownload()}
                disabled={!!busyAction}
              >
                <Ionicons name="download-outline" size={16} color="#FFF" />
                <Text style={styles.bottomUtilText}>Yuklab olish</Text>
              </Pressable>
              <Pressable
                style={styles.bottomUtil}
                onPress={() => void onShare()}
                disabled={!!busyAction}
              >
                <Ionicons name="share-social-outline" size={16} color="#FFF" />
                <Text style={styles.bottomUtilText}>Ulashish</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050505" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { color: "#FFF", fontWeight: "800" },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  row: { gap: 10 },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#141414",
    marginBottom: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardImgWrap: { position: "relative" },
  img: { width: "100%", aspectRatio: 3 / 4, backgroundColor: "#1A1A1A" },
  cardBadge: {
    position: "absolute",
    left: 8,
    bottom: 8,
    backgroundColor: "rgba(0,0,0,0.62)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cardBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },
  cardTitle: {
    fontWeight: "700",
    color: "#FFF",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: { fontWeight: "800", fontSize: 18, color: "#FFF" },
  emptySub: {
    textAlign: "center",
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
  },
  err: { color: "rgba(255,255,255,0.55)", textAlign: "center" },
  retry: {
    marginTop: 10,
    backgroundColor: "#FFF",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: { color: "#050505", fontWeight: "800" },
  modal: { flex: 1, justifyContent: "flex-end" },
  modalBg: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  sheet: {
    backgroundColor: "#0A0A0A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginBottom: 4,
  },
  sheetTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sheetTitle: {
    flex: 1,
    fontWeight: "800",
    fontSize: 18,
    color: "#FFF",
  },
  sheetTopActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  utilIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  modeRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  modeChip: {
    flex: 1,
    minHeight: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modeChipOn: {
    backgroundColor: "#FFF",
  },
  modeChipText: {
    color: "rgba(255,255,255,0.55)",
    fontWeight: "700",
    fontSize: 12,
  },
  modeChipTextOn: {
    color: "#050505",
  },
  previewWrap: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#141414",
    position: "relative",
  },
  sheetImg: {
    width: "100%",
    height: "100%",
  },
  previewEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  previewBadge: {
    position: "absolute",
    left: 10,
    top: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  previewBadgeText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 11,
  },
  splitRow: {
    flexDirection: "row",
    gap: 8,
  },
  splitCol: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#141414",
    position: "relative",
  },
  splitImg: {
    width: "100%",
    height: "100%",
  },
  splitLabel: {
    position: "absolute",
    left: 8,
    bottom: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  splitLabelText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 11,
  },
  hint: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  sheetActions: { flexDirection: "row", gap: 10 },
  sheetBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  sheetBtnGhost: { backgroundColor: "rgba(255,255,255,0.08)" },
  sheetBtnText: { color: "#050505", fontWeight: "800" },
  sheetBtnGhostText: { color: "#FFF" },
  bottomUtils: {
    flexDirection: "row",
    gap: 10,
  },
  bottomUtil: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  bottomUtilText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 12,
  },
});
