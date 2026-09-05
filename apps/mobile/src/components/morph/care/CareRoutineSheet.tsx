import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
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
  MORNING_TIME_OPTIONS,
  EVENING_TIME_OPTIONS,
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
import { morphFont } from "../../../theme/morph-font";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../../utils/responsive";

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
    return {
      ...task,
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
  const [schedule, setSchedule] = useState<CareSchedulePrefs | null>(null);
  const [draftMorning, setDraftMorning] = useState<string>("07:30");
  const [draftEvening, setDraftEvening] = useState<string>("21:00");
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleReady, setScheduleReady] = useState(false);
  const knownIdsRef = useRef<number[]>([]);
  const planRef = useRef<AiCarePlan | null>(null);
  const syncingRef = useRef(false);

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
      setAiLoading(true);
      setAiAppending(false);
      setAiError(null);
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
        setAiPlan(null);
        planRef.current = null;
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
      syncingRef.current = true;
      try {
        const profile = careProfileKey(quiz, sched);
        const currentIds = sortProductIds(products.map((p) => p.id));

        if (opts?.forceFull) {
          await generateFull(products, sched);
          return;
        }

        let cached = await loadCachedCarePlan();
        let plan = planRef.current;

        if (!plan && cached && cached.profileKey === profile) {
          plan = cached.plan as AiCarePlan;
          planRef.current = plan;
          setAiPlan(plan);
          knownIdsRef.current = sortProductIds(cached.productIds);
          void syncReminders(plan, products);
        }

        if (cached && cached.profileKey !== profile) {
          cached = null;
          plan = null;
          planRef.current = null;
          setAiPlan(null);
          knownIdsRef.current = [];
        }

        if (!plan) {
          await generateFull(products, sched);
          return;
        }

        const prevIds = knownIdsRef.current.length
          ? knownIdsRef.current
          : sortProductIds(cached?.productIds ?? []);

        if (idsEqual(prevIds, currentIds)) {
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

  const confirmSchedule = useCallback(async () => {
    const prefs: CareSchedulePrefs = {
      morningTime: draftMorning,
      eveningTime: draftEvening,
    };
    await saveCareSchedule(prefs);
    setSchedule(prefs);
    setEditingSchedule(false);
    const mine = myProducts.length ? myProducts : await loadMyProducts();
    setMyProducts(mine);
    await syncPlanWithProducts(mine, { forceFull: true, prefs });
  }, [draftEvening, draftMorning, myProducts, syncPlanWithProducts]);

  const refreshLocal = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const [mine, done, sched] = await Promise.all([
        loadMyProducts(),
        loadRoutineDone(selectedDate),
        loadCareSchedule(),
      ]);
      setMyProducts(mine);
      setDoneMap(done);
      setSchedule(sched);
      if (sched) {
        setDraftMorning(sched.morningTime);
        setDraftEvening(sched.eveningTime);
        setEditingSchedule(false);
      } else {
        setEditingSchedule(true);
      }
      setScheduleReady(true);
      return mine;
    } finally {
      setLoadingProducts(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void (async () => {
      const mine = await refreshLocal();
      await syncPlanWithProducts(mine);
    })();
  }, [refreshLocal, syncPlanWithProducts]);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const mine = await refreshLocal();
        await syncPlanWithProducts(mine);
      })();
    }, [refreshLocal, syncPlanWithProducts]),
  );

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

  return (
    <ScrollView
      style={styles.sheetScroll}
      contentContainerStyle={styles.sheetContent}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.dayHero}>
        <View style={styles.dayHeroTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.dayEyebrow}>
              {t("care.routine.dayRitual", { defaultValue: "Bugungi ritual" })}
            </Text>
            <Text style={styles.dayHello}>
              {t("care.routine.helloName", {
                name: greeting,
                defaultValue: "Salom, {{name}}",
              })}
            </Text>
            <Text style={styles.daySub} numberOfLines={2}>
              {aiPlan?.summary ||
                t("care.routine.daySub", {
                  defaultValue: "Mahsulotlaringiz bilan 1 kunlik to‘liq soch parvarishi",
                })}
            </Text>
          </View>
          <Pressable style={styles.refreshBtn} onPress={() => void syncPlanWithProducts(myProducts, { forceFull: true })}>
            <Ionicons name="refresh-outline" size={16} color="#111" />
          </Pressable>
        </View>

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
            <Ionicons name="notifications" size={14} color="#111" />
            <Text style={styles.remindText}>
              {t("care.routine.remindOn", {
                defaultValue: "Vaqti kelganda eslatma yuboriladi",
              })}
            </Text>
          </View>
        ) : null}
      </View>

      {scheduleReady && (editingSchedule || !schedule) ? (
        <View style={styles.scheduleCard}>
          <Text style={styles.scheduleTitle}>
            {t("care.routine.scheduleTitle", { defaultValue: "Qulay vaqtingiz" })}
          </Text>
          <Text style={styles.scheduleSub}>
            {t("care.routine.scheduleSub", {
              defaultValue: "Ertalab va kechqurun qachon parvarish qilasiz? Shu asosida shaxsiy sxema tuziladi.",
            })}
          </Text>

          <Text style={styles.scheduleLabel}>
            {t("care.routine.slots.morning")}
          </Text>
          <View style={styles.timeRow}>
            {MORNING_TIME_OPTIONS.map((opt) => {
              const on = draftMorning === opt;
              return (
                <Pressable
                  key={opt}
                  style={[styles.timeChip, on && styles.timeChipOn]}
                  onPress={() => setDraftMorning(opt)}
                >
                  <Text style={[styles.timeChipText, on && styles.timeChipTextOn]}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.scheduleLabel}>
            {t("care.routine.slots.evening")}
          </Text>
          <View style={styles.timeRow}>
            {EVENING_TIME_OPTIONS.map((opt) => {
              const on = draftEvening === opt;
              return (
                <Pressable
                  key={opt}
                  style={[styles.timeChip, on && styles.timeChipOn]}
                  onPress={() => setDraftEvening(opt)}
                >
                  <Text style={[styles.timeChipText, on && styles.timeChipTextOn]}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.scheduleSave} onPress={() => void confirmSchedule()}>
            <Text style={styles.scheduleSaveText}>
              {t("care.routine.scheduleSave", { defaultValue: "Shu vaqtga reja tuzish" })}
            </Text>
          </Pressable>
          {schedule ? (
            <Pressable onPress={() => setEditingSchedule(false)}>
              <Text style={styles.scheduleCancel}>
                {t("common.cancel", { defaultValue: "Bekor qilish" })}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : schedule ? (
        <Pressable style={styles.scheduleSummary} onPress={() => setEditingSchedule(true)}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.scheduleSummaryTitle}>
              {t("care.routine.scheduleActive", { defaultValue: "Sizning oynangiz" })}
            </Text>
            <Text style={styles.scheduleSummaryMeta}>
              {t("care.routine.slots.morning")} {schedule.morningTime} ·{" "}
              {t("care.routine.slots.evening")} {schedule.eveningTime}
            </Text>
          </View>
          <Ionicons name="create-outline" size={18} color="#111" />
        </Pressable>
      ) : null}

      {schedule && !editingSchedule ? (
      <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeRow}>
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

      {aiLoading || aiAppending ? (
        <View style={styles.aiLoadingRow}>
          <ActivityIndicator size="small" color="#111" />
          <Text style={styles.aiLoadingText}>
            {aiAppending
              ? t("care.routine.aiPlanAppending")
              : t("care.routine.aiPlanLoading")}
          </Text>
        </View>
      ) : null}

      {aiError && !aiPlan ? (
        <Pressable
          style={styles.aiErrorRow}
          onPress={() => void syncPlanWithProducts(myProducts, { forceFull: true })}
        >
          <Text style={styles.aiErrorText}>{aiError}</Text>
          <Text style={styles.aiRetry}>{t("care.routine.aiPlanRetry")}</Text>
        </Pressable>
      ) : null}

      {myProducts.length === 0 ? (
        <Pressable style={styles.emptyProducts} onPress={onOpenScan}>
          <Ionicons name="bag-add-outline" size={28} color="#111" />
          <Text style={styles.emptyProductsTitle}>{t("care.myProducts.emptyTitle")}</Text>
          <Text style={styles.emptyProductsSub}>
            {t("care.routine.needProducts", {
              defaultValue: "Reja sizning mahsulotlaringiz bilan tuziladi — avval qo‘shing",
            })}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.stepStack}>
        {tasks.map((task, index) => {
          const done = !!doneMap[task.id];
          return (
            <View key={task.id} style={[styles.ritualCard, done && styles.ritualCardDone]}>
              <View style={styles.ritualTop}>
                <View style={styles.ritualIndex}>
                  <Text style={styles.ritualIndexText}>{index + 1}</Text>
                </View>
                {(task.time || task.timeHint) ? (
                  <View style={styles.timePill}>
                    <Ionicons name="time-outline" size={12} color="#111" />
                    <Text style={styles.timePillText}>{task.time || task.timeHint}</Text>
                  </View>
                ) : null}
                {task.slot ? (
                  <Text style={styles.slotTag}>
                    {task.slot === "morning"
                      ? t("care.routine.slots.morning")
                      : task.slot === "evening"
                        ? t("care.routine.slots.evening")
                        : t("care.routine.slots.weekly")}
                  </Text>
                ) : null}
                <View style={{ flex: 1 }} />
                <Pressable
                  style={[styles.checkBtn, done && styles.checkBtnOn]}
                  onPress={() => void toggleTask(task.id)}
                  hitSlop={8}
                >
                  {done ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
                </Pressable>
              </View>

              <View style={styles.productBlock}>
                <Pressable
                  style={styles.productImgWrap}
                  onPress={() => (task.productId ? onOpenProduct(task.productId) : undefined)}
                >
                  {task.imageUrl ? (
                    <Image source={{ uri: task.imageUrl }} style={styles.productImg} contentFit="cover" />
                  ) : (
                    <View style={[styles.productImg, styles.productPh]}>
                      <Ionicons name={TASK_ICONS[task.icon]} size={22} color="#111" />
                    </View>
                  )}
                </Pressable>

                <View style={styles.productCopy}>
                  <Text style={[styles.ritualTitle, done && styles.ritualTitleDone]} numberOfLines={2}>
                    {task.title}
                  </Text>
                  {task.productName ? (
                    <Text style={styles.productName} numberOfLines={1}>
                      {task.productName}
                      {task.brand ? ` · ${task.brand}` : ""}
                    </Text>
                  ) : null}
                  {task.durationMin ? (
                    <Text style={styles.durationLabel}>{task.durationMin} daq</Text>
                  ) : null}
                </View>

                <Pressable
                  style={styles.playBtn}
                  onPress={() => openGuideFor(task)}
                  accessibilityLabel={t("care.routine.playHow", { defaultValue: "Qanday ishlatish" })}
                >
                  <Ionicons name="play" size={18} color="#fff" />
                </Pressable>
              </View>

              <View style={styles.howBox}>
                <Text style={styles.howLabel}>
                  {t("care.routine.howToUse", { defaultValue: "Qanday ishlatish" })}
                </Text>
                <Text style={styles.howText} numberOfLines={4}>
                  {task.usageHow ||
                    task.subtitle ||
                    t("care.routine.howFallback", {
                      defaultValue: "Play tugmasini bosing — bosqichma-bosqich yo‘riqnoma ochiladi",
                    })}
                </Text>
              </View>

              <View style={styles.ritualActions}>
                <Pressable style={styles.secondaryAct} onPress={() => openGuideFor(task)}>
                  <Ionicons name="play-circle-outline" size={16} color="#111" />
                  <Text style={styles.secondaryActText}>
                    {t("care.routine.startGuide", { defaultValue: "Yo‘riqnoma" })}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryAct, done && styles.primaryActDone]}
                  onPress={() => void toggleTask(task.id)}
                >
                  <Text style={[styles.primaryActText, done && styles.primaryActTextDone]}>
                    {done
                      ? t("care.routine.stepDone", { defaultValue: "Bajarildi" })
                      : t("care.routine.stepTodo", { defaultValue: "Bajarildi deb belgilash" })}
                  </Text>
                </Pressable>
              </View>
            </View>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRow}>
          {myProducts.map((p) => {
            const img = productImageUri(p.image_url);
            return (
            <Pressable key={p.id} style={styles.myCard} onPress={() => onOpenProduct(p.id)}>
              {img ? (
                <Image source={{ uri: img }} style={styles.myCardImg} contentFit="cover" />
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
          <Pressable style={styles.addCard} onPress={onOpenCatalog}>
            <Ionicons name="add" size={22} color="#111" />
            <Text style={styles.addCardText}>{t("care.myProducts.addShort")}</Text>
          </Pressable>
        </ScrollView>
      )}
      </>
      ) : null}

      <Pressable style={styles.profileLink} onPress={onRetakeQuiz}>
        <Text style={styles.profileLinkText}>
          {t("care.quiz.retake")} · {t("care.onboarding.badge")}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheetScroll: { flex: 1, backgroundColor: "#EFEDE8" },
  sheetContent: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(110),
    gap: moderateScale(14),
  },
  dayHero: {
    borderRadius: moderateScale(28),
    backgroundColor: "#FFFFFF",
    padding: moderateScale(18),
    gap: moderateScale(12),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.06)",
  },
  dayHeroTop: { flexDirection: "row", gap: moderateScale(10), alignItems: "flex-start" },
  dayEyebrow: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "rgba(17,17,17,0.4)",
  },
  dayHello: {
    ...morphFont,
    marginTop: verticalScale(4),
    fontSize: fontSize(24),
    fontWeight: "700",
    color: "#111",
    letterSpacing: -0.5,
  },
  daySub: {
    ...morphFont,
    marginTop: verticalScale(4),
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: "rgba(17,17,17,0.55)",
  },
  refreshBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(14),
    backgroundColor: "#F3F1EC",
    alignItems: "center",
    justifyContent: "center",
  },
  progressWrap: { gap: moderateScale(6) },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E8E4DC",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#111",
  },
  progressText: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "600",
    color: "rgba(17,17,17,0.45)",
  },
  remindBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(6),
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(10),
    borderRadius: moderateScale(12),
    backgroundColor: "#F3F1EC",
  },
  remindText: {
    ...morphFont,
    flex: 1,
    fontSize: fontSize(12),
    fontWeight: "600",
    color: "#111",
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
  modeRow: { gap: moderateScale(8), paddingRight: scale(4) },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(6),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.08)",
  },
  modeChipOn: { backgroundColor: "#111", borderColor: "#111" },
  modeChipText: { ...morphFont, fontSize: fontSize(12), fontWeight: "700", color: "#111" },
  modeChipTextOn: { color: "#fff" },
  aiLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    paddingHorizontal: scale(4),
  },
  aiLoadingText: { ...morphFont, fontSize: fontSize(12), color: "rgba(17,17,17,0.5)" },
  aiErrorRow: {
    padding: moderateScale(12),
    borderRadius: moderateScale(14),
    backgroundColor: "#FEF2F2",
    gap: moderateScale(4),
  },
  aiErrorText: { ...morphFont, fontSize: fontSize(12), color: "#991B1B" },
  aiRetry: { ...morphFont, fontSize: fontSize(12), fontWeight: "700", color: "#111" },
  emptyProducts: {
    borderRadius: moderateScale(22),
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.12)",
    borderStyle: "dashed",
    padding: moderateScale(20),
    alignItems: "center",
    gap: moderateScale(6),
    backgroundColor: "#FFFFFF",
  },
  emptyProductsTitle: { ...morphFont, fontSize: fontSize(14), fontWeight: "700", color: "#111" },
  emptyProductsSub: {
    ...morphFont,
    fontSize: fontSize(12),
    color: "rgba(26,26,26,0.5)",
    textAlign: "center",
    lineHeight: fontSize(16),
  },
  stepStack: { gap: moderateScale(12) },
  ritualCard: {
    borderRadius: moderateScale(26),
    backgroundColor: "#FFFFFF",
    padding: moderateScale(14),
    gap: moderateScale(12),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.06)",
  },
  ritualCardDone: { opacity: 0.78, backgroundColor: "#F7F5F1" },
  ritualTop: { flexDirection: "row", alignItems: "center", gap: moderateScale(8) },
  ritualIndex: {
    width: scale(26),
    height: scale(26),
    borderRadius: moderateScale(10),
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  ritualIndexText: { ...morphFont, fontSize: fontSize(12), fontWeight: "700", color: "#fff" },
  timePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: 999,
    backgroundColor: "#F3F1EC",
  },
  timePillText: { ...morphFont, fontSize: fontSize(11), fontWeight: "700", color: "#111" },
  slotTag: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "700",
    color: "rgba(17,17,17,0.4)",
    textTransform: "uppercase",
  },
  checkBtn: {
    width: scale(30),
    height: scale(30),
    borderRadius: moderateScale(15),
    borderWidth: 1.5,
    borderColor: "rgba(17,17,17,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkBtnOn: { backgroundColor: "#111", borderColor: "#111" },
  productBlock: { flexDirection: "row", alignItems: "center", gap: moderateScale(12) },
  productImgWrap: {
    width: scale(88),
    height: scale(88),
    borderRadius: moderateScale(20),
    overflow: "hidden",
    backgroundColor: "#F3F1EC",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.06)",
  },
  productImg: { width: "100%", height: "100%" },
  productPh: { alignItems: "center", justifyContent: "center", backgroundColor: "#F3F1EC" },
  productCopy: { flex: 1, minWidth: 0, gap: 2 },
  ritualTitle: { ...morphFont, fontSize: fontSize(16), fontWeight: "700", color: "#111" },
  ritualTitleDone: { textDecorationLine: "line-through", color: "rgba(17,17,17,0.4)" },
  productName: { ...morphFont, fontSize: fontSize(13), fontWeight: "600", color: "rgba(17,17,17,0.65)" },
  durationLabel: { ...morphFont, fontSize: fontSize(11), color: "rgba(17,17,17,0.4)", marginTop: 2 },
  playBtn: {
    width: scale(48),
    height: scale(48),
    borderRadius: moderateScale(24),
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  howBox: {
    borderRadius: moderateScale(16),
    backgroundColor: "#F7F5F1",
    padding: moderateScale(12),
    gap: moderateScale(4),
  },
  howLabel: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "700",
    color: "rgba(17,17,17,0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  howText: {
    ...morphFont,
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: "#111",
  },
  ritualActions: { flexDirection: "row", gap: moderateScale(8) },
  secondaryAct: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(6),
    paddingVertical: verticalScale(12),
    borderRadius: 999,
    backgroundColor: "#F3F1EC",
  },
  secondaryActText: { ...morphFont, fontSize: fontSize(12), fontWeight: "700", color: "#111" },
  primaryAct: {
    flex: 1.2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(12),
    borderRadius: 999,
    backgroundColor: "#111",
  },
  primaryActDone: { backgroundColor: "#D8D4CB" },
  primaryActText: { ...morphFont, fontSize: fontSize(12), fontWeight: "700", color: "#fff" },
  primaryActTextDone: { color: "#111" },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: verticalScale(4),
  },
  sectionTitle: { ...morphFont, fontSize: fontSize(16), fontWeight: "700", color: "#111" },
  scanLink: { flexDirection: "row", alignItems: "center", gap: moderateScale(4) },
  scanLinkText: { ...morphFont, fontSize: fontSize(13), fontWeight: "600", color: "#111" },
  productRow: { gap: moderateScale(10), paddingRight: scale(4) },
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
    width: scale(96),
    borderRadius: moderateScale(18),
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(17,17,17,0.15)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: moderateScale(10),
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
});
