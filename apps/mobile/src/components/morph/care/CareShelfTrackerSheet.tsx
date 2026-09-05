import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  createCareShelfItem,
  deleteCareShelfItem,
  estimateCareShelf,
  fetchCareShelf,
  updateCareShelfItem,
  type CareShelfCategory,
  type CareShelfEstimate,
  type CareShelfItem,
} from "../../../api/care";
import { scheduleCareShelfReminders } from "../../../lib/care-shelf-reminders";
import { morphFont } from "../../../theme/morph-font";
import { fontSize, moderateScale, scale, verticalScale } from "../../../utils/responsive";

type Props = {
  visible: boolean;
  onClose: () => void;
};

type EditorMode = "manual" | "ai";

type FormState = {
  name: string;
  brand: string;
  category: CareShelfCategory;
  volumeMl: string;
  usageFrequency: string;
  openedAt: string;
  paoMonths: 3 | 6 | 12 | 24;
};

const C = {
  fg: "#111111",
  muted: "#6B7280",
  bg: "#F6F6F6",
  line: "rgba(15,23,42,0.08)",
  emerald: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
};

const PAO_OPTS: Array<3 | 6 | 12 | 24> = [3, 6, 12, 24];
const FREQ_OPTS = [
  "Kuniga 1 mahal",
  "Kuniga 2 mahal",
  "Haftada 2-3 marta",
  "Haftada 1 marta",
] as const;

const CATEGORY_OPTS: Array<{ value: CareShelfCategory; key: string; fallback: string }> = [
  { value: "hair", key: "catHair", fallback: "Soch" },
  { value: "face", key: "catFace", fallback: "Yuz" },
  { value: "scalp", key: "catScalp", fallback: "Bosh terisi" },
  { value: "beard", key: "catBeard", fallback: "Soqol" },
];

function defaultForm(): FormState {
  return {
    name: "",
    brand: "",
    category: "hair",
    volumeMl: "250",
    usageFrequency: FREQ_OPTS[0],
    openedAt: new Date().toISOString().slice(0, 10),
    paoMonths: 12,
  };
}

function chipColor(status: string): string {
  if (status === "EXPIRED") return C.red;
  if (status === "REFILL_SOON") return C.amber;
  return C.emerald;
}

function friendlyDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
}

function isIsoDate(raw: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const d = new Date(`${raw}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

export function CareShelfTrackerSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [items, setItems] = useState<CareShelfItem[]>([]);
  const [summary, setSummary] = useState({ active: 0, refill_soon: 0, expired: 0 });
  const [formOpen, setFormOpen] = useState(false);
  const [mode, setMode] = useState<EditorMode>("manual");
  const [editing, setEditing] = useState<CareShelfItem | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [estimate, setEstimate] = useState<CareShelfEstimate | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const backdrop = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCareShelf();
      setItems(data.items || []);
      setSummary(data.summary || { active: 0, refill_soon: 0, expired: 0 });
      void scheduleCareShelfReminders(data.items || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Yuklab bo'lmadi.";
      Alert.alert("Parvarish", msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      sheetY.setValue(1);
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(sheetY, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      void load();
      return;
    }
    if (!mounted) return;
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(sheetY, {
        toValue: 1,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
        setFormOpen(false);
        setEstimate(null);
        setEditing(null);
      }
    });
  }, [visible, mounted, backdrop, sheetY, load]);

  useEffect(() => {
    fadeIn.setValue(0);
    Animated.timing(fadeIn, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [items, formOpen, fadeIn]);

  const openCreate = () => {
    setEditing(null);
    setEstimate(null);
    setMode("manual");
    setForm(defaultForm());
    setFormOpen(true);
  };

  const openEdit = (item: CareShelfItem) => {
    setEditing(item);
    setEstimate(null);
    setMode("manual");
    setForm({
      name: item.name,
      brand: item.brand || "",
      category: (item.category as CareShelfCategory) || "hair",
      volumeMl: String(item.volume_ml || 100),
      usageFrequency: item.usage_frequency || FREQ_OPTS[0],
      openedAt: item.opened_at || new Date().toISOString().slice(0, 10),
      paoMonths: (item.pao_months as 3 | 6 | 12 | 24) || 12,
    });
    setFormOpen(true);
  };

  const validateForm = (): string | null => {
    if (form.name.trim().length < 2) return t("care.shelf.errName", { defaultValue: "Nom kamida 2 belgi bo'lsin." });
    const volume = Number(form.volumeMl);
    if (!Number.isFinite(volume) || volume < 10 || volume > 3000) {
      return t("care.shelf.errVolume", { defaultValue: "Hajm 10-3000 ml bo'lishi kerak." });
    }
    if (!isIsoDate(form.openedAt)) {
      return t("care.shelf.errDate", { defaultValue: "Sana YYYY-MM-DD formatda bo'lsin." });
    }
    return null;
  };

  const runEstimate = async () => {
    const err = validateForm();
    if (err) {
      Alert.alert("Parvarish", err);
      return;
    }
    setEstimating(true);
    try {
      const res = await estimateCareShelf({
        product_name: form.name.trim(),
        category: form.category,
        volume_ml: Number(form.volumeMl),
        usage_frequency: form.usageFrequency,
        opened_at: form.openedAt,
        pao_months: form.paoMonths,
      });
      setEstimate(res.estimate);
    } catch (e) {
      Alert.alert("Parvarish", e instanceof Error ? e.message : "Hisoblab bo'lmadi.");
    } finally {
      setEstimating(false);
    }
  };

  const save = async () => {
    const err = validateForm();
    if (err) {
      Alert.alert("Parvarish", err);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        brand: form.brand.trim(),
        category: form.category,
        volume_ml: Number(form.volumeMl),
        usage_frequency: form.usageFrequency,
        opened_at: form.openedAt,
        pao_months: form.paoMonths,
        with_ai: mode === "ai",
      } as const;
      if (editing) {
        await updateCareShelfItem(editing.id, payload);
      } else {
        await createCareShelfItem(payload);
      }
      setFormOpen(false);
      setEstimate(null);
      await load();
    } catch (e) {
      Alert.alert("Parvarish", e instanceof Error ? e.message : "Saqlab bo'lmadi.");
    } finally {
      setSaving(false);
    }
  };

  const removeItem = (item: CareShelfItem) => {
    Alert.alert(
      t("care.shelf.delTitle", { defaultValue: "Mahsulotni o'chirish" }),
      item.name,
      [
        { text: t("common.cancel", { defaultValue: "Bekor" }), style: "cancel" },
        {
          text: t("common.delete", { defaultValue: "O'chirish" }),
          style: "destructive",
          onPress: async () => {
            setBusyId(item.id);
            try {
              await deleteCareShelfItem(item.id);
              await load();
            } catch (e) {
              Alert.alert("Parvarish", e instanceof Error ? e.message : "O'chirib bo'lmadi.");
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const markRefill = (item: CareShelfItem) => {
    Alert.alert(
      t("care.shelf.refill", { defaultValue: "Qayta sotib olish" }),
      t("care.shelf.refillDone", {
        defaultValue: "Eslatma qo'shildi. Mahsulot tugashidan oldin sizga bildiramiz.",
      }),
    );
    void scheduleCareShelfReminders([item]);
  };

  const sheetTransform = sheetY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 680],
  });

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: sheetTransform }],
              paddingBottom: Math.max(insets.bottom, verticalScale(12)),
            },
          ]}
        >
          <LinearGradient
            colors={["#111111", "#1F2937"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle}>
                  {t("care.shelf.title", { defaultValue: "Mening parvarish vositalarim" })}
                </Text>
                <Text style={styles.headerSub}>
                  {t("care.shelf.sub", {
                    defaultValue: "Tugash muddati, PAO va refill eslatmalarini kuzating",
                  })}
                </Text>
              </View>
              <Pressable style={styles.iconBtn} onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={moderateScale(18)} color="#fff" />
              </Pressable>
            </View>
          </LinearGradient>

          <Animated.View style={{ opacity: fadeIn, flex: 1 }}>
            {formOpen ? (
              <ScrollView
                style={styles.body}
                contentContainerStyle={styles.bodyPad}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modeRow}>
                  <Pressable
                    style={[styles.modeBtn, mode === "manual" && styles.modeBtnOn]}
                    onPress={() => setMode("manual")}
                  >
                    <Text style={[styles.modeText, mode === "manual" && styles.modeTextOn]}>Manual</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modeBtn, mode === "ai" && styles.modeBtnOn]}
                    onPress={() => setMode("ai")}
                  >
                    <Ionicons
                      name="sparkles-outline"
                      size={moderateScale(13)}
                      color={mode === "ai" ? "#FFFFFF" : C.fg}
                    />
                    <Text style={[styles.modeText, mode === "ai" && styles.modeTextOn]}>AI Quick</Text>
                  </Pressable>
                </View>

                <TextInput
                  value={form.name}
                  onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                  placeholder={t("care.shelf.name", { defaultValue: "Mahsulot nomi" })}
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
                <TextInput
                  value={form.brand}
                  onChangeText={(v) => setForm((p) => ({ ...p, brand: v }))}
                  placeholder={t("care.shelf.brand", { defaultValue: "Brend (ixtiyoriy)" })}
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />

                <View style={styles.catWrap}>
                  {CATEGORY_OPTS.map((cat) => {
                    const active = form.category === cat.value;
                    return (
                      <Pressable
                        key={cat.value}
                        style={[styles.catChip, active && styles.catChipOn]}
                        onPress={() => setForm((p) => ({ ...p, category: cat.value }))}
                      >
                        <Text style={[styles.catChipText, active && styles.catChipTextOn]}>
                          {t(`care.shelf.${cat.key}`, { defaultValue: cat.fallback })}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.row2}>
                  <TextInput
                    value={form.volumeMl}
                    onChangeText={(v) => setForm((p) => ({ ...p, volumeMl: v.replace(/[^\d]/g, "") }))}
                    placeholder="250"
                    keyboardType="number-pad"
                    style={[styles.input, styles.half]}
                  />
                  <TextInput
                    value={form.openedAt}
                    onChangeText={(v) => setForm((p) => ({ ...p, openedAt: v }))}
                    placeholder="YYYY-MM-DD"
                    autoCapitalize="none"
                    style={[styles.input, styles.half]}
                  />
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.freqWrap}>
                  {FREQ_OPTS.map((opt) => {
                    const active = form.usageFrequency === opt;
                    return (
                      <Pressable
                        key={opt}
                        style={[styles.freqChip, active && styles.freqChipOn]}
                        onPress={() => setForm((p) => ({ ...p, usageFrequency: opt }))}
                      >
                        <Text style={[styles.freqText, active && styles.freqTextOn]}>{opt}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View style={styles.catWrap}>
                  {PAO_OPTS.map((pao) => {
                    const active = form.paoMonths === pao;
                    return (
                      <Pressable
                        key={pao}
                        style={[styles.catChip, active && styles.catChipOn]}
                        onPress={() => setForm((prev) => ({ ...prev, paoMonths: pao }))}
                      >
                        <Text style={[styles.catChipText, active && styles.catChipTextOn]}>{pao}M</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {mode === "ai" ? (
                  <View style={styles.aiCard}>
                    <Pressable style={styles.aiBtn} onPress={runEstimate} disabled={estimating}>
                      {estimating ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="sparkles" size={moderateScale(14)} color="#fff" />
                          <Text style={styles.aiBtnText}>AI hisoblash</Text>
                        </>
                      )}
                    </Pressable>
                    {estimate ? (
                      <View style={styles.aiResult}>
                        <Text style={styles.aiResultLine}>
                          {estimate.estimated_days_left} kun qoldi · refill {friendlyDate(estimate.refill_date)}
                        </Text>
                        <Text style={styles.aiResultSub}>{estimate.ai_advice}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.actions}>
                  <Pressable
                    style={[styles.actionBtn, styles.actionGhost]}
                    onPress={() => setFormOpen(false)}
                  >
                    <Text style={styles.actionGhostText}>
                      {t("common.cancel", { defaultValue: "Bekor" })}
                    </Text>
                  </Pressable>
                  <Pressable style={[styles.actionBtn, styles.actionMain]} onPress={save} disabled={saving}>
                    {saving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.actionMainText}>
                        {editing
                          ? t("common.save", { defaultValue: "Saqlash" })
                          : t("care.shelf.add", { defaultValue: "Mahsulot qo'shish" })}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            ) : (
              <ScrollView
                style={styles.body}
                contentContainerStyle={styles.bodyPad}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.summaryRow}>
                  <StatusDot label={t("care.shelf.active", { defaultValue: "Faol" })} color={C.emerald} value={summary.active} />
                  <StatusDot
                    label={t("care.shelf.refillSoon", { defaultValue: "Tugamoqda" })}
                    color={C.amber}
                    value={summary.refill_soon}
                  />
                  <StatusDot
                    label={t("care.shelf.expired", { defaultValue: "Muddati o'tdi" })}
                    color={C.red}
                    value={summary.expired}
                  />
                </View>

                <Pressable style={styles.addBtn} onPress={openCreate}>
                  <Ionicons name="add-circle" size={moderateScale(16)} color="#fff" />
                  <Text style={styles.addBtnText}>
                    {t("care.shelf.add", { defaultValue: "Mahsulot qo'shish" })}
                  </Text>
                </Pressable>

                {loading ? (
                  <View style={styles.loaderWrap}>
                    <ActivityIndicator size="small" color={C.fg} />
                  </View>
                ) : items.length === 0 ? (
                  <View style={styles.empty}>
                    <Text style={styles.emptyText}>
                      {t("care.shelf.empty", { defaultValue: "Hali mahsulot qo'shilmagan." })}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.list}>
                    {items.map((item) => (
                      <View key={item.id} style={styles.card}>
                        <View style={styles.cardHead}>
                          <View style={styles.thumb}>
                            {item.image_url ? (
                              <Image source={{ uri: item.image_url }} style={styles.thumbImg} contentFit="cover" />
                            ) : (
                              <Ionicons name="cube-outline" size={moderateScale(20)} color={C.muted} />
                            )}
                          </View>
                          <View style={styles.cardMeta}>
                            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                            <Text style={styles.cardSub} numberOfLines={1}>
                              {(item.brand || "Morf Care")} · {item.category}
                            </Text>
                          </View>
                          <View style={[styles.badge, { backgroundColor: `${chipColor(item.status_flag)}1A` }]}>
                            <Text style={[styles.badgeText, { color: chipColor(item.status_flag) }]} numberOfLines={1}>
                              {item.status_label}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.progressTop}>
                          <Text style={styles.progressHint}>{item.remaining_percent}%</Text>
                          <Text style={styles.progressHint}>{Math.max(item.estimated_days_left, 0)} kun</Text>
                        </View>
                        <View style={styles.progressTrack}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${Math.max(4, Math.min(100, item.remaining_percent))}%`,
                                backgroundColor: chipColor(item.status_flag),
                              },
                            ]}
                          />
                        </View>

                        <View style={styles.dateRow}>
                          <View style={styles.datePill}>
                            <Ionicons name="calendar-outline" size={moderateScale(11)} color={C.muted} />
                            <Text style={styles.dateText}>
                              {t("care.shelf.opened", { defaultValue: "Ochilgan" })}: {friendlyDate(item.opened_at)}
                            </Text>
                          </View>
                          <View style={styles.datePill}>
                            <Ionicons name="alert-circle-outline" size={moderateScale(11)} color={C.muted} />
                            <Text style={styles.dateText}>PAO {item.pao_code}</Text>
                          </View>
                        </View>

                        <Text style={styles.advice} numberOfLines={2}>{item.ai_advice}</Text>

                        <View style={styles.cardActions}>
                          <Pressable style={[styles.smallBtn, styles.smallBtnMain]} onPress={() => markRefill(item)}>
                            <Ionicons name="refresh-outline" size={moderateScale(12)} color="#fff" />
                            <Text style={styles.smallBtnMainText}>
                              {t("care.shelf.refill", { defaultValue: "Qayta sotib olish" })}
                            </Text>
                          </Pressable>
                          <Pressable style={styles.smallBtn} onPress={() => openEdit(item)}>
                            <Ionicons name="create-outline" size={moderateScale(12)} color={C.fg} />
                          </Pressable>
                          <Pressable
                            style={styles.smallBtn}
                            onPress={() => removeItem(item)}
                            disabled={busyId === item.id}
                          >
                            {busyId === item.id ? (
                              <ActivityIndicator size="small" color={C.fg} />
                            ) : (
                              <Ionicons name="trash-outline" size={moderateScale(12)} color={C.fg} />
                            )}
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function StatusDot({ label, color, value }: { label: string; color: string; value: number }) {
  return (
    <View style={styles.statChip}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.statText}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: "rgba(8,12,20,0.46)" },
  sheet: {
    height: "90%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: moderateScale(28),
    borderTopRightRadius: moderateScale(28),
    overflow: "hidden",
  },
  header: { paddingHorizontal: scale(18), paddingTop: verticalScale(14), paddingBottom: verticalScale(14) },
  headerRow: { flexDirection: "row", alignItems: "center", gap: moderateScale(10) },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: { ...morphFont, color: "#fff", fontWeight: "800", fontSize: fontSize(16), letterSpacing: -0.2 },
  headerSub: { ...morphFont, color: "rgba(255,255,255,0.72)", fontSize: fontSize(11), marginTop: 3 },
  iconBtn: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  body: { flex: 1 },
  bodyPad: { paddingHorizontal: scale(16), paddingTop: verticalScale(12), paddingBottom: verticalScale(14) },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: moderateScale(8) },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(6),
    backgroundColor: "#F5F5F5",
    borderRadius: 999,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
  },
  dot: { width: scale(7), height: scale(7), borderRadius: 999 },
  statText: { ...morphFont, fontSize: fontSize(11), color: "rgba(17,17,17,0.72)" },
  statValue: { ...morphFont, fontWeight: "700", fontSize: fontSize(11), color: C.fg },
  addBtn: {
    marginTop: verticalScale(10),
    backgroundColor: C.fg,
    borderRadius: moderateScale(14),
    paddingVertical: verticalScale(10),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: moderateScale(6),
  },
  addBtnText: { ...morphFont, color: "#fff", fontWeight: "700", fontSize: fontSize(12) },
  loaderWrap: { paddingVertical: verticalScale(26), alignItems: "center", justifyContent: "center" },
  empty: {
    marginTop: verticalScale(10),
    borderRadius: moderateScale(16),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    borderStyle: "dashed",
    paddingVertical: verticalScale(18),
    alignItems: "center",
  },
  emptyText: { ...morphFont, color: C.muted, fontSize: fontSize(12) },
  list: { marginTop: verticalScale(10), gap: moderateScale(8) },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(16),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    padding: moderateScale(10),
    gap: moderateScale(8),
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: moderateScale(9) },
  thumb: {
    width: scale(42),
    height: scale(42),
    borderRadius: moderateScale(12),
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImg: { width: "100%", height: "100%" },
  cardMeta: { flex: 1, minWidth: 0 },
  cardTitle: { ...morphFont, color: C.fg, fontWeight: "800", fontSize: fontSize(13) },
  cardSub: { ...morphFont, color: C.muted, fontSize: fontSize(11), marginTop: 1 },
  badge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(5),
    borderRadius: 999,
    maxWidth: "56%",
  },
  badgeText: { ...morphFont, fontSize: fontSize(10), fontWeight: "700" },
  progressTop: { flexDirection: "row", justifyContent: "space-between" },
  progressHint: { ...morphFont, color: C.muted, fontSize: fontSize(10) },
  progressTrack: {
    height: verticalScale(7),
    borderRadius: 999,
    backgroundColor: "#F1F1F1",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 999 },
  dateRow: { flexDirection: "row", flexWrap: "wrap", gap: moderateScale(6) },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
    backgroundColor: "#F8F8F8",
    borderRadius: 999,
    paddingHorizontal: scale(9),
    paddingVertical: verticalScale(4),
  },
  dateText: { ...morphFont, color: C.muted, fontSize: fontSize(10) },
  advice: { ...morphFont, color: "rgba(17,17,17,0.66)", fontSize: fontSize(11), lineHeight: fontSize(15) },
  cardActions: { flexDirection: "row", alignItems: "center", gap: moderateScale(6) },
  smallBtn: {
    height: verticalScale(28),
    minWidth: scale(28),
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(8),
    backgroundColor: "#fff",
    flexDirection: "row",
    gap: moderateScale(4),
  },
  smallBtnMain: { backgroundColor: "#111111", borderColor: "#111111" },
  smallBtnMainText: { ...morphFont, color: "#fff", fontSize: fontSize(10), fontWeight: "700" },

  modeRow: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    padding: 4,
    gap: 4,
    marginBottom: verticalScale(10),
  },
  modeBtn: {
    flex: 1,
    height: verticalScale(34),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: moderateScale(5),
  },
  modeBtnOn: { backgroundColor: "#111111" },
  modeText: { ...morphFont, color: C.fg, fontSize: fontSize(12), fontWeight: "700" },
  modeTextOn: { color: "#fff" },
  input: {
    height: verticalScale(42),
    borderRadius: moderateScale(12),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.14)",
    backgroundColor: "#FFFFFF",
    color: C.fg,
    paddingHorizontal: scale(12),
    ...morphFont,
    fontSize: fontSize(13),
    marginBottom: verticalScale(8),
  },
  row2: { flexDirection: "row", gap: moderateScale(8) },
  half: { flex: 1 },
  catWrap: { flexDirection: "row", flexWrap: "wrap", gap: moderateScale(8), marginBottom: verticalScale(8) },
  catChip: {
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
  },
  catChipOn: { backgroundColor: "#111111" },
  catChipText: { ...morphFont, color: C.fg, fontSize: fontSize(11), fontWeight: "700" },
  catChipTextOn: { color: "#fff" },
  freqWrap: { gap: moderateScale(8), marginBottom: verticalScale(8) },
  freqChip: {
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
  },
  freqChipOn: { backgroundColor: "#111111" },
  freqText: { ...morphFont, color: C.fg, fontSize: fontSize(11), fontWeight: "700" },
  freqTextOn: { color: "#fff" },
  aiCard: {
    borderRadius: moderateScale(14),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    backgroundColor: "#F9FAFB",
    padding: moderateScale(10),
    marginTop: verticalScale(2),
  },
  aiBtn: {
    height: verticalScale(34),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
    flexDirection: "row",
    gap: moderateScale(6),
  },
  aiBtnText: { ...morphFont, color: "#fff", fontSize: fontSize(12), fontWeight: "700" },
  aiResult: { marginTop: verticalScale(8), gap: 2 },
  aiResultLine: { ...morphFont, color: C.fg, fontSize: fontSize(12), fontWeight: "700" },
  aiResultSub: { ...morphFont, color: C.muted, fontSize: fontSize(11), lineHeight: fontSize(14) },
  actions: { marginTop: verticalScale(10), flexDirection: "row", gap: moderateScale(8) },
  actionBtn: {
    height: verticalScale(42),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  actionGhost: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    backgroundColor: "#fff",
  },
  actionMain: {
    backgroundColor: "#111111",
    flex: 1.6,
  },
  actionGhostText: { ...morphFont, color: C.fg, fontSize: fontSize(12), fontWeight: "700" },
  actionMainText: { ...morphFont, color: "#fff", fontSize: fontSize(12), fontWeight: "700" },
});
