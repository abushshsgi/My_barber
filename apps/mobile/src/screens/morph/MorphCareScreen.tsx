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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [quiz, setQuiz] = useState<CareQuizAnswers>(() => defaultQuiz());
  const [step, setStep] = useState<QuizStep>(0);
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

      let profileComplete = false;
      if (profile?.complete && profile.condition && profile.texture && profile.color_status) {
        const next: CareQuizAnswers = {
          condition: profile.condition as HairCondition,
          texture: profile.texture as HairTexture,
          colorStatus: profile.color_status as HairColorStatus,
        };
        setQuiz(next);
        await saveCareQuiz(next);
        profileComplete = true;
      } else if (saved) {
        setQuiz(saved);
        profileComplete = true;
      }

      setShowOnboarding(!profileComplete);
      if (!profileComplete) setStep(0);

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
      setShowOnboarding(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#5B4B8A" />
      </View>
    );
  }

  if (access && !access.allowed) {
    return (
      <View style={[styles.lockRoot, styles.pad, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.lockMuted}>{t("care.badge")}</Text>
        <View style={styles.lockWrap}>
          <Ionicons name="lock-closed" size={28} color="rgba(26,26,26,0.35)" />
          <Text style={styles.lockTitle}>{t("care.badge")}</Text>
          <Text style={styles.lockSub}>{access.detail || t("care.proOnly")}</Text>
          <Pressable style={[styles.primaryBtn, { marginTop: 24 }]} onPress={openSubscriptions}>
            <Text style={styles.primaryBtnText}>{t("care.seePlans")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (showOnboarding) {
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
        <View style={[styles.onboardPad, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.onboardBadge}>{t("care.onboarding.badge")}</Text>
          <Text style={styles.onboardH1}>{quizMeta.title}</Text>
          <Text style={styles.onboardSub}>{quizMeta.sub}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((step + 1) / 3) * 100}%` }]} />
          </View>
          <View style={styles.optGrid}>
            {quizMeta.opts.map((opt) => {
              const on = quizMeta.value === opt;
              return (
                <Pressable
                  key={opt}
                  style={[styles.optCard, on && styles.optCardOn]}
                  onPress={() => quizMeta.set(opt as never)}
                >
                  <Text style={[styles.optText, on && styles.optTextOn]}>
                    {t(`${quizMeta.labelKey}.${opt}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.onboardFooter}>
            {step > 0 ? (
              <Pressable
                style={styles.ghostBtn}
                onPress={() => setStep((s) => (s > 0 ? ((s - 1) as QuizStep) : 0))}
              >
                <Text style={styles.ghostBtnText}>{t("common.back")}</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.primaryBtn, styles.flexGrow, saving && styles.disabled]}
              disabled={saving}
              onPress={() => {
                if (step === 2) void finishQuiz();
                else setStep((step + 1) as QuizStep);
              }}
            >
              <Text style={styles.primaryBtnText}>
                {step === 2 ? t("care.onboarding.finish") : t("common.next")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const avatarUri = user?.avatar?.trim() || null;
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <View style={styles.hubRoot}>
      <LinearGradient
        colors={["#EDE4FF", "#F7E8F0", "#F4F5F8"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 0.55 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.blob, styles.blobLilac]} />
      <View style={[styles.blob, styles.blobPink]} />

      <View style={[styles.hubTop, { paddingTop: insets.top + 8 }]}>
        <View style={styles.hubHeader}>
          <View style={styles.hubHeaderText}>
            <Text style={styles.hubHello}>{t("care.hubHello", { name: displayName })}</Text>
            <Text style={styles.hubHeadline}>{t(greetingKey())}</Text>
          </View>
          <Pressable style={styles.notifyBtn} onPress={openWeather}>
            <Ionicons name="notifications-outline" size={20} color="#1a1a1a" />
            <View style={styles.notifyDot} />
          </Pressable>
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
            <ActivityIndicator size="small" color="#5B4B8A" />
          ) : (
            <>
              <Ionicons
                name={weatherIconName(weather?.current.condition_key ?? "unknown")}
                size={18}
                color="#5B4B8A"
              />
              <Text style={styles.weatherTemp}>
                {weather?.current.temperature_c != null
                  ? `${Math.round(weather.current.temperature_c)}°`
                  : "—"}
              </Text>
              <Text style={styles.weatherHint} numberOfLines={1}>
                {t(`care.weather.conditions.${weather?.current.condition_key ?? "unknown"}`)}
              </Text>
            </>
          )}
        </Pressable>

        <View style={styles.dayRow}>
          {dayRows.map((day, idx) => {
            const on = idx === selectedDayIdx;
            const done = idx < selectedDayIdx;
            return (
              <Pressable
                key={day.date}
                style={[styles.dayPill, on && styles.dayPillOn]}
                onPress={() => {
                  setSelectedDayIdx(idx);
                  if (idx === 0) openWeather();
                }}
              >
                {done ? (
                  <View style={styles.dayCheck}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                ) : (
                  <Text style={[styles.dayPillDate, on && styles.dayPillTextOn]}>
                    {idx === 0 ? t("care.routine.dayLabel") : formatDayNumber(day.date)}
                  </Text>
                )}
                <Text style={[styles.dayPillWeek, on && styles.dayPillTextOn]} numberOfLines={1}>
                  {t(`care.weather.weekdaysShort.${day.weekday_key}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.hubSheet, { paddingBottom: Math.max(insets.bottom, 12) + 88 }]}>
        <CareRoutineSheet
          quiz={quiz}
          catalog={catalog}
          selectedDate={selectedDate}
          onOpenCatalog={openCatalog}
          onOpenScan={openTarkib}
          onOpenProduct={openProduct}
          onOpenAssistant={openAssistant}
          onRetakeQuiz={() => {
            setStep(0);
            setShowOnboarding(true);
          }}
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
  root: { flex: 1, backgroundColor: "#F4F5F8" },
  lockRoot: { flex: 1, backgroundColor: "#F4F5F8" },
  hubRoot: { flex: 1, backgroundColor: "#F4F5F8" },
  onboardRoot: { flex: 1, backgroundColor: "#F4F5F8" },
  center: { alignItems: "center", justifyContent: "center" },
  pad: { paddingHorizontal: 20 },
  onboardPad: { flex: 1, paddingHorizontal: 20, justifyContent: "space-between" },
  blob: { position: "absolute", borderRadius: 999, opacity: 0.55 },
  blobLilac: { width: 220, height: 220, top: 40, right: -60, backgroundColor: "#D9D0FF" },
  blobPink: { width: 180, height: 180, top: 120, left: -50, backgroundColor: "#F5C9DE" },
  hubTop: { paddingHorizontal: 20, paddingBottom: 10, gap: 12 },
  hubHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  hubHeaderText: { flex: 1, gap: 4 },
  hubHello: { ...morphFont, fontSize: 15, fontWeight: "500", color: "rgba(26,26,26,0.72)" },
  hubHeadline: {
    ...morphFont,
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  notifyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  notifyDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  hubAvatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  hubAvatar: { width: "100%", height: "100%" },
  hubAvatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8E0FF",
  },
  hubAvatarInitial: { ...morphFont, fontSize: 18, fontWeight: "700", color: "#5B4B8A" },
  weatherChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "100%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  weatherTemp: { ...morphFont, fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  weatherHint: { ...morphFont, flex: 1, fontSize: 12, color: "rgba(26,26,26,0.55)" },
  dayRow: { flexDirection: "row", gap: 6 },
  dayPill: {
    flex: 1,
    minHeight: 64,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 2,
    gap: 2,
  },
  dayPillOn: { backgroundColor: "#fff" },
  dayCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  dayPillDate: { ...morphFont, fontSize: 14, fontWeight: "700", color: "rgba(26,26,26,0.7)" },
  dayPillWeek: { ...morphFont, fontSize: 10, fontWeight: "600", color: "rgba(26,26,26,0.45)" },
  dayPillTextOn: { color: "#1a1a1a" },
  hubSheet: {
    flex: 1,
    marginTop: 4,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingTop: 20,
  },
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
  onboardBadge: {
    ...morphFont,
    fontSize: 12,
    fontWeight: "600",
    color: "#5B4B8A",
    letterSpacing: 0.4,
  },
  onboardH1: {
    marginTop: 12,
    ...morphFont,
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  onboardSub: {
    marginTop: 10,
    ...morphFont,
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(26,26,26,0.55)",
  },
  progressTrack: {
    marginTop: 20,
    height: 4,
    borderRadius: 99,
    backgroundColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#8B7CFF", borderRadius: 99 },
  optGrid: { marginTop: 24, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  optCard: {
    width: "47%",
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    backgroundColor: "rgba(255,255,255,0.65)",
    padding: 14,
    justifyContent: "center",
  },
  optCardOn: { borderColor: "#8B7CFF", backgroundColor: "#fff" },
  optText: { ...morphFont, fontSize: 14, fontWeight: "600", color: "rgba(26,26,26,0.65)" },
  optTextOn: { color: "#111" },
  onboardFooter: { flexDirection: "row", gap: 8, marginTop: 24 },
  primaryBtn: {
    height: 48,
    borderRadius: 999,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  primaryBtnText: { ...morphFont, fontSize: 14, fontWeight: "600", color: "#fff" },
  ghostBtn: {
    height: 48,
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  ghostBtnText: { ...morphFont, fontSize: 14, fontWeight: "600", color: "#111" },
  flexGrow: { flex: 1.6 },
  disabled: { opacity: 0.5 },
  lockWrap: { marginTop: 80, alignItems: "center", paddingHorizontal: 24 },
  lockMuted: { ...morphFont, fontSize: 12, color: "rgba(26,26,26,0.35)", fontWeight: "500" },
  lockTitle: { marginTop: 16, ...morphFont, fontSize: 18, fontWeight: "600", color: "#111" },
  lockSub: {
    marginTop: 8,
    ...morphFont,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(26,26,26,0.5)",
    textAlign: "center",
  },
});
