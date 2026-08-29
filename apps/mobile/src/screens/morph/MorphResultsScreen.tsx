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
import { useAuth } from "../../auth/AuthContext";
import { FaceAnalysisRing } from "../../components/morph/FaceAnalysisRing";
import { FaceAnalysisSummary } from "../../components/morph/FaceAnalysisSummary";
import { ShareFriendsModal } from "../../components/morph/ShareFriendsModal";
import { useAppToast } from "../../components/ui/ToastProvider";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";
import { presentMorphPaywall } from "../../lib/morph-return";
import { useMorphSession } from "../../lib/morph-session";
import type { MorphStackParamList } from "../../navigation/MorphStack";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

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
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("analyzing");
  const [error, setError] = useState<string | null>(null);
  const [activeStyleId, setActiveStyleId] = useState<string | null>(null);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [moreStyles, setMoreStyles] = useState<ApiHairstyle[]>([]);
  const [shareTarget, setShareTarget] = useState<AiStyleSuggestion | null>(null);
  const carouselRef = useRef<FlatList<AiStyleSuggestion>>(null);
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
        if (!cancelled) setMoreStyles(rows);
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
      const result = await gate.ensureTryOnDetailed();
      if (!result.ok) {
        presentMorphPaywall(
          navigation,
          result.reason === "limit" ? "limit" : "subscription",
          "MorphResults",
        );
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
          presentMorphPaywall(navigation, "limit", "MorphResults");
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

        setPhase("summary");
      } catch (err) {
        if (gate.handleError(err)) {
          presentMorphPaywall(navigation, "limit", "MorphResults");
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
    [session, gate, navigation],
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
  }, [phase]);

  useEffect(() => {
    return () => toast.hide();
  }, [toast]);

  const suggestions = useMemo(() => {
    const raw = session.analyze?.suggestions ?? [];
    const preferredId = session.preferredStyleId;
    if (!preferredId) return raw.slice(0, 3);
    const preferred = raw.find((s) => s.id === preferredId);
    const rest = raw.filter((s) => s.id !== preferredId);
    return (preferred ? [preferred, ...rest] : raw).slice(0, 3);
  }, [session.analyze?.suggestions, session.preferredStyleId]);
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

  const sharePreview = shareTarget
    ? session.tryOnByStyle[shareTarget.id] ||
      (session.tryOnStyleId === shareTarget.id ? session.tryOnPreview : null)
    : null;

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

  /** Summary — selfie full-bleed; metrikalar + Generate rasm o‘lchamida. */
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

        <View style={[styles.scanChrome, { paddingTop: Math.max(insets.top, 10) }]}>
          <Pressable style={styles.summaryBackOnPhoto} onPress={onBack} accessibilityLabel="Orqaga">
            <Ionicons name="chevron-back" size={18} color="#0A0A0A" />
          </Pressable>
          <View style={{ flex: 1 }} />
        </View>

        <View style={styles.summaryBottom}>
          <FaceAnalysisSummary
            analyze={session.analyze}
            onStartGenerate={onStartGenerate}
            generating={false}
            bottomInset={Math.max(insets.bottom, 16)}
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
                    <View
                      style={[
                        styles.spotlight,
                        { width: cardW, marginRight: isLast ? 0 : CARD_GAP },
                      ]}
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
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.85)"]}
                        style={styles.spotlightGrad}
                      >
                        <View style={styles.spotlightMeta}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            {preview && !loading ? (
                              <Text style={styles.previewInline}>Sizning preview</Text>
                            ) : (
                              <Text style={styles.spotlightIndex}>#{index + 1}</Text>
                            )}
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
                        <Pressable
                          style={({ pressed }) => [
                            styles.inImageCta,
                            pressed && { opacity: 0.9 },
                          ]}
                          android_ripple={{ color: "rgba(0,0,0,0.08)" }}
                          disabled={loading}
                          onPress={() => {
                            if (preview) {
                              setShareTarget(item);
                              return;
                            }
                            void runTryOn(item);
                          }}
                        >
                          {loading ? (
                            <ActivityIndicator color="#0A0A0A" />
                          ) : (
                            <>
                              <Ionicons
                                name={preview ? "share-social-outline" : "sparkles"}
                                size={18}
                                color="#0A0A0A"
                              />
                              <Text style={styles.inImageCtaText}>
                                {preview ? "Ulashish" : "Generatsiya qilish"}
                              </Text>
                            </>
                          )}
                        </Pressable>
                      </LinearGradient>
                    </View>
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
              <Pressable
                style={({ pressed }) => [styles.studioBtn, pressed && { opacity: 0.9 }]}
                android_ripple={{ color: "rgba(0,0,0,0.08)" }}
                onPress={openStudio}
              >
                <Ionicons name="color-palette-outline" size={18} color="#0A0A0A" />
                <Text style={styles.studioBtnText}>Studio</Text>
              </Pressable>
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

      {shareTarget && sharePreview ? (
        <ShareFriendsModal
          visible
          onClose={() => setShareTarget(null)}
          styleId={shareTarget.id}
          title={shareTarget.title}
          previewImage={sharePreview}
          userName={user?.first_name || user?.full_name}
          userKey={user?.id}
          onError={(message) => toast.show(message, { tone: "error", durationMs: 3600 })}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#111111" },
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
  summaryBackOnPhoto: {
    width: scale(32),
    height: scale(32),
    borderRadius: moderateScale(16),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  summaryBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    zIndex: 3,
  },
  analyzeCardPad: {
    paddingHorizontal: scale(14),
  },
  analyzePanel: {
    width: "100%",
    backgroundColor: "#FFF",
    paddingHorizontal: H_PAD,
    paddingTop: verticalScale(18),
    paddingBottom: verticalScale(20),
    gap: moderateScale(14),
  },
  analyzePanelTitle: {
    fontSize: fontSize(15),
    fontWeight: "800",
    color: "#0A0A0A",
    letterSpacing: -0.2,
  },
  aiChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    minHeight: verticalScale(48),
    borderRadius: moderateScale(14),
    paddingHorizontal: scale(14),
    backgroundColor: "#F5F5F5",
  },
  aiChatBtnText: {
    flex: 1,
    fontSize: fontSize(14),
    fontWeight: "700",
    color: "#0A0A0A",
    includeFontPadding: false,
  },
  fallbackTop: {
    paddingHorizontal: H_PAD,
    paddingBottom: verticalScale(8),
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
    paddingHorizontal: scale(12),
    gap: moderateScale(10),
  },
  imageBackBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: moderateScale(16),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  imageBackBtnSpacer: {
    width: scale(32),
    height: scale(32),
  },
  recsCountPill: {
    flexShrink: 1,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 999,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(7),
  },
  recsCountText: {
    fontSize: fontSize(12),
    fontWeight: "800",
    color: "#0A0A0A",
    includeFontPadding: false,
  },
  scanHintAbove: {
    color: "rgba(255,255,255,0.9)",
    fontSize: fontSize(14),
    fontWeight: "600",
    textAlign: "center",
    marginBottom: verticalScale(12),
  },
  scanChrome: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(12),
    zIndex: 2,
  },
  scanBackBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(20),
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
    paddingHorizontal: scale(16),
  },
  analyzeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(10),
    minHeight: verticalScale(54),
    borderRadius: moderateScale(18),
    backgroundColor: "rgba(30,30,30,0.92)",
    overflow: "hidden",
  },
  analyzeBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: fontSize(15),
    includeFontPadding: false,
  },
  recsBlock: {
    width: "100%",
    backgroundColor: "#FFF",
    paddingTop: 0,
    paddingBottom: verticalScale(18),
    gap: moderateScale(12),
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
    width: scale(56),
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3,
  },
  navArrowBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(22),
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  navArrowLeft: { left: scale(4) },
  navArrowRight: { right: scale(4) },
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
    gap: moderateScale(10),
  },
  spotlightBusyText: { color: "#FFF", fontWeight: "700", fontSize: fontSize(13) },
  previewInline: {
    color: "rgba(255,255,255,0.78)",
    fontSize: fontSize(11),
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  spotlightGrad: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: H_PAD,
    paddingBottom: verticalScale(16),
    paddingTop: verticalScale(48),
    gap: moderateScale(12),
  },
  inImageCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(8),
    minHeight: verticalScale(48),
    borderRadius: moderateScale(16),
    backgroundColor: "#FFF",
    overflow: "hidden",
  },
  inImageCtaText: {
    color: "#0A0A0A",
    fontWeight: "800",
    fontSize: fontSize(15),
    includeFontPadding: false,
  },
  spotlightMeta: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: moderateScale(10),
  },
  spotlightIndex: { color: "rgba(255,255,255,0.7)", fontSize: fontSize(12), fontWeight: "700" },
  spotlightTitle: { color: "#FFF", fontSize: fontSize(18), fontWeight: "800", letterSpacing: -0.3 },
  matchPill: {
    backgroundColor: "#FFF",
    borderRadius: 999,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
  },
  matchPillText: { fontSize: fontSize(11), fontWeight: "800", color: "#0A0A0A" },
  reason: {
    fontSize: fontSize(13),
    lineHeight: fontSize(19),
    color: "#525252",
    paddingHorizontal: H_PAD,
  },
  studioBtn: {
    marginHorizontal: H_PAD,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(8),
    minHeight: verticalScale(52),
    borderRadius: moderateScale(16),
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  studioBtnText: { color: "#0A0A0A", fontWeight: "700", fontSize: fontSize(15), includeFontPadding: false },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: moderateScale(8),
    paddingVertical: verticalScale(2),
  },
  dot: {
    width: scale(7),
    height: scale(7),
    borderRadius: moderateScale(4),
    backgroundColor: "#D4D4D4",
  },
  dotOn: {
    width: scale(18),
    backgroundColor: "#111111",
  },
  morePanel: {
    width: "100%",
    backgroundColor: "#FFF",
    paddingHorizontal: H_PAD,
    paddingTop: verticalScale(18),
    paddingBottom: verticalScale(24),
    gap: moderateScale(8),
  },
  moreTitle: { fontSize: fontSize(17), fontWeight: "700", color: "#0A0A0A" },
  moreSub: { fontSize: fontSize(12), color: "#737373", marginBottom: verticalScale(8) },
  moreGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: moderateScale(12),
  },
  moreCard: {
    flexGrow: 1,
    flexBasis: "47%",
    maxWidth: "48%",
    gap: moderateScale(6),
  },
  moreImgWrap: {
    borderRadius: moderateScale(18),
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
    left: scale(8),
    right: scale(8),
    bottom: verticalScale(8),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(6),
    backgroundColor: "#111111",
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(8),
  },
  moreCtaText: { color: "#FFF", fontSize: fontSize(11), fontWeight: "800" },
  moreCardTitle: { fontSize: fontSize(13), fontWeight: "800", color: "#0A0A0A", paddingHorizontal: scale(2) },
});
