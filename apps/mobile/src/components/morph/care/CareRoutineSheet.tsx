import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
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
import {
  buildDailyRoutine,
  careProfileKey,
  estimateProductFit,
  loadCachedCarePlan,
  saveCachedCarePlan,
  sortProductIds,
  stripPlanProducts,
  type CareQuizAnswers,
  type RoutineSlot,
  type RoutineTask,
} from "../../../lib/morph-ai-care";
import {
  loadMyProducts,
  loadRoutineDone,
  setRoutineTaskDone,
  type MyCareProduct,
} from "../../../lib/morph-my-products";
import { morphFont } from "../../../theme/morph-font";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../../utils/responsive";

type Props = {
  quiz: CareQuizAnswers;
  catalog: CareProduct[];
  selectedDate: string;
  onOpenCatalog: () => void;
  onOpenScan: () => void;
  onOpenProduct: (id: number) => void;
  onRetakeQuiz: () => void;
};

const SLOTS: RoutineSlot[] = ["morning", "evening", "weekly"];

const SLOT_ICONS: Record<RoutineSlot, keyof typeof Ionicons.glyphMap> = {
  morning: "sunny-outline",
  evening: "moon-outline",
  weekly: "calendar-outline",
};

const TASK_ICONS: Record<RoutineTask["icon"], keyof typeof Ionicons.glyphMap> = {
  water: "water-outline",
  flask: "flask-outline",
  sparkles: "sparkles-outline",
  shield: "shield-checkmark-outline",
  leaf: "leaf-outline",
  cut: "cut-outline",
};

const WEEK_ORDER = ["Du", "Se", "Chor", "Pay", "Ju", "Shan", "Ya"] as const;

function mapAiTasks(
  plan: AiCarePlan | null,
  slot: RoutineSlot,
  products: MyCareProduct[],
): RoutineTask[] | null {
  if (!plan) return null;
  const rows = plan[slot];
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const byId = new Map(products.map((p) => [p.id, p]));
  const byCat = new Map<string, MyCareProduct>();
  for (const p of products) {
    const cat = (p.category || "").toLowerCase();
    if (cat && !byCat.has(cat)) byCat.set(cat, p);
  }

  const GENERIC = /^(shampun|konditsioner|balsam|maska|yog'|yog|spray|sprey|serum)/i;

  return rows.map((t) => {
    const icon = (TASK_ICONS[t.icon as RoutineTask["icon"]]
      ? t.icon
      : "sparkles") as RoutineTask["icon"];

    let productId = t.product_id ?? undefined;
    let productName = t.product_name || undefined;

    if (productId && byId.has(productId)) {
      productName = byId.get(productId)!.name;
    } else if ((!productId || !productName || GENERIC.test(productName)) && products.length) {
      const hint =
        /shamp/i.test(t.title + (productName || ""))
          ? "shampoo"
          : /kondits|balsam/i.test(t.title + (productName || ""))
            ? "balsam"
            : /mask/i.test(t.title + (productName || ""))
              ? "mask"
              : /yog|oil/i.test(t.title + (productName || ""))
                ? "oil"
                : /sprey|spray|himoya/i.test(t.title + (productName || ""))
                  ? "spray"
                  : null;
      const hit = hint ? byCat.get(hint) : undefined;
      if (hit) {
        productId = hit.id;
        productName = hit.name;
      }
    }

    const clock = (t.time || "").trim();
    const timeHint = t.time_hint || clock || undefined;

    return {
      id: t.id,
      title: t.title,
      subtitle: t.subtitle || productName || "",
      icon,
      productId,
      productName,
      time: clock || undefined,
      timeHint,
      durationMin: typeof t.duration_min === "number" ? t.duration_min : undefined,
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

export function CareRoutineSheet({
  quiz,
  catalog,
  selectedDate,
  onOpenCatalog,
  onOpenScan,
  onOpenProduct,
  onRetakeQuiz,
}: Props) {
  const { t } = useTranslation();
  const [slot, setSlot] = useState<RoutineSlot>("morning");
  const [weekDayIdx, setWeekDayIdx] = useState(0);
  const [myProducts, setMyProducts] = useState<MyCareProduct[]>([]);
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [aiPlan, setAiPlan] = useState<AiCarePlan | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAppending, setAiAppending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const knownIdsRef = useRef<number[]>([]);
  const planRef = useRef<AiCarePlan | null>(null);
  const syncingRef = useRef(false);

  const fallbackTasks = useMemo(
    () => buildDailyRoutine(quiz, slot, myProducts),
    [quiz, slot, myProducts],
  );
  const aiTasks = useMemo(
    () => mapAiTasks(aiPlan, slot, myProducts),
    [aiPlan, slot, myProducts],
  );
  const tasks = aiTasks ?? fallbackTasks;

  const doneCount = useMemo(
    () => tasks.filter((task) => doneMap[task.id]).length,
    [tasks, doneMap],
  );

  const recommended = useMemo(() => {
    return [...catalog]
      .map((p) => ({ product: p, fit: estimateProductFit(p, quiz) }))
      .sort((a, b) => b.fit - a.fit)
      .slice(0, 8);
  }, [catalog, quiz]);

  const weekRows = useMemo(() => {
    const schedule = aiPlan?.weekly_schedule ?? [];
    return WEEK_ORDER.map((day) => {
      const match = schedule.find((r) => {
        const d = (r.day || "").toLowerCase();
        const key = day.toLowerCase();
        return d === key || d.startsWith(key.slice(0, 2)) || key.startsWith(d.slice(0, 2));
      });
      return {
        day,
        task: match?.task ?? "",
        time: match?.time ?? "",
        productName: match?.product_name ?? "",
        productId: match?.product_id ?? null,
      };
    });
  }, [aiPlan?.weekly_schedule]);

  const selectedWeek = weekRows[weekDayIdx] ?? weekRows[0];

  const persistPlan = useCallback(
    async (plan: AiCarePlan, products: MyCareProduct[]) => {
      planRef.current = plan;
      setAiPlan(plan);
      const ids = sortProductIds(products.map((p) => p.id));
      knownIdsRef.current = ids;
      await saveCachedCarePlan({
        plan,
        productIds: ids,
        profileKey: careProfileKey(quiz),
        updatedAt: new Date().toISOString(),
      });
    },
    [quiz],
  );

  const generateFull = useCallback(
    async (products: MyCareProduct[]) => {
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
    [persistPlan, quiz.colorStatus, quiz.condition, quiz.texture, t],
  );

  const appendForProducts = useCallback(
    async (allProducts: MyCareProduct[], newOnes: MyCareProduct[], existing: AiCarePlan) => {
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
        });
        await persistPlan(plan, allProducts);
      } catch (e) {
        // Keep old plan; surface soft error
        setAiError(e instanceof Error ? e.message : t("care.routine.aiPlanError"));
        knownIdsRef.current = sortProductIds(allProducts.map((p) => p.id));
      } finally {
        setAiAppending(false);
      }
    },
    [persistPlan, quiz.colorStatus, quiz.condition, quiz.texture, t],
  );

  const syncPlanWithProducts = useCallback(
    async (products: MyCareProduct[], opts?: { forceFull?: boolean }) => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      try {
        const profile = careProfileKey(quiz);
        const currentIds = sortProductIds(products.map((p) => p.id));

        if (opts?.forceFull) {
          await generateFull(products);
          return;
        }

        let cached = await loadCachedCarePlan();
        let plan = planRef.current;

        if (!plan && cached && cached.profileKey === profile) {
          plan = cached.plan as AiCarePlan;
          planRef.current = plan;
          setAiPlan(plan);
          knownIdsRef.current = sortProductIds(cached.productIds);
        }

        if (cached && cached.profileKey !== profile) {
          cached = null;
          plan = null;
          planRef.current = null;
          setAiPlan(null);
          knownIdsRef.current = [];
        }

        if (!plan) {
          await generateFull(products);
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
    [appendForProducts, generateFull, persistPlan, quiz],
  );

  const refreshLocal = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const [mine, done] = await Promise.all([
        loadMyProducts(),
        loadRoutineDone(selectedDate),
      ]);
      setMyProducts(mine);
      setDoneMap(done);
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

  const onRefreshPlan = () => {
    void syncPlanWithProducts(myProducts, { forceFull: true });
  };

  return (
    <ScrollView
      style={styles.sheetScroll}
      contentContainerStyle={styles.sheetContent}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={["#1A1A1C", "#2C2C30"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={12} color="#F5F5F5" />
            <Text style={styles.heroBadgeText}>{t("care.routine.aiPlanBadge")}</Text>
          </View>
          <Pressable style={styles.refreshBtn} onPress={onRefreshPlan} hitSlop={8}>
            <Ionicons name="refresh-outline" size={15} color="#F5F5F5" />
            <Text style={styles.refreshText}>{t("care.quiz.retake")}</Text>
          </Pressable>
        </View>

        <Text style={styles.heroTitle}>{t("care.routine.title")}</Text>
        <Text style={styles.heroSub}>
          {aiPlan?.summary || t("care.hubParvarishSub")}
        </Text>

        <View style={styles.chipRow}>
          <View style={styles.chipDark}>
            <Text style={styles.chipDarkText}>{t(`care.conditions.${quiz.condition}`)}</Text>
          </View>
          <View style={styles.chipDark}>
            <Text style={styles.chipDarkText}>{t(`care.textures.${quiz.texture}`)}</Text>
          </View>
          <View style={styles.chipDark}>
            <Text style={styles.chipDarkText}>{t(`care.colors.${quiz.colorStatus}`)}</Text>
          </View>
        </View>

        <View style={styles.heroMeta}>
          <Text style={styles.heroMetaText}>
            {myProducts.length > 0
              ? t("care.routine.aiPlanProducts", {
                  count: myProducts.length,
                  defaultValue: "{{count}} ta mahsulotingiz asosida",
                })
              : t("care.routine.aiPlanNoProducts", {
                  defaultValue: "Mahsulot qo‘shing — reja aniqroq bo‘ladi",
                })}
          </Text>
          {tasks.length > 0 ? (
            <Text style={styles.heroMetaText}>
              {doneCount}/{tasks.length}
            </Text>
          ) : null}
        </View>

        {myProducts.length > 0 ? (
          <View style={styles.heroProducts}>
            {myProducts.slice(0, 5).map((p, idx) => (
              <Pressable
                key={p.id}
                onPress={() => onOpenProduct(p.id)}
                style={[styles.heroProductAvatar, { marginLeft: idx === 0 ? 0 : -scale(8) }]}
              >
                {p.image_url ? (
                  <Image source={{ uri: p.image_url }} style={styles.heroProductImg} contentFit="cover" />
                ) : (
                  <View style={[styles.heroProductImg, styles.heroProductPh]}>
                    <Ionicons name="flask-outline" size={14} color="#111" />
                  </View>
                )}
              </Pressable>
            ))}
            {myProducts.length > 5 ? (
              <View style={[styles.heroProductAvatar, styles.heroProductMore, { marginLeft: -scale(8) }]}>
                <Text style={styles.heroProductMoreText}>+{myProducts.length - 5}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </LinearGradient>

      {aiLoading || aiAppending ? (
        <View style={styles.aiLoadingRow}>
          <ActivityIndicator size="small" color="#111111" />
          <Text style={styles.aiLoadingText}>
            {aiAppending
              ? t("care.routine.aiPlanAppending")
              : t("care.routine.aiPlanLoading")}
          </Text>
        </View>
      ) : null}

      {aiError && !aiPlan ? (
        <Pressable style={styles.aiErrorRow} onPress={onRefreshPlan}>
          <Text style={styles.aiErrorText}>{aiError}</Text>
          <Text style={styles.aiRetry}>{t("care.routine.aiPlanRetry")}</Text>
        </Pressable>
      ) : null}

      <View style={styles.slotRow}>
        {SLOTS.map((s) => {
          const on = slot === s;
          return (
            <Pressable
              key={s}
              style={[styles.slotCard, on && styles.slotCardOn]}
              onPress={() => setSlot(s)}
            >
              <View style={[styles.slotIconWrap, on && styles.slotIconWrapOn]}>
                <Ionicons
                  name={SLOT_ICONS[s]}
                  size={16}
                  color={on ? "#FFFFFF" : "rgba(17,17,17,0.55)"}
                />
              </View>
              <Text style={[styles.slotLabel, on && styles.slotLabelOn]}>
                {t(`care.routine.slots.${s}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.timeline}>
        {tasks.map((task, index) => {
          const done = !!doneMap[task.id];
          const isLast = index === tasks.length - 1;
          return (
            <View key={task.id} style={styles.timelineItem}>
              <View style={styles.timelineRail}>
                <Pressable
                  style={[styles.stepNum, done && styles.stepNumDone]}
                  onPress={() => void toggleTask(task.id)}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : (
                    <Text style={styles.stepNumText}>{index + 1}</Text>
                  )}
                </Pressable>
                {!isLast ? <View style={[styles.timelineLine, done && styles.timelineLineDone]} /> : null}
              </View>

              <Pressable
                style={[styles.stepCard, done && styles.stepCardDone]}
                onPress={() => {
                  if (task.productId) onOpenProduct(task.productId);
                  else void toggleTask(task.id);
                }}
                onLongPress={() => void toggleTask(task.id)}
              >
                <View style={styles.stepHead}>
                  <View style={[styles.stepIcon, done && styles.stepIconDone]}>
                    <Ionicons
                      name={TASK_ICONS[task.icon]}
                      size={18}
                      color={done ? "#FFFFFF" : "#111111"}
                    />
                  </View>
                  <View style={styles.stepBody}>
                    <Text style={[styles.stepTitle, done && styles.stepTitleDone]}>
                      {task.title}
                    </Text>
                    <View style={styles.stepMetaRow}>
                      {task.time || task.timeHint ? (
                        <View style={styles.timeBadge}>
                          <Ionicons name="time-outline" size={11} color="#111" />
                          <Text style={styles.timeBadgeText}>
                            {task.time || task.timeHint}
                          </Text>
                        </View>
                      ) : null}
                      {task.durationMin ? (
                        <Text style={styles.durationText}>{task.durationMin} daq</Text>
                      ) : null}
                    </View>
                  </View>
                </View>
                {task.subtitle ? (
                  <Text style={styles.stepSub} numberOfLines={3}>
                    {task.subtitle}
                  </Text>
                ) : null}
                {task.productName ? (
                  <View style={styles.productPill}>
                    <Ionicons name="flask-outline" size={12} color="#111" />
                    <Text style={styles.productPillText} numberOfLines={1}>
                      {task.productName}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={styles.weekCard}>
        <View style={styles.weekHead}>
          <Text style={styles.sectionTitle}>{t("care.weeklyTitle")}</Text>
          <Text style={styles.weekHint}>{t("care.routine.weekHint")}</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekDays}
        >
          {weekRows.map((row, idx) => {
            const on = idx === weekDayIdx;
            return (
              <Pressable
                key={row.day}
                style={[styles.weekDayChip, on && styles.weekDayChipOn]}
                onPress={() => setWeekDayIdx(idx)}
              >
                <Text style={[styles.weekDayLabel, on && styles.weekDayLabelOn]}>{row.day}</Text>
                <View style={[styles.weekDot, row.task ? styles.weekDotOn : null, on && styles.weekDotActive]} />
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.weekTaskCard}>
          <View style={styles.weekTaskTop}>
            <Text style={styles.weekTaskDay}>{selectedWeek?.day}</Text>
            {selectedWeek?.time ? (
              <View style={styles.timeBadge}>
                <Ionicons name="time-outline" size={11} color="#111" />
                <Text style={styles.timeBadgeText}>{selectedWeek.time}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.weekTaskText}>
            {selectedWeek?.task || t("care.routine.noWeekTask")}
          </Text>
          {selectedWeek?.productName ? (
            <Pressable
              style={styles.productPill}
              onPress={() => {
                if (selectedWeek.productId) onOpenProduct(Number(selectedWeek.productId));
              }}
            >
              <Ionicons name="flask-outline" size={12} color="#111" />
              <Text style={styles.productPillText} numberOfLines={1}>
                {selectedWeek.productName}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{t("care.myProducts.title")}</Text>
        <Pressable style={styles.scanLink} onPress={onOpenScan}>
          <Ionicons name="scan-outline" size={16} color="#111111" />
          <Text style={styles.scanLinkText}>{t("care.myProducts.scan")}</Text>
        </Pressable>
      </View>

      {loadingProducts ? (
        <ActivityIndicator color="#111111" style={{ marginVertical: 12 }} />
      ) : myProducts.length === 0 ? (
        <Pressable style={styles.emptyProducts} onPress={onOpenScan}>
          <Ionicons name="add-circle-outline" size={28} color="#111111" />
          <Text style={styles.emptyProductsTitle}>{t("care.myProducts.emptyTitle")}</Text>
          <Text style={styles.emptyProductsSub}>{t("care.myProducts.emptySub")}</Text>
        </Pressable>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRow}>
          {myProducts.map((p) => (
            <Pressable key={p.id} style={styles.myCard} onPress={() => onOpenProduct(p.id)}>
              {p.image_url ? (
                <Image source={{ uri: p.image_url }} style={styles.myCardImg} contentFit="cover" />
              ) : (
                <View style={[styles.myCardImg, styles.myCardPh]}>
                  <Ionicons name="flask-outline" size={20} color="#111111" />
                </View>
              )}
              <Text style={styles.myCardName} numberOfLines={2}>
                {p.name}
              </Text>
              {p.brand ? (
                <Text style={styles.myCardBrand} numberOfLines={1}>
                  {p.brand}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={[styles.sectionHead, { marginTop: 8 }]}>
        <Text style={styles.sectionTitle}>{t("care.routine.buyTitle")}</Text>
        <Pressable onPress={onOpenCatalog}>
          <Text style={styles.seeAllText}>{t("common.viewAll")}</Text>
        </Pressable>
      </View>

      {recommended.length === 0 ? (
        <Text style={styles.emptyHint}>{t("care.catalog.empty")}</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRow}>
          {recommended.map(({ product, fit }) => (
            <Pressable
              key={product.id}
              style={styles.recCard}
              onPress={() => onOpenProduct(product.id)}
            >
              <View style={styles.fitBadge}>
                <Text style={styles.fitBadgeText}>{t("care.routine.fitYou", { pct: fit })}</Text>
              </View>
              {product.image_url ? (
                <Image source={{ uri: product.image_url }} style={styles.recImg} contentFit="cover" />
              ) : (
                <View style={[styles.recImg, styles.myCardPh]}>
                  <Ionicons name="flask-outline" size={24} color="#111111" />
                </View>
              )}
              <Text style={styles.recName} numberOfLines={2}>
                {product.name}
              </Text>
              {product.brand ? (
                <Text style={styles.recBrand} numberOfLines={1}>
                  {product.brand}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Pressable style={styles.profileLink} onPress={onRetakeQuiz}>
        <Text style={styles.profileLinkText}>
          {t("care.quiz.retake")} · {t("care.onboarding.badge")}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheetScroll: { flex: 1, backgroundColor: "#F4F4F6" },
  sheetContent: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(110),
    gap: moderateScale(14),
  },
  hero: {
    borderRadius: moderateScale(28),
    padding: moderateScale(18),
    gap: moderateScale(10),
    overflow: "hidden",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(5),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroBadgeText: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "700",
    color: "#F5F5F5",
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  refreshText: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "600",
    color: "#F5F5F5",
  },
  heroTitle: {
    ...morphFont,
    fontSize: fontSize(24),
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroSub: {
    ...morphFont,
    fontSize: fontSize(13),
    lineHeight: fontSize(19),
    color: "rgba(255,255,255,0.72)",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: moderateScale(6),
    marginTop: verticalScale(2),
  },
  chipDark: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  chipDarkText: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "600",
    color: "#FFFFFF",
  },
  heroMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: verticalScale(4),
  },
  heroMetaText: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "600",
    color: "rgba(255,255,255,0.55)",
  },
  heroProducts: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(4),
  },
  heroProductAvatar: {
    width: scale(32),
    height: scale(32),
    borderRadius: moderateScale(16),
    borderWidth: 2,
    borderColor: "#2C2C30",
    overflow: "hidden",
    backgroundColor: "#EEE",
  },
  heroProductImg: { width: "100%", height: "100%" },
  heroProductPh: { alignItems: "center", justifyContent: "center" },
  heroProductMore: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
  },
  heroProductMoreText: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "700",
    color: "#fff",
  },
  aiLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    paddingVertical: verticalScale(6),
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
  aiRetry: { ...morphFont, fontSize: fontSize(12), fontWeight: "700", color: "#111111" },
  slotRow: {
    flexDirection: "row",
    gap: moderateScale(8),
  },
  slotCard: {
    flex: 1,
    alignItems: "center",
    gap: moderateScale(6),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(18),
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.06)",
  },
  slotCardOn: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },
  slotIconWrap: {
    width: scale(32),
    height: scale(32),
    borderRadius: moderateScale(12),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F0F2",
  },
  slotIconWrapOn: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  slotLabel: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "700",
    color: "rgba(17,17,17,0.55)",
  },
  slotLabelOn: { color: "#FFFFFF" },
  timeline: { gap: 0 },
  timelineItem: {
    flexDirection: "row",
    gap: moderateScale(12),
    minHeight: verticalScale(88),
  },
  timelineRail: {
    width: scale(28),
    alignItems: "center",
  },
  stepNum: {
    width: scale(28),
    height: scale(28),
    borderRadius: moderateScale(14),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(17,17,17,0.12)",
    zIndex: 1,
  },
  stepNumDone: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },
  stepNumText: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "700",
    color: "#111",
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: "rgba(17,17,17,0.1)",
    marginVertical: verticalScale(2),
  },
  timelineLineDone: {
    backgroundColor: "rgba(17,17,17,0.35)",
  },
  stepCard: {
    flex: 1,
    marginBottom: verticalScale(10),
    padding: moderateScale(14),
    borderRadius: moderateScale(20),
    backgroundColor: "#FFFFFF",
    gap: moderateScale(8),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.06)",
  },
  stepCardDone: {
    backgroundColor: "#F7F7F8",
    opacity: 0.92,
  },
  stepHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
  },
  stepIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(14),
    backgroundColor: "#F0F0F2",
    alignItems: "center",
    justifyContent: "center",
  },
  stepIconDone: {
    backgroundColor: "#111111",
  },
  stepBody: { flex: 1, minWidth: 0, gap: 2 },
  stepTitle: {
    ...morphFont,
    fontSize: fontSize(15),
    fontWeight: "700",
    color: "#111111",
  },
  stepTitleDone: {
    color: "rgba(17,17,17,0.4)",
    textDecorationLine: "line-through",
  },
  stepMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    marginTop: verticalScale(2),
    flexWrap: "wrap",
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: 999,
    backgroundColor: "#F0F0F2",
  },
  timeBadgeText: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "700",
    color: "#111",
  },
  durationText: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "600",
    color: "rgba(17,17,17,0.4)",
  },
  stepSub: {
    ...morphFont,
    fontSize: fontSize(12),
    lineHeight: fontSize(17),
    color: "rgba(17,17,17,0.5)",
  },
  productPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(5),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: 999,
    backgroundColor: "#F0F0F2",
  },
  productPillText: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "600",
    color: "#111",
    maxWidth: scale(200),
  },
  weekCard: {
    borderRadius: moderateScale(24),
    backgroundColor: "#FFFFFF",
    padding: moderateScale(16),
    gap: moderateScale(12),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.06)",
  },
  weekHead: { gap: moderateScale(4) },
  weekHint: {
    ...morphFont,
    fontSize: fontSize(12),
    color: "rgba(17,17,17,0.45)",
  },
  weekDays: {
    gap: moderateScale(8),
    paddingRight: scale(4),
  },
  weekDayChip: {
    width: scale(48),
    alignItems: "center",
    gap: moderateScale(6),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(16),
    backgroundColor: "#F4F4F6",
  },
  weekDayChipOn: {
    backgroundColor: "#111111",
  },
  weekDayLabel: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "700",
    color: "#111",
  },
  weekDayLabelOn: { color: "#fff" },
  weekDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "transparent",
  },
  weekDotOn: {
    backgroundColor: "rgba(17,17,17,0.25)",
  },
  weekDotActive: {
    backgroundColor: "#fff",
  },
  weekTaskCard: {
    borderRadius: moderateScale(16),
    backgroundColor: "#F7F7F8",
    padding: moderateScale(14),
    gap: moderateScale(8),
  },
  weekTaskTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: moderateScale(8),
  },
  weekTaskDay: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "700",
    color: "rgba(17,17,17,0.45)",
  },
  weekTaskText: {
    ...morphFont,
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    fontWeight: "600",
    color: "#111",
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: verticalScale(4),
  },
  sectionTitle: { ...morphFont, fontSize: fontSize(16), fontWeight: "700", color: "#111" },
  scanLink: { flexDirection: "row", alignItems: "center", gap: moderateScale(4) },
  scanLinkText: { ...morphFont, fontSize: fontSize(13), fontWeight: "600", color: "#111111" },
  emptyProducts: {
    borderRadius: moderateScale(20),
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.12)",
    borderStyle: "dashed",
    padding: moderateScale(20),
    alignItems: "center",
    gap: moderateScale(6),
    backgroundColor: "#FFFFFF",
  },
  emptyProductsTitle: { ...morphFont, fontSize: fontSize(14), fontWeight: "600", color: "#111" },
  emptyProductsSub: {
    ...morphFont,
    fontSize: fontSize(12),
    color: "rgba(26,26,26,0.45)",
    textAlign: "center",
    lineHeight: fontSize(16),
  },
  productRow: { gap: moderateScale(12), paddingRight: scale(4) },
  myCard: {
    width: scale(120),
    borderRadius: moderateScale(18),
    backgroundColor: "#FFFFFF",
    padding: moderateScale(10),
    gap: moderateScale(6),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.04)",
  },
  myCardImg: { width: "100%", height: verticalScale(88), borderRadius: moderateScale(12) },
  myCardPh: { alignItems: "center", justifyContent: "center", backgroundColor: "#F0F0F0" },
  myCardName: { ...morphFont, fontSize: fontSize(12), fontWeight: "600", color: "#111" },
  myCardBrand: { ...morphFont, fontSize: fontSize(10), color: "rgba(26,26,26,0.45)" },
  recCard: {
    width: scale(160),
    borderRadius: moderateScale(20),
    backgroundColor: "#FFFFFF",
    padding: moderateScale(12),
    gap: moderateScale(8),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.04)",
  },
  fitBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: 999,
    backgroundColor: "#F0F0F0",
  },
  fitBadgeText: { ...morphFont, fontSize: fontSize(10), fontWeight: "700", color: "#111111" },
  recImg: { width: "100%", height: verticalScale(110), borderRadius: moderateScale(14) },
  recName: { ...morphFont, fontSize: fontSize(13), fontWeight: "600", color: "#111" },
  recBrand: { ...morphFont, fontSize: fontSize(11), color: "rgba(26,26,26,0.45)" },
  emptyHint: { ...morphFont, fontSize: fontSize(13), color: "rgba(26,26,26,0.45)" },
  seeAllText: { ...morphFont, fontSize: fontSize(13), fontWeight: "600", color: "rgba(26,26,26,0.45)" },
  profileLink: {
    alignSelf: "center",
    paddingVertical: verticalScale(12),
  },
  profileLinkText: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "600",
    color: "rgba(17,17,17,0.4)",
  },
});
