import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchCareAccess } from "../../api/ai";
import { weatherIconName } from "../../api/weather";
import {
  fetchCareProducts,
  fetchHairCareProfile,
  updateHairCareProfile,
  type CareProduct,
  type HairColorStatus,
  type HairCondition,
  type HairTexture,
} from "../../api/care";
import { CareRoutineSheet } from "../../components/morph/care/CareRoutineSheet";
import { DarkMeshAmbientBg } from "../../components/morph/care/DarkMeshAmbientBg";
import { useCareWeather } from "../../hooks/useCareWeather";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import {
  defaultQuiz,
  loadCareQuiz,
  saveCareQuiz,
  type CareQuizAnswers,
} from "../../lib/morph-ai-care";
import { markCareOnboardingSeen } from "../../lib/morph-my-products";
import type { MorphCareStackParamList } from "../../navigation/MorphCareStack";
import { useShellNavigation } from "../../lib/shell-nav";
import { morphFont } from "../../theme/morph-font";

type Props = NativeStackScreenProps<MorphCareStackParamList, "CareHome">;
type QuizStep = 0 | 1 | 2;
type ViewMode = "hub" | "flow";

const CARE_ACCESS_DEBUG = true;

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "hair", label: "Hair Cut" },
  { id: "face", label: "Face Care" },
  { id: "eye", label: "Eye care" },
  { id: "skin", label: "Skin Care" },
];

const CONDITION_OPTS: HairCondition[] = ["oily", "dry", "normal", "damaged"];
const TEXTURE_OPTS: HairTexture[] = ["straight", "wavy", "curly"];
const COLOR_OPTS: HairColorStatus[] = ["natural", "colored", "bleached"];

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function formatDayNumber(iso: string): string {
  const day = Number(iso.slice(8, 10));
  return Number.isFinite(day) ? String(day) : "—";
}

function buildFallbackDays(): { date: string; weekday_key: string; is_today: boolean }[] {
  const rows: { date: string; weekday_key: string; is_today: boolean }[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    rows.push({
      date: iso,
      weekday_key: WEEKDAY_KEYS[d.getDay()],
      is_today: i === 0,
    });
  }
  return rows;
}

function greetingKey(): string {
  const h = new Date().getHours();
  if (h < 12) return "care.routine.goodMorning";
  if (h < 18) return "care.routine.goodAfternoon";
  return "care.routine.goodEvening";
}

export function MorphCareScreen({ navigation }: Props) {
  useHideTabBar();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { goMorph, navigateRootTab } = useShellNavigation();
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<{ allowed: boolean; detail?: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("hub");
  const [selectedCat, setSelectedCat] = useState("all");
  const [quiz, setQuiz] = useState<CareQuizAnswers>(() => defaultQuiz());
  const [step, setStep] = useState<QuizStep | "plan">(0);
  const [catalog, setCatalog] = useState<CareProduct[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const { data: weather, loading: weatherLoading } = useCareWeather();

  const handleBack = useCallback(() => {
    if (viewMode === "flow") {
      setViewMode("hub");
      return;
    }
    if (step !== "plan") {
      if (typeof step === "number" && step > 0) {
        setStep((step - 1) as QuizStep);
        return;
      }
      setViewMode("hub");
      setStep("plan");
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigateRootTab(navigation, "Home");
    }
  }, [viewMode, step, navigation, navigateRootTab]);

  const dayRows = weather?.days?.length ? weather.days.slice(0, 7) : buildFallbackDays();
  const selectedDate = dayRows[selectedDayIdx]?.date ?? new Date().toISOString().slice(0, 10);

  const openCatalog = useCallback(() => {
    navigation.navigate("CareProducts");
  }, [navigation]);

  const openTarkib = useCallback(() => {
    goMorph(navigation, "MorphIngredient");
  }, [navigation, goMorph]);

  const openSubscriptions = useCallback(() => {
    goMorph(navigation, "Profile", { screen: "Subscriptions" });
  }, [navigation, goMorph]);

  const openWeather = useCallback(() => {
    navigation.navigate("CareWeather");
  }, [navigation]);

  const openAssistant = useCallback(() => {
    navigateRootTab(navigation, "MorphChat");
  }, [navigation, navigateRootTab]);

  const openProduct = useCallback(
    (productId: number) => {
      navigation.navigate("CareProductDetail", { productId });
    },
    [navigation],
  );

  const openParvarish = useCallback(() => {
    setViewMode("flow");
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const accessRes = CARE_ACCESS_DEBUG
        ? { allowed: true as const, detail: undefined }
        : await fetchCareAccess().catch(() => ({ allowed: false, detail: undefined }));
      setAccess(accessRes);
      if (!accessRes.allowed) return;

      const [saved, profile] = await Promise.all([
        loadCareQuiz(),
        fetchHairCareProfile().catch(() => null),
      ]);

      if (profile?.complete && profile.condition && profile.texture && profile.color_status) {
        const next: CareQuizAnswers = {
          condition: profile.condition as HairCondition,
          texture: profile.texture as HairTexture,
          colorStatus: profile.color_status as HairColorStatus,
        };
        setQuiz(next);
        await saveCareQuiz(next);
        setStep("plan");
      } else if (saved) {
        setQuiz(saved);
        setStep("plan");
      } else {
        setStep(0);
      }

      const products = await fetchCareProducts({ recommended: true }).catch(() => []);
      setCatalog(products);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const finishQuiz = async () => {
    setSaving(true);
    try {
      await saveCareQuiz(quiz);
      await updateHairCareProfile({
        condition: quiz.condition,
        texture: quiz.texture,
        color_status: quiz.colorStatus,
      }).catch(() => undefined);
      await markCareOnboardingSeen();
      const products = await fetchCareProducts({ recommended: true }).catch(() => []);
      setCatalog(products);
      setStep("plan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color="rgba(255,255,255,0.5)" />
      </View>
    );
  }

  if (access && !access.allowed) {
    return (
      <View style={[styles.root, styles.pad, { paddingTop: insets.top + 12 }]}>
        <View style={styles.navBarRow}>
          <Pressable
            style={styles.navCircleBtn}
            onPress={handleBack}
            accessibilityLabel={t("common.back")}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <View style={{ width: 42 }} />
        </View>
        <Text style={[styles.muted, { marginTop: 12 }]}>{t("care.badge")}</Text>
        <View style={styles.lockWrap}>
          <Ionicons name="lock-closed" size={28} color="rgba(255,255,255,0.5)" />
          <Text style={styles.lockTitle}>{t("care.badge")}</Text>
          <Text style={styles.lockSub}>{access.detail || t("care.proOnly")}</Text>
          <Pressable style={[styles.primaryBtnDark, { marginTop: 24 }]} onPress={openSubscriptions}>
            <Text style={styles.primaryBtnDarkText}>{t("care.seePlans")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (viewMode === "hub") {
    return (
      <View style={styles.hubRoot}>
        <LinearGradient
          colors={["#FFF0F4", "#FDE8EE", "#FCE2E9", "#121214"]}
          locations={[0, 0.28, 0.52, 0.95]}
          style={StyleSheet.absoluteFill}
        />

        <ScrollView
          style={styles.hubScroll}
          contentContainerStyle={{
            paddingTop: insets.top + 8,
            paddingBottom: Math.max(insets.bottom, 16) + 12,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Nav Bar */}
          <View style={[styles.navBarRow, { paddingHorizontal: 20 }]}>
            <Pressable
              style={styles.navCircleBtnLight}
              onPress={handleBack}
              accessibilityLabel={t("common.back")}
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={22} color="#111" />
            </Pressable>
            <View style={{ width: 42 }} />
          </View>

          {/* Promo Card Banner from Screenshot */}
          <View style={styles.promoWrap}>
            <LinearGradient
              colors={["#FFE0EA", "#FFF0F5", "#FCE2E9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.promoCard}
            >
              <View style={styles.promoLeft}>
                <Text style={styles.promoTitle}>{"Your Glow,\nHalf the Price"}</Text>
                <Pressable style={styles.promoBtn} onPress={openCatalog}>
                  <Text style={styles.promoBtnText}>Get offer</Text>
                </Pressable>
              </View>
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
                }}
                style={styles.promoImg}
                resizeMode="cover"
              />
            </LinearGradient>

            {/* Pagination Dots */}
            <View style={styles.dotsRow}>
              <View style={styles.dotActive} />
              <View style={styles.dotInactive} />
              <View style={styles.dotInactive} />
            </View>
          </View>

          {/* Search Bar with Pink Filter & Voice Mic Button */}
          <View style={styles.searchSection}>
            <Pressable style={styles.searchBar} onPress={openCatalog}>
              <Ionicons name="search-outline" size={20} color="#9CA3AF" />
              <Text style={styles.searchPlaceholder}>Search...</Text>
              <View style={styles.filterBtn}>
                <Ionicons name="options-outline" size={18} color="#fff" />
              </View>
            </Pressable>

            <Pressable style={styles.micBtn} onPress={openAssistant} accessibilityLabel="Voice">
              <Ionicons name="mic-outline" size={22} color="#374151" />
            </Pressable>
          </View>

          {/* Category Pills (All, Hair Cut, Face Care, Eye care, etc.) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => {
              const active = selectedCat === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  style={[styles.catPill, active ? styles.catPillActive : styles.catPillInactive]}
                  onPress={() => setSelectedCat(cat.id)}
                >
                  <Text
                    style={[
                      styles.catText,
                      active ? styles.catTextActive : styles.catTextInactive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Bottom Sheet - Parvarish, Tarkib Skan, AI Assistant */}
          <View style={styles.hubSheet}>
            <View style={styles.reportHead}>
              <Text style={styles.reportTitle}>{t("care.hubReport")}</Text>
              <Pressable style={styles.reportFilter} onPress={openCatalog}>
                <Text style={styles.reportFilterText}>{t("care.hubReportFilter")}</Text>
                <Ionicons name="chevron-down" size={14} color="#1a1a1a" />
              </Pressable>
            </View>

            <View style={styles.hubCards}>
              <Pressable style={styles.hubCard} onPress={openParvarish}>
                <View style={styles.hubCardHead}>
                  <Text style={styles.hubCardTitle}>{t("care.hubParvarish")}</Text>
                  <View style={[styles.hubCardIcon, styles.hubCardIconBlue]}>
                    <Ionicons name="water" size={16} color="#3B82F6" />
                  </View>
                </View>
                <Text style={styles.hubCardMetric} numberOfLines={1}>
                  {t(`care.conditions.${quiz.condition}`)}
                </Text>
                <Text style={styles.hubCardSub} numberOfLines={2}>
                  {t("care.hubParvarishSub")}
                </Text>
              </Pressable>

              <Pressable style={styles.hubCard} onPress={openTarkib}>
                <View style={styles.hubCardHead}>
                  <Text style={styles.hubCardTitle}>{t("care.hubTarkib")}</Text>
                  <View style={[styles.hubCardIcon, styles.hubCardIconRose]}>
                    <Ionicons name="flask" size={16} color="#E11D48" />
                  </View>
                </View>
                <Text style={styles.hubCardMetric} numberOfLines={1}>
                  {t("care.hubTarkibMetric")}
                </Text>
                <Text style={styles.hubCardSub} numberOfLines={2}>
                  {t("care.hubTarkibSub")}
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.aiAssistant}
              onPress={openAssistant}
              accessibilityLabel={t("care.hubAiAssistant")}
            >
              <LinearGradient
                colors={["#8B7CFF", "#5B8CFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.aiAssistantIcon}
              >
                <Ionicons name="sparkles" size={18} color="#fff" />
              </LinearGradient>
              <Text style={styles.aiAssistantText}>{t("care.hubAiAssistant")}</Text>
              <Ionicons name="arrow-forward" size={18} color="#1a1a1a" />
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (step !== "plan") {
    const quizMeta =
      step === 0
        ? {
            title: t("care.onboarding.step1Title"),
            sub: t("care.onboarding.step1Sub"),
            opts: CONDITION_OPTS,
            value: quiz.condition,
            labelKey: "care.conditions",
            set: (v: HairCondition) => setQuiz((q) => ({ ...q, condition: v })),
          }
        : step === 1
          ? {
              title: t("care.onboarding.step2Title"),
              sub: t("care.onboarding.step2Sub"),
              opts: TEXTURE_OPTS,
              value: quiz.texture,
              labelKey: "care.textures",
              set: (v: HairTexture) => setQuiz((q) => ({ ...q, texture: v })),
            }
          : {
              title: t("care.onboarding.step3Title"),
              sub: t("care.onboarding.step3Sub"),
              opts: COLOR_OPTS,
              value: quiz.colorStatus,
              labelKey: "care.colors",
              set: (v: HairColorStatus) => setQuiz((q) => ({ ...q, colorStatus: v })),
            };

    return (
      <View style={styles.onboardRoot}>
        <LinearGradient
          colors={["#EDE4FF", "#F7E8F0", "#F4F5F8"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 0.55 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.onboardPad, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.navBarRow}>
            <Pressable
              style={styles.navCircleBtnLight}
              onPress={handleBack}
              hitSlop={8}
              accessibilityLabel={t("common.back")}
            >
              <Ionicons name="chevron-back" size={20} color="#111" />
            </Pressable>
            <Text style={styles.onboardBadge}>{t("care.onboarding.badge")}</Text>
            <View style={{ width: 42 }} />
          </View>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text style={styles.onboardH1}>{quizMeta.title}</Text>
            <Text style={styles.onboardSub}>{quizMeta.sub}</Text>
            <View style={styles.progressTrackLight}>
              <View style={[styles.progressFillLight, { width: `${((step + 1) / 3) * 100}%` }]} />
            </View>
            <View style={styles.optGridLight}>
              {quizMeta.opts.map((opt) => {
                const on = quizMeta.value === opt;
                return (
                  <Pressable
                    key={opt}
                    style={[styles.optCardLight, on && styles.optCardLightOn]}
                    onPress={() => quizMeta.set(opt as never)}
                  >
                    <Text style={[styles.optTextLight, on && styles.optTextLightOn]}>
                      {t(`${quizMeta.labelKey}.${opt}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={styles.onboardFooter}>
            {typeof step === "number" && step > 0 ? (
              <Pressable
                style={styles.ghostBtnLight}
                onPress={() => setStep((s) => (typeof s === "number" && s > 0 ? ((s - 1) as QuizStep) : 0))}
              >
                <Text style={styles.ghostBtnLightText}>{t("common.back")}</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.primaryBtnLight, styles.flexGrow, saving && styles.disabled]}
              disabled={saving}
              onPress={() => {
                if (step === 2) void finishQuiz();
                else setStep((step + 1) as QuizStep);
              }}
            >
              <Text style={styles.primaryBtnLightText}>
                {step === 2 ? t("care.onboarding.finish") : t("common.next")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.routineRoot}>
      <LinearGradient
        colors={["#EDE4FF", "#F7E8F0", "#F4F5F8"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 0.55 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.routineTop, { paddingTop: insets.top + 8 }]}>
        <View style={styles.navBarRow}>
          <Pressable
            style={styles.navCircleBtnLight}
            onPress={() => setViewMode("hub")}
            hitSlop={8}
            accessibilityLabel={t("common.back")}
          >
            <Ionicons name="chevron-back" size={20} color="#111" />
          </Pressable>
          <Text style={styles.routineTopTitle}>{t("care.hubParvarish")}</Text>
          <Pressable
            style={styles.navCircleBtnLight}
            onPress={openAssistant}
            hitSlop={8}
            accessibilityLabel="Help"
          >
            <Ionicons name="help-outline" size={18} color="#111" />
          </Pressable>
        </View>
        <Text style={styles.routineHeadline}>{t(greetingKey())}</Text>
      </View>

      <View style={[styles.hubSheet, { flex: 1, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <CareRoutineSheet
          quiz={quiz}
          catalog={catalog}
          selectedDate={selectedDate}
          onOpenCatalog={openCatalog}
          onOpenScan={openTarkib}
          onOpenProduct={openProduct}
          onOpenAssistant={openAssistant}
          onRetakeQuiz={() => setStep(0)}
        />
      </View>

      <Pressable
        style={[styles.fab, { bottom: Math.max(insets.bottom, 16) + 16 }]}
        onPress={openAssistant}
        accessibilityLabel={t("care.hubAiAssistant")}
      >
        <LinearGradient
          colors={["#8B7CFF", "#5B8CFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabInner}
        >
          <Ionicons name="happy-outline" size={24} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050505" },
  routineRoot: { flex: 1, backgroundColor: "#F4F5F8" },
  onboardRoot: { flex: 1, backgroundColor: "#F4F5F8" },
  center: { alignItems: "center", justifyContent: "center" },
  pad: { flex: 1, paddingHorizontal: 20 },
  onboardPad: { flex: 1, paddingHorizontal: 20 },
  hubRoot: { flex: 1, backgroundColor: "#FFF0F4" },
  hubScroll: { flex: 1 },
  navBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 4,
  },
  navCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
  },
  navCircleBtnLight: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
  },
  promoWrap: {
    paddingHorizontal: 20,
    marginTop: 4,
  },
  promoCard: {
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 135,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    shadowColor: "#E11D48",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  promoLeft: {
    flex: 1,
    gap: 12,
    paddingRight: 8,
  },
  promoTitle: {
    ...morphFont,
    fontSize: 20,
    fontWeight: "800",
    color: "#18181B",
    lineHeight: 26,
    letterSpacing: -0.4,
  },
  promoBtn: {
    backgroundColor: "#09090B",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  promoBtnText: {
    ...morphFont,
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  promoImg: {
    width: 105,
    height: 105,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  dotActive: {
    width: 22,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E11D48",
  },
  dotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingLeft: 16,
    paddingRight: 6,
    height: 52,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchPlaceholder: {
    ...morphFont,
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#9CA3AF",
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E11D48",
    alignItems: "center",
    justifyContent: "center",
  },
  micBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryScroll: {
    paddingHorizontal: 20,
    gap: 10,
    paddingVertical: 14,
  },
  catPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  catPillActive: {
    backgroundColor: "#09090B",
  },
  catPillInactive: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  catText: {
    ...morphFont,
    fontSize: 14,
  },
  catTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  catTextInactive: {
    color: "#374151",
    fontWeight: "600",
  },
  routineTop: { paddingHorizontal: 20, paddingBottom: 8, gap: 10 },
  routineTopTitle: { ...morphFont, fontSize: 16, fontWeight: "700", color: "#111" },
  routineHeadline: {
    ...morphFont,
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  hubSheet: {
    marginTop: "auto",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingTop: 20,
    gap: 16,
  },
  reportHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reportTitle: { ...morphFont, fontSize: 18, fontWeight: "700", color: "#111" },
  reportFilter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F2F2F4",
  },
  reportFilterText: { ...morphFont, fontSize: 12, fontWeight: "600", color: "#1a1a1a" },
  hubCards: { flexDirection: "row", gap: 12 },
  hubCard: {
    flex: 1,
    minHeight: 154,
    borderRadius: 24,
    backgroundColor: "#FAFAFC",
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  hubCardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  hubCardIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  hubCardIconBlue: { backgroundColor: "rgba(59,130,246,0.12)" },
  hubCardIconRose: { backgroundColor: "rgba(225,29,72,0.12)" },
  hubCardTitle: { ...morphFont, flex: 1, fontSize: 13, fontWeight: "600", color: "rgba(26,26,26,0.72)" },
  hubCardMetric: { ...morphFont, fontSize: 22, fontWeight: "700", color: "#111", letterSpacing: -0.4 },
  hubCardSub: { ...morphFont, fontSize: 11.5, lineHeight: 16, color: "rgba(26,26,26,0.48)", marginTop: "auto" },
  aiAssistant: {
    height: 64,
    borderRadius: 24,
    backgroundColor: "#F8F8FA",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.18)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 12,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  aiAssistantIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  aiAssistantText: { ...morphFont, flex: 1, fontSize: 16, fontWeight: "600", color: "#111" },
  rowBetweenLight: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  onboardBadge: { ...morphFont, fontSize: 12, fontWeight: "600", color: "#5B4B8A" },
  onboardH1: { ...morphFont, fontSize: 28, fontWeight: "700", color: "#111", letterSpacing: -0.6, lineHeight: 34 },
  onboardSub: { marginTop: 10, ...morphFont, fontSize: 15, lineHeight: 22, color: "rgba(26,26,26,0.55)" },
  progressTrackLight: {
    marginTop: 20,
    height: 4,
    borderRadius: 99,
    backgroundColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  progressFillLight: { height: "100%", backgroundColor: "#8B7CFF", borderRadius: 99 },
  optGridLight: { marginTop: 24, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  optCardLight: {
    width: "47%",
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    backgroundColor: "rgba(255,255,255,0.65)",
    padding: 14,
    justifyContent: "center",
  },
  optCardLightOn: { borderColor: "#8B7CFF", backgroundColor: "#fff" },
  optTextLight: { ...morphFont, fontSize: 14, fontWeight: "600", color: "rgba(26,26,26,0.65)" },
  optTextLightOn: { color: "#111" },
  onboardFooter: { flexDirection: "row", gap: 8 },
  primaryBtnLight: {
    height: 48,
    borderRadius: 999,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  primaryBtnLightText: { ...morphFont, fontSize: 14, fontWeight: "600", color: "#fff" },
  ghostBtnLight: {
    height: 48,
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  ghostBtnLightText: { ...morphFont, fontSize: 14, fontWeight: "600", color: "#111" },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#5B8CFF",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  fabInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  flexGrow: { flex: 1.6 },
  disabled: { opacity: 0.5 },
  muted: { ...morphFont, fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: "500" },
  lockWrap: { marginTop: 80, alignItems: "center", paddingHorizontal: 24 },
  lockTitle: { marginTop: 16, ...morphFont, fontSize: 18, fontWeight: "600", color: "#fff" },
  lockSub: {
    marginTop: 8,
    ...morphFont,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },
  primaryBtnDark: {
    height: 48,
    borderRadius: 999,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  primaryBtnDarkText: { ...morphFont, fontSize: 14, fontWeight: "600", color: "#000" },
});
