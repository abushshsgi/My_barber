import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  estimateProductFit,
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
  onOpenAssistant: () => void;
  onRetakeQuiz: () => void;
};

const SLOTS: RoutineSlot[] = ["morning", "evening", "weekly"];

const SLOT_ICONS: Record<RoutineSlot, keyof typeof Ionicons.glyphMap> = {
  morning: "sunny-outline",
  evening: "moon-outline",
  weekly: "flash-outline",
};

const TASK_ICONS: Record<RoutineTask["icon"], keyof typeof Ionicons.glyphMap> = {
  water: "water-outline",
  flask: "flask-outline",
  sparkles: "sparkles-outline",
  shield: "shield-checkmark-outline",
  leaf: "leaf-outline",
  cut: "cut-outline",
};

function mapAiTasks(
  plan: AiCarePlan | null,
  slot: RoutineSlot,
): RoutineTask[] | null {
  if (!plan) return null;
  const rows = plan[slot];
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows.map((t) => {
    const icon = (TASK_ICONS[t.icon as RoutineTask["icon"]]
      ? t.icon
      : "sparkles") as RoutineTask["icon"];
    return {
      id: t.id,
      title: t.title,
      subtitle: t.subtitle || t.product_name || "",
      icon,
      productId: t.product_id ?? undefined,
      productName: t.product_name || undefined,
      timeHint: t.time_hint || undefined,
    };
  });
}

export function CareRoutineSheet({
  quiz,
  catalog,
  selectedDate,
  onOpenCatalog,
  onOpenScan,
  onOpenProduct,
  onOpenAssistant,
  onRetakeQuiz,
}: Props) {
  const { t } = useTranslation();
  const [slot, setSlot] = useState<RoutineSlot>("morning");
  const [myProducts, setMyProducts] = useState<MyCareProduct[]>([]);
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [aiPlan, setAiPlan] = useState<AiCarePlan | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const fallbackTasks = useMemo(
    () => buildDailyRoutine(quiz, slot, myProducts),
    [quiz, slot, myProducts],
  );
  const aiTasks = useMemo(() => mapAiTasks(aiPlan, slot), [aiPlan, slot]);
  const tasks = aiTasks ?? fallbackTasks;

  const recommended = useMemo(() => {
    return [...catalog]
      .map((p) => ({ product: p, fit: estimateProductFit(p, quiz) }))
      .sort((a, b) => b.fit - a.fit)
      .slice(0, 8);
  }, [catalog, quiz]);

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

  const loadAiPlan = useCallback(
    async (products: MyCareProduct[]) => {
      setAiLoading(true);
      setAiError(null);
      try {
        const plan = await generateCarePlan({
          condition: quiz.condition,
          texture: quiz.texture,
          color_status: quiz.colorStatus,
          products: products.map((p) => ({
            id: p.id,
            name: p.name,
            brand: p.brand,
            category: p.category,
          })),
        });
        setAiPlan(plan);
      } catch (e) {
        setAiPlan(null);
        setAiError(e instanceof Error ? e.message : t("care.routine.aiPlanError"));
      } finally {
        setAiLoading(false);
      }
    },
    [quiz.colorStatus, quiz.condition, quiz.texture, t],
  );

  useEffect(() => {
    void (async () => {
      const mine = await refreshLocal();
      await loadAiPlan(mine);
    })();
  }, [refreshLocal, loadAiPlan]);

  useFocusEffect(
    useCallback(() => {
      void refreshLocal();
    }, [refreshLocal]),
  );

  const toggleTask = async (taskId: string) => {
    const next = !doneMap[taskId];
    const updated = await setRoutineTaskDone(selectedDate, taskId, next);
    setDoneMap(updated);
  };

  return (
    <ScrollView
      style={styles.sheetScroll}
      contentContainerStyle={styles.sheetContent}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.routineTitle}>{t("care.routine.title")}</Text>
            <Text style={styles.heroHint} numberOfLines={1}>
              {t("care.hubParvarishSub")}
            </Text>
          </View>
          <Pressable style={styles.retakeBtn} onPress={onRetakeQuiz}>
            <Ionicons name="refresh-outline" size={14} color="#111111" />
            <Text style={styles.retakeText}>{t("care.quiz.retake")}</Text>
          </Pressable>
        </View>
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{t(`care.conditions.${quiz.condition}`)}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{t(`care.textures.${quiz.texture}`)}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{t(`care.colors.${quiz.colorStatus}`)}</Text>
          </View>
        </View>
      </View>

      {aiPlan?.summary ? (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHead}>
            <Ionicons name="sparkles" size={14} color="#111111" />
            <Text style={styles.summaryLabel}>{t("care.routine.aiPlanBadge")}</Text>
          </View>
          <Text style={styles.summaryText}>{aiPlan.summary}</Text>
        </View>
      ) : null}

      {aiLoading ? (
        <View style={styles.aiLoadingRow}>
          <ActivityIndicator size="small" color="#111111" />
          <Text style={styles.aiLoadingText}>{t("care.routine.aiPlanLoading")}</Text>
        </View>
      ) : null}

      {aiError && !aiPlan ? (
        <Pressable
          style={styles.aiErrorRow}
          onPress={() => void loadAiPlan(myProducts)}
        >
          <Text style={styles.aiErrorText}>{aiError}</Text>
          <Text style={styles.aiRetry}>
            {t("care.routine.aiPlanRetry", { defaultValue: "Qayta urinish" })}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.slotTrack}>
        {SLOTS.map((s) => {
          const on = slot === s;
          return (
            <Pressable
              key={s}
              style={[styles.slotPill, on && styles.slotPillOn]}
              onPress={() => setSlot(s)}
            >
              <Ionicons
                name={SLOT_ICONS[s]}
                size={15}
                color={on ? "#FFFFFF" : "rgba(17,17,17,0.45)"}
              />
              <Text style={[styles.slotText, on && styles.slotTextOn]}>
                {t(`care.routine.slots.${s}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.taskList}>
        {tasks.map((task) => {
          const done = !!doneMap[task.id];
          return (
            <Pressable
              key={task.id}
              style={[styles.taskRow, done && styles.taskRowDone]}
              onPress={() => {
                if (task.productId) onOpenProduct(task.productId);
                else void toggleTask(task.id);
              }}
              onLongPress={() => void toggleTask(task.id)}
            >
              <View style={[styles.taskThumb, done && styles.taskThumbDone]}>
                <Ionicons
                  name={TASK_ICONS[task.icon]}
                  size={18}
                  color={done ? "#FFFFFF" : "#111111"}
                />
              </View>
              <View style={styles.taskBody}>
                <Text style={[styles.taskTitle, done && styles.taskTitleDone]}>{task.title}</Text>
                <Text style={styles.taskSub} numberOfLines={2}>
                  {task.timeHint ? `${task.timeHint} · ` : ""}
                  {task.subtitle}
                </Text>
                {task.productName ? (
                  <Text style={styles.taskProduct} numberOfLines={1}>
                    {task.productName}
                  </Text>
                ) : null}
              </View>
              <Pressable
                style={[styles.taskCheck, done && styles.taskCheckOn]}
                onPress={() => void toggleTask(task.id)}
                hitSlop={8}
              >
                {done ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
              </Pressable>
            </Pressable>
          );
        })}
      </View>

      {aiPlan?.weekly_schedule?.length ? (
        <View style={styles.weekBlock}>
          <Text style={styles.sectionTitle}>{t("care.weeklyTitle")}</Text>
          <View style={styles.weekList}>
            {aiPlan.weekly_schedule.map((row) => (
              <View key={`${row.day}-${row.task}`} style={styles.weekRow}>
                <Text style={styles.weekDay}>{row.day}</Text>
                <Text style={styles.weekTask}>{row.task}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <Pressable style={styles.seeAll} onPress={onOpenCatalog}>
        <Text style={styles.seeAllText}>{t("common.viewAll")}</Text>
      </Pressable>

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

      <View style={[styles.sectionHead, { marginTop: 20 }]}>
        <Text style={styles.sectionTitle}>{t("care.routine.buyTitle")}</Text>
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

      <Pressable style={styles.aiHelp} onPress={onOpenAssistant}>
        <LinearGradient
          colors={["#F0F0F0", "#F0F0F0"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiHelpInner}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="#111111" />
          <View style={{ flex: 1 }}>
            <Text style={styles.aiHelpTitle}>{t("care.routine.aiHelpTitle")}</Text>
            <Text style={styles.aiHelpSub}>{t("care.routine.aiHelpSub")}</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color="#111111" />
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheetScroll: { flex: 1, backgroundColor: "#FAFAFA" },
  sheetContent: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(120),
    gap: moderateScale(12),
  },
  heroCard: {
    borderRadius: moderateScale(22),
    backgroundColor: "#FFFFFF",
    padding: moderateScale(16),
    gap: moderateScale(12),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.06)",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: moderateScale(10),
  },
  routineTitle: {
    ...morphFont,
    fontSize: fontSize(20),
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -0.4,
  },
  heroHint: {
    ...morphFont,
    marginTop: verticalScale(3),
    fontSize: fontSize(12),
    lineHeight: fontSize(16),
    color: "rgba(17,17,17,0.45)",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: moderateScale(6),
  },
  chip: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: 999,
    backgroundColor: "#F3F3F5",
  },
  chipText: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "600",
    color: "#111111",
  },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(8),
    borderRadius: 999,
    backgroundColor: "#F3F3F5",
  },
  retakeText: { ...morphFont, fontSize: fontSize(12), fontWeight: "600", color: "#111111" },
  summaryCard: {
    borderRadius: moderateScale(18),
    padding: moderateScale(14),
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.06)",
    gap: moderateScale(6),
  },
  summaryHead: { flexDirection: "row", alignItems: "center", gap: moderateScale(6) },
  summaryLabel: { ...morphFont, fontSize: fontSize(11), fontWeight: "700", color: "#111111" },
  summaryText: { ...morphFont, fontSize: fontSize(13), lineHeight: fontSize(18), color: "#111111" },
  aiLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    paddingVertical: verticalScale(8),
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
  slotTrack: {
    flexDirection: "row",
    gap: moderateScale(6),
    padding: moderateScale(4),
    borderRadius: 999,
    backgroundColor: "#EEEEF0",
  },
  slotPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(5),
    paddingVertical: verticalScale(10),
    borderRadius: 999,
  },
  slotPillOn: {
    backgroundColor: "#111111",
  },
  slotText: { ...morphFont, fontSize: fontSize(12), fontWeight: "700", color: "rgba(17,17,17,0.45)" },
  slotTextOn: { color: "#FFFFFF" },
  taskList: {
    gap: moderateScale(8),
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(18),
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.06)",
  },
  taskRowDone: {
    backgroundColor: "#F7F7F8",
  },
  taskThumb: {
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(14),
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  taskThumbDone: {
    backgroundColor: "#111111",
  },
  taskBody: { flex: 1, gap: moderateScale(2), minWidth: 0 },
  taskTitle: { ...morphFont, fontSize: fontSize(14), fontWeight: "700", color: "#111111" },
  taskTitleDone: { color: "rgba(17,17,17,0.45)", textDecorationLine: "line-through" },
  taskSub: { ...morphFont, fontSize: fontSize(12), color: "rgba(17,17,17,0.45)" },
  taskProduct: {
    ...morphFont,
    marginTop: verticalScale(2),
    fontSize: fontSize(11),
    fontWeight: "600",
    color: "#111111",
  },
  taskCheck: {
    width: scale(26),
    height: scale(26),
    borderRadius: moderateScale(13),
    borderWidth: 1.5,
    borderColor: "rgba(17,17,17,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  taskCheckOn: { backgroundColor: "#111111", borderColor: "#111111" },
  weekBlock: { marginTop: verticalScale(4), gap: moderateScale(8) },
  weekList: {
    borderRadius: moderateScale(16),
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.06)",
  },
  weekRow: {
    flexDirection: "row",
    gap: moderateScale(12),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(17,17,17,0.05)",
  },
  weekDay: { ...morphFont, width: scale(40), fontSize: fontSize(13), fontWeight: "700", color: "#111111" },
  weekTask: { ...morphFont, flex: 1, fontSize: fontSize(13), color: "#111111" },
  seeAll: { alignSelf: "center", paddingVertical: verticalScale(10) },
  seeAllText: { ...morphFont, fontSize: fontSize(13), fontWeight: "600", color: "rgba(26,26,26,0.45)" },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: verticalScale(8),
    marginBottom: verticalScale(10),
  },
  sectionTitle: { ...morphFont, fontSize: fontSize(16), fontWeight: "700", color: "#111" },
  scanLink: { flexDirection: "row", alignItems: "center", gap: moderateScale(4) },
  scanLinkText: { ...morphFont, fontSize: fontSize(13), fontWeight: "600", color: "#111111" },
  emptyProducts: {
    borderRadius: moderateScale(20),
    borderWidth: 1,
    borderColor: "rgba(139,124,255,0.25)",
    borderStyle: "dashed",
    padding: moderateScale(20),
    alignItems: "center",
    gap: moderateScale(6),
    backgroundColor: "#FAFAFA",
  },
  emptyProductsTitle: { ...morphFont, fontSize: fontSize(14), fontWeight: "600", color: "#111" },
  emptyProductsSub: {
    ...morphFont,
    fontSize: fontSize(12),
    color: "rgba(26,26,26,0.45)",
    textAlign: "center",
    lineHeight: fontSize(16),
  },
  myGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: moderateScale(10),
  },
  productRow: { gap: moderateScale(12), paddingRight: scale(4) },
  myCard: {
    width: scale(120),
    borderRadius: moderateScale(18),
    backgroundColor: "#FAFAFB",
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
    backgroundColor: "#FAFAFB",
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
  emptyHint: { ...morphFont, fontSize: fontSize(13), color: "rgba(26,26,26,0.45)", marginBottom: verticalScale(8) },
  aiHelp: { marginTop: verticalScale(16), borderRadius: moderateScale(20), overflow: "hidden" },
  aiHelpInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
    padding: moderateScale(16),
  },
  aiHelpTitle: { ...morphFont, fontSize: fontSize(14), fontWeight: "700", color: "#111" },
  aiHelpSub: {
    ...morphFont,
    marginTop: verticalScale(2),
    fontSize: fontSize(12),
    lineHeight: fontSize(16),
    color: "rgba(26,26,26,0.5)",
  },
});
