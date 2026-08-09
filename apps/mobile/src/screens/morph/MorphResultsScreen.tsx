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
import { FaceAnalysisRing } from "../../components/morph/FaceAnalysisRing";
import { FaceAnalysisSummary } from "../../components/morph/FaceAnalysisSummary";
import { useAppToast } from "../../components/ui/ToastProvider";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";
import { WEB_ORIGIN } from "../../lib/morph-share";
import { useMorphSession } from "../../lib/morph-session";
import type { MorphStackParamList } from "../../navigation/MorphStack";

type Props = NativeStackScreenProps<MorphStackParamList, "MorphResults">;

type Phase = "checking" | "analyzing" | "summary" | "ready" | "error";

const { width: SCREEN_W } = Dimensions.get("window");
const H_PAD = 18;
const CARD_GAP = 14;
/** ScrollView padding ichida to‘liq eni — snap aniq ishlashi uchun. */
const CARD_W = SCREEN_W - H_PAD * 2;

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
  const carouselRef = useRef<FlatList<AiStyleSuggestion>>(null);
  const pendingTryOnRef = useRef<AiStyleSuggestion | null>(null);
  const analyzingBusy = phase === "checking" || phase === "analyzing";
  const summaryBusy = phase === "summary";

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
          hair_color_key: result.hair_color,
          hair_texture_key: result.hair_texture,
          beard_key: result.beard,
          source: "camera_scan",
          replace_latest: true,
        }).catch(() => undefined);

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
        pendingTryOnRef.current =
          preferredFromList || preferredFallback || result.suggestions[0] || null;
        setPhase("summary");
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
    if (phase === "summary") {
      toast.hide();
      return;
    }
    toast.hide();
  }, [phase, error, session.analyze, toast]);

  const onStartGenerate = useCallback(() => {
    if (phase !== "summary") return;
    setPhase("ready");
    const first = pendingTryOnRef.current;
    if (first) {
      void runTryOn(first);
    }
  }, [phase, runTryOn]);

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

  const goToSuggestion = useCallback(
    (index: number) => {
      if (suggestions.length === 0) return;
      const next = Math.max(0, Math.min(index, suggestions.length - 1));
      setSpotlightIndex(next);
      carouselRef.current?.scrollToOffset({
        offset: next * (CARD_W + CARD_GAP),
        animated: true,
      });
    },
    [suggestions.length],
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

  /** Tahlil natijasi — Skin Summary + Start Generate. */
  if (summaryBusy && session.analyze) {
    return (
      <View style={styles.rootSummary}>
        {session.selfieDataUrl ? (
          <Image
            source={{ uri: session.selfieDataUrl }}
            style={styles.bgPhoto}
            blurRadius={22}
          />
        ) : null}
        <LinearGradient
          colors={["rgba(255,220,200,0.55)", "rgba(255,200,210,0.45)", "rgba(255,255,255,0.35)"]}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.scanChrome, { paddingTop: Math.max(insets.top, 10) }]}>
          <Pressable style={styles.summaryBackBtn} onPress={onBack} accessibilityLabel="Orqaga">
            <Ionicons name="chevron-back" size={22} color="#111" />
          </Pressable>
          <Text style={styles.summaryChromeTitle}>Morf AI</Text>
          <View style={styles.summaryBackBtn} />
        </View>

        <View style={styles.summaryStage}>
          <FaceAnalysisSummary
            analyze={session.analyze}
            onStartGenerate={onStartGenerate}
            generating={false}
          />
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

      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable style={styles.topBtn} onPress={onBack} accessibilityLabel="Orqaga">
          <Ionicons name="chevron-back" size={20} color="#0A0A0A" />
        </Pressable>
        <Text style={styles.topCounter}>
          {suggestions.length > 0
            ? `${spotlightIndex + 1} / ${suggestions.length}`
            : "Natija"}
        </Text>
        <Pressable style={styles.topLink} onPress={onNewPhoto}>
          <Ionicons name="camera-outline" size={15} color="#0A0A0A" />
          <Text style={styles.topLinkText}>Yangi</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 16) + 28,
          paddingHorizontal: H_PAD,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorInline}>
            <Text style={styles.errorInlineText}>{error}</Text>
          </View>
        ) : null}

        {suggestions.length > 0 ? (
          <View style={styles.recsBlock}>
            <Text style={styles.recsTitle}>{suggestions.length} ta tavsiya</Text>
            <Text style={styles.recsHint}>Chap yoki o‘ngga suring · tugmalar bilan ham</Text>

            <View style={styles.carouselWrap}>
              <FlatList
                ref={carouselRef}
                data={suggestions}
                horizontal
                pagingEnabled={false}
                decelerationRate="fast"
                snapToInterval={CARD_W + CARD_GAP}
                snapToAlignment="start"
                disableIntervalMomentum
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                getItemLayout={(_, index) => ({
                  length: CARD_W + CARD_GAP,
                  offset: (CARD_W + CARD_GAP) * index,
                  index,
                })}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(
                    e.nativeEvent.contentOffset.x / (CARD_W + CARD_GAP),
                  );
                  setSpotlightIndex(Math.max(0, Math.min(idx, suggestions.length - 1)));
                }}
                contentContainerStyle={undefined}
                renderItem={({ item, index }) => {
                  const preview = session.tryOnByStyle[item.id];
                  const loading = activeStyleId === item.id;
                  const isLast = index === suggestions.length - 1;
                  return (
                    <Pressable
                      style={[
                        styles.spotlight,
                        { width: CARD_W, marginRight: isLast ? 0 : CARD_GAP },
                      ]}
                      onPress={() => openPreview(item)}
                    >
                      <Image
                        source={{
                          uri:
                            preview ||
                            item.image_url ||
                            session.selfieDataUrl ||
                            undefined,
                        }}
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
                            <Text style={styles.matchPillText}>
                              {Math.round(item.match)}% mos
                            </Text>
                          </View>
                        </View>
                      </LinearGradient>
                    </Pressable>
                  );
                }}
              />

              {suggestions.length > 1 ? (
                <>
                  <Pressable
                    style={[
                      styles.navArrow,
                      styles.navArrowLeft,
                      spotlightIndex === 0 && styles.navArrowDisabled,
                    ]}
                    disabled={spotlightIndex === 0}
                    onPress={() => goToSuggestion(spotlightIndex - 1)}
                    accessibilityLabel="Oldingi tavsiya"
                  >
                    <Ionicons name="chevron-back" size={22} color="#0A0A0A" />
                  </Pressable>
                  <Pressable
                    style={[
                      styles.navArrow,
                      styles.navArrowRight,
                      spotlightIndex >= suggestions.length - 1 && styles.navArrowDisabled,
                    ]}
                    disabled={spotlightIndex >= suggestions.length - 1}
                    onPress={() => goToSuggestion(spotlightIndex + 1)}
                    accessibilityLabel="Keyingi tavsiya"
                  >
                    <Ionicons name="chevron-forward" size={22} color="#0A0A0A" />
                  </Pressable>
                </>
              ) : null}
            </View>

            {suggestions.length > 1 ? (
              <View style={styles.dots}>
                {suggestions.map((s, i) => (
                  <Pressable
                    key={s.id}
                    onPress={() => goToSuggestion(i)}
                    hitSlop={8}
                    style={[styles.dot, i === spotlightIndex && styles.dotOn]}
                  />
                ))}
              </View>
            ) : null}

            {activeSuggestion?.reason_uz ? (
              <Text style={styles.reason} numberOfLines={3}>
                {activeSuggestion.reason_uz}
              </Text>
            ) : null}

            <Pressable
              style={styles.bookBtn}
              onPress={() => void bookSalon(activeSuggestion?.salon_id ?? null)}
            >
              <Ionicons name="calendar-outline" size={18} color="#FFF" />
              <Text style={styles.bookBtnText}>Bron qilish</Text>
            </Pressable>

            <View style={styles.iconActions}>
              <Pressable
                style={[styles.iconAction, activePreview ? styles.iconActionOn : null]}
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
          </View>
        ) : null}

        {session.analyze ? <FaceAnalysisRing analyze={session.analyze} /> : null}

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
  rootLight: { flex: 1, backgroundColor: "#EDE6DF" },
  rootSummary: { flex: 1, backgroundColor: "#F3B7C2" },
  bgPhoto: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
    opacity: 0.85,
  },
  bgDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  summaryStage: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 24,
  },
  summaryBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  summaryChromeTitle: {
    flex: 1,
    textAlign: "center",
    color: "#111",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 10,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
  },
  topCounter: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: "#0A0A0A",
    letterSpacing: -0.2,
  },
  topLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorInline: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 12,
    padding: 12,
  },
  errorInlineText: { color: "#B91C1C", fontSize: 13 },
  recsBlock: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 24,
    paddingVertical: 16,
    gap: 12,
    overflow: "hidden",
  },
  recsTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0A0A0A",
    paddingHorizontal: 16,
  },
  recsHint: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8E8E93",
    paddingHorizontal: 16,
    marginTop: -6,
  },
  carouselWrap: {
    position: "relative",
  },
  navArrow: {
    position: "absolute",
    top: "42%",
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  navArrowLeft: { left: 6 },
  navArrowRight: { right: 6 },
  navArrowDisabled: { opacity: 0.35 },
  spotlight: {
    borderRadius: 22,
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
    paddingVertical: 6,
  },
  previewBadgeText: { fontSize: 11, fontWeight: "800", color: "#0A0A0A" },
  spotlightGrad: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 48,
  },
  spotlightMeta: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  spotlightIndex: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "700" },
  spotlightTitle: { color: "#FFF", fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  matchPill: {
    backgroundColor: "#FFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  matchPillText: { fontSize: 11, fontWeight: "800", color: "#0A0A0A" },
  reason: {
    fontSize: 13,
    lineHeight: 19,
    color: "#525252",
    paddingHorizontal: 16,
  },
  bookBtn: {
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#0A0A0A",
  },
  bookBtnText: { color: "#FFF", fontWeight: "800", fontSize: 15 },
  iconActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 16,
  },
  iconAction: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F3F3F3",
    alignItems: "center",
    justifyContent: "center",
  },
  iconActionOn: { backgroundColor: "#0A0A0A" },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#D4D4D4",
  },
  dotOn: {
    width: 18,
    backgroundColor: "#0A0A0A",
  },
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
