import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  analyzeAiStyle,
  formatMorphUserError,
  generateAiStyleTryOn,
  NO_FACE_MESSAGE,
  saveAiStyleHistory,
  saveMorphAiGeneration,
  type AiStyleSuggestion,
} from "../../api/ai";
import { fetchHairstyles, type ApiHairstyle } from "../../api/hairstyles";
import { resolveMediaUrl } from "../../api/media";
import { FaceAnalysisRing } from "../../components/morph/FaceAnalysisRing";
import { FaceAnalysisSummary } from "../../components/morph/FaceAnalysisSummary";
import { useAppToast } from "../../components/ui/ToastProvider";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";
import { shareMorphLook } from "../../lib/morph-share";
import { useMorphSession } from "../../lib/morph-session";
import type { MorphStackParamList } from "../../navigation/MorphStack";

type Props = NativeStackScreenProps<MorphStackParamList, "MorphResults">;

type Phase = "analyzing" | "summary" | "ready" | "error";

const H_PAD = 16;
const CARD_GAP = 0;

export function MorphResultsScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  /** To‘liq ekran — chap/o‘ng bo‘sh joy yo‘q. */
  const cardW = Math.max(1, Math.round(screenW));
  const session = useMorphSession();
  const gate = useMorphLimitGate();
  const toast = useAppToast();
  const [phase, setPhase] = useState<Phase>("analyzing");
  const [error, setError] = useState<string | null>(null);
  const [activeStyleId, setActiveStyleId] = useState<string | null>(null);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [moreStyles, setMoreStyles] = useState<ApiHairstyle[]>([]);
  const [shareBusy, setShareBusy] = useState(false);
  const carouselRef = useRef<FlatList<AiStyleSuggestion>>(null);
  const pendingTryOnRef = useRef<AiStyleSuggestion | null>(null);
  const analyzingBusy = phase === "analyzing";
  const summaryBusy = phase === "summary";

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
        // Katalog rasmi qoladi — xato toast orqali, sticky banner yo‘q.
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
      setPhase("analyzing");
      setError(null);
      try {
        // Face-check alohida Vertex chaqiruv — 429 beradi.
        // Analyze ichida has_face tekshiruvi bor.
        const result = await analyzeAiStyle(photo, "men");
        session.setAnalyze(result);
        setError(null);
        void saveAiStyleHistory({
          image: photo,
          face_shape_key: result.face_shape,
          hair_type_key: result.hair_type,
          hair_color_key: result.hair_color,
          hair_texture_key: result.hair_texture,
          beard_key: result.beard,
          source: "camera_scan",
          replace_latest: false,
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
    // Analyzing status ekranda pastda — toast dublikat emas.
    if (phase === "analyzing") {
      toast.hide();
    }
  }, [phase, error, session.analyze, toast]);

  const onStartGenerate = useCallback(() => {
    if (phase !== "summary") return;
    setError(null);
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
        offset: next * (cardW + CARD_GAP),
        animated: true,
      });
    },
    [suggestions.length, cardW],
  );

  const openPreview = useCallback(
    (style: AiStyleSuggestion) => {
      const preview = session.tryOnByStyle[style.id] || undefined;
      navigation.navigate("MorphPreview", {
        styleId: style.id,
        title: style.title,
        match: style.match,
        imageUrl: resolveMediaUrl(style.image_url, { width: 900 }) || style.image_url,
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

  const onShareLook = useCallback(async () => {
    if (!activeSuggestion || !activePreview || shareBusy) return;
    setShareBusy(true);
    try {
      await shareMorphLook({
        styleId: activeSuggestion.id,
        title: activeSuggestion.title,
        previewImage: activePreview,
      });
    } catch {
      toast.show("Ulashib bo‘lmadi", { tone: "error", durationMs: 3200 });
    } finally {
      setShareBusy(false);
    }
  }, [activeSuggestion, activePreview, shareBusy, toast]);

  const openStudio = useCallback(() => {
    if (!activePreview) return;
    if (activeSuggestion) {
      session.setTryOn(activePreview, activeSuggestion.id, activeSuggestion.title);
    }
    navigation.navigate("MorphStudio");
  }, [activePreview, activeSuggestion, navigation, session]);

  const openAiChat = useCallback(() => {
    navigation.getParent()?.navigate("MorphChat" as never);
  }, [navigation]);

  /** Summary — yuzga hech narsa yo‘q; pastda metrikalar + Generate. */
  if (summaryBusy && session.analyze) {
    return (
      <View style={styles.root}>
        {session.selfieDataUrl ? (
          <Image
            source={{ uri: session.selfieDataUrl }}
            style={styles.scanPhoto}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.scanPhotoFallback} />
        )}
        <View style={styles.summaryScrim} />

        <View style={[styles.scanChrome, { paddingTop: Math.max(insets.top, 10) }]}>
          <Pressable style={styles.scanBackBtn} onPress={onBack} accessibilityLabel="Orqaga">
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </Pressable>
          <View style={{ flex: 1 }} />
          <View style={styles.scanBackBtn} />
        </View>

        <View style={styles.summaryBottom}>
          <FaceAnalysisSummary
            analyze={session.analyze}
            onStartGenerate={onStartGenerate}
            generating={false}
            bottomInset={Math.max(insets.bottom, 12)}
          />
        </View>
      </View>
    );
  }

  /** Checking / analyzing / xato — selfie to‘liq, frame yo‘q. */
  if (analyzingBusy || (phase === "error" && !session.analyze)) {
    return (
      <View style={styles.root}>
        {session.selfieDataUrl ? (
          <Image
            source={{ uri: session.selfieDataUrl }}
            style={styles.scanPhoto}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.scanPhotoFallback} />
        )}
        <View style={styles.summaryScrim} />

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
          <View style={{ flex: 1 }} />
          <View style={styles.scanBackBtn} />
        </View>

        {phase === "error" ? (
          <View style={[styles.scanBottomDock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={styles.scanHintAbove}>Yuz aniq ko‘rinadigan selfie yuklang</Text>
            <Pressable
              style={({ pressed }) => [styles.analyzeBtn, pressed && { opacity: 0.88 }]}
              android_ripple={{ color: "rgba(255,255,255,0.15)" }}
              onPress={onNewPhoto}
            >
              <Ionicons name="camera-outline" size={18} color="#FFF" />
              <Text style={styles.analyzeBtnText}>Yangi rasm yuklash</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.scanBottomDock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.analyzeBtn}>
              <ActivityIndicator color="#FFF" />
              <Text style={styles.analyzeBtnText}>Tahlil qilinmoqda…</Text>
            </View>
          </View>
        )}
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 16) + 28,
          gap: 0,
        }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {suggestions.length > 0 ? (
          <View style={styles.recsBlock}>
            <View style={styles.carouselWrap}>
              <FlatList
                ref={carouselRef}
                data={suggestions}
                horizontal
                pagingEnabled
                nestedScrollEnabled
                decelerationRate="fast"
                snapToInterval={cardW + CARD_GAP}
                snapToAlignment="start"
                disableIntervalMomentum
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                getItemLayout={(_, index) => ({
                  length: cardW + CARD_GAP,
                  offset: (cardW + CARD_GAP) * index,
                  index,
                })}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(
                    e.nativeEvent.contentOffset.x / Math.max(1, cardW + CARD_GAP),
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
                        { width: cardW, marginRight: isLast ? 0 : CARD_GAP },
                      ]}
                      onPress={() => openPreview(item)}
                    >
                      <Image
                        source={{
                          uri:
                            preview ||
                            resolveMediaUrl(item.image_url, { width: 900 }) ||
                            session.selfieDataUrl ||
                            undefined,
                        }}
                        style={styles.spotlightImg}
                        resizeMode="cover"
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

              <View
                style={[styles.imageChrome, { paddingTop: Math.max(insets.top, 10) }]}
                pointerEvents="box-none"
              >
                <Pressable
                  style={styles.imageBackBtn}
                  onPress={onBack}
                  accessibilityLabel="Orqaga"
                  hitSlop={8}
                >
                  <Ionicons name="chevron-back" size={18} color="#0A0A0A" />
                </Pressable>
                <View style={styles.recsCountPill}>
                  <Text style={styles.recsCountText}>{suggestions.length} ta tavsiya</Text>
                </View>
                <View style={styles.imageBackBtnSpacer} />
              </View>

              {suggestions.length > 1 ? (
                <>
                  {spotlightIndex > 0 ? (
                    <Pressable
                      style={[styles.navArrowHit, styles.navArrowLeft]}
                      onPress={() => goToSuggestion(spotlightIndex - 1)}
                      accessibilityLabel="Oldingi tavsiya"
                      android_ripple={{ color: "rgba(0,0,0,0.08)", borderless: true, radius: 24 }}
                    >
                      <View style={styles.navArrowBtn}>
                        <Ionicons name="chevron-back" size={22} color="#0A0A0A" />
                      </View>
                    </Pressable>
                  ) : null}
                  {spotlightIndex < suggestions.length - 1 ? (
                    <Pressable
                      style={[styles.navArrowHit, styles.navArrowRight]}
                      onPress={() => goToSuggestion(spotlightIndex + 1)}
                      accessibilityLabel="Keyingi tavsiya"
                      android_ripple={{ color: "rgba(0,0,0,0.08)", borderless: true, radius: 24 }}
                    >
                      <View style={styles.navArrowBtn}>
                        <Ionicons name="chevron-forward" size={22} color="#0A0A0A" />
                      </View>
                    </Pressable>
                  ) : null}
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

            {activePreview ? (
              <View style={styles.postGenActions}>
                <Pressable
                  style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.9 }]}
                  android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                  disabled={shareBusy}
                  onPress={() => void onShareLook()}
                >
                  {shareBusy ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="share-social-outline" size={18} color="#FFF" />
                      <Text style={styles.shareBtnText}>Ulashish</Text>
                    </>
                  )}
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.studioBtn, pressed && { opacity: 0.9 }]}
                  android_ripple={{ color: "rgba(0,0,0,0.08)" }}
                  onPress={openStudio}
                >
                  <Ionicons name="color-palette-outline" size={18} color="#0A0A0A" />
                  <Text style={styles.studioBtnText}>Studio</Text>
                </Pressable>
              </View>
            ) : activeSuggestion && !activeStyleId ? (
              <Pressable
                style={({ pressed }) => [
                  styles.shareBtn,
                  styles.shareBtnSolo,
                  pressed && { opacity: 0.9 },
                ]}
                android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                onPress={() => void runTryOn(activeSuggestion)}
              >
                <Ionicons name="sparkles" size={18} color="#FFF" />
                <Text style={styles.shareBtnText}>AI yaratish</Text>
              </Pressable>
            ) : activeStyleId ? (
              <View style={[styles.shareBtn, styles.shareBtnSolo]}>
                <ActivityIndicator color="#FFF" />
                <Text style={styles.shareBtnText}>AI yaratmoqda…</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={[styles.fallbackTop, { paddingTop: Math.max(insets.top, 10) }]}>
            <Pressable style={styles.imageBackBtn} onPress={onBack} accessibilityLabel="Orqaga">
              <Ionicons name="chevron-back" size={18} color="#0A0A0A" />
            </Pressable>
          </View>
        )}

        {session.analyze ? (
          <View style={styles.analyzePanel}>
            <Text style={styles.analyzePanelTitle}>Yuz tahlili</Text>
            <FaceAnalysisRing analyze={session.analyze} tone="onLight" />
            <Pressable
              style={({ pressed }) => [styles.aiChatBtn, pressed && { opacity: 0.9 }]}
              android_ripple={{ color: "rgba(0,0,0,0.06)" }}
              onPress={openAiChat}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={17} color="#0A0A0A" />
              <Text style={styles.aiChatBtnText}>AI chat — maslahat olish</Text>
              <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
            </Pressable>
          </View>
        ) : null}

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
                        source={{
                          uri:
                            preview ||
                            resolveMediaUrl(item.image_url, { width: 600 }) ||
                            undefined,
                        }}
                        style={styles.moreImg}
                        resizeMode="cover"
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
  rootLight: { flex: 1, backgroundColor: "#F5F5F5", width: "100%" },
  scroll: { flex: 1, width: "100%" },
  bgPhoto: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
    opacity: 0.35,
  },
  bgDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(245,245,245,0.88)",
  },
  summaryScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  scanPhoto: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
  },
  scanPhotoFallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#111",
  },
  summaryBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
  },
  analyzeCardPad: {
    paddingHorizontal: 14,
  },
  analyzePanel: {
    width: "100%",
    backgroundColor: "#FFF",
    paddingHorizontal: H_PAD,
    paddingTop: 18,
    paddingBottom: 20,
    gap: 14,
  },
  analyzePanelTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0A0A0A",
    letterSpacing: -0.2,
  },
  aiChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "#F5F5F5",
  },
  aiChatBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#0A0A0A",
    includeFontPadding: false,
  },
  fallbackTop: {
    paddingHorizontal: H_PAD,
    paddingBottom: 8,
  },
  imageChrome: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    gap: 10,
  },
  imageBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  imageBackBtnSpacer: {
    width: 32,
    height: 32,
  },
  recsCountPill: {
    flexShrink: 1,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  recsCountText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0A0A0A",
    includeFontPadding: false,
  },
  scanHintAbove: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
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
  /** Analyzing / error CTA — pastga dock. */
  scanBottomDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    paddingHorizontal: 16,
  },
  analyzeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "rgba(30,30,30,0.92)",
    overflow: "hidden",
  },
  analyzeBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
    includeFontPadding: false,
  },
  recsBlock: {
    width: "100%",
    backgroundColor: "#FFF",
    paddingTop: 0,
    paddingBottom: 18,
    gap: 12,
  },
  carouselWrap: {
    position: "relative",
    width: "100%",
    marginHorizontal: 0,
  },
  navArrowHit: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 56,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3,
  },
  navArrowBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  navArrowLeft: { left: 4 },
  navArrowRight: { right: 4 },
  spotlight: {
    overflow: "hidden",
    backgroundColor: "#111",
    aspectRatio: 3 / 4,
    borderRadius: 0,
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
    top: 56,
    left: 12,
    backgroundColor: "#FFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 2,
  },
  previewBadgeText: { fontSize: 11, fontWeight: "800", color: "#0A0A0A" },
  spotlightGrad: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: H_PAD,
    paddingBottom: 16,
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
    paddingHorizontal: H_PAD,
  },
  postGenActions: {
    marginHorizontal: H_PAD,
    gap: 10,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#0A0A0A",
    overflow: "hidden",
  },
  shareBtnSolo: {
    marginHorizontal: H_PAD,
  },
  shareBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15, includeFontPadding: false },
  studioBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  studioBtnText: { color: "#0A0A0A", fontWeight: "700", fontSize: 15, includeFontPadding: false },
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
    width: "100%",
    backgroundColor: "#FFF",
    paddingHorizontal: H_PAD,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 8,
  },
  moreTitle: { fontSize: 17, fontWeight: "700", color: "#0A0A0A" },
  moreSub: { fontSize: 12, color: "#737373", marginBottom: 8 },
  moreGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  moreCard: {
    flexGrow: 1,
    flexBasis: "47%",
    maxWidth: "48%",
    gap: 6,
  },
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
