import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
  formatMorphUserError,
  type MorphAiGeneration,
} from "../../api/ai";
import { BeforeAfterSlider } from "../../components/morph/BeforeAfterSlider";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { shareMorphLook } from "../../lib/morph-share";
import { useMorphSession } from "../../lib/morph-session";
import type { MorphStackParamList } from "../../navigation/MorphStack";
import { scaleFont } from "../../theme/layout";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<MorphStackParamList, "MorphHistory">;

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

export function MorphHistoryScreen({ navigation, route }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const fs = (n: number) => scaleFont(n, width);
  const session = useMorphSession();
  const focusId = route.params?.generationId;

  const [items, setItems] = useState<MorphAiGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MorphAiGeneration | null>(null);
  const [busyAction, setBusyAction] = useState<"share" | "download" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchMorphAiGenerations();
      setItems(rows);
      if (focusId != null) {
        const hit = rows.find((r) => r.id === focusId) ?? null;
        setSelected(hit);
      }
    } catch (err) {
      setError(formatMorphUserError(err instanceof Error ? err.message : "", "Tarix yuklanmadi"));
    } finally {
      setLoading(false);
    }
  }, [focusId]);

  useEffect(() => {
    void load();
  }, [load]);

  const closeDetail = useCallback(() => {
    setSelected(null);
    setBusyAction(null);
  }, []);

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
    if (!selected) return;
    if (selected.after_url) {
      session.setTryOn(selected.after_url, selected.style_id, selected.title);
    }
    if (selected.before_url) {
      session.setSelfie(selected.before_url);
    }
    closeDetail();
    navigation.navigate("MorphStudio");
  }, [closeDetail, navigation, selected, session]);

  const colW = (width - 20 * 2 - 12) / 2;
  const compareW = width - 32;
  const compareH = Math.min(compareW * 1.15, width * 1.05);

  if (selected) {
    const canCompare = !!(selected.before_url && selected.after_url);
    const soloUri = selected.after_url || selected.before_url || undefined;
    const lookTitle = selected.title || selected.style_id || "Look";

    return (
      <View style={[styles.detailRoot, { paddingTop: Math.max(insets.top, 10) }]}>
        <LinearGradient
          colors={["#1A1210", "#070708", "#050505"]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.detailTop}>
          <Pressable style={styles.pillBtn} onPress={closeDetail}>
            <Ionicons name="chevron-back" size={18} color="#FFF" />
            <Text style={styles.pillBtnText}>Tarix</Text>
          </Pressable>
          <Text style={[styles.detailTitle, { fontSize: fs(16) }]} numberOfLines={1}>
            {lookTitle}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.compareStage}>
          {canCompare ? (
            <BeforeAfterSlider
              beforeUri={selected.before_url!}
              afterUri={selected.after_url!}
              width={compareW}
              height={compareH}
              title={lookTitle}
            />
          ) : soloUri ? (
            <View style={[styles.soloWrap, { width: compareW, height: compareH }]}>
              <Image
                source={{ uri: soloUri }}
                style={styles.soloImg}
                contentFit="cover"
              />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.88)"]}
                locations={[0.45, 0.75, 1]}
                style={styles.soloGrad}
              />
              <Text style={styles.soloTitle} numberOfLines={1}>
                {lookTitle}
              </Text>
            </View>
          ) : null}
          {canCompare ? (
            <Text style={styles.sliderHint}>Chiziqni siljiting — Oldin / Keyin</Text>
          ) : null}
        </View>

        <View style={[styles.detailActions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            style={styles.primaryAction}
            onPress={() => void onDownload()}
            disabled={!!busyAction}
          >
            {busyAction === "download" ? (
              <ActivityIndicator color="#0A0A0A" />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color="#0A0A0A" />
                <Text style={styles.primaryActionText}>Yuklab olish</Text>
              </>
            )}
          </Pressable>
          <View style={styles.actionRow}>
            <Pressable
              style={styles.secondaryAction}
              onPress={() => void onShare()}
              disabled={!!busyAction}
            >
              {busyAction === "share" ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="share-social-outline" size={16} color="#FFF" />
                  <Text style={styles.secondaryActionText}>Ulashish</Text>
                </>
              )}
            </Pressable>
            <Pressable style={styles.secondaryAction} onPress={openStudio}>
              <Ionicons name="color-palette-outline" size={16} color="#FFF" />
              <Text style={styles.secondaryActionText}>Studio</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable
          style={styles.iconRound}
          onPress={() => {
            const routes = navigation.getState?.()?.routes;
            if (routes && routes.length > 1) {
              navigation.goBack();
            } else {
              navigation.navigate("MorphCapture");
            }
          }}
        >
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </Pressable>
        <View style={styles.topCenter}>
          <Text style={[styles.topTitle, { fontSize: fs(17) }]}>Tarix</Text>
          <Text style={styles.topSub}>
            {loading ? "…" : `${items.length} ta look`}
          </Text>
        </View>
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
          <View style={styles.emptyIcon}>
            <Ionicons name="images-outline" size={28} color="rgba(255,255,255,0.45)" />
          </View>
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
              onPress={() => setSelected(item)}
            >
              <View style={styles.cardMedia}>
                <Image
                  source={{ uri: item.after_url || item.before_url || undefined }}
                  style={styles.cardImg}
                  contentFit="cover"
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.82)"]}
                  locations={[0.4, 1]}
                  style={styles.cardGrad}
                />
                {item.before_url && item.after_url ? (
                  <View style={styles.cardChip}>
                    <Ionicons name="swap-horizontal" size={11} color="#FFF" />
                    <Text style={styles.cardChipText}>Taqqos</Text>
                  </View>
                ) : null}
                <Text
                  style={[styles.cardTitle, { fontSize: fs(12) }]}
                  numberOfLines={1}
                >
                  {item.title || item.style_id}
                </Text>
              </View>
            </Pressable>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFA" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(14),
    paddingBottom: verticalScale(12),
  },
  topCenter: { alignItems: "center", gap: moderateScale(2) },
  topTitle: { color: "#FFF", fontWeight: "800", letterSpacing: -0.3 },
  topSub: { color: "rgba(255,255,255,0.45)", fontSize: fontSize(11), fontWeight: "600" },
  iconRound: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(14),
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  list: { paddingHorizontal: scale(20), paddingBottom: verticalScale(28), gap: moderateScale(12) },
  row: { gap: moderateScale(12) },
  card: {
    borderRadius: moderateScale(18),
    overflow: "hidden",
    backgroundColor: "#151517",
  },
  cardMedia: {
    aspectRatio: 3 / 4,
    backgroundColor: "#0F0F10",
    position: "relative",
  },
  cardImg: { width: "100%", height: "100%" },
  cardGrad: {
    ...StyleSheet.absoluteFill,
  },
  cardChip: {
    position: "absolute",
    left: scale(8),
    top: verticalScale(8),
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 999,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
  },
  cardChipText: { color: "#FFF", fontSize: fontSize(10), fontWeight: "700" },
  cardTitle: {
    position: "absolute",
    left: scale(10),
    right: scale(10),
    bottom: verticalScale(10),
    fontWeight: "800",
    color: "#FFF",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(32),
    gap: moderateScale(8),
  },
  emptyIcon: {
    width: scale(64),
    height: scale(64),
    borderRadius: moderateScale(20),
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(6),
  },
  emptyTitle: { fontWeight: "800", fontSize: fontSize(18), color: "#FFF" },
  emptySub: {
    textAlign: "center",
    color: "rgba(255,255,255,0.5)",
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
  },
  err: { color: "rgba(255,255,255,0.55)", textAlign: "center" },
  retry: {
    marginTop: verticalScale(10),
    backgroundColor: "#FFF",
    borderRadius: 999,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
  },
  retryText: { color: "#050505", fontWeight: "800" },

  detailRoot: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  detailTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    paddingHorizontal: scale(14),
    paddingBottom: verticalScale(10),
  },
  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(8),
  },
  pillBtnText: { color: "#FFF", fontWeight: "700", fontSize: fontSize(12) },
  detailTitle: {
    flex: 1,
    color: "#FFF",
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  compareStage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(16),
    gap: moderateScale(12),
  },
  soloWrap: {
    borderRadius: moderateScale(20),
    overflow: "hidden",
    backgroundColor: "#111",
    position: "relative",
  },
  soloImg: { width: "100%", height: "100%" },
  soloGrad: {
    ...StyleSheet.absoluteFill,
  },
  soloTitle: {
    position: "absolute",
    left: scale(14),
    right: scale(14),
    bottom: verticalScale(14),
    color: "#FFF",
    fontSize: fontSize(16),
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  sliderHint: {
    color: "rgba(255,255,255,0.4)",
    fontSize: fontSize(12),
    fontWeight: "600",
  },
  detailActions: {
    paddingHorizontal: scale(16),
    gap: moderateScale(10),
    paddingTop: verticalScale(8),
  },
  primaryAction: {
    minHeight: verticalScale(50),
    borderRadius: moderateScale(16),
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(8),
  },
  primaryActionText: { color: "#0A0A0A", fontWeight: "800", fontSize: fontSize(14) },
  actionRow: { flexDirection: "row", gap: moderateScale(10) },
  secondaryAction: {
    flex: 1,
    minHeight: verticalScale(46),
    borderRadius: moderateScale(14),
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(6),
  },
  secondaryActionText: { color: "#FFF", fontWeight: "700", fontSize: fontSize(13) },
});
