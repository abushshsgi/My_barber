import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector, ScrollView } from "react-native-gesture-handler";
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
  formatMorphUserError,
  type MorphAiGeneration,
} from "../../api/ai";
import { fetchHairstyles } from "../../api/hairstyles";
import { genderToAudience, getAppGender } from "../../lib/guest";
import { pexelsPhotoUrl } from "../../api/media";
import { useAuth } from "../../auth/AuthContext";
import { TAB_DOCK_CLEARANCE } from "../../hooks/useHideTabBar";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";
import { writeAppShell, writeLastShellTab } from "../../lib/app-shell";
import { presentMorphPaywall } from "../../lib/morph-return";
import { markMorphTryOnIntroDone } from "../../lib/morph-onboarding";
import { useMorphSession } from "../../lib/morph-session";
import { pickSelfieFromCamera, pickSelfieFromGallery } from "../../lib/selfie";
import type { MorphStackParamList } from "../../navigation/MorphStack";
import {
  ASPECT,
  IS_SMALL_DEVICE,
  clamp,
  fontSize,
  moderateScale,
  radius,
  scale,
  spacing,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<MorphStackParamList, "MorphCapture">;

const FALLBACK_HERO = pexelsPhotoUrl(3998429, 1400);
const SPRING = { damping: 22, stiffness: 220, mass: 0.85 };
const PREVIEW_LIMIT = 6;

/** Viewfinder + yuz — kamera tugmasi uchun. */
function FaceScanIcon({ color = "#FFF", size = 28 }: { color?: string; size?: number }) {
  const s = size;
  const c = Math.max(5, Math.round(s * 0.22));
  const stroke = Math.max(1.5, s * 0.07);
  return (
    <View style={{ width: s, height: s }}>
      {/* 4 burchak */}
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: c,
          height: c,
          borderTopWidth: stroke,
          borderLeftWidth: stroke,
          borderColor: color,
          borderTopLeftRadius: 2,
        }}
      />
      <View
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: c,
          height: c,
          borderTopWidth: stroke,
          borderRightWidth: stroke,
          borderColor: color,
          borderTopRightRadius: 2,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: c,
          height: c,
          borderBottomWidth: stroke,
          borderLeftWidth: stroke,
          borderColor: color,
          borderBottomLeftRadius: 2,
        }}
      />
      <View
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: c,
          height: c,
          borderBottomWidth: stroke,
          borderRightWidth: stroke,
          borderColor: color,
          borderBottomRightRadius: 2,
        }}
      />
      {/* Yuz */}
      <View
        style={{
          position: "absolute",
          left: s * 0.28,
          top: s * 0.32,
          width: s * 0.14,
          height: s * 0.14,
          borderRadius: 99,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: "absolute",
          right: s * 0.28,
          top: s * 0.32,
          width: s * 0.14,
          height: s * 0.14,
          borderRadius: 99,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: s * 0.3,
          top: s * 0.58,
          width: s * 0.4,
          height: s * 0.22,
          borderBottomWidth: stroke * 1.2,
          borderLeftWidth: stroke * 0.9,
          borderRightWidth: stroke * 0.9,
          borderColor: color,
          borderBottomLeftRadius: s * 0.22,
          borderBottomRightRadius: s * 0.22,
        }}
      />
    </View>
  );
}

/** Uchta ustma-ust kartochka — galereya tugmasi uchun. */
function GalleryStackIcon({ size = 28 }: { size?: number }) {
  const w = size * 0.52;
  const h = size * 0.62;
  const r = 4;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          position: "absolute",
          width: w,
          height: h,
          borderRadius: r,
          backgroundColor: "#D8D8D8",
          transform: [{ rotate: "-14deg" }, { translateX: -size * 0.16 }],
        }}
      />
      <View
        style={{
          position: "absolute",
          width: w,
          height: h,
          borderRadius: r,
          backgroundColor: "#BDBDBD",
          transform: [{ rotate: "10deg" }, { translateX: size * 0.14 }],
        }}
      />
      <View
        style={{
          width: w,
          height: h,
          borderRadius: r,
          backgroundColor: "#9A9A9A",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: "#7A7A7A",
        }}
      />
    </View>
  );
}

/**
 * Try-on — ixcham sheet + yuqoriga swipe bilan oq history panel.
 * Ochilganda capture UI yashirinadi; oxirgi 6 ta look 2 ustunli gridda.
 */
export function MorphTryOnScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { height: winH, width: winW } = useWindowDimensions();
  const { isAuthenticated } = useAuth();
  const session = useMorphSession();
  const gate = useMorphLimitGate();

  const dockPad = TAB_DOCK_CLEARANCE + Math.max(insets.bottom, 8);
  const gridGap = moderateScale(8);
  const gridPad = scale(28);
  const cardW = (winW - gridPad * 2 - gridGap) / 2;

  /**
   * Sheet o'lchamlari — hammasi joriy ekran balandligidan hosil bo'ladi,
   * shunda iPhone SE'da ham tugmalar dock ostiga tushib ketmaydi.
   */
  const { captureMaxHeight, historyH, sheetMinHeight } = useMemo(() => {
    const usable = winH - insets.top - dockPad;
    return {
      historyH: clamp(Math.round(winH * 0.68), 320, Math.min(560, usable)),
      captureMaxHeight: clamp(Math.round(usable * 0.34), 168, 250),
      sheetMinHeight: clamp(Math.round(usable * 0.42), 240, 340),
    };
  }, [dockPad, insets.top, winH]);

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
    setReady(true);
    void markMorphTryOnIntroDone();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getAppGender()
      .then((g) => fetchHairstyles(genderToAudience(g)))
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

  const scrollNative = Gesture.Native();
  const pan = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .failOffsetX([-40, 40])
    .simultaneousWithExternalGesture(scrollNative)
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

  /** Sheet pastidan o‘sadi — translate kerak emas. */
  const captureAnim = useAnimatedStyle(() => {
    const t = interpolate(
      lift.value,
      [0, historyH * 0.45],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return {
      opacity: t,
      maxHeight: interpolate(
        lift.value,
        [0, historyH * 0.55],
        [captureMaxHeight, 0],
        Extrapolation.CLAMP,
      ),
      marginBottom: interpolate(
        lift.value,
        [0, historyH * 0.4],
        [0, -12],
        Extrapolation.CLAMP,
      ),
      overflow: "hidden" as const,
    };
  });

  const historyAnim = useAnimatedStyle(() => {
    const t = interpolate(
      lift.value,
      [historyH * 0.15, historyH * 0.5],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: t,
      height: lift.value,
      overflow: "hidden" as const,
    };
  });

  const fullHistoryCtaAnim = useAnimatedStyle(() => {
    const t = interpolate(
      lift.value,
      [historyH * 0.72, historyH * 0.92],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: t,
      transform: [{ translateY: interpolate(t, [0, 1], [10, 0]) }],
    };
  });

  const handleOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(lift.value, [0, historyH * 0.4], [1, 0.55], Extrapolation.CLAMP),
  }));

  const startWith = useCallback(
    async (source: "camera" | "gallery") => {
      if (!isAuthenticated) {
        void writeAppShell("morph");
        void writeLastShellTab("morph", "MorphTryOn");
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

        session.clear();
        session.setSelfie(dataUrl);

        // Tahlil/generatsiya sahifasiga o'tamiz — obuna faqat Generate da so'raladi
        navigation.replace("MorphResults");
      } catch (err) {
        setError(formatMorphUserError(err instanceof Error ? err.message : "", "Rasm yuklashda xato"));
      } finally {
        setBusy(null);
      }
    },
    [isAuthenticated, navigation, session],
  );

  const openGeneration = useCallback(
    (item: MorphAiGeneration) => {
      navigation.navigate("MorphHistory", { generationId: item.id });
    },
    [navigation],
  );

  if (!ready) {
    return <View style={styles.root} />;
  }

  const previewItems = historyItems.slice(0, PREVIEW_LIMIT);

  return (
    <View style={styles.root}>
      <Image
        source={{ uri: heroUri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={300}
      />
      <LinearGradient
        colors={["rgba(17,17,17,0.08)", "rgba(17,17,17,0.35)", "#FAFAFA"]}
        locations={[0, 0.42, 0.72]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        entering={FadeIn.duration(400)}
        style={[styles.centerCopy, { paddingTop: insets.top + verticalScale(40) }]}
        pointerEvents="none"
      >
        <Text style={styles.headline}>Selfie yuklang</Text>
        <Text style={styles.sub}>Yuz aniq ko‘rinsin · yaxshi yorug‘lik</Text>
      </Animated.View>

      {/* Nav ostidagi oq fon — qora bo‘shliq bo‘lmasin */}
      <View style={[styles.dockBleed, { height: dockPad }]} pointerEvents="none" />

      <Animated.View
        style={[
          styles.sheet,
          {
            paddingBottom: dockPad,
            minHeight: sheetMinHeight,
          },
        ]}
      >
        <GestureDetector gesture={pan}>
          <View>
            <View style={styles.handleRow}>
              <View style={styles.handleSpacer} />
              <Animated.View style={[styles.handleCluster, handleOpacity]}>
                <View style={styles.handle} />
                <Text style={styles.handleHint}>
                  {historyOpen ? "Yopish · pastga" : "Tarix · yuqoriga"}
                </Text>
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
                  color={historyOpen ? "#FFF" : "#111111"}
                />
              </Pressable>
            </View>

            {/* Capture — yopiq holat (pan faqat handle orqali; tugmalar bosiladi) */}
            <Animated.View
              style={captureAnim}
              pointerEvents={historyOpen ? "none" : "auto"}
            >
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
                      onPress={() =>
                        presentMorphPaywall(navigation, "subscription", "MorphCapture")
                      }
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
                      <FaceScanIcon color="#FFF" size={ACTION_ICON} />
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
                    <ActivityIndicator color="#111111" />
                  ) : (
                    <>
                      <GalleryStackIcon size={ACTION_ICON} />
                      <Text style={styles.gridTitleDark}>Galereyadan tanlash</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </Animated.View>

            {/* History — ochiq holat */}
            <Animated.View
              style={[styles.historyBody, historyAnim]}
              pointerEvents={historyOpen ? "auto" : "none"}
            >
              <View style={styles.historyHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTitle}>So‘nggi looklar</Text>
                  <Text style={styles.historySub}>
                    {historyLoading
                      ? "Yuklanmoqda…"
                      : historyItems.length > 0
                        ? `${Math.min(previewItems.length, PREVIEW_LIMIT)} / ${historyItems.length}`
                        : "Try-on tarixi"}
                  </Text>
                </View>
                <Pressable
                  style={styles.seeAllBtn}
                  onPress={() => navigation.navigate("MorphHistory")}
                  accessibilityLabel="Barcha tarix"
                >
                  <Text style={styles.seeAllText}>Barchasi</Text>
                  <Ionicons name="chevron-forward" size={14} color="#111111" />
                </Pressable>
              </View>

              {historyLoading && !historyFetched ? (
                <ActivityIndicator color="#111111" style={{ marginTop: 28 }} />
              ) : historyError ? (
                <View style={styles.historyEmpty}>
                  <Text style={styles.historyEmptyText}>{historyError}</Text>
                  <Pressable
                    style={styles.historyRetry}
                    onPress={() => void loadHistory()}
                  >
                    <Text style={styles.historyRetryText}>Qayta</Text>
                  </Pressable>
                </View>
              ) : previewItems.length === 0 ? (
                <View style={styles.historyEmpty}>
                  <Text style={styles.historyEmptyTitle}>Hali try-on yo‘q</Text>
                  <Text style={styles.historyEmptyText}>
                    Yangi look yarating — bu yerda saqlanadi.
                  </Text>
                </View>
              ) : (
                <GestureDetector gesture={scrollNative}>
                  <ScrollView
                    style={styles.historyScroll}
                    contentContainerStyle={[
                      styles.historyGrid,
                      { gap: gridGap, paddingHorizontal: gridPad - 16 },
                    ]}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                    bounces
                  >
                    {previewItems.map((item) => (
                      <Pressable
                        key={item.id}
                        style={[styles.historyCard, { width: cardW }]}
                        onPress={() => openGeneration(item)}
                      >
                        <View style={styles.historyImgWrap}>
                          <Image
                            source={{
                              uri: item.after_url || item.before_url || undefined,
                            }}
                            style={styles.historyImg}
                            contentFit="cover"
                          />
                          <LinearGradient
                            colors={["transparent", "rgba(0,0,0,0.75)"]}
                            locations={[0.35, 1]}
                            style={styles.historyGrad}
                          />
                          <Text style={styles.historyCardTitle} numberOfLines={1}>
                            {item.title || item.style_id}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </GestureDetector>
              )}

              {previewItems.length > 0 ? (
                <Animated.View
                  style={fullHistoryCtaAnim}
                  pointerEvents={historyOpen ? "auto" : "none"}
                >
                  <Pressable
                    style={styles.fullHistoryCta}
                    onPress={() => navigation.navigate("MorphHistory")}
                  >
                    <Text style={styles.fullHistoryCtaText}>To‘liq tarixni ko‘rish</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFF" />
                  </Pressable>
                </Animated.View>
              ) : null}
            </Animated.View>
          </View>
        </GestureDetector>
      </Animated.View>
    </View>
  );
}

const ACTION_ICON = scale(IS_SMALL_DEVICE ? 22 : 26);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFA" },
  centerCopy: {
    alignItems: "center",
    paddingHorizontal: scale(24),
    gap: spacing.xs,
  },
  headline: {
    color: "#FFF",
    fontSize: fontSize(26),
    fontWeight: "800",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  sub: {
    color: "rgba(255,255,255,0.72)",
    fontSize: fontSize(13),
    fontWeight: "500",
    textAlign: "center",
  },
  dockBleed: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFF",
    zIndex: 1,
  },
  sheet: {
    marginTop: "auto",
    backgroundColor: "#FFF",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: scale(16),
    paddingTop: spacing.sm,
    gap: spacing.sm,
    zIndex: 2,
    overflow: "hidden",
  },
  handleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: verticalScale(IS_SMALL_DEVICE ? 36 : 44),
    paddingVertical: spacing.xs,
  },
  handleSpacer: { width: scale(34) },
  handleCluster: {
    flex: 1,
    alignItems: "center",
    gap: moderateScale(4),
  },
  handle: {
    width: scale(40),
    height: verticalScale(4),
    borderRadius: moderateScale(2),
    backgroundColor: "#D4D4D4",
  },
  handleHint: {
    fontSize: fontSize(10),
    fontWeight: "600",
    color: "#A0A0A0",
    includeFontPadding: false,
  },
  historyIconBtn: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(34) / 2,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  historyIconBtnOn: {
    backgroundColor: "#111111",
  },
  steps: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
    position: "relative",
  },
  stepTrack: {
    position: "absolute",
    left: scale(32),
    right: scale(32),
    top: scale(12),
    height: verticalScale(1.5),
    backgroundColor: "#E8E8E8",
  },
  stepCol: {
    flex: 1,
    alignItems: "center",
    gap: moderateScale(5),
    zIndex: 1,
  },
  stepDot: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(24) / 2,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotOn: { backgroundColor: "#111111" },
  stepNum: {
    fontSize: fontSize(11),
    fontWeight: "700",
    color: "#9A9A9A",
    includeFontPadding: false,
  },
  stepNumOn: { color: "#FFF" },
  stepLabel: {
    fontSize: fontSize(11),
    fontWeight: "600",
    color: "#A0A0A0",
    includeFontPadding: false,
  },
  stepLabelOn: { color: "#111111", fontWeight: "700" },
  errorBox: {
    backgroundColor: "rgba(185,28,28,0.08)",
    borderRadius: radius.sm,
    padding: spacing.xs,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: fontSize(11),
    fontWeight: "600",
    lineHeight: fontSize(15),
  },
  errorCta: {
    alignSelf: "flex-start",
    backgroundColor: "#111111",
    borderRadius: radius.pill,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
  },
  errorCtaText: { color: "#FFF", fontSize: fontSize(11), fontWeight: "700" },
  actionGrid: {
    flexDirection: "row",
    gap: moderateScale(10),
    marginTop: spacing.xl,
    paddingHorizontal: scale(18),
    justifyContent: "center",
  },
  gridBtnDark: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: "#111111",
    borderRadius: radius.xl,
    minHeight: verticalScale(IS_SMALL_DEVICE ? 60 : 72),
    paddingHorizontal: scale(8),
    paddingVertical: spacing.sm,
    overflow: "hidden",
  },
  gridBtnLight: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    minHeight: verticalScale(IS_SMALL_DEVICE ? 60 : 72),
    paddingHorizontal: scale(8),
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: "#D0D0D0",
    borderStyle: "dashed",
  },
  gridTitleLight: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: fontSize(12),
    textAlign: "center",
    includeFontPadding: false,
  },
  gridTitleDark: {
    color: "#111111",
    fontWeight: "700",
    fontSize: fontSize(12),
    textAlign: "center",
    includeFontPadding: false,
  },
  historyBody: {
    gap: spacing.sm,
  },
  historyScroll: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: moderateScale(10),
  },
  historyTitle: {
    color: "#111111",
    fontSize: fontSize(15),
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  historySub: {
    marginTop: verticalScale(2),
    color: "#8A8A8A",
    fontSize: fontSize(11),
    fontWeight: "600",
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(2),
    backgroundColor: "#F2F2F2",
    borderRadius: radius.pill,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(7),
  },
  seeAllText: {
    color: "#111111",
    fontSize: fontSize(12),
    fontWeight: "700",
  },
  historyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingBottom: verticalScale(4),
  },
  historyCard: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: "#FAFAFA",
  },
  historyImgWrap: {
    width: "100%",
    aspectRatio: ASPECT.portrait,
    backgroundColor: "#FAFAFA",
    position: "relative",
  },
  historyImg: {
    width: "100%",
    height: "100%",
  },
  historyGrad: {
    ...StyleSheet.absoluteFill,
    justifyContent: "flex-end",
  },
  historyCardTitle: {
    position: "absolute",
    left: scale(8),
    right: scale(8),
    bottom: scale(8),
    color: "#FFF",
    fontSize: fontSize(11),
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  historyEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(24),
    gap: spacing.xs,
    minHeight: verticalScale(120),
  },
  historyEmptyTitle: {
    color: "#111111",
    fontSize: fontSize(16),
    fontWeight: "800",
  },
  historyEmptyText: {
    color: "#8A8A8A",
    fontSize: fontSize(12),
    textAlign: "center",
    lineHeight: fontSize(17),
  },
  historyRetry: {
    marginTop: spacing.sm,
    backgroundColor: "#111111",
    borderRadius: radius.pill,
    paddingHorizontal: scale(14),
    paddingVertical: spacing.xs,
  },
  historyRetryText: { color: "#FFF", fontWeight: "800", fontSize: fontSize(12) },
  fullHistoryCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(8),
    backgroundColor: "#111111",
    borderRadius: radius.md,
    minHeight: verticalScale(46),
    paddingHorizontal: scale(14),
  },
  fullHistoryCtaText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: fontSize(13),
  },
});
