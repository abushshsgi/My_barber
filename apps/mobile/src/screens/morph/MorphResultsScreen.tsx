import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  analyzeAiStyle,
  checkAiStyleFace,
  formatMorphUserError,
  generateAiStyleTryOn,
  NO_FACE_MESSAGE,
  saveAiStyleHistory,
  saveMorphAiGeneration,
  type AiStyleSuggestion,
} from "../../api/ai";
import { fetchHairstyles, type ApiHairstyle } from "../../api/hairstyles";
import { useAppToast } from "../../components/ui/ToastProvider";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";
import { faceShapeLabel, hairTypeLabel } from "../../lib/morph-labels";
import { WEB_ORIGIN } from "../../lib/morph-share";
import { useMorphSession } from "../../lib/morph-session";
import type { MorphStackParamList } from "../../navigation/MorphStack";

type Props = NativeStackScreenProps<MorphStackParamList, "MorphResults">;

type Phase = "checking" | "analyzing" | "ready" | "error";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = SCREEN_W - 40;

export function MorphResultsScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const session = useMorphSession();
  const gate = useMorphLimitGate();
  const toast = useAppToast();
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);
  const [activeStyleId, setActiveStyleId] = useState<string | null>(null);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [moreStyles, setMoreStyles] = useState<ApiHairstyle[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const analyzingBusy = phase === "checking" || phase === "analyzing";

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scanAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !analyzingBusy });
  }, [navigation, analyzingBusy]);

  useEffect(() => {
    const sub = navigation.addListener("beforeRemove", (e) => {
      if (!analyzingBusy) return;
      e.preventDefault();
    });
    return sub;
  }, [navigation, analyzingBusy]);

  useEffect(() => {
    let cancelled = false;
    void fetchHairstyles("men")
      .then((rows) => {
        if (!cancelled) setMoreStyles(rows.slice(0, 12));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const runTryOn = useCallback(
    async (style: AiStyleSuggestion, photoOverride?: string) => {
      const photo = photoOverride || session.selfieDataUrl;
      if (!photo) return;
      if (session.tryOnByStyle[style.id]) {
        session.setTryOn(session.tryOnByStyle[style.id], style.id, style.title);
        return;
      }
      const ok = await gate.ensureTryOn();
      if (!ok) {
        navigation.navigate("MorphPaywall");
        return;
      }
      setActiveStyleId(style.id);
      setError(null);
      try {
        const out = await generateAiStyleTryOn(photo, style.id);
        session.setTryOn(out.preview_image, out.style_id || style.id, out.style_title || style.title);
        void saveMorphAiGeneration({
          style_id: out.style_id || style.id,
          title: out.style_title || style.title,
          before_image: photo,
          after_image: out.preview_image,
        }).catch(() => undefined);
        gate.refresh();
      } catch (err) {
        if (gate.handleError(err)) {
          navigation.navigate("MorphPaywall");
          return;
        }
        const msg = formatMorphUserError(
          err instanceof Error ? err.message : "Try-on xatosi",
          "Try-on xatosi",
        );
        setError(msg);
        toast.show(msg, { tone: "error", durationMs: 4200 });
      } finally {
        setActiveStyleId(null);
      }
    },
    [session, gate, navigation, toast],
  );

  const runAnalyze = useCallback(
    async (photoOverride?: string) => {
      const photo = photoOverride || session.selfieDataUrl;
      if (!photo) {
        setError("Selfie topilmadi");
        setPhase("error");
        return;
      }
      setPhase("checking");
      setError(null);
      try {
        // Yuzdan boshqa narsa (obyekt, landscape, …) — darhol to‘xtatiladi.
        await checkAiStyleFace(photo);
        setPhase("analyzing");
        const result = await analyzeAiStyle(photo, "men");
        session.setAnalyze(result);
        void saveAiStyleHistory({
          image: photo,
          face_shape_key: result.face_shape,
          hair_type_key: result.hair_type,
          source: "camera_scan",
          replace_latest: true,
        }).catch(() => undefined);
        setPhase("ready");

        const preferredId = session.preferredStyleId;
        const preferredFromList =
          preferredId != null ? result.suggestions.find((s) => s.id === preferredId) : undefined;
        const preferredFallback: AiStyleSuggestion | null =
          preferredId && !preferredFromList
            ? {
                id: preferredId,
                title: session.preferredStyleTitle || preferredId,
                match: 100,
                reason_uz: "",
                category: "",
                seed: preferredId,
                image_url: "",
                salon_id: null,
                salon_name: null,
                barber_name: null,
              }
            : null;
        const first = preferredFromList || preferredFallback || result.suggestions[0];
        if (first) {
          void runTryOn(first, photo);
        }
      } catch (err) {
        if (gate.handleError(err)) {
          navigation.navigate("MorphPaywall");
          return;
        }
        setError(
          formatMorphUserError(
            err instanceof Error ? err.message : NO_FACE_MESSAGE,
            NO_FACE_MESSAGE,
          ),
        );
        setPhase("error");
      }
    },
    [session, gate, navigation, runTryOn],
  );

  useEffect(() => {
    void runAnalyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bir marta selfie bilan
  }, []);

  useEffect(() => {
    if (phase === "error" && !session.analyze) {
      toast.show(error || NO_FACE_MESSAGE, { tone: "error", durationMs: 5200 });
      return;
    }
    if (phase === "checking") {
      toast.show("Yuz tekshirilmoqda…", { tone: "loading", durationMs: 0 });
      return;
    }
    if (phase === "analyzing") {
      toast.show("Yuz topildi. Tahlil qilinmoqda…", {
        tone: "success",
        durationMs: 3600,
      });
      return;
    }
    toast.hide();
  }, [phase, error, session.analyze, toast]);

  useEffect(() => {
    return () => toast.hide();
  }, [toast]);

  const suggestions = session.analyze?.suggestions ?? [];
  const activeSuggestion = suggestions[spotlightIndex] ?? suggestions[0] ?? null;
  const activePreview = activeSuggestion
    ? session.tryOnByStyle[activeSuggestion.id] ||
      (session.tryOnStyleId === activeSuggestion.id ? session.tryOnPreview : null)
    : session.tryOnPreview;
  const analyzing = analyzingBusy;
  const frameH = Math.min(SCREEN_W * 0.72, 340);
  const scanTranslate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [12, frameH - 28],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.9],
  });
  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.02],
  });

  const suggestionIds = useMemo(() => new Set(suggestions.map((s) => s.id)), [suggestions]);
  const otherStyles = useMemo(
    () => moreStyles.filter((s) => !suggestionIds.has(s.id)),
    [moreStyles, suggestionIds],
  );

  const openPreview = useCallback(
    (style: AiStyleSuggestion) => {
      const preview = session.tryOnByStyle[style.id] || undefined;
      navigation.navigate("MorphPreview", {
        styleId: style.id,
        title: style.title,
        match: style.match,
        imageUrl: style.image_url,
        previewImage: preview,
        salonId: style.salon_id,
        reason: style.reason_uz,
      });
    },
    [navigation, session.tryOnByStyle],
  );

  const goCapture = useCallback(() => {
    toast.hide();
    session.clear();
    setError(null);
    setSpotlightIndex(0);
    navigation.replace("MorphCapture");
  }, [navigation, session, toast]);

  const onBack = useCallback(() => {
    if (analyzingBusy) return;
    goCapture();
  }, [analyzingBusy, goCapture]);

  /** Alert.alert webda ishlamaydi — capture sahifasiga qaytaramiz. */
  const onNewPhoto = useCallback(() => {
    if (analyzingBusy) return;
    goCapture();
  }, [analyzingBusy, goCapture]);

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const bookSalon = useCallback(async (salonId: number | null) => {
    if (!salonId) {
      await Linking.openURL(`${WEB_ORIGIN}/map`);
      return;
    }
    await Linking.openURL(`${WEB_ORIGIN}/booking/${salonId}`);
  }, []);

  /** Analiz / xato — selfie ustida scan UI. */
  if (analyzing || (phase === "error" && !session.analyze)) {
    return (
      <View style={styles.root}>
        {session.selfieDataUrl ? (
          <Image source={{ uri: session.selfieDataUrl }} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "#111" }]} />
        )}
        <LinearGradient
          colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.2)", "rgba(0,0,0,0.7)"]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.scanChrome, { paddingTop: Math.max(insets.top, 10) }]}>
          <Pressable
            style={[styles.scanBackBtn, analyzingBusy && styles.scanBackBtnDisabled]}
            onPress={onBack}
            disabled={analyzingBusy}
            accessibilityLabel="Orqaga"
            accessibilityState={{ disabled: analyzingBusy }}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={analyzingBusy ? "rgba(255,255,255,0.35)" : "#FFF"}
            />
          </Pressable>
          <Text style={styles.scanChromeTitle}>Morf AI</Text>
          <View style={styles.scanBackBtn} />
        </View>

        <View style={styles.scanStage}>
          <Animated.View
            style={[
              styles.faceFrame,
              {
                width: SCREEN_W * 0.72,
                height: frameH,
                opacity: analyzing ? pulseOpacity : 1,
                transform: analyzing ? [{ scale: pulseScale }] : undefined,
              },
            ]}
          >
            <View style={[styles.frameCorner, styles.frameTL]} />
            <View style={[styles.frameCorner, styles.frameTR]} />
            <View style={[styles.frameCorner, styles.frameBL]} />
            <View style={[styles.frameCorner, styles.frameBR]} />
            {analyzing ? (
              <Animated.View
                style={[styles.scanLine, { transform: [{ translateY: scanTranslate }] }]}
              />
            ) : (
              <View style={styles.frameErrorBadge}>
                <Ionicons name="alert-circle" size={22} color="#FFF" />
              </View>
            )}
          </Animated.View>
          <Text style={styles.scanHint}>
            {phase === "error"
              ? "Yuz aniq ko‘rinadigan selfie yuklang"
              : phase === "checking"
                ? "Yuz qidirilmoqda…"
                : "Yuz shakli tahlil qilinmoqda…"}
          </Text>
        </View>

        <View style={[styles.scanBottom, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          {phase === "error" ? (
            <Pressable style={styles.analyzeBtn} onPress={onNewPhoto}>
              <Ionicons name="camera-outline" size={18} color="#FFF" />
              <Text style={styles.analyzeBtnText}>Yangi rasm yuklash</Text>
            </Pressable>
          ) : (
            <View style={styles.analyzeBtn}>
              <ActivityIndicator color="#FFF" />
              <Text style={styles.analyzeBtnText}>
                {phase === "checking" ? "Yuz tekshirilmoqda…" : "Tahlil qilinmoqda…"}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.rootLight}>
      {session.selfieDataUrl ? (
        <Image
          source={{ uri: session.selfieDataUrl }}
          style={styles.bgPhoto}
          blurRadius={18}
        />
      ) : null}
      <View style={styles.bgDim} />

      <View style={[styles.chrome, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable style={styles.chromeBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={20} color="#0A0A0A" />
        </Pressable>
        <Text style={styles.chromeTitle}>Morf AI</Text>
        <View style={styles.chromeRight}>
          <Pressable
            style={styles.chromeBtn}
            onPress={() => navigation.getParent()?.navigate("Explore" as never)}
          >
            <Ionicons name="compass-outline" size={18} color="#0A0A0A" />
          </Pressable>
          <Pressable style={styles.chromeBtn} onPress={() => navigation.navigate("MorphHistory")}>
            <Ionicons name="time-outline" size={18} color="#0A0A0A" />
          </Pressable>
          <Pressable
            style={styles.chromeBtn}
            onPress={() => navigation.getParent()?.navigate("Profile" as never)}
          >
            <Ionicons name="person-outline" size={18} color="#0A0A0A" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 16) + 24,
          paddingHorizontal: 14,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.panel}>
          <Pressable style={styles.homeLink} onPress={() => navigation.navigate("MorphCapture")}>
            <Ionicons name="chevron-back" size={14} color="#0A0A0A" />
            <Text style={styles.homeLinkText}>Morf AI Home</Text>
          </Pressable>

          {session.analyze ? (
            <View style={styles.analysisBlock}>
              <Text style={styles.analysisEyebrow}>TAHLIL NATIJASI</Text>
              <View style={styles.chipRow}>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{faceShapeLabel(session.analyze.face_shape)}</Text>
                </View>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{hairTypeLabel(session.analyze.hair_type)}</Text>
                </View>
              </View>
              <Text style={styles.summary}>{session.analyze.summary_uz}</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorInline}>
              <Text style={styles.errorInlineText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.recsHead}>
            <Text style={styles.recsTitle}>
              {suggestions.length} ta tavsiya
            </Text>
            <Pressable onPress={onNewPhoto}>
              <Text style={styles.newPhoto}>Yangi rasm</Text>
            </Pressable>
          </View>

          {suggestions.length > 0 ? (
            <>
              <FlatList
                data={suggestions}
                horizontal
                pagingEnabled
                decelerationRate="fast"
                snapToInterval={CARD_W + 12}
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_W + 12));
                  setSpotlightIndex(Math.max(0, Math.min(idx, suggestions.length - 1)));
                }}
                contentContainerStyle={{ gap: 12 }}
                renderItem={({ item, index }) => {
                  const preview = session.tryOnByStyle[item.id];
                  const loading = activeStyleId === item.id;
                  return (
                    <Pressable
                      style={[styles.spotlight, { width: CARD_W }]}
                      onPress={() => openPreview(item)}
                    >
                      <Image
                        source={{ uri: preview || item.image_url || session.selfieDataUrl || undefined }}
                        style={styles.spotlightImg}
                      />
                      {loading ? (
                        <View style={styles.spotlightBusy}>
                          <ActivityIndicator color="#FFF" size="large" />
                          <Text style={styles.spotlightBusyText}>AI yaratmoqda...</Text>
                        </View>
                      ) : null}
                      {preview && !loading ? (
                        <View style={styles.previewBadge}>
                          <Text style={styles.previewBadgeText}>Sizning preview</Text>
                        </View>
                      ) : null}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.85)"]}
                        style={styles.spotlightGrad}
                      >
                        <View style={styles.spotlightMeta}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.spotlightIndex}>#{index + 1}</Text>
                            <Text style={styles.spotlightTitle} numberOfLines={1}>
                              {item.title}
                            </Text>
                          </View>
                          <View style={styles.matchPill}>
                            <Text style={styles.matchPillText}>{Math.round(item.match)}% mos</Text>
                          </View>
                        </View>
                      </LinearGradient>
                    </Pressable>
                  );
                }}
              />

              {activeSuggestion?.reason_uz ? (
                <Text style={styles.reason} numberOfLines={2}>
                  {activeSuggestion.reason_uz}
                </Text>
              ) : null}

              <Pressable
                style={[
                  styles.bookBtn,
                  !activeSuggestion?.salon_id && styles.bookBtnDisabled,
                ]}
                onPress={() => void bookSalon(activeSuggestion?.salon_id ?? null)}
              >
                <Ionicons name="calendar-outline" size={18} color="#FFF" />
                <Text style={styles.bookBtnText}>Bron qilish</Text>
              </Pressable>

              <View style={styles.iconActions}>
                <Pressable
                  style={[
                    styles.iconAction,
                    activePreview ? styles.iconActionOn : null,
                  ]}
                  disabled={!!activeStyleId || !!activePreview}
                  onPress={() => {
                    if (activeSuggestion) void runTryOn(activeSuggestion);
                  }}
                >
                  {activeStyleId === activeSuggestion?.id ? (
                    <ActivityIndicator color={activePreview ? "#FFF" : "#0A0A0A"} />
                  ) : (
                    <Ionicons
                      name="sparkles"
                      size={18}
                      color={activePreview ? "#FFF" : "#0A0A0A"}
                    />
                  )}
                </Pressable>
                <Pressable
                  style={[
                    styles.iconAction,
                    activeSuggestion && savedIds.includes(activeSuggestion.id)
                      ? styles.iconActionOn
                      : null,
                  ]}
                  onPress={() => activeSuggestion && toggleSave(activeSuggestion.id)}
                >
                  <Ionicons
                    name={
                      activeSuggestion && savedIds.includes(activeSuggestion.id)
                        ? "bookmark"
                        : "bookmark-outline"
                    }
                    size={18}
                    color={
                      activeSuggestion && savedIds.includes(activeSuggestion.id)
                        ? "#FFF"
                        : "#0A0A0A"
                    }
                  />
                </Pressable>
                <Pressable
                  style={styles.iconAction}
                  onPress={() => activeSuggestion && openPreview(activeSuggestion)}
                >
                  <Ionicons name="share-outline" size={18} color="#0A0A0A" />
                </Pressable>
              </View>

              {suggestions.length > 1 ? (
                <View style={styles.dots}>
                  {suggestions.map((s, i) => (
                    <View
                      key={s.id}
                      style={[styles.dot, i === spotlightIndex && styles.dotOn]}
                    />
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
        </View>

        {otherStyles.length > 0 ? (
          <View style={styles.morePanel}>
            <Text style={styles.moreTitle}>Boshqa uslublar</Text>
            <Text style={styles.moreSub}>
              Uslubni tanlang — AI sizning suratingizda ko'rsatadi
            </Text>
            <View style={styles.moreGrid}>
              {otherStyles.map((item) => {
                const preview = session.tryOnByStyle[item.id];
                const loading = activeStyleId === item.id;
                const title = item.title_uz || item.title;
                return (
                  <Pressable
                    key={item.id}
                    style={styles.moreCard}
                    disabled={!!activeStyleId && !preview}
                    onPress={() => {
                      if (preview) {
                        openPreview({
                          id: item.id,
                          title,
                          match: 80,
                          reason_uz: "",
                          category: item.category,
                          seed: item.slug,
                          image_url: item.image_url,
                          salon_id: null,
                          salon_name: null,
                          barber_name: null,
                        });
                        return;
                      }
                      void runTryOn({
                        id: item.id,
                        title,
                        match: 80,
                        reason_uz: "",
                        category: item.category,
                        seed: item.slug,
                        image_url: item.image_url,
                        salon_id: null,
                        salon_name: null,
                        barber_name: null,
                      });
                    }}
                  >
                    <View style={styles.moreImgWrap}>
                      <Image
                        source={{ uri: preview || item.image_url }}
                        style={styles.moreImg}
                      />
                      {loading ? (
                        <View style={styles.moreBusy}>
                          <ActivityIndicator color="#FFF" />
                        </View>
                      ) : (
                        <View style={styles.moreCta}>
                          <Ionicons name="sparkles" size={12} color="#FFF" />
                          <Text style={styles.moreCtaText}>
                            {preview ? "Sizning preview" : "Mening suratimda"}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.moreCardTitle} numberOfLines={1}>
                      {title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  rootLight: { flex: 1, backgroundColor: "#F5F5F5" },
  bgPhoto: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
    opacity: 0.55,
  },
  bgDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(245,245,245,0.72)",
  },
  scanChrome: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    zIndex: 2,
  },
  scanBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  scanBackBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  scanChromeTitle: {
    flex: 1,
    textAlign: "center",
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  scanStage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    paddingHorizontal: 24,
  },
  faceFrame: {
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  frameCorner: {
    position: "absolute",
    width: 22,
    height: 22,
    borderColor: "#FFF",
  },
  frameTL: { top: 10, left: 10, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  frameTR: { top: 10, right: 10, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  frameBL: { bottom: 10, left: 10, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  frameBR: { bottom: 10, right: 10, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  frameErrorBadge: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(220,38,38,0.25)",
  },
  scanLine: {
    position: "absolute",
    left: 10,
    right: 10,
    height: 2,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.95)",
    shadowColor: "#FFF",
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  scanHint: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  scanBottom: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 0,
  },
  analyzeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "rgba(30,30,30,0.92)",
  },
  analyzeBtnText: { color: "#FFF", fontWeight: "800", fontSize: 15 },
  chrome: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 8,
  },
  chromeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  chromeTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    color: "#0A0A0A",
  },
  chromeRight: { flexDirection: "row", gap: 6 },
  panel: {
    backgroundColor: "#FFF",
    borderRadius: 28,
    padding: 18,
    gap: 14,
  },
  homeLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#F3F3F3",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  homeLinkText: { fontSize: 12, fontWeight: "700", color: "#0A0A0A" },
  analysisBlock: { gap: 10 },
  analysisEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.6,
    color: "#A3A3A3",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#0A0A0A",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: { color: "#FFF", fontSize: 12, fontWeight: "800" },
  summary: {
    fontSize: 13,
    lineHeight: 19,
    color: "#525252",
  },
  errorInline: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 12,
    padding: 12,
  },
  errorInlineText: { color: "#B91C1C", fontSize: 13 },
  recsHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recsTitle: { fontSize: 16, fontWeight: "800", color: "#0A0A0A" },
  newPhoto: { fontSize: 13, fontWeight: "700", color: "#0A0A0A", textDecorationLine: "underline" },
  spotlight: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#111",
    aspectRatio: 3 / 4,
  },
  spotlightImg: { width: "100%", height: "100%" },
  spotlightBusy: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  spotlightBusyText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  previewBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#FFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  previewBadgeText: { fontSize: 10, fontWeight: "800", color: "#0A0A0A" },
  spotlightGrad: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 48,
  },
  spotlightMeta: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
  },
  spotlightIndex: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  spotlightTitle: { color: "#FFF", fontSize: 20, fontWeight: "800", marginTop: 2 },
  matchPill: {
    backgroundColor: "#FFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  matchPillText: { fontSize: 11, fontWeight: "800", color: "#0A0A0A" },
  reason: {
    fontSize: 13,
    lineHeight: 19,
    color: "#525252",
  },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: "#0A0A0A",
  },
  bookBtnDisabled: { opacity: 0.45 },
  bookBtnText: { color: "#FFF", fontWeight: "800", fontSize: 14 },
  iconActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  iconAction: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  iconActionOn: { backgroundColor: "#0A0A0A" },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D4D4D4",
  },
  dotOn: { width: 18, backgroundColor: "#0A0A0A" },
  morePanel: {
    backgroundColor: "#FFF",
    borderRadius: 28,
    padding: 18,
    gap: 8,
  },
  moreTitle: { fontSize: 17, fontWeight: "800", color: "#0A0A0A" },
  moreSub: { fontSize: 12, color: "#737373", marginBottom: 8 },
  moreGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  moreCard: { width: "47.5%", gap: 6 },
  moreImgWrap: {
    borderRadius: 18,
    overflow: "hidden",
    aspectRatio: 3 / 4,
    backgroundColor: "#EEE",
  },
  moreImg: { width: "100%", height: "100%" },
  moreBusy: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  moreCta: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0A0A0A",
    borderRadius: 12,
    paddingVertical: 8,
  },
  moreCtaText: { color: "#FFF", fontSize: 11, fontWeight: "800" },
  moreCardTitle: { fontSize: 13, fontWeight: "800", color: "#0A0A0A", paddingHorizontal: 2 },
});
