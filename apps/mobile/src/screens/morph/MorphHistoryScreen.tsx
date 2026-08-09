import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchMorphAiGenerations,
  type MorphAiGeneration,
} from "../../api/ai";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useMorphSession } from "../../lib/morph-session";
import type { MorphStackParamList } from "../../navigation/MorphStack";
import { scaleFont } from "../../theme/layout";

type Props = NativeStackScreenProps<MorphStackParamList, "MorphHistory">;

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

  const colW = (width - 16 * 2 - 10) / 2;

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
          <Text style={styles.emptyTitle}>Hali try-on yo'q</Text>
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
              onPress={() => setSelected(item)}
            >
              <Image
                source={{ uri: item.after_url || item.before_url || undefined }}
                style={styles.img}
              />
              <Text style={[styles.cardTitle, { fontSize: fs(12) }]} numberOfLines={1}>
                {item.title || item.style_id}
              </Text>
            </Pressable>
          )}
        />
      )}

      <Modal visible={!!selected} transparent animationType="fade">
        <View style={styles.modal}>
          <Pressable style={styles.modalBg} onPress={() => setSelected(null)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 28) }]}>
            {selected?.after_url ? (
              <Image source={{ uri: selected.after_url }} style={styles.sheetImg} />
            ) : null}
            <Text style={styles.sheetTitle}>{selected?.title}</Text>
            <View style={styles.sheetActions}>
              <Pressable
                style={styles.sheetBtn}
                onPress={() => {
                  if (selected?.after_url) {
                    session.setTryOn(
                      selected.after_url,
                      selected.style_id,
                      selected.title,
                    );
                    if (selected.before_url) {
                      session.setSelfie(selected.before_url);
                    }
                    setSelected(null);
                    navigation.navigate("MorphStudio");
                  }
                }}
              >
                <Text style={styles.sheetBtnText}>Studio ga</Text>
              </Pressable>
              <Pressable
                style={[styles.sheetBtn, styles.sheetBtnGhost]}
                onPress={() => setSelected(null)}
              >
                <Text style={[styles.sheetBtnText, styles.sheetBtnGhostText]}>
                  Yopish
                </Text>
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
  img: { width: "100%", aspectRatio: 3 / 4, backgroundColor: "#1A1A1A" },
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
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    backgroundColor: "#0A0A0A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
  },
  sheetImg: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 16,
    backgroundColor: "#141414",
  },
  sheetTitle: {
    marginTop: 12,
    fontWeight: "800",
    fontSize: 17,
    color: "#FFF",
  },
  sheetActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  sheetBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBtnGhost: { backgroundColor: "rgba(255,255,255,0.08)" },
  sheetBtnText: { color: "#050505", fontWeight: "800" },
  sheetBtnGhostText: { color: "#FFF" },
});
