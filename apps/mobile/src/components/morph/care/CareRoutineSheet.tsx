import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import Reanimated, { FadeIn, FadeOut } from "react-native-reanimated";
import {
  generateCarePlan,
  type AiCarePlan,
  type CareProduct,
} from "../../../api/care";
import { resolveMediaUrl } from "../../../api/media";
import {
  buildDailyRoutine,
  careProfileKey,
  loadCachedCarePlan,
  loadCareSchedule,
  saveCareSchedule,
  saveCachedCarePlan,
  shiftRoutineTimes,
  sortProductIds,
  stripPlanProducts,
  type CareSchedulePrefs,
  type CareQuizAnswers,
  type RoutineSlot,
  type RoutineTask,
} from "../../../lib/morph-ai-care";
import { scheduleCareReminders } from "../../../lib/care-reminders";
import {
  loadMyProducts,
  loadRoutineDone,
  setRoutineTaskDone,
  type MyCareProduct,
} from "../../../lib/morph-my-products";
import { AiPlanThinkingOverlay, type AiScanProduct } from "./AiPlanThinkingOverlay";
import { colors } from "../../../theme/colors";
import { morphFont } from "../../../theme/morph-font";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../../utils/responsive";

/** Kategoriya sinonimlari — AI / offline reja moslashuvi. */
const CAT_ALIASES: Record<string, string[]> = {
  shampoo: ["shampoo"],
  balsam: ["balsam", "conditioner"],
  conditioner: ["conditioner", "balsam"],
  mask: ["mask"],
  oil: ["oil"],
  spray: ["spray"],
  serum: ["serum", "spray"],
};

function productImageUri(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  return resolveMediaUrl(url, { width: 360 }) || url.trim();
}

function findByCategory(
  byCat: Map<string, MyCareProduct>,
  hint: string,
): MyCareProduct | undefined {
  for (const key of CAT_ALIASES[hint] || [hint]) {
    const hit = byCat.get(key);
    if (hit) return hit;
  }
  return undefined;
}

type DayMode = "today" | RoutineSlot;

type GuidePayload = {
  productId?: number;
  title: string;
  brand?: string;
  category?: string;
  usageText?: string;
  durationMinutes?: number;
  image?: string;
};

type Props = {
  quiz: CareQuizAnswers;
  catalog: CareProduct[];
  selectedDate: string;
  userName?: string | null;
  onOpenCatalog: () => void;
  onOpenScan: () => void;
  onOpenShelf: () => void;
  onOpenProduct: (id: number) => void;
  onOpenGuide: (payload: GuidePayload) => void;
  onRetakeQuiz: () => void;
};

const DAY_MODES: { id: DayMode; icon: keyof typeof Ionicons.glyphMap; labelKey: string }[] = [
  { id: "today", icon: "today-outline", labelKey: "care.routine.dayToday" },
  { id: "morning", icon: "sunny-outline", labelKey: "care.routine.slots.morning" },
  { id: "evening", icon: "moon-outline", labelKey: "care.routine.slots.evening" },
  { id: "weekly", icon: "calendar-outline", labelKey: "care.routine.slots.weekly" },
];

const TASK_ICONS: Record<RoutineTask["icon"], keyof typeof Ionicons.glyphMap> = {
  water: "water-outline",
  flask: "flask-outline",
  sparkles: "sparkles-outline",
  shield: "shield-checkmark-outline",
  leaf: "leaf-outline",
  cut: "cut-outline",
};

function enrichTask(
  t: {
    id: string;
    title: string;
    subtitle?: string;
    icon?: string;
    product_id?: number | null;
    product_name?: string;
    time?: string;
    time_hint?: string;
    duration_min?: number | null;
  },
  products: MyCareProduct[],
  slot: RoutineSlot,
  catalog?: CareProduct[],
): RoutineTask {
  const byId = new Map(products.map((p) => [p.id, p]));
  const byCat = new Map<string, MyCareProduct>();
  for (const p of products) {
    const cat = (p.category || "").toLowerCase();
    if (cat && !byCat.has(cat)) byCat.set(cat, p);
  }
  const catalogById = new Map((catalog || []).map((c) => [c.id, c]));
  const GENERIC = /^(shampun|konditsioner|balsam|balzam|maska|yog'|yog|spray|sprey|serum)/i;

  let productId = t.product_id ?? undefined;
  let product = productId ? byId.get(productId) : undefined;
  let productName = t.product_name || product?.name;
  if (!productName || productName === "null" || productName === "undefined") {
    productName = product?.name || undefined;
  }
  if (productName === "null" || productName === "undefined") productName = undefined;

  if ((!product || !productName || GENERIC.test(productName || "")) && products.length) {
    const blob = `${t.title} ${productName || ""} ${t.subtitle || ""}`;
    const hint =
      /shamp/i.test(blob)
        ? "shampoo"
        : /kondits|balsam|balzam|condition/i.test(blob)
          ? "balsam"
          : /mask/i.test(blob)
            ? "mask"
            : /yog|oil/i.test(blob)
              ? "oil"
              : /serum/i.test(blob)
                ? "serum"
                : /sprey|spray|himoya/i.test(blob)
                  ? "spray"
                  : null;
    const hit = hint ? findByCategory(byCat, hint) : undefined;
    if (hit) {
      product = hit;
      productId = hit.id;
      productName = hit.name;
    }
  }

  const catalogRow = productId ? catalogById.get(productId) : undefined;
  const rawImage = product?.image_url || catalogRow?.image_url || null;

  const icon = (TASK_ICONS[t.icon as RoutineTask["icon"]]
    ? t.icon
    : "sparkles") as RoutineTask["icon"];
  const clock = (t.time || "").trim();
  const usageHow =
    product?.usage_uz ||
    product?.purpose_uz ||
    catalogRow?.usage_uz ||
    t.subtitle ||
    "";

  return {
    id: t.id,
    title: t.title,
    subtitle: t.subtitle || usageHow || productName || "",
    icon,
    productId,
    productName,
    time: clock || undefined,
    timeHint: t.time_hint || clock || undefined,
    durationMin: typeof t.duration_min === "number" ? t.duration_min : undefined,
    imageUrl: productImageUri(rawImage),
    usageHow,
    brand: product?.brand || catalogRow?.brand,
    category: product?.category || catalogRow?.category,
    slot,
  };
}

function mapSlotTasks(
  plan: AiCarePlan | null,
  slot: RoutineSlot,
  products: MyCareProduct[],
  quiz: CareQuizAnswers,
  catalog?: CareProduct[],
  schedule?: CareSchedulePrefs | null,
): RoutineTask[] {
  // Mahsulotsiz — offline fallback ham yo‘q (faqat qo‘shish CTA)
  if (!products.length) return [];
  if (plan && Array.isArray(plan[slot]) && plan[slot].length > 0) {
    const rows = plan[slot].map((t) => enrichTask(t, products, slot, catalog));
    const anchor = slot === "morning" ? schedule?.morningTime : schedule?.eveningTime;
    return shiftRoutineTimes(rows, anchor);
  }
  return buildDailyRoutine(quiz, slot, products, schedule).map((task) => {
    const catalogById = new Map((catalog || []).map((c) => [c.id, c]));
    const product = products.find((p) => p.id === task.productId);
    const catalogRow = task.productId ? catalogById.get(task.productId) : undefined;
    const rawImage = product?.image_url || catalogRow?.image_url || null;
    const rawName = task.productName || product?.name;
    const productName =
      rawName && rawName !== "null" && rawName !== "undefined" ? rawName : undefined;
    return {
      ...task,
      productName,
      slot,
      imageUrl: productImageUri(rawImage),
      usageHow: product?.usage_uz || product?.purpose_uz || task.subtitle,
      brand: product?.brand || task.brand,
      category: product?.category || task.category,
    };
  });
}

function productPayload(products: MyCareProduct[]) {
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
  }));
}

function idsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = sortProductIds(a);
  const sb = sortProductIds(b);
  return sa.every((id, i) => id === sb[i]);
}

function clockSortKey(task: RoutineTask): string {
  return task.time || task.timeHint || "99:99";
}

export function CareRoutineSheet({
  quiz,
  catalog,
  selectedDate,
  userName,
  onOpenCatalog,
  onOpenScan,
  onOpenShelf,
  onOpenProduct,
  onOpenGuide,
  onRetakeQuiz,
}: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<DayMode>("today");
  const [myProducts, setMyProducts] = useState<MyCareProduct[]>([]);
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [aiPlan, setAiPlan] = useState<AiCarePlan | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAppending, setAiAppending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [remindersOn, setRemindersOn] = useState(false);
  const [schedule, setSchedule] = useState<CareSchedulePrefs | null>({
    morningTime: "07:30",
    eveningTime: "21:00",
  });
  const [celebrate, setCelebrate] = useState(false);
  const knownIdsRef = useRef<number[]>([]);
  const planRef = useRef<AiCarePlan | null>(null);
  const syncingRef = useRef(false);
  const loadedOnceRef = useRef(false);
  const prevProductCountRef = useRef<number | null>(null);
  const celebrateScale = useRef(new Animated.Value(0.7)).current;
  const celebrateOpacity = useRef(new Animated.Value(0)).current;

  const morningTasks = useMemo(
    () => mapSlotTasks(aiPlan, "morning", myProducts, quiz, catalog, schedule),
    [aiPlan, myProducts, quiz, catalog, schedule],
  );
  const eveningTasks = useMemo(
    () => mapSlotTasks(aiPlan, "evening", myProducts, quiz, catalog, schedule),
    [aiPlan, myProducts, quiz, catalog, schedule],
  );
  const weeklyTasks = useMemo(
    () => mapSlotTasks(aiPlan, "weekly", myProducts, quiz, catalog, schedule),
    [aiPlan, myProducts, quiz, catalog, schedule],
  );

  const tasks = useMemo(() => {
    if (mode === "today") {
      return [...morningTasks, ...eveningTasks].sort((a, b) =>
        clockSortKey(a).localeCompare(clockSortKey(b)),
      );
    }
    if (mode === "morning") return morningTasks;
    if (mode === "evening") return eveningTasks;
    return weeklyTasks;
  }, [mode, morningTasks, eveningTasks, weeklyTasks]);

  const doneCount = useMemo(
    () => tasks.filter((task) => doneMap[task.id]).length,
    [tasks, doneMap],
  );
  const progress = tasks.length ? doneCount / tasks.length : 0;

  const syncReminders = useCallback(
    async (plan: AiCarePlan, products: MyCareProduct[]) => {
      const toNotif = (slot: RoutineSlot) =>
        mapSlotTasks(plan, slot, products, quiz, catalog, schedule).map((task) => ({
          id: task.id,
          title: task.title,
          subtitle: task.subtitle,
          time: task.time,
          time_hint: task.timeHint,
          icon: task.icon,
          product_id: task.productId ?? null,
          product_name: task.productName,
          duration_min: task.durationMin ?? null,
        }));
      const n = await scheduleCareReminders({
        userName,
        morning: toNotif("morning"),
        evening: toNotif("evening"),
      });
      setRemindersOn(n > 0);
    },
    [catalog, quiz, schedule, userName],
  );

  const persistPlan = useCallback(
    async (plan: AiCarePlan, products: MyCareProduct[]) => {
      planRef.current = plan;
      setAiPlan(plan);
      const ids = sortProductIds(products.map((p) => p.id));
      knownIdsRef.current = ids;
      await saveCachedCarePlan({
        plan,
        productIds: ids,
        profileKey: careProfileKey(quiz, schedule),
        updatedAt: new Date().toISOString(),
      });
      void syncReminders(plan, products);
    },
    [quiz, schedule, syncReminders],
  );

  const generateFull = useCallback(
    async (products: MyCareProduct[], prefs?: CareSchedulePrefs | null) => {
      const sched = prefs ?? schedule;
      if (!sched?.morningTime || !sched?.eveningTime) return;
      if (!products.length) {
        setAiPlan(null);
        planRef.current = null;
        return;
      }
      setAiLoading(true);
      setAiAppending(false);
      setAiError(null);
      if (!planRef.current) {
        setAiPlan(null);
      }
      try {
        const plan = await generateCarePlan({
          condition: quiz.condition,
          texture: quiz.texture,
          color_status: quiz.colorStatus,
          products: productPayload(products),
          mode: "full",
          morning_time: sched.morningTime,
          evening_time: sched.eveningTime,
        });
        await persistPlan(plan, products);
      } catch (e) {
        if (!planRef.current) setAiPlan(null);
        setAiError(e instanceof Error ? e.message : t("care.routine.aiPlanError"));
      } finally {
        setAiLoading(false);
      }
    },
    [persistPlan, quiz.colorStatus, quiz.condition, quiz.texture, schedule, t],
  );

  const appendForProducts = useCallback(
    async (allProducts: MyCareProduct[], newOnes: MyCareProduct[], existing: AiCarePlan) => {
      if (!schedule?.morningTime || !schedule?.eveningTime) return;
      setAiAppending(true);
      setAiError(null);
      try {
        const plan = await generateCarePlan({
          condition: quiz.condition,
          texture: quiz.texture,
          color_status: quiz.colorStatus,
          products: productPayload(newOnes),
          mode: "append",
          existing_plan: existing,
          morning_time: schedule.morningTime,
          evening_time: schedule.eveningTime,
        });
        await persistPlan(plan, allProducts);
      } catch (e) {
        setAiError(e instanceof Error ? e.message : t("care.routine.aiPlanError"));
        knownIdsRef.current = sortProductIds(allProducts.map((p) => p.id));
      } finally {
        setAiAppending(false);
      }
    },
    [persistPlan, quiz.colorStatus, quiz.condition, quiz.texture, schedule, t],
  );

  const syncPlanWithProducts = useCallback(
    async (products: MyCareProduct[], opts?: { forceFull?: boolean; prefs?: CareSchedulePrefs | null }) => {
      if (syncingRef.current) return;
      const sched = opts?.prefs ?? schedule;
      if (!sched?.morningTime || !sched?.eveningTime) return;
      if (!products.length) return;
      syncingRef.current = true;
      try {
        const currentIds = sortProductIds(products.map((p) => p.id));

        let cached = await loadCachedCarePlan();
        let plan = planRef.current;

        if (!plan && cached?.plan) {
          plan = cached.plan as AiCarePlan;
          planRef.current = plan;
          setAiPlan(plan);
          knownIdsRef.current = sortProductIds(cached.productIds);
          void syncReminders(plan, products);
        }

        if (!plan) {
          if (opts?.forceFull !== false) await generateFull(products, sched);
          return;
        }

        if (opts?.forceFull) return;

        const prevIds = knownIdsRef.current.length
          ? knownIdsRef.current
          : sortProductIds(cached?.productIds ?? []);

        if (!prevIds.length || idsEqual(prevIds, currentIds)) {
          knownIdsRef.current = currentIds;
          return;
        }

        const prevSet = new Set(prevIds);
        const currSet = new Set(currentIds);
        const added = products.filter((p) => !prevSet.has(p.id));
        const removed = prevIds.filter((id) => !currSet.has(id));

        if (removed.length) {
          const keep = new Set(currentIds);
          plan = stripPlanProducts(plan, keep) as AiCarePlan;
          await persistPlan(plan, products);
        }

        if (added.length) {
          await appendForProducts(products, added, planRef.current ?? plan);
        } else {
          knownIdsRef.current = currentIds;
        }
      } finally {
        syncingRef.current = false;
      }
    },
    [appendForProducts, generateFull, persistPlan, quiz, schedule, syncReminders],
  );

  const refreshLocal = useCallback(async () => {
    if (!loadedOnceRef.current) setLoadingProducts(true);
    try {
      const [mine, done, schedRaw] = await Promise.all([
        loadMyProducts(),
        loadRoutineDone(selectedDate),
        loadCareSchedule(),
      ]);
      setMyProducts(mine);
      setDoneMap(done);
      let sched = schedRaw;
      if (!sched?.morningTime || !sched?.eveningTime) {
        sched = { morningTime: "07:30", eveningTime: "21:00" };
        await saveCareSchedule(sched);
      }
      setSchedule(sched);
      loadedOnceRef.current = true;
      return { mine, sched };
    } finally {
      setLoadingProducts(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    let live = true;
    void loadCachedCarePlan().then((cached) => {
      if (!live || !cached?.plan || planRef.current) return;
      const plan = cached.plan as AiCarePlan;
      planRef.current = plan;
      knownIdsRef.current = sortProductIds(cached.productIds || []);
      setAiPlan(plan);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const { mine, sched } = await refreshLocal();
      await syncPlanWithProducts(mine, { prefs: sched });
    })();
  }, [refreshLocal, syncPlanWithProducts]);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const { mine, sched } = await refreshLocal();
        await syncPlanWithProducts(mine, { prefs: sched });
      })();
    }, [refreshLocal, syncPlanWithProducts]),
  );

  useEffect(() => {
    const prev = prevProductCountRef.current;
    const next = myProducts.length;
    if (prev === null) {
      prevProductCountRef.current = next;
      return;
    }
    if (prev === 0 && next > 0) {
      setCelebrate(true);
      celebrateOpacity.setValue(0);
      celebrateScale.setValue(0.65);
      Animated.parallel([
        Animated.spring(celebrateScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(celebrateOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => {
          Animated.timing(celebrateOpacity, {
            toValue: 0,
            duration: 280,
            useNativeDriver: true,
          }).start(() => setCelebrate(false));
        }, 900);
      });
    }
    if (next === 0) {
      setAiPlan(null);
      planRef.current = null;
      knownIdsRef.current = [];
    }
    prevProductCountRef.current = next;
  }, [celebrateOpacity, celebrateScale, myProducts.length]);

  const toggleTask = async (taskId: string) => {
    const next = !doneMap[taskId];
    const updated = await setRoutineTaskDone(selectedDate, taskId, next);
    setDoneMap(updated);
  };

  const openGuideFor = (task: RoutineTask) => {
    onOpenGuide({
      productId: task.productId,
      title: task.productName || task.title,
      brand: task.brand,
      category: task.category,
      usageText: task.usageHow || task.subtitle,
      durationMinutes: task.durationMin || 3,
      image: task.imageUrl || undefined,
    });
  };

  const greeting = userName?.trim().split(/\s+/)[0] || t("care.routine.friendFallback", { defaultValue: "Do‘stim" });
  const hasProducts = myProducts.length > 0;
  const scanProducts = useMemo<AiScanProduct[]>(
    () =>
      myProducts.map((p) => ({
        id: p.id,
        name: p.name,
        image: productImageUri(p.image_url),
      })),
    [myProducts],
  );
  const showPlans = hasProducts && !!schedule && !!aiPlan && !aiLoading;
  const showAiThinking = hasProducts && !!schedule && !aiPlan && (aiLoading || aiAppending);
  const showStickyShelfCta = showPlans;
  const emptyOnly = !loadingProducts && !hasProducts;

  const displayProductName = (name?: string | null) => {
    if (!name || name === "null" || name === "undefined") return null;
    return name;
  };

  return (
    <View style={styles.sheetWrap}>
      <ScrollView
        style={styles.sheetScroll}
        contentContainerStyle={[
          styles.sheetContent,
          showStickyShelfCta ? styles.sheetContentWithStickyCta : null,
        ]}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {emptyOnly ? (
          <View style={styles.emptyHero}>
            <View style={styles.emptyGlow} />
            <View style={styles.emptyIconRing}>
              <Ionicons name="leaf-outline" size={30} color={colors.fg} />
            </View>
            <Text style={styles.emptyEyebrow}>
              {t("care.hubParvarish", { defaultValue: "Parvarish" })}
            </Text>
            <Text style={styles.emptyHeroTitle}>
              {t("care.myProducts.emptyTitle", { defaultValue: "Hali mahsulot yo‘q" })}
            </Text>
            <Text style={styles.emptyHeroSub}>
              {t("care.routine.needProducts", {
                defaultValue: "Reja sizning mahsulotlaringiz bilan tuziladi — avval qo‘shing",
              })}
            </Text>
            <Pressable style={styles.emptyPrimaryCta} onPress={onOpenCatalog}>
              <Ionicons name="search-outline" size={18} color="#fff" />
              <Text style={styles.emptyPrimaryCtaText}>
                {t("care.catalog.title", { defaultValue: "Tavsiya etilgan mahsulotlar" })}
              </Text>
            </Pressable>
            <Pressable style={styles.emptySecondaryCta} onPress={onOpenScan}>
              <View style={styles.emptySecondaryIcon}>
                <Ionicons name="scan-outline" size={16} color={colors.fg} />
              </View>
              <Text style={styles.emptySecondaryCtaText}>
                {t("care.myProducts.scan", { defaultValue: "Skaner" })}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.dayHero}>
              <View style={styles.dayHeroTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.dayEyebrow}>
                    {showPlans
                      ? t("care.routine.planKicker", { defaultValue: "Morf AI" })
                      : t("care.routine.dayRitual", { defaultValue: "Bugungi ritual" })}
                  </Text>
                  <Text style={styles.dayHello} numberOfLines={2}>
                    {showPlans
                      ? t("care.routine.planTitle", { defaultValue: "Morf AI Parvarish Rejasi" })
                      : t("care.routine.helloName", {
                          name: greeting,
                          defaultValue: "Salom, {{name}}",
                        })}
                  </Text>
                  <Text style={styles.daySub} numberOfLines={2}>
                    {showPlans
                      ? aiPlan?.summary ||
                        t("care.routine.daySub", {
                          defaultValue: "Mahsulotlaringiz bilan 1 kunlik to‘liq soch parvarishi",
                        })
                      : t("care.routine.daySubWaiting", {
                          defaultValue: "Mahsulotlaringiz asosida AI shaxsiy reja tuzadi",
                        })}
                  </Text>
                </View>
                {hasProducts ? (
                  <Pressable
                    style={styles.refreshBtn}
                    onPress={() => void syncPlanWithProducts(myProducts)}
                  >
                    <Ionicons name="refresh-outline" size={16} color={colors.fg} />
                  </Pressable>
                ) : null}
              </View>

              {showPlans ? (
                <>
                  <View style={styles.progressWrap}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
                    </View>
                    <Text style={styles.progressText}>
                      {doneCount}/{tasks.length || 0} · {Math.round(progress * 100)}%
                    </Text>
                  </View>
                  {remindersOn ? (
                    <View style={styles.remindBanner}>
                      <Ionicons name="notifications" size={13} color={colors.fg} />
                      <Text style={styles.remindText}>
                        {t("care.routine.remindOn", {
                          defaultValue: "Vaqti kelganda eslatma yuboriladi",
                        })}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>

            {showAiThinking ? (
              <Reanimated.View entering={FadeIn.duration(280)} exiting={FadeOut.duration(220)}>
                <AiPlanThinkingOverlay appending={aiAppending} products={scanProducts} />
              </Reanimated.View>
            ) : null}

            {aiError && !aiPlan && hasProducts && !showAiThinking ? (
              <Pressable
                style={styles.aiErrorRow}
                onPress={() => void syncPlanWithProducts(myProducts, { forceFull: true })}
              >
                <Text style={styles.aiErrorText}>{aiError}</Text>
                <Text style={styles.aiRetry}>{t("care.routine.aiPlanRetry")}</Text>
              </Pressable>
            ) : null}

            {showPlans ? (
              <Reanimated.View entering={FadeIn.duration(420)}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.modeRow}
                >
                  {DAY_MODES.map((item) => {
                    const on = mode === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        style={[styles.modeChip, on && styles.modeChipOn]}
                        onPress={() => setMode(item.id)}
                      >
                        <Ionicons name={item.icon} size={14} color={on ? "#fff" : "#111"} />
                        <Text style={[styles.modeChipText, on && styles.modeChipTextOn]}>
                          {t(item.labelKey, {
                            defaultValue:
                              item.id === "today"
                                ? "Bugun"
                                : item.id === "morning"
                                  ? "Ertalab"
                                  : item.id === "evening"
                                    ? "Kechqurun"
                                    : "Haftalik",
                          })}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View style={styles.stepStack}>
                  {tasks.map((task) => {
                    const done = !!doneMap[task.id];
                    const pname = displayProductName(task.productName);
                    const when = task.time || task.timeHint;
                    return (
                      <Pressable
                        key={task.id}
                        style={[styles.ritualCard, done && styles.ritualCardDone]}
                        onPress={() => openGuideFor(task)}
                      >
                        {task.imageUrl ? (
                          <Image
                            source={{ uri: task.imageUrl }}
                            style={styles.productImg}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={0}
                            recyclingKey={`task-${task.id}`}
                          />
                        ) : (
                          <View style={[styles.productImg, styles.productPh]}>
                            <Ionicons name={TASK_ICONS[task.icon]} size={16} color="#111" />
                          </View>
                        )}
                        <View style={styles.productCopy}>
                          <Text
                            style={[styles.ritualTitle, done && styles.ritualTitleDone]}
                            numberOfLines={1}
                          >
                            {task.title}
                          </Text>
                          {pname ? (
                            <Text style={styles.productName} numberOfLines={1}>
                              {pname}
                            </Text>
                          ) : null}
                        </View>
                        {when ? <Text style={styles.timeText}>{when}</Text> : null}
                        <Pressable
                          style={[styles.checkBtn, done && styles.checkBtnOn]}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            void toggleTask(task.id);
                          }}
                          hitSlop={8}
                        >
                          {done ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
                        </Pressable>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>{t("care.myProducts.title")}</Text>
                  <Pressable style={styles.scanLink} onPress={onOpenScan}>
                    <Ionicons name="scan-outline" size={16} color="#111" />
                    <Text style={styles.scanLinkText}>{t("care.myProducts.scan")}</Text>
                  </Pressable>
                </View>

                {loadingProducts ? (
                  <ActivityIndicator color="#111" style={{ marginVertical: 12 }} />
                ) : (
                  <View style={styles.productShelf}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.productScroll}
                      contentContainerStyle={styles.productRow}
                    >
                      {myProducts.map((p) => {
                        const img = productImageUri(p.image_url);
                        return (
                          <Pressable key={p.id} style={styles.myCard} onPress={() => onOpenProduct(p.id)}>
                            {img ? (
                              <Image
                                source={{ uri: img }}
                                style={styles.myCardImg}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                transition={0}
                                recyclingKey={`mine-${p.id}`}
                              />
                            ) : (
                              <View style={[styles.myCardImg, styles.productPh]}>
                                <Ionicons name="flask-outline" size={20} color="#111" />
                              </View>
                            )}
                            <Text style={styles.myCardName} numberOfLines={2}>
                              {p.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                    <Pressable style={styles.addCard} onPress={onOpenCatalog}>
                      <Ionicons name="add" size={22} color="#111" />
                      <Text style={styles.addCardText}>{t("care.myProducts.addShort")}</Text>
                    </Pressable>
                  </View>
                )}
              </Reanimated.View>
            ) : null}
          </>
        )}

        {!emptyOnly ? (
          <Pressable style={styles.profileLink} onPress={onRetakeQuiz}>
            <Text style={styles.profileLinkText}>
              {t("care.quiz.retake")} · {t("care.onboarding.badge")}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {celebrate ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.celebrateOverlay,
            { opacity: celebrateOpacity, transform: [{ scale: celebrateScale }] },
          ]}
        >
          <View style={styles.celebrateCard}>
            <Ionicons name="checkmark-circle" size={36} color="#16A34A" />
            <Text style={styles.celebrateTitle}>
              {t("care.routine.productAdded", { defaultValue: "Mahsulot qo‘shildi!" })}
            </Text>
            <Text style={styles.celebrateSub}>
              {t("care.routine.aiWillPlan", { defaultValue: "AI endi reja tuzadi…" })}
            </Text>
          </View>
        </Animated.View>
      ) : null}

      {showStickyShelfCta ? (
        <View pointerEvents="box-none" style={styles.stickyShelfWrap}>
          <Pressable style={styles.stickyShelfBtn} onPress={onOpenShelf}>
            <View style={styles.stickyShelfIcon}>
              <Ionicons name="cube-outline" size={16} color="#fff" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.stickyShelfTitle} numberOfLines={1}>
                {t("care.shelf.cta", { defaultValue: "Mahsulot tugash muddatini kuzatish" })}
              </Text>
              <Text style={styles.stickyShelfSub} numberOfLines={1}>
                {t("care.shelf.ctaSub", { defaultValue: "PAO va refill eslatmalarini yoqish" })}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sheetWrap: { flex: 1, position: "relative" },
  sheetScroll: { flex: 1, backgroundColor: colors.bg },
  sheetContent: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(110),
    gap: moderateScale(12),
  },
  sheetContentWithStickyCta: {
    paddingBottom: verticalScale(186),
  },
  dayHero: {
    borderRadius: moderateScale(22),
    backgroundColor: colors.surface,
    padding: moderateScale(14),
    gap: moderateScale(10),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: "#111",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  dayHeroTop: { flexDirection: "row", gap: moderateScale(10), alignItems: "flex-start" },
  dayEyebrow: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: colors.muted,
  },
  dayHello: {
    ...morphFont,
    marginTop: verticalScale(3),
    fontSize: fontSize(20),
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.5,
  },
  daySub: {
    ...morphFont,
    marginTop: verticalScale(3),
    fontSize: fontSize(12.5),
    lineHeight: fontSize(17),
    color: "rgba(17,17,17,0.55)",
  },
  refreshBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: colors.promo,
    alignItems: "center",
    justifyContent: "center",
  },
  progressWrap: { gap: moderateScale(5) },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: "#EDEAE4",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.fg,
  },
  progressText: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "600",
    color: colors.muted,
  },
  remindBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(6),
    paddingVertical: verticalScale(7),
    paddingHorizontal: scale(10),
    borderRadius: moderateScale(12),
    backgroundColor: colors.promo,
  },
  remindText: {
    ...morphFont,
    flex: 1,
    fontSize: fontSize(11),
    fontWeight: "600",
    color: colors.fg,
  },
  emptyHero: {
    borderRadius: moderateScale(26),
    backgroundColor: colors.surface,
    paddingVertical: verticalScale(32),
    paddingHorizontal: scale(22),
    alignItems: "center",
    gap: moderateScale(10),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
    shadowColor: "#111",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  emptyGlow: {
    position: "absolute",
    top: -40,
    width: scale(180),
    height: scale(180),
    borderRadius: scale(90),
    backgroundColor: colors.promo,
    opacity: 0.9,
  },
  emptyIconRing: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: colors.promo,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(2),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  emptyEyebrow: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.muted,
  },
  emptyHeroTitle: {
    ...morphFont,
    fontSize: fontSize(20),
    fontWeight: "800",
    color: colors.fg,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  emptyHeroSub: {
    ...morphFont,
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: "rgba(17,17,17,0.55)",
    textAlign: "center",
    marginBottom: verticalScale(4),
  },
  emptyHeroHint: {
    ...morphFont,
    fontSize: fontSize(11),
    color: colors.muted,
    textAlign: "center",
  },
  emptyPrimaryCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    backgroundColor: colors.fg,
    borderRadius: 999,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(13),
    minWidth: "86%",
    justifyContent: "center",
    marginTop: verticalScale(4),
  },
  emptyPrimaryCtaText: {
    ...morphFont,
    fontSize: fontSize(14),
    fontWeight: "700",
    color: "#fff",
  },
  emptySecondaryCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(14),
  },
  emptySecondaryIcon: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: colors.promo,
    alignItems: "center",
    justifyContent: "center",
  },
  emptySecondaryCtaText: {
    ...morphFont,
    fontSize: fontSize(13),
    fontWeight: "600",
    color: colors.fg,
  },
  celebrateOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 40,
    backgroundColor: "rgba(250,250,250,0.72)",
  },
  celebrateCard: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(22),
    paddingVertical: verticalScale(22),
    paddingHorizontal: scale(26),
    alignItems: "center",
    gap: moderateScale(6),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: "#111",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  celebrateTitle: {
    ...morphFont,
    fontSize: fontSize(16),
    fontWeight: "800",
    color: colors.fg,
  },
  celebrateSub: {
    ...morphFont,
    fontSize: fontSize(12),
    color: colors.muted,
  },
  shelfLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    borderRadius: moderateScale(14),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(9),
    backgroundColor: "#F7F5F1",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.08)",
  },
  shelfLinkIcon: {
    width: scale(28),
    height: scale(28),
    borderRadius: moderateScale(10),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECE7DE",
  },
  shelfLinkTitle: {
    ...morphFont,
    fontSize: fontSize(12.5),
    fontWeight: "700",
    color: "#111",
  },
  shelfLinkSub: {
    ...morphFont,
    marginTop: 1,
    fontSize: fontSize(10.5),
    color: "rgba(17,17,17,0.52)",
  },
  scheduleCard: {
    borderRadius: moderateScale(24),
    backgroundColor: "#FFFFFF",
    padding: moderateScale(16),
    gap: moderateScale(10),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.08)",
  },
  scheduleTitle: { ...morphFont, fontSize: fontSize(17), fontWeight: "700", color: "#111" },
  scheduleSub: {
    ...morphFont,
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: "rgba(17,17,17,0.55)",
  },
  scheduleLabel: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "700",
    color: "rgba(17,17,17,0.45)",
    marginTop: verticalScale(4),
  },
  timeRow: { flexDirection: "row", flexWrap: "wrap", gap: moderateScale(8) },
  timeChip: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: 999,
    backgroundColor: "#F3F1EC",
  },
  timeChipOn: { backgroundColor: "#111" },
  timeChipText: { ...morphFont, fontSize: fontSize(13), fontWeight: "600", color: "#111" },
  timeChipTextOn: { color: "#fff" },
  scheduleSave: {
    marginTop: verticalScale(6),
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(14),
    borderRadius: 999,
    backgroundColor: "#111",
  },
  scheduleSaveText: { ...morphFont, fontSize: fontSize(14), fontWeight: "700", color: "#fff" },
  scheduleCancel: {
    ...morphFont,
    textAlign: "center",
    fontSize: fontSize(13),
    fontWeight: "600",
    color: "rgba(17,17,17,0.45)",
    marginTop: verticalScale(4),
  },
  scheduleSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    borderRadius: moderateScale(18),
    backgroundColor: "#FFFFFF",
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.08)",
  },
  scheduleSummaryTitle: { ...morphFont, fontSize: fontSize(13), fontWeight: "700", color: "#111" },
  scheduleSummaryMeta: {
    ...morphFont,
    fontSize: fontSize(12),
    color: "rgba(17,17,17,0.55)",
    marginTop: 2,
  },
  modeRow: { gap: moderateScale(8), paddingRight: scale(4), paddingVertical: verticalScale(2) },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(6),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(9),
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  modeChipOn: { backgroundColor: colors.fg, borderColor: colors.fg },
  modeChipText: { ...morphFont, fontSize: fontSize(12), fontWeight: "700", color: colors.fg },
  modeChipTextOn: { color: "#fff" },
  aiLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    paddingHorizontal: scale(4),
  },
  aiLoadingText: { ...morphFont, fontSize: fontSize(12), color: colors.muted },
  aiErrorRow: {
    padding: moderateScale(14),
    borderRadius: moderateScale(16),
    backgroundColor: "#FEF2F2",
    gap: moderateScale(4),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(153,27,27,0.15)",
  },
  aiErrorText: { ...morphFont, fontSize: fontSize(12), color: "#991B1B" },
  aiRetry: { ...morphFont, fontSize: fontSize(12), fontWeight: "700", color: colors.fg },
  emptyProducts: {
    borderRadius: moderateScale(22),
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    padding: moderateScale(20),
    alignItems: "center",
    gap: moderateScale(6),
    backgroundColor: colors.surface,
  },
  emptyProductsTitle: { ...morphFont, fontSize: fontSize(14), fontWeight: "700", color: colors.fg },
  emptyProductsSub: {
    ...morphFont,
    fontSize: fontSize(12),
    color: colors.muted,
    textAlign: "center",
    lineHeight: fontSize(16),
  },
  stepStack: { gap: moderateScale(6) },
  ritualCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    borderRadius: moderateScale(14),
    backgroundColor: colors.surface,
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(10),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  ritualCardDone: { opacity: 0.55 },
  checkBtn: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    borderWidth: 1.5,
    borderColor: "rgba(17,17,17,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkBtnOn: { backgroundColor: "#16A34A", borderColor: "#16A34A" },
  productImg: {
    width: scale(36),
    height: scale(36),
    borderRadius: moderateScale(10),
    backgroundColor: colors.promo,
  },
  productPh: { alignItems: "center", justifyContent: "center" },
  productCopy: { flex: 1, minWidth: 0 },
  ritualTitle: { ...morphFont, fontSize: fontSize(13), fontWeight: "700", color: colors.fg },
  ritualTitleDone: { textDecorationLine: "line-through", color: colors.muted },
  productName: { ...morphFont, fontSize: fontSize(11), color: "rgba(17,17,17,0.5)", marginTop: 1 },
  timeText: { ...morphFont, fontSize: fontSize(12), fontWeight: "700", color: colors.fg },
  playBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(20),
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  howBox: {
    borderRadius: moderateScale(12),
    backgroundColor: colors.promo,
    padding: moderateScale(9),
    gap: 2,
  },
  howBoxHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  howLabel: {
    ...morphFont,
    fontSize: fontSize(9),
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  howText: {
    ...morphFont,
    fontSize: fontSize(12),
    lineHeight: fontSize(16),
    color: "rgba(17,17,17,0.65)",
  },
  ritualActions: { flexDirection: "row", gap: moderateScale(6) },
  secondaryAct: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(9),
    borderRadius: moderateScale(12),
    backgroundColor: colors.promo,
  },
  secondaryActText: { ...morphFont, fontSize: fontSize(11), fontWeight: "700", color: colors.fg },
  primaryAct: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(9),
    borderRadius: moderateScale(12),
    backgroundColor: colors.fg,
  },
  primaryActDone: { backgroundColor: "#E8E4DC" },
  primaryActText: { ...morphFont, fontSize: fontSize(11), fontWeight: "700", color: "#fff" },
  primaryActTextDone: { color: colors.fg },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: verticalScale(4),
  },
  sectionTitle: { ...morphFont, fontSize: fontSize(16), fontWeight: "700", color: "#111" },
  scanLink: { flexDirection: "row", alignItems: "center", gap: moderateScale(4) },
  scanLinkText: { ...morphFont, fontSize: fontSize(13), fontWeight: "600", color: "#111" },
  productShelf: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: moderateScale(8),
  },
  productScroll: { flex: 1, minWidth: 0 },
  productRow: { gap: moderateScale(10), paddingRight: scale(2) },
  myCard: {
    width: scale(110),
    borderRadius: moderateScale(18),
    backgroundColor: "#FFFFFF",
    padding: moderateScale(10),
    gap: moderateScale(6),
  },
  myCardImg: { width: "100%", height: verticalScale(100), borderRadius: moderateScale(14) },
  myCardName: { ...morphFont, fontSize: fontSize(12), fontWeight: "600", color: "#111" },
  addCard: {
    width: scale(78),
    flexShrink: 0,
    borderRadius: moderateScale(18),
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.12)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: moderateScale(8),
  },
  addCardText: { ...morphFont, fontSize: fontSize(11), fontWeight: "600", color: "#111" },
  recCard: {
    width: scale(148),
    borderRadius: moderateScale(18),
    backgroundColor: "#FFFFFF",
    padding: moderateScale(10),
    gap: moderateScale(8),
  },
  fitBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: 999,
    backgroundColor: "#F3F1EC",
  },
  fitBadgeText: { ...morphFont, fontSize: fontSize(10), fontWeight: "700", color: "#111" },
  recImg: { width: "100%", height: verticalScale(96), borderRadius: moderateScale(12) },
  recName: { ...morphFont, fontSize: fontSize(12), fontWeight: "600", color: "#111" },
  seeAllText: { ...morphFont, fontSize: fontSize(13), fontWeight: "600", color: "rgba(26,26,26,0.45)" },
  profileLink: { alignSelf: "center", paddingVertical: verticalScale(12) },
  profileLinkText: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "600",
    color: "rgba(17,17,17,0.4)",
  },
  stickyShelfWrap: {
    position: "absolute",
    left: scale(16),
    right: scale(16),
    bottom: verticalScale(20),
  },
  stickyShelfBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    borderRadius: moderateScale(16),
    backgroundColor: "#111111",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    shadowColor: "#111111",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  stickyShelfIcon: {
    width: scale(30),
    height: scale(30),
    borderRadius: moderateScale(12),
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  stickyShelfTitle: {
    ...morphFont,
    fontSize: fontSize(12.5),
    fontWeight: "700",
    color: "#FFFFFF",
  },
  stickyShelfSub: {
    ...morphFont,
    marginTop: 1,
    fontSize: fontSize(10.5),
    color: "rgba(255,255,255,0.72)",
  },
});
