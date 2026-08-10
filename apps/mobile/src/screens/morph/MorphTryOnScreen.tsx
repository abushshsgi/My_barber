import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  FadeIn,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchMorphAiGenerations,
  type MorphAiGeneration,
} from "../../api/ai";
import { fetchHairstyles } from "../../api/hairstyles";
import { pexelsPhotoUrl } from "../../api/media";
import { useAuth } from "../../auth/AuthContext";
import { TAB_DOCK_CLEARANCE } from "../../hooks/useHideTabBar";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";
import { hasCompletedMorphTryOnIntro } from "../../lib/morph-onboarding";
import { useMorphSession } from "../../lib/morph-session";
import { pickSelfieFromCamera, pickSelfieFromGallery } from "../../lib/selfie";
import type { MorphStackParamList } from "../../navigation/MorphStack";

type Props = NativeStackScreenProps<MorphStackParamList, "MorphCapture">;

const FALLBACK_HERO = pexelsPhotoUrl(3998429, 1400);
const SPRING = { damping: 22, stiffness: 220, mass: 0.85 };

/**
 * Try-on — ixcham sheet + yuqoriga swipe bilan history panel.
 * History faqat sheet gesture / history icon orqali; root bosish ochmaydi.
 */
export function MorphTryOnScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const { isAuthenticated } = useAuth();
  const session = useMorphSession();
  const gate = useMorphLimitGate();

  const dockPad = TAB_DOCK_CLEARANCE + Math.max(insets.bottom, 8);
  const historyH = Math.min(Math.round(winH * 0.48), 360);

  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<"camera" | "gallery" | null>(null);
  const [heroUri, setHeroUri] = useState(FALLBACK_HERO);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<MorphAiGeneration[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyFetched, setHistoryFetched] = useState(false);

  const lift = useSharedValue(0);
  const dragStart = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    void hasCompletedMorphTryOnIntro().then((done) => {
      if (cancelled) return;
      if (!done) {
        navigation.replace("MorphWelcome");
        return;
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  useEffect(() => {
    let cancelled = false;
    void fetchHairstyles("men")
      .then((rows) => {
        if (cancelled) return;
        const uri = rows[0]?.image_url?.trim();
        if (uri) setHeroUri(uri);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const loadHistory = useCallback(async () => {
    if (!isAuthenticated) {
      setHistoryItems([]);
      setHistoryError("Tarix uchun tizimga kiring");
      setHistoryFetched(true);
      return;
    }
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const rows = await fetchMorphAiGenerations();
      setHistoryItems(rows);
      setHistoryFetched(true);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Tarix yuklanmadi");
    } finally {
      setHistoryLoading(false);
    }
  }, [isAuthenticated]);

  const onHistoryOpened = useCallback(() => {
    setHistoryOpen(true);
    if (!historyFetched && !historyLoading) {
      void loadHistory();
    }
  }, [historyFetched, historyLoading, loadHistory]);

  const onHistoryClosed = useCallback(() => {
    setHistoryOpen(false);
  }, []);

  const setOpenProgress = useCallback(
    (open: boolean) => {
      if (open) onHistoryOpened();
      else onHistoryClosed();
    },
    [onHistoryClosed, onHistoryOpened],
  );

  const openHistoryPanel = useCallback(() => {
    lift.value = withSpring(historyH, SPRING);
    onHistoryOpened();
  }, [historyH, lift, onHistoryOpened]);

  const closeHistoryPanel = useCallback(() => {
    lift.value = withSpring(0, SPRING);
    onHistoryClosed();
  }, [lift, onHistoryClosed]);

  const pan = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .failOffsetX([-28, 28])
    .onBegin(() => {
      dragStart.value = lift.value;
    })
    .onUpdate((e) => {
      const next = dragStart.value - e.translationY;
      lift.value = Math.min(historyH, Math.max(0, next));
    })
    .onEnd((e) => {
      let open = lift.value > historyH * 0.35;
      if (e.velocityY < -550) open = true;
      if (e.velocityY > 550) open = false;
      lift.value = withSpring(open ? historyH : 0, SPRING);
      runOnJS(setOpenProgress)(open);
    });

  const sheetAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.value }],
  }));

  const historyAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: historyH - lift.value }],
    opacity: interpolate(lift.value, [0, historyH * 0.25, historyH], [0, 0.85, 1], Extrapolation.CLAMP),
  }));

  const handleOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(lift.value, [0, historyH * 0.4], [1, 0.35], Extrapolation.CLAMP),
  }));

  const startWith = useCallback(
    async (source: "camera" | "gallery") => {
      if (!isAuthenticated) {
        navigation.getParent()?.navigate("Profile" as never);
        return;
      }
      setError(null);
      setBusy(source);
      try {
        const dataUrl =
          source === "camera"
            ? await pickSelfieFromCamera()
            : await pickSelfieFromGallery();
        if (!dataUrl) {
          setError(
            source === "camera"
              ? "Selfie olinmadi. Ruxsat bering yoki galereyadan tanlang."
              : "Rasm tanlanmadi.",
          );
          return;
        }

        const ok = await gate.ensureAccess();
        if (!ok) {
          setError("Morph AI uchun obuna kerak — tarifni tanlang.");
          return;
        }

        session.clear();
        session.setSelfie(dataUrl);
        navigation.replace("MorphResults");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Rasm yuklashda xato");
      } finally {
        setBusy(null);
      }
    },
    [gate, isAuthenticated, navigation, session],
  );

  const openGeneration = useCallback(
    (item: MorphAiGeneration) => {
      if (item.after_url) {
        session.setTryOn(item.after_url, item.style_id, item.title);
      }
      if (item.before_url) {
        session.setSelfie(item.before_url);
      }
      navigation.navigate("MorphStudio");
    },
    [navigation, session],
  );

  if (!ready) {
    return <View style={styles.root} />;
  }

  const thumb = Math.max(96, Math.floor((winH > 0 ? winH : 700) * 0.11));

  return (
    <View style={styles.root}>
      <Image
        source={{ uri: heroUri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={300}
      />
      <LinearGradient
        colors={["rgba(10,10,10,0.15)", "rgba(10,10,10,0.55)", "#1A1A1A"]}
        locations={[0, 0.42, 0.72]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        entering={FadeIn.duration(400)}
        style={[styles.centerCopy, { paddingTop: insets.top + 40 }]}
        pointerEvents="none"
      >
        <Text style={styles.headline}>Selfie yuklang</Text>
        <Text style={styles.sub}>Yuz aniq ko‘rinsin · yaxshi yorug‘lik</Text>
      </Animated.View>

      {/* History — pastdan ko‘tariladi; sheet yuqoriga siljisa ochiladi */}
      <Animated.View
        style={[
          styles.historyPanel,
          {
            height: historyH,
            bottom: dockPad,
            paddingBottom: 12,
          },
          historyAnim,
        ]}
        pointerEvents={historyOpen ? "auto" : "none"}
      >
        <View style={styles.historyHeader}>
          <View>
            <Text style={styles.historyTitle}>Saqlangan va yaratilgan</Text>
            <Text style={styles.historySub}>
              {historyLoading
                ? "Yuklanmoqda…"
                : historyItems.length > 0
                  ? `${historyItems.length} ta look`
                  : "Try-on tarixi"}
            </Text>
          </View>
          <Pressable
            style={styles.historyClose}
            onPress={closeHistoryPanel}
            accessibilityLabel="Yopish"
          >
            <Ionicons name="chevron-down" size={18} color="#FFF" />
          </Pressable>
        </View>

        {historyLoading && !historyFetched ? (
          <ActivityIndicator color="#FFF" style={{ marginTop: 28 }} />
        ) : historyError ? (
          <View style={styles.historyEmpty}>
            <Text style={styles.historyEmptyText}>{historyError}</Text>
            <Pressable style={styles.historyRetry} onPress={() => void loadHistory()}>
              <Text style={styles.historyRetryText}>Qayta</Text>
            </Pressable>
          </View>
        ) : historyItems.length === 0 ? (
          <View style={styles.historyEmpty}>
            <Text style={styles.historyEmptyTitle}>Hali try-on yo‘q</Text>
            <Text style={styles.historyEmptyText}>
              Yangi look yarating — bu yerda saqlanadi.
            </Text>
          </View>
        ) : (
          <FlatList
            data={historyItems}
            keyExtractor={(item) => String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.historyList}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.historyCard, { width: thumb }]}
                onPress={() => openGeneration(item)}
              >
                <Image
                  source={{ uri: item.after_url || item.before_url || undefined }}
                  style={styles.historyImg}
                  contentFit="cover"
                />
                <Text style={styles.historyCardTitle} numberOfLines={1}>
                  {item.title || item.style_id}
                </Text>
              </Pressable>
            )}
          />
        )}
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.sheet,
            {
              marginBottom: dockPad,
              paddingBottom: 12,
            },
            sheetAnim,
          ]}
        >
          <View style={styles.handleRow}>
            <View style={styles.handleSpacer} />
            <Animated.View style={[styles.handleCluster, handleOpacity]}>
              <View style={styles.handle} />
              <Text style={styles.handleHint}>Tarix · yuqoriga</Text>
            </Animated.View>
            <Pressable
              style={[
                styles.historyIconBtn,
                historyOpen && styles.historyIconBtnOn,
              ]}
              onPress={() => {
                if (historyOpen) closeHistoryPanel();
                else openHistoryPanel();
              }}
              accessibilityLabel="Tarix"
              hitSlop={8}
            >
              <Ionicons
                name="time-outline"
                size={16}
                color={historyOpen ? "#FFF" : "#0A0A0A"}
              />
            </Pressable>
          </View>

          <View style={styles.steps}>
            <View style={styles.stepTrack} />
            {(["Selfie", "Tahlil", "Natija"] as const).map((label, i) => (
              <View key={label} style={styles.stepCol}>
                <View style={[styles.stepDot, i === 0 && styles.stepDotOn]}>
                  <Text style={[styles.stepNum, i === 0 && styles.stepNumOn]}>
                    {i + 1}
                  </Text>
                </View>
                <Text style={[styles.stepLabel, i === 0 && styles.stepLabelOn]}>
                  {label}
                </Text>
              </View>
            ))}
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              {error.includes("obuna") ? (
                <Pressable
                  style={styles.errorCta}
                  onPress={() => navigation.navigate("MorphPaywall")}
                >
                  <Text style={styles.errorCtaText}>Tariflar</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <View style={styles.actionGrid}>
            <Pressable
              style={styles.gridBtnDark}
              disabled={!!busy}
              onPress={() => void startWith("camera")}
            >
              {busy === "camera" ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={20} color="#FFF" />
                  <Text style={styles.gridTitleLight}>Kameradan olish</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={styles.gridBtnLight}
              disabled={!!busy}
              onPress={() => void startWith("gallery")}
            >
              {busy === "gallery" ? (
                <ActivityIndicator color="#0A0A0A" />
              ) : (
                <>
                  <Ionicons name="images-outline" size={20} color="#6B6B6B" />
                  <Text style={styles.gridTitleDark}>Galereyadan tanlash</Text>
                </>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#1A1A1A" },
  centerCopy: {
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 6,
  },
  headline: {
    color: "#FFF",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  sub: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  historyPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#0A0A0A",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 14,
    paddingHorizontal: 14,
    zIndex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  historyTitle: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  historySub: {
    marginTop: 2,
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    fontWeight: "600",
  },
  historyClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  historyList: {
    gap: 10,
    paddingRight: 8,
    paddingBottom: 8,
  },
  historyCard: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#161616",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
  },
  historyImg: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: "#1A1A1A",
  },
  historyCardTitle: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  historyEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 6,
  },
  historyEmptyTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },
  historyEmptyText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
  },
  historyRetry: {
    marginTop: 10,
    backgroundColor: "#FFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  historyRetryText: { color: "#0A0A0A", fontWeight: "800", fontSize: 12 },
  sheet: {
    marginTop: "auto",
    backgroundColor: "#FFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 8,
    gap: 10,
    zIndex: 2,
  },
  handleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 28,
  },
  handleSpacer: { width: 32 },
  handleCluster: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D4D4D4",
  },
  handleHint: {
    fontSize: 10,
    fontWeight: "600",
    color: "#A0A0A0",
    includeFontPadding: false,
  },
  historyIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  historyIconBtnOn: {
    backgroundColor: "#0A0A0A",
  },
  steps: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    position: "relative",
  },
  stepTrack: {
    position: "absolute",
    left: 28,
    right: 28,
    top: 11,
    height: 1.5,
    backgroundColor: "#E8E8E8",
  },
  stepCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    zIndex: 1,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotOn: { backgroundColor: "#0A0A0A" },
  stepNum: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9A9A9A",
    includeFontPadding: false,
  },
  stepNumOn: { color: "#FFF" },
  stepLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#A0A0A0",
    includeFontPadding: false,
  },
  stepLabelOn: { color: "#0A0A0A", fontWeight: "700" },
  errorBox: {
    backgroundColor: "rgba(185,28,28,0.08)",
    borderRadius: 10,
    padding: 8,
    gap: 6,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },
  errorCta: {
    alignSelf: "flex-start",
    backgroundColor: "#0A0A0A",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  errorCtaText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  actionGrid: { flexDirection: "row", gap: 8 },
  gridBtnDark: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0A0A0A",
    borderRadius: 14,
    minHeight: 72,
    paddingHorizontal: 8,
    paddingVertical: 10,
    overflow: "hidden",
  },
  gridBtnLight: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFF",
    borderRadius: 14,
    minHeight: 72,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: "#D4D4D4",
  },
  gridTitleLight: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
    includeFontPadding: false,
  },
  gridTitleDark: {
    color: "#0A0A0A",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
    includeFontPadding: false,
  },
});
