import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeModal } from "../../ui/SafeModal";
import { safeBottom } from "../../../lib/safe-area";
import {
  createCareShelfItem,
  deleteCareShelfItem,
  fetchCareShelf,
  updateCareShelfItem,
  type CareShelfCategory,
  type CareShelfItem,
} from "../../../api/care";
import { resolveMediaUrl } from "../../../api/media";
import { scheduleCareShelfReminders } from "../../../lib/care-shelf-reminders";
import { loadMyProducts, type MyCareProduct } from "../../../lib/morph-my-products";
import { morphFont } from "../../../theme/morph-font";
import { colors } from "../../../theme/colors";
import { fontSize, moderateScale, scale, verticalScale } from "../../../utils/responsive";

type Props = {
  visible: boolean;
  onClose: () => void;
};

type SheetView = "list" | "pick" | "form";

type FormState = {
  productId: number | null;
  imageUrl: string | null;
  name: string;
  brand: string;
  category: CareShelfCategory;
  volumeMl: string;
  usageFrequency: string;
  openedAt: string;
  paoMonths: 3 | 6 | 12 | 24;
};

const C = {
  fg: colors.fg,
  muted: colors.muted,
  bg: colors.bg,
  card: colors.surface,
  line: colors.border,
  promo: colors.promo,
  emerald: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
};

const SHEET_HEIGHT_RATIO = 0.64;
const SHEET_HEIGHT_MAX = 580;

const MONTHS_UZ = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"] as const;

const PAO_OPTS: Array<3 | 6 | 12 | 24> = [3, 6, 12, 24];
const FREQ_OPTS = [
  "Kuniga 1 mahal",
  "Kuniga 2 mahal",
  "Haftada 2-3 marta",
  "Haftada 1 marta",
] as const;

const FREQ_SHORT: Record<(typeof FREQ_OPTS)[number], string> = {
  "Kuniga 1 mahal": "1× / kun",
  "Kuniga 2 mahal": "2× / kun",
  "Haftada 2-3 marta": "2–3× / hafta",
  "Haftada 1 marta": "1× / hafta",
};

const CATEGORY_OPTS: Array<{ value: CareShelfCategory; key: string; fallback: string }> = [
  { value: "hair", key: "catHair", fallback: "Soch" },
  { value: "face", key: "catFace", fallback: "Yuz" },
  { value: "scalp", key: "catScalp", fallback: "Bosh terisi" },
  { value: "beard", key: "catBeard", fallback: "Soqol" },
];

function defaultForm(): FormState {
  return {
    productId: null,
    imageUrl: null,
    name: "",
    brand: "",
    category: "hair",
    volumeMl: "250",
    usageFrequency: FREQ_OPTS[0],
    openedAt: new Date().toISOString().slice(0, 10),
    paoMonths: 12,
  };
}

function mapCategory(raw: string): CareShelfCategory {
  const s = raw.toLowerCase();
  if (s.includes("face") || s.includes("yuz")) return "face";
  if (s.includes("scalp") || s.includes("terisi")) return "scalp";
  if (s.includes("beard") || s.includes("soqol")) return "beard";
  return "hair";
}

/** Shampun, konditsioner va boshqa soch mahsulotlari faqat soch uchun. */
function isHairOnlyProduct(name: string, category?: string): boolean {
  const s = `${name} ${category || ""}`.toLowerCase();
  if (
    /shamp|shampun|conditioner|kondits|maska|mask|serum|balzam|spray|soch|hair|treatment|oil|yog/.test(
      s,
    )
  ) {
    return true;
  }
  const cat = (category || "").toLowerCase();
  return cat === "hair" || cat.includes("soch");
}

function computeExpirationDate(openedAt: string, paoMonths: number): string | null {
  if (!isIsoDate(openedAt)) return null;
  const d = new Date(`${openedAt}T00:00:00`);
  d.setMonth(d.getMonth() + paoMonths);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function chipColor(status: string): string {
  if (status === "EXPIRED") return C.red;
  if (status === "REFILL_SOON") return C.amber;
  return C.emerald;
}

function friendlyDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  return `${day} ${MONTHS_UZ[d.getMonth()]}, ${d.getFullYear()}`;
}

function isIsoDate(raw: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const d = new Date(`${raw}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

export function CareShelfTrackerSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<CareShelfItem[]>([]);
  const [summary, setSummary] = useState({ active: 0, refill_soon: 0, expired: 0 });
  const [view, setView] = useState<SheetView>("list");
  const [editing, setEditing] = useState<CareShelfItem | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [myProducts, setMyProducts] = useState<MyCareProduct[]>([]);
  const [myLoading, setMyLoading] = useState(false);

  const hairOnly = useMemo(
    () => isHairOnlyProduct(form.name, form.category),
    [form.name, form.category],
  );
  const expiryPreview = useMemo(() => {
    const iso = computeExpirationDate(form.openedAt, form.paoMonths);
    return iso ? friendlyDate(iso) : "—";
  }, [form.openedAt, form.paoMonths]);

  const backdrop = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(1)).current;

  const linkedProductIds = useMemo(
    () => new Set(items.map((i) => i.product_id).filter((id): id is number => id != null)),
    [items],
  );

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

  const loadMy = useCallback(async () => {
    setMyLoading(true);
    try {
      setMyProducts(await loadMyProducts());
    } catch {
      setMyProducts([]);
    } finally {
      setMyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setView("list");
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
      void loadMy();
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
        setEditing(null);
        setForm(defaultForm());
      }
    });
  }, [visible, mounted, backdrop, sheetY, load, loadMy]);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm());
    setView("form");
  };

  const openPick = () => {
    setView("pick");
    void loadMy();
  };

  const openFromMyProduct = (product: MyCareProduct) => {
    if (linkedProductIds.has(product.id)) {
      Alert.alert(
        t("care.shelf.alreadyOnShelfTitle", { defaultValue: "Allaqachon kuzatuvda" }),
        t("care.shelf.alreadyOnShelf", {
          defaultValue: "Bu mahsulot parvarish javonida allaqachon bor.",
        }),
      );
      return;
    }
    setEditing(null);
    const hairProduct = isHairOnlyProduct(product.name, product.category);
    setForm({
      productId: product.id,
      imageUrl: product.image_url,
      name: product.name,
      brand: product.brand || "",
      category: hairProduct ? "hair" : mapCategory(product.category || "hair"),
      volumeMl: "250",
      usageFrequency: FREQ_OPTS[0],
      openedAt: new Date().toISOString().slice(0, 10),
      paoMonths: 12,
    });
    setView("form");
  };

  const openEdit = (item: CareShelfItem) => {
    setEditing(item);
    setForm({
      productId: item.product_id,
      imageUrl: item.image_url,
      name: item.name,
      brand: item.brand || "",
      category: (item.category as CareShelfCategory) || "hair",
      volumeMl: String(item.volume_ml || 100),
      usageFrequency: item.usage_frequency || FREQ_OPTS[0],
      openedAt: item.opened_at || new Date().toISOString().slice(0, 10),
      paoMonths: (item.pao_months as 3 | 6 | 12 | 24) || 12,
    });
    setView("form");
  };

  const validateForm = (): string | null => {
    if (form.name.trim().length < 2) {
      return t("care.shelf.errName", { defaultValue: "Nom kamida 2 belgi bo'lsin." });
    }
    const volume = Number(form.volumeMl);
    if (!Number.isFinite(volume) || volume < 10 || volume > 3000) {
      return t("care.shelf.errVolume", { defaultValue: "Hajm 10-3000 ml bo'lishi kerak." });
    }
    if (!isIsoDate(form.openedAt)) {
      return t("care.shelf.errDate", { defaultValue: "Sana YYYY-MM-DD formatda bo'lsin." });
    }
    return null;
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
        product_id: form.productId,
        name: form.name.trim(),
        brand: form.brand.trim(),
        category: form.category,
        volume_ml: Number(form.volumeMl),
        usage_frequency: form.usageFrequency,
        opened_at: form.openedAt,
        pao_months: form.paoMonths,
        with_ai: false,
      } as const;
      if (editing) {
        await updateCareShelfItem(editing.id, payload);
      } else {
        await createCareShelfItem(payload);
      }
      setView("list");
      await load();
      await loadMy();
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

  const sheetHeight = useMemo(
    () => Math.min(Math.round(winH * SHEET_HEIGHT_RATIO), SHEET_HEIGHT_MAX),
    [winH],
  );

  const sheetTransform = sheetY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, sheetHeight + 48],
  });

  if (!mounted) return null;

  return (
    <SafeModal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              transform: [{ translateY: sheetTransform }],
              paddingBottom:
                view === "form" || (view === "list" && items.length > 0)
                  ? 0
                  : safeBottom(insets.bottom, 4),
            },
          ]}
        >
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          <View style={styles.topBar}>
            <Pressable
              style={styles.topIconBtn}
              onPress={() => {
                if (view === "list") onClose();
                else setView(view === "form" && form.productId && !editing ? "pick" : "list");
              }}
              hitSlop={8}
              accessibilityLabel={view === "list" ? t("common.close", { defaultValue: "Yopish" }) : t("common.back", { defaultValue: "Orqaga" })}
            >
              <Ionicons name="chevron-back" size={moderateScale(22)} color={C.fg} />
            </Pressable>
            <View style={[styles.topCenter, styles.topCenterSolo]}>
              <Text style={styles.topTitle} numberOfLines={1}>
                {view === "pick"
                  ? t("care.shelf.pickTitle", { defaultValue: "Mahsulotlarimdan tanlang" })
                  : view === "form"
                    ? editing
                      ? t("care.shelf.editTitle", { defaultValue: "Mahsulotni tahrirlash" })
                      : t("care.shelf.addTitle", { defaultValue: "Yangi mahsulot" })
                    : t("care.shelf.titleShort", { defaultValue: "Parvarish javoni" })}
              </Text>
            </View>
            <View style={styles.topIconBtnGhost} />
          </View>

          {view === "list" ? (
            <ScrollView
              style={styles.body}
              contentContainerStyle={[
                styles.bodyPad,
                items.length === 0 && !loading ? styles.bodyPadEmpty : null,
              ]}
              showsVerticalScrollIndicator={false}
            >
              {loading ? (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator size="small" color={C.fg} />
                </View>
              ) : items.length === 0 ? (
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="file-tray-outline" size={moderateScale(28)} color={C.muted} />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {t("care.shelf.emptyTitle", { defaultValue: "Javon bo'sh" })}
                  </Text>
                  <Text style={styles.emptyText}>
                    {t("care.shelf.empty", {
                      defaultValue: "PAO va refill eslatmalari uchun birinchi mahsulotingizni qo'shing.",
                    })}
                  </Text>
                  <Pressable style={styles.emptyPrimary} onPress={openPick}>
                    <Ionicons name="heart" size={moderateScale(15)} color="#fff" />
                    <Text style={styles.emptyPrimaryText}>
                      {t("care.shelf.addFromMine", { defaultValue: "Mahsulotlarimdan" })}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.emptySecondary} onPress={openCreate}>
                    <Text style={styles.emptySecondaryText}>
                      {t("care.shelf.addManual", { defaultValue: "Qo'lda qo'shish" })}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <ShelfSummaryBar
                    active={summary.active}
                    refillSoon={summary.refill_soon}
                    expired={summary.expired}
                    activeLabel={t("care.shelf.active", { defaultValue: "Faol" })}
                    refillLabel={t("care.shelf.refillSoon", { defaultValue: "Tugamoqda" })}
                    expiredLabel={t("care.shelf.expired", { defaultValue: "Muddati o'tdi" })}
                  />
                  <View style={styles.list}>
                    {items.map((item) => (
                      <ShelfItemCard
                        key={item.id}
                        item={item}
                        busy={busyId === item.id}
                        onRefill={() => markRefill(item)}
                        onEdit={() => openEdit(item)}
                        onDelete={() => removeItem(item)}
                        openedLabel={t("care.shelf.opened", { defaultValue: "Ochilgan" })}
                        refillLabel={t("care.shelf.refill", { defaultValue: "Qayta sotib olish" })}
                      />
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          ) : null}

          {view === "list" && items.length > 0 && !loading ? (
            <View
              style={[
                styles.dock,
                { paddingBottom: safeBottom(insets.bottom, 4) },
              ]}
            >
              <Pressable style={styles.dockBtn} onPress={openPick}>
                <Ionicons name="heart-outline" size={moderateScale(15)} color={C.fg} />
                <Text style={styles.dockBtnText}>
                  {t("care.shelf.addFromMine", { defaultValue: "Mahsulotlarimdan" })}
                </Text>
              </Pressable>
              <Pressable style={[styles.dockBtn, styles.dockBtnSolid]} onPress={openCreate}>
                <Ionicons name="add" size={moderateScale(16)} color="#fff" />
                <Text style={[styles.dockBtnText, styles.dockBtnTextSolid]}>
                  {t("care.shelf.addManual", { defaultValue: "Qo'lda qo'shish" })}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {view === "pick" ? (
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyPad}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.pickHint}>
                {t("care.shelf.pickHint", {
                  defaultValue: "Mening mahsulotlarim ro'yxatidan tanlang — avtomatik to'ldiriladi.",
                })}
              </Text>
              {myLoading ? (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator size="small" color={C.fg} />
                </View>
              ) : myProducts.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>
                    {t("care.shelf.pickEmpty", {
                      defaultValue: "Mening mahsulotlarim bo'sh. Avval katalog yoki skan orqali qo'shing.",
                    })}
                  </Text>
                  <Pressable style={styles.pickManualBtn} onPress={openCreate}>
                    <Text style={styles.pickManualBtnText}>
                      {t("care.shelf.addManual", { defaultValue: "Qo'lda qo'shish" })}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.pickGrid}>
                  {myProducts.map((product) => {
                    const linked = linkedProductIds.has(product.id);
                    const img = resolveMediaUrl(product.image_url, { width: 240 });
                    return (
                      <Pressable
                        key={product.id}
                        style={[styles.pickCard, linked && styles.pickCardLinked]}
                        onPress={() => openFromMyProduct(product)}
                        disabled={linked}
                      >
                        <View style={styles.pickThumb}>
                          {img ? (
                            <Image source={{ uri: img }} style={styles.pickImg} contentFit="cover" />
                          ) : (
                            <Ionicons name="cube-outline" size={moderateScale(18)} color={C.muted} />
                          )}
                        </View>
                        <Text style={styles.pickName} numberOfLines={2}>
                          {product.name}
                        </Text>
                        <Text style={styles.pickBrand} numberOfLines={1}>
                          {product.brand || "Morf Care"}
                        </Text>
                        <View style={[styles.pickBadge, linked && styles.pickBadgeLinked]}>
                          <Ionicons
                            name={linked ? "checkmark-circle" : "add-circle-outline"}
                            size={moderateScale(12)}
                            color={linked ? C.emerald : C.fg}
                          />
                          <Text style={[styles.pickBadgeText, linked && styles.pickBadgeTextLinked]}>
                            {linked
                              ? t("care.shelf.onShelf", { defaultValue: "Javonda" })
                              : t("care.shelf.addShort", { defaultValue: "Qo'shish" })}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          ) : null}

          {view === "form" ? (
            <View style={styles.formShell}>
              <ScrollView
                style={styles.formScroll}
                contentContainerStyle={styles.formPad}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.groupCardElevated}>
                    {form.productId ? (
                      <>
                        <View style={styles.formHeroInline}>
                          <View style={styles.formHeroThumbSm}>
                            {form.imageUrl ? (
                              <Image
                                source={{ uri: resolveMediaUrl(form.imageUrl, { width: 120 }) || undefined }}
                                style={styles.formHeroImg}
                                contentFit="cover"
                              />
                            ) : (
                              <Ionicons name="cube-outline" size={moderateScale(16)} color={C.muted} />
                            )}
                          </View>
                          <View style={styles.formHeroCopy}>
                            <Text style={styles.formHeroTitleSm} numberOfLines={1}>
                              {form.name}
                            </Text>
                            <Text style={styles.formHeroBrandSm} numberOfLines={1}>
                              {form.brand || "Morf Care"}
                              {form.productId
                                ? ` · ${t("care.shelf.fromMineShort", { defaultValue: "Mahsulotlarimdan" })}`
                                : ""}
                            </Text>
                          </View>
                          {hairOnly ? (
                            <View style={styles.lockBadgeSm}>
                              <Ionicons name="lock-closed" size={moderateScale(10)} color={C.fg} />
                              <Text style={styles.lockBadgeTextSm}>
                                {t("care.shelf.catHair", { defaultValue: "Soch" })}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={styles.groupDivider} />
                      </>
                    ) : null}

                    {!form.productId ? (
                      <>
                        <View style={styles.inlineFieldSm}>
                          <Text style={styles.inlineLabelSm}>{t("care.shelf.name", { defaultValue: "Nom" })}</Text>
                          <TextInput
                            value={form.name}
                            onChangeText={(v) => {
                              const hairProduct = isHairOnlyProduct(v, form.category);
                              setForm((p) => ({
                                ...p,
                                name: v,
                                category: hairProduct ? "hair" : p.category,
                              }));
                            }}
                            placeholder={t("care.shelf.name", { defaultValue: "Mahsulot nomi" })}
                            placeholderTextColor={C.muted}
                            style={styles.inlineInputSm}
                          />
                        </View>
                        <View style={styles.groupDivider} />
                        <View style={styles.inlineFieldSm}>
                          <Text style={styles.inlineLabelSm}>
                            {t("care.shelf.brand", { defaultValue: "Brend" })}
                          </Text>
                          <TextInput
                            value={form.brand}
                            onChangeText={(v) => setForm((p) => ({ ...p, brand: v }))}
                            placeholder={t("care.shelf.brandOptional", { defaultValue: "Ixtiyoriy" })}
                            placeholderTextColor={C.muted}
                            style={styles.inlineInputSm}
                          />
                        </View>
                        <View style={styles.groupDivider} />
                      </>
                    ) : null}

                    {!form.productId && !hairOnly ? (
                      <>
                        <View style={styles.inlineFieldSm}>
                          <Text style={styles.inlineLabelSm}>
                            {t("care.shelf.categoryLabel", { defaultValue: "Joy" })}
                          </Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segRowInline}>
                            {CATEGORY_OPTS.map((cat) => {
                              const active = form.category === cat.value;
                              return (
                                <Pressable
                                  key={cat.value}
                                  style={[styles.segChipSm, active && styles.segChipOn]}
                                  onPress={() => setForm((p) => ({ ...p, category: cat.value }))}
                                >
                                  <Text style={[styles.segChipTextSm, active && styles.segChipTextOn]}>
                                    {t(`care.shelf.${cat.key}`, { defaultValue: cat.fallback })}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </ScrollView>
                        </View>
                        <View style={styles.groupDivider} />
                      </>
                    ) : null}

                    {!form.productId && hairOnly ? (
                      <>
                        <View style={styles.inlineFieldSm}>
                          <Text style={styles.inlineLabelSm}>
                            {t("care.shelf.categoryLabel", { defaultValue: "Joy" })}
                          </Text>
                          <View style={styles.lockBadgeSm}>
                            <Ionicons name="lock-closed" size={moderateScale(10)} color={C.fg} />
                            <Text style={styles.lockBadgeTextSm}>
                              {t("care.shelf.catHair", { defaultValue: "Soch" })}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.groupDivider} />
                      </>
                    ) : null}

                    <View style={styles.metricRowInline}>
                      <View style={styles.metricHalf}>
                        <Text style={styles.metricLabelSm}>
                          {t("care.shelf.volumeLabel", { defaultValue: "Hajm (ml)" })}
                        </Text>
                        <TextInput
                          value={form.volumeMl}
                          onChangeText={(v) => setForm((p) => ({ ...p, volumeMl: v.replace(/[^\d]/g, "") }))}
                          placeholder="250"
                          keyboardType="number-pad"
                          style={styles.metricInputSm}
                        />
                      </View>
                      <View style={styles.metricDivider} />
                      <View style={styles.metricHalf}>
                        <Text style={styles.metricLabelSm}>
                          {t("care.shelf.openedLabel", { defaultValue: "Ochilgan" })}
                        </Text>
                        <TextInput
                          value={form.openedAt}
                          onChangeText={(v) => setForm((p) => ({ ...p, openedAt: v }))}
                          placeholder="YYYY-MM-DD"
                          autoCapitalize="none"
                          style={styles.metricInputSm}
                        />
                      </View>
                    </View>

                    <View style={styles.groupDivider} />

                    <View style={styles.inlineBlockSm}>
                      <Text style={styles.groupLabelSm}>
                        {t("care.shelf.usageLabel", { defaultValue: "Tezligi" })}
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.freqRow}
                      >
                        {FREQ_OPTS.map((opt) => {
                          const active = form.usageFrequency === opt;
                          return (
                            <Pressable
                              key={opt}
                              style={[styles.freqChipSm, active && styles.freqChipOn]}
                              onPress={() => setForm((p) => ({ ...p, usageFrequency: opt }))}
                            >
                              <Text
                                style={[styles.freqChipText, active && styles.freqChipTextOn]}
                                numberOfLines={1}
                              >
                                {FREQ_SHORT[opt]}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>

                    <View style={styles.groupDivider} />

                    <View style={styles.paoHeader}>
                      <Text style={styles.groupLabelSm}>
                        {t("care.shelf.paoShort", { defaultValue: "Yaroqlik muddati" })}
                      </Text>
                      <Text style={styles.expiryInline}>
                        <Text style={styles.expiryInlineMuted}>
                          {t("care.shelf.expiryLabel", { defaultValue: "Tugaydi" })}:{" "}
                        </Text>
                        <Text style={styles.expiryInlineValue}>{expiryPreview}</Text>
                      </Text>
                    </View>
                    <View style={styles.paoRow}>
                      {PAO_OPTS.map((pao) => {
                        const active = form.paoMonths === pao;
                        return (
                          <Pressable
                            key={pao}
                            style={[styles.paoChipSm, active && styles.paoChipOn]}
                            onPress={() => setForm((prev) => ({ ...prev, paoMonths: pao }))}
                          >
                            <Text style={[styles.paoChipText, active && styles.paoChipTextOn]}>{pao} oy</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
              </ScrollView>

              <View style={[styles.formFooter, { paddingBottom: safeBottom(insets.bottom, 4) }]}>
                <Pressable style={styles.formCancelBtn} onPress={() => setView("list")}>
                  <Text style={styles.formCancelText}>
                    {t("common.cancelLong", { defaultValue: "Bekor qilish" })}
                  </Text>
                </Pressable>
                <Pressable style={styles.formSaveBtn} onPress={save} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.formSaveText}>
                      {editing
                        ? t("common.save", { defaultValue: "Saqlash" })
                        : t("care.shelf.add", { defaultValue: "Mahsulot qo'shish" })}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </SafeModal>
  );
}

function categoryLabel(raw: string): string {
  const hit = CATEGORY_OPTS.find((c) => c.value === raw);
  return hit?.fallback || raw;
}

function ShelfSummaryBar({
  active,
  refillSoon,
  expired,
  activeLabel,
  refillLabel,
  expiredLabel,
}: {
  active: number;
  refillSoon: number;
  expired: number;
  activeLabel: string;
  refillLabel: string;
  expiredLabel: string;
}) {
  const metrics = [
    { label: activeLabel, value: active, accent: C.emerald },
    { label: refillLabel, value: refillSoon, accent: C.amber },
    { label: expiredLabel, value: expired, accent: "#6B7280" },
  ] as const;

  return (
    <View style={styles.segment}>
      {metrics.map((m, idx) => (
        <View
          key={m.label}
          style={[styles.segmentCell, idx < metrics.length - 1 && styles.segmentCellBorder]}
        >
          <Text style={[styles.segmentValue, { color: m.accent }]}>{m.value}</Text>
          <Text style={styles.segmentLabel} numberOfLines={1}>
            {m.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ShelfItemCard({
  item,
  busy,
  onRefill,
  onEdit,
  onDelete,
  openedLabel,
  refillLabel,
}: {
  item: CareShelfItem;
  busy: boolean;
  onRefill: () => void;
  onEdit: () => void;
  onDelete: () => void;
  openedLabel: string;
  refillLabel: string;
}) {
  const tone = chipColor(item.status_flag);
  const img = resolveMediaUrl(item.image_url, { width: 160 });
  const pct = Math.max(4, Math.min(100, item.remaining_percent));
  const daysLeft = Math.max(item.estimated_days_left, 0);

  return (
    <View style={styles.productPanel}>
      <View style={[styles.productPanelStripe, { backgroundColor: tone }]} />

      <View style={styles.productPanelBody}>
        <View style={styles.productHero}>
          <View style={styles.productAvatarWrap}>
            {img ? (
              <Image source={{ uri: img }} style={styles.productAvatar} contentFit="cover" />
            ) : (
              <View style={styles.productAvatarFallback}>
                <Ionicons name="water-outline" size={moderateScale(22)} color={C.muted} />
              </View>
            )}
          </View>

          <View style={styles.productHeroCopy}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.productBrand} numberOfLines={1}>
              {item.brand || "Morf Care"} · {categoryLabel(String(item.category))}
            </Text>
            <Text style={[styles.productStatusLine, { color: tone }]} numberOfLines={1}>
              {item.status_label}
            </Text>
          </View>

          <View style={styles.productPctBlock}>
            <Text style={[styles.productPctNum, { color: tone }]}>{pct}</Text>
            <Text style={styles.productPctUnit}>% qoldi</Text>
          </View>
        </View>

        <View style={styles.productStatsRow}>
          <View style={styles.productStatBox}>
            <Text style={styles.productStatLabel}>Qolgan vaqt</Text>
            <Text style={styles.productStatValue}>{daysLeft} kun</Text>
          </View>
          <View style={styles.productStatBox}>
            <Text style={styles.productStatLabel}>PAO</Text>
            <Text style={styles.productStatValue}>{item.pao_code}</Text>
          </View>
          <View style={styles.productStatBox}>
            <Text style={styles.productStatLabel}>{openedLabel}</Text>
            <Text style={styles.productStatValue} numberOfLines={1}>
              {friendlyDate(item.opened_at)}
            </Text>
          </View>
        </View>

        <View style={styles.productMeterTrack}>
          <View style={[styles.productMeterFill, { width: `${pct}%`, backgroundColor: tone }]} />
        </View>

        {item.ai_advice ? (
          <View style={styles.productQuote}>
            <Text style={styles.productQuoteMark}>“</Text>
            <Text style={styles.productQuoteText} numberOfLines={2}>
              {item.ai_advice}
            </Text>
          </View>
        ) : null}

        <View style={styles.productActionBar}>
          <Pressable style={styles.productActionCell} onPress={onRefill}>
            <Ionicons name="cart-outline" size={moderateScale(15)} color={C.fg} />
            <Text style={styles.productActionLabel}>{refillLabel}</Text>
          </Pressable>
          <View style={styles.productActionDivider} />
          <Pressable style={styles.productActionCell} onPress={onEdit}>
            <Ionicons name="create-outline" size={moderateScale(15)} color={C.fg} />
            <Text style={styles.productActionLabel}>Tahrir</Text>
          </Pressable>
          <View style={styles.productActionDivider} />
          <Pressable style={styles.productActionCell} onPress={onDelete} disabled={busy}>
            {busy ? (
              <ActivityIndicator size="small" color={C.red} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={moderateScale(15)} color={C.red} />
                <Text style={[styles.productActionLabel, styles.productActionLabelDanger]}>O'chir</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: "rgba(8,12,20,0.42)" },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: moderateScale(28),
    borderTopRightRadius: moderateScale(28),
    overflow: "hidden",
    shadowColor: "#111111",
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  handleWrap: { alignItems: "center", paddingTop: verticalScale(10) },
  handle: {
    width: scale(36),
    height: verticalScale(4),
    borderRadius: 999,
    backgroundColor: "rgba(17,17,17,0.16)",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(10),
    gap: moderateScale(10),
  },
  topIconBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  topIconBtnGhost: {
    width: scale(40),
    height: scale(40),
  },
  topCenter: { flex: 1, minWidth: 0 },
  topCenterSolo: { paddingLeft: scale(2) },
  topTitle: {
    ...morphFont,
    color: C.fg,
    fontWeight: "800",
    fontSize: fontSize(17),
    letterSpacing: -0.4,
  },
  body: { flex: 1, minHeight: 0 },
  bodyPad: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(4),
    paddingBottom: verticalScale(14),
    gap: moderateScale(12),
  },
  bodyPadEmpty: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: verticalScale(24),
  },
  segment: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: moderateScale(14),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    overflow: "hidden",
  },
  segmentCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: verticalScale(12),
    gap: 2,
  },
  segmentCellBorder: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: C.line,
  },
  segmentValue: {
    ...morphFont,
    fontWeight: "800",
    fontSize: fontSize(18),
    letterSpacing: -0.4,
  },
  segmentLabel: {
    ...morphFont,
    color: C.muted,
    fontSize: fontSize(10),
    fontWeight: "600",
  },
  loaderWrap: { paddingVertical: verticalScale(36), alignItems: "center" },
  empty: {
    alignItems: "center",
    paddingHorizontal: scale(12),
    gap: moderateScale(8),
  },
  emptyIcon: {
    width: scale(64),
    height: scale(64),
    borderRadius: 999,
    backgroundColor: C.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(6),
  },
  emptyTitle: {
    ...morphFont,
    color: C.fg,
    fontWeight: "800",
    fontSize: fontSize(18),
    letterSpacing: -0.35,
  },
  emptyText: {
    ...morphFont,
    color: C.muted,
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    textAlign: "center",
    maxWidth: scale(280),
    marginBottom: verticalScale(8),
  },
  emptyPrimary: {
    marginTop: verticalScale(4),
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(8),
    backgroundColor: C.fg,
    borderRadius: moderateScale(14),
    paddingVertical: verticalScale(14),
  },
  emptyPrimaryText: {
    ...morphFont,
    color: "#fff",
    fontWeight: "700",
    fontSize: fontSize(14),
  },
  emptySecondary: {
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(12),
  },
  emptySecondaryText: {
    ...morphFont,
    color: C.fg,
    fontWeight: "700",
    fontSize: fontSize(13),
    textDecorationLine: "underline",
  },
  list: { gap: moderateScale(10) },
  dock: {
    flexDirection: "row",
    gap: moderateScale(8),
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(10),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
    backgroundColor: C.bg,
  },
  dockBtn: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(6),
    borderRadius: moderateScale(14),
    paddingVertical: verticalScale(12),
    backgroundColor: C.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  dockBtnSolid: {
    backgroundColor: C.fg,
    borderColor: C.fg,
  },
  dockBtnText: {
    ...morphFont,
    color: C.fg,
    fontWeight: "700",
    fontSize: fontSize(12),
  },
  dockBtnTextSolid: { color: "#fff" },
  productPanel: {
    backgroundColor: C.card,
    borderRadius: moderateScale(18),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    overflow: "hidden",
  },
  productPanelStripe: { height: verticalScale(4), width: "100%" },
  productPanelBody: { paddingHorizontal: scale(12), paddingBottom: verticalScale(10), gap: moderateScale(8) },
  productHero: { flexDirection: "row", alignItems: "center", gap: moderateScale(10), paddingTop: verticalScale(10) },
  productAvatarWrap: {
    width: scale(56),
    height: scale(56),
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: C.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  productAvatar: { width: "100%", height: "100%" },
  productAvatarFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  productHeroCopy: { flex: 1, minWidth: 0, gap: 2 },
  productName: { ...morphFont, color: C.fg, fontWeight: "800", fontSize: fontSize(14) },
  productBrand: { ...morphFont, color: C.muted, fontSize: fontSize(10) },
  productStatusLine: { ...morphFont, fontWeight: "700", fontSize: fontSize(10.5), marginTop: 1 },
  productPctBlock: { alignItems: "flex-end", minWidth: scale(52) },
  productPctNum: { ...morphFont, fontWeight: "800", fontSize: fontSize(26), lineHeight: fontSize(28) },
  productPctUnit: { ...morphFont, color: C.muted, fontSize: fontSize(9), fontWeight: "700" },
  productStatsRow: { flexDirection: "row", gap: moderateScale(6) },
  productStatBox: {
    flex: 1,
    minWidth: 0,
    borderRadius: moderateScale(12),
    backgroundColor: C.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(7),
    gap: 2,
  },
  productStatLabel: { ...morphFont, color: C.muted, fontSize: fontSize(8.5), fontWeight: "700", textTransform: "uppercase" },
  productStatValue: { ...morphFont, color: C.fg, fontWeight: "800", fontSize: fontSize(11) },
  productMeterTrack: {
    height: verticalScale(5),
    borderRadius: 999,
    backgroundColor: C.promo,
    overflow: "hidden",
  },
  productMeterFill: { height: "100%", borderRadius: 999 },
  productQuote: {
    flexDirection: "row",
    gap: moderateScale(4),
    borderLeftWidth: scale(3),
    borderLeftColor: C.line,
    paddingLeft: scale(8),
  },
  productQuoteMark: { ...morphFont, color: C.muted, fontSize: fontSize(18), lineHeight: fontSize(18), marginTop: -2 },
  productQuoteText: {
    ...morphFont,
    flex: 1,
    color: "rgba(17,17,17,0.62)",
    fontSize: fontSize(10.5),
    lineHeight: fontSize(14),
  },
  productActionBar: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: moderateScale(12),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    overflow: "hidden",
    backgroundColor: C.bg,
  },
  productActionCell: {
    flex: 1,
    minHeight: verticalScale(44),
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(3),
    paddingHorizontal: scale(4),
  },
  productActionDivider: { width: StyleSheet.hairlineWidth, backgroundColor: C.line },
  productActionLabel: { ...morphFont, color: C.fg, fontSize: fontSize(9), fontWeight: "700", textAlign: "center" },
  productActionLabelDanger: { color: C.red },
  pickHint: { ...morphFont, color: C.muted, fontSize: fontSize(12), lineHeight: fontSize(16) },
  pickGrid: { flexDirection: "row", flexWrap: "wrap", gap: moderateScale(10) },
  pickCard: {
    width: "47.5%",
    backgroundColor: C.card,
    borderRadius: moderateScale(16),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    padding: moderateScale(10),
    gap: moderateScale(6),
  },
  pickCardLinked: { opacity: 0.72, backgroundColor: "#F8FAF9" },
  pickThumb: {
    width: "100%",
    aspectRatio: 1.15,
    borderRadius: moderateScale(12),
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pickImg: { width: "100%", height: "100%" },
  pickName: { ...morphFont, color: C.fg, fontWeight: "800", fontSize: fontSize(12), minHeight: fontSize(30) },
  pickBrand: { ...morphFont, color: C.muted, fontSize: fontSize(10) },
  pickBadge: {
    marginTop: verticalScale(2),
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
    borderRadius: 999,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    backgroundColor: C.promo,
  },
  pickBadgeLinked: { backgroundColor: "rgba(16,185,129,0.12)" },
  pickBadgeText: { ...morphFont, color: C.fg, fontWeight: "700", fontSize: fontSize(9.5) },
  pickBadgeTextLinked: { color: C.emerald },
  pickManualBtn: {
    marginTop: verticalScale(8),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: 999,
    backgroundColor: C.fg,
  },
  pickManualBtnText: { ...morphFont, color: "#fff", fontWeight: "700", fontSize: fontSize(11) },
  formShell: { flex: 1, minHeight: 0 },
  formScroll: { flex: 1, minHeight: 0 },
  formPad: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(2),
    paddingBottom: verticalScale(4),
    flexGrow: 0,
  },
  formFooter: {
    flexDirection: "row",
    gap: moderateScale(8),
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(4),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
    backgroundColor: C.bg,
  },
  formHeroInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(8),
  },
  groupCardElevated: {
    backgroundColor: C.card,
    borderRadius: moderateScale(16),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    overflow: "hidden",
    shadowColor: "#111111",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  formHeroThumbSm: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(10),
    backgroundColor: C.promo,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  formHeroImg: { width: "100%", height: "100%" },
  formHeroCopy: { flex: 1, minWidth: 0 },
  formHeroTitleSm: { ...morphFont, color: C.fg, fontWeight: "800", fontSize: fontSize(12.5) },
  formHeroBrandSm: { ...morphFont, color: C.muted, fontSize: fontSize(10), marginTop: 1 },
  lockBadgeSm: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
    borderRadius: 999,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    backgroundColor: C.promo,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  lockBadgeTextSm: { ...morphFont, color: C.fg, fontWeight: "800", fontSize: fontSize(10) },
  inlineBlockSm: {
    paddingHorizontal: scale(10),
    paddingTop: verticalScale(6),
    paddingBottom: verticalScale(4),
    gap: moderateScale(4),
  },
  groupLabelSm: {
    ...morphFont,
    color: C.muted,
    fontSize: fontSize(9.5),
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    paddingHorizontal: scale(2),
  },
  groupDivider: { height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginHorizontal: scale(10) },
  inlineFieldSm: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(7),
  },
  inlineLabelSm: {
    ...morphFont,
    width: scale(56),
    color: C.muted,
    fontSize: fontSize(10),
    fontWeight: "700",
  },
  inlineInputSm: {
    flex: 1,
    minWidth: 0,
    ...morphFont,
    color: C.fg,
    fontSize: fontSize(12),
    fontWeight: "600",
    padding: 0,
  },
  segRowInline: { gap: moderateScale(6), alignItems: "center" },
  segChipSm: {
    borderRadius: 999,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    backgroundColor: C.promo,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  segChipOn: { backgroundColor: C.fg, borderColor: C.fg },
  segChipTextSm: { ...morphFont, color: C.fg, fontSize: fontSize(10), fontWeight: "700" },
  segChipTextOn: { color: "#fff" },
  metricRowInline: { flexDirection: "row", alignItems: "stretch" },
  metricHalf: { flex: 1, paddingHorizontal: scale(10), paddingVertical: verticalScale(8), gap: 2 },
  metricDivider: { width: StyleSheet.hairlineWidth, backgroundColor: C.line },
  metricLabelSm: { ...morphFont, color: C.muted, fontSize: fontSize(9.5), fontWeight: "700" },
  metricInputSm: {
    ...morphFont,
    color: C.fg,
    fontSize: fontSize(14),
    fontWeight: "800",
    padding: 0,
  },
  freqRow: { gap: moderateScale(6), paddingBottom: verticalScale(2) },
  freqChipSm: {
    borderRadius: 999,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    backgroundColor: C.promo,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  freqChipOn: { backgroundColor: C.fg, borderColor: C.fg },
  freqChipText: { ...morphFont, color: C.fg, fontSize: fontSize(10), fontWeight: "700" },
  freqChipTextOn: { color: "#fff" },
  paoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: moderateScale(8),
    paddingHorizontal: scale(10),
    paddingTop: verticalScale(6),
    paddingBottom: verticalScale(2),
  },
  expiryInline: { flex: 1, textAlign: "right" },
  expiryInlineMuted: {
    ...morphFont,
    color: C.muted,
    fontSize: fontSize(9.5),
    fontWeight: "600",
  },
  expiryInlineValue: {
    ...morphFont,
    color: C.fg,
    fontSize: fontSize(10),
    fontWeight: "800",
  },
  paoRow: {
    flexDirection: "row",
    gap: moderateScale(6),
    paddingHorizontal: scale(10),
    paddingBottom: verticalScale(6),
  },
  paoChipSm: {
    flex: 1,
    borderRadius: moderateScale(10),
    paddingVertical: verticalScale(7),
    alignItems: "center",
    backgroundColor: C.promo,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  paoChipOn: { backgroundColor: C.fg, borderColor: C.fg },
  paoChipText: { ...morphFont, color: C.fg, fontSize: fontSize(10), fontWeight: "800" },
  paoChipTextOn: { color: "#fff" },
  formCancelBtn: {
    flex: 1,
    height: verticalScale(42),
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  formCancelText: { ...morphFont, color: C.fg, fontSize: fontSize(11.5), fontWeight: "700" },
  formSaveBtn: {
    flex: 1.55,
    height: verticalScale(42),
    borderRadius: 999,
    backgroundColor: C.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  formSaveText: { ...morphFont, color: "#fff", fontSize: fontSize(11.5), fontWeight: "700" },
});
