import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
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
import { useAuth } from "../../auth/AuthContext";
import { CareRoutineSheet } from "../../components/morph/care/CareRoutineSheet";
import { DarkMeshAmbientBg } from "../../components/morph/care/DarkMeshAmbientBg";
import { useCareWeather } from "../../hooks/useCareWeather";
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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { goMorph, navigateRootTab } = useShellNavigation();
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<{ allowed: boolean; detail?: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("hub");
  const [quiz, setQuiz] = useState<CareQuizAnswers>(() => defaultQuiz());
  const [step, setStep] = useState<QuizStep | "plan">(0);
  const [catalog, setCatalog] = useState<CareProduct[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const { data: weather, loading: weatherLoading } = useCareWeather();

  const displayName =
    user?.first_name?.trim() ||
    user?.full_name?.trim()?.split(/\s+/)[0] ||
    t("care.hubGuestName");

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

  const openProfile = useCallback(() => {
    navigateRootTab(navigation, "Profile");
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
        <Text style={styles.muted}>{t("care.badge")}</Text>
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
    const avatarUri = user?.avatar?.trim() || null;
    const initial = displayName.slice(0, 1).toUpperCase();

    return (
      <View style={styles.hubRoot}>
        <DarkMeshAmbientBg />

        <View style={[styles.hubTop, { paddingTop: insets.top + 8 }]}>
          <View style={styles.hubHeader}>
            <View style={styles.hubHeaderText}>
              <Text style={styles.hubHello}>{t("care.hubHello", { name: displayName })}</Text>
              <Text style={styles.hubHeadline}>{t("care.hubHeadline")}</Text>
            </View>
            <Pressable style={styles.hubAvatarBtn} onPress={openProfile}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.hubAvatar} />
              ) : (
                <View style={styles.hubAvatarFallback}>
                  <Text style={styles.hubAvatarInitial}>{initial}</Text>
                </View>
              )}
            </Pressable>
          </View>

          <Pressable style={styles.weatherChip} onPress={openWeather}>
            {weatherLoading ? (
              <ActivityIndicator size="small" color="rgba(255,255,255,0.85)" />
            ) : (
              <>
                <Ionicons
                  name={weatherIconName(weather?.current.condition_key ?? "unknown")}
                  size={18}
                  color="rgba(255,255,255,0.9)"
                />
                <Text style={styles.weatherTemp}>
                  {weather?.current.temperature_c != null
                    ? `${Math.round(weather.current.temperature_c)}°`
                    : "—"}
                </Text>
              </>
            )}
          </Pressable>

          <View style={styles.dayRow}>
            {dayRows.map((day, idx) => {
              const on = idx === selectedDayIdx;
              return (
                <Pressable
                  key={day.date}
                  style={[styles.dayPill, on && styles.dayPillOn]}
                  onPress={() => {
                    setSelectedDayIdx(idx);
                    openWeather();
                  }}
                >
                  <Text style={[styles.dayPillDate, on && styles.dayPillTextOn]}>
                    {formatDayNumber(day.date)}
                  </Text>
                  <Text style={[styles.dayPillWeek, on && styles.dayPillTextOn]} numberOfLines={1}>
                    {t(`care.weather.weekdaysShort.${day.weekday_key}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.hubSheet, { paddingBottom: Math.max(insets.bottom, 12) + 72 }]}>
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
          <View style={styles.rowBetweenLight}>
            <Pressable onPress={() => setViewMode("hub")} hitSlop={12}>
              <Ionicons name="chevron-back" size={22} color="#111" />
            </Pressable>
            <Text style={styles.onboardBadge}>{t("care.onboarding.badge")}</Text>
            <View style={{ width: 22 }} />
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
        <View style={styles.rowBetweenLight}>
          <Pressable onPress={() => setViewMode("hub")} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color="#111" />
          </Pressable>
          <Text style={styles.routineTopTitle}>{t("care.hubParvarish")}</Text>
          <View style={{ width: 22 }} />
        </View>
        <Text style={styles.routineHello}>{t("care.hubHello", { name: displayName })}</Text>
        <Text style={styles.routineHeadline}>{t(greetingKey())}</Text>
      </View>

      <View style={[styles.hubSheet, { flex: 1, paddingBottom: Math.max(insets.bottom, 12) + 88 }]}>
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
        style={[styles.fab, { bottom: Math.max(insets.bottom, 12) + 72 }]}
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
  hubRoot: { flex: 1, backgroundColor: "#0c0e0c" },
  hubTop: { paddingHorizontal: 20, paddingBottom: 14, gap: 14 },
  routineTop: { paddingHorizontal: 20, paddingBottom: 8, gap: 4 },
  routineTopTitle: { ...morphFont, fontSize: 15, fontWeight: "600", color: "#111" },
  routineHello: { ...morphFont, fontSize: 15, fontWeight: "500", color: "rgba(26,26,26,0.72)" },
  routineHeadline: {
    ...morphFont,
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  hubHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  hubHeaderText: { flex: 1, gap: 4 },
  hubHello: { ...morphFont, fontSize: 15, fontWeight: "500", color: "rgba(255,255,255,0.72)" },
  hubHeadline: {
    ...morphFont,
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  hubAvatarBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
  },
  hubAvatar: { width: "100%", height: "100%" },
  hubAvatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  hubAvatarInitial: { ...morphFont, fontSize: 20, fontWeight: "700", color: "#fff" },
  weatherChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 88,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
  },
  weatherTemp: { ...morphFont, fontSize: 16, fontWeight: "700", color: "#fff" },
  dayRow: { flexDirection: "row", gap: 6 },
  dayPill: {
    flex: 1,
    minHeight: 64,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 2,
    gap: 2,
  },
  dayPillOn: { backgroundColor: "rgba(255,255,255,0.92)" },
  dayPillDate: { ...morphFont, fontSize: 16, fontWeight: "700", color: "rgba(255,255,255,0.78)" },
  dayPillWeek: { ...morphFont, fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.45)" },
  dayPillTextOn: { color: "#1a1a1a" },
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
    minHeight: 148,
    borderRadius: 24,
    backgroundColor: "#FAFAFB",
    padding: 14,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.04)",
  },
  hubCardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  hubCardIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  hubCardIconBlue: { backgroundColor: "rgba(59,130,246,0.12)" },
  hubCardIconRose: { backgroundColor: "rgba(225,29,72,0.12)" },
  hubCardTitle: { ...morphFont, flex: 1, fontSize: 13, fontWeight: "600", color: "rgba(26,26,26,0.7)" },
  hubCardMetric: { ...morphFont, fontSize: 22, fontWeight: "700", color: "#111", letterSpacing: -0.4 },
  hubCardSub: { ...morphFont, fontSize: 11, lineHeight: 15, color: "rgba(26,26,26,0.45)", marginTop: "auto" },
  aiAssistant: {
    height: 64,
    borderRadius: 999,
    backgroundColor: "rgba(245,245,248,0.95)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.04)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 12,
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
