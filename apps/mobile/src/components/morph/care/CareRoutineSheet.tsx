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
import type { CareProduct } from "../../../api/care";
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

  const tasks = useMemo(() => buildDailyRoutine(quiz, slot), [quiz, slot]);

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
    } finally {
      setLoadingProducts(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void refreshLocal();
  }, [refreshLocal]);

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
      <View style={styles.profileRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.routineTitle}>{t("care.routine.title")}</Text>
          <Text style={styles.profileSummary} numberOfLines={2}>
            {t(`care.conditions.${quiz.condition}`)} · {t(`care.textures.${quiz.texture}`)} ·{" "}
            {t(`care.colors.${quiz.colorStatus}`)}
          </Text>
        </View>
        <Pressable style={styles.retakeBtn} onPress={onRetakeQuiz}>
          <Text style={styles.retakeText}>{t("care.quiz.retake")}</Text>
        </Pressable>
      </View>

      <View style={styles.slotRow}>
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
                size={14}
                color={on ? "#1a1a1a" : "rgba(26,26,26,0.45)"}
              />
              <Text style={[styles.slotText, on && styles.slotTextOn]}>
                {t(`care.routine.slots.${s}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.taskList}>
        {tasks.map((task, idx) => {
          const done = !!doneMap[task.id];
          return (
            <Pressable
              key={task.id}
              style={[styles.taskRow, idx === 0 && styles.taskRowFirst]}
              onPress={() => void toggleTask(task.id)}
            >
              <View style={styles.taskThumb}>
                <Ionicons name={TASK_ICONS[task.icon]} size={18} color="#5B4B8A" />
              </View>
              <View style={styles.taskBody}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskSub}>{task.subtitle}</Text>
              </View>
              <View style={[styles.taskCheck, done && styles.taskCheckOn]}>
                {done ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.seeAll} onPress={onOpenCatalog}>
        <Text style={styles.seeAllText}>{t("common.viewAll")}</Text>
      </Pressable>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{t("care.myProducts.title")}</Text>
        <Pressable style={styles.scanLink} onPress={onOpenScan}>
          <Ionicons name="scan-outline" size={16} color="#3B82F6" />
          <Text style={styles.scanLinkText}>{t("care.myProducts.scan")}</Text>
        </Pressable>
      </View>

      {loadingProducts ? (
        <ActivityIndicator color="#5B4B8A" style={{ marginVertical: 12 }} />
      ) : myProducts.length === 0 ? (
        <Pressable style={styles.emptyProducts} onPress={onOpenScan}>
          <Ionicons name="add-circle-outline" size={28} color="#8B7CFF" />
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
                  <Ionicons name="flask-outline" size={20} color="#8B7CFF" />
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
                  <Ionicons name="flask-outline" size={24} color="#8B7CFF" />
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
          colors={["#EDE4FF", "#E8F0FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiHelpInner}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="#5B4B8A" />
          <View style={{ flex: 1 }}>
            <Text style={styles.aiHelpTitle}>{t("care.routine.aiHelpTitle")}</Text>
            <Text style={styles.aiHelpSub}>{t("care.routine.aiHelpSub")}</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color="#5B4B8A" />
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheetScroll: { flex: 1 },
  sheetContent: { paddingBottom: 120, gap: 4 },
  profileRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 4 },
  routineTitle: { ...morphFont, fontSize: 18, fontWeight: "700", color: "#111" },
  profileSummary: {
    ...morphFont,
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: "rgba(26,26,26,0.5)",
  },
  retakeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F2F2F4",
  },
  retakeText: { ...morphFont, fontSize: 12, fontWeight: "600", color: "#1a1a1a" },
  slotRow: { flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 12 },
  slotPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#F2F2F4",
  },
  slotPillOn: { backgroundColor: "#fff", borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" },
  slotText: { ...morphFont, fontSize: 13, fontWeight: "600", color: "rgba(26,26,26,0.45)" },
  slotTextOn: { color: "#1a1a1a" },
  taskList: {
    borderRadius: 20,
    backgroundColor: "#FAFAFB",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.04)",
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  taskRowFirst: { borderTopWidth: 0 },
  taskThumb: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EDE4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  taskBody: { flex: 1, gap: 2 },
  taskTitle: { ...morphFont, fontSize: 14, fontWeight: "600", color: "#111" },
  taskSub: { ...morphFont, fontSize: 12, color: "rgba(26,26,26,0.45)" },
  taskCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "rgba(26,26,26,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  taskCheckOn: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  seeAll: { alignSelf: "center", paddingVertical: 10 },
  seeAllText: { ...morphFont, fontSize: 13, fontWeight: "600", color: "rgba(26,26,26,0.45)" },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: { ...morphFont, fontSize: 16, fontWeight: "700", color: "#111" },
  scanLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  scanLinkText: { ...morphFont, fontSize: 13, fontWeight: "600", color: "#3B82F6" },
  emptyProducts: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(139,124,255,0.25)",
    borderStyle: "dashed",
    padding: 20,
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FAFAFF",
  },
  emptyProductsTitle: { ...morphFont, fontSize: 14, fontWeight: "600", color: "#111" },
  emptyProductsSub: {
    ...morphFont,
    fontSize: 12,
    color: "rgba(26,26,26,0.45)",
    textAlign: "center",
    lineHeight: 16,
  },
  productRow: { gap: 12, paddingRight: 4 },
  myCard: {
    width: 120,
    borderRadius: 18,
    backgroundColor: "#FAFAFB",
    padding: 10,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.04)",
  },
  myCardImg: { width: "100%", height: 88, borderRadius: 12 },
  myCardPh: { alignItems: "center", justifyContent: "center", backgroundColor: "#EDE4FF" },
  myCardName: { ...morphFont, fontSize: 12, fontWeight: "600", color: "#111" },
  myCardBrand: { ...morphFont, fontSize: 10, color: "rgba(26,26,26,0.45)" },
  recCard: {
    width: 160,
    borderRadius: 20,
    backgroundColor: "#FAFAFB",
    padding: 12,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.04)",
  },
  fitBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#EDE4FF",
  },
  fitBadgeText: { ...morphFont, fontSize: 10, fontWeight: "700", color: "#5B4B8A" },
  recImg: { width: "100%", height: 110, borderRadius: 14 },
  recName: { ...morphFont, fontSize: 13, fontWeight: "600", color: "#111" },
  recBrand: { ...morphFont, fontSize: 11, color: "rgba(26,26,26,0.45)" },
  emptyHint: { ...morphFont, fontSize: 13, color: "rgba(26,26,26,0.45)", marginBottom: 8 },
  aiHelp: { marginTop: 16, borderRadius: 20, overflow: "hidden" },
  aiHelpInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  aiHelpTitle: { ...morphFont, fontSize: 14, fontWeight: "700", color: "#111" },
  aiHelpSub: {
    ...morphFont,
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: "rgba(26,26,26,0.5)",
  },
});
