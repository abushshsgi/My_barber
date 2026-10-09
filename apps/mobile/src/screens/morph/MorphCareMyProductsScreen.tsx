import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeBottom, safeTop } from "../../lib/safe-area";
import { CareCatalogSheet } from "../../components/morph/care/CareCatalogSheet";
import { NativeBackButton } from "../../components/ui/NativeBackButton";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { prefetchCareCatalog } from "../../lib/care-catalog-cache";
import { useShellNavigation } from "../../lib/shell-nav";
import {
  loadMyProducts,
  removeMyProduct,
  type MyCareProduct,
} from "../../lib/morph-my-products";
import { resolveMediaUrl } from "../../api/media";
import type { MorphCareStackParamList } from "../../navigation/MorphCareStack";
import { shellChrome, useShellTheme, type ShellChrome } from "../../lib/useShellTheme";
import { morphFont } from "../../theme/morph-font";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<MorphCareStackParamList, "CareMyProducts">;

const GAP = 8;
const H_PAD = 14;
const COL_W = (Dimensions.get("window").width - H_PAD * 2 - GAP) / 2;

const SOURCE_META: Record<
  MyCareProduct["source"],
  { icon: keyof typeof Ionicons.glyphMap }
> = {
  scan: { icon: "scan-outline" as const },
  recommended: { icon: "sparkles-outline" as const },
  catalog: { icon: "grid-outline" as const },
};

export function MorphCareMyProductsScreen({ navigation }: Props) {
  const pal = useShellTheme();
  const colors = shellChrome(pal);
  const styles = useMemo(
    () => createProductStyles(colors),
    [colors.bg, colors.fg, colors.muted, colors.surface, colors.border, colors.promo, colors.onAccent],
  );
  useHideTabBar();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { goMorph } = useShellNavigation();
  const [rows, setRows] = useState<MyCareProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [deletedToast, setDeletedToast] = useState<string | null>(null);
  const toastY = useRef(new Animated.Value(-120)).current;
  const toastOp = useRef(new Animated.Value(0)).current;

  const playDeletedToast = useCallback(
    (name: string) => {
      setDeletedToast(name);
      toastY.setValue(-120);
      toastOp.setValue(0);
      Animated.sequence([
        Animated.parallel([
          Animated.spring(toastY, {
            toValue: insets.top + 10,
            friction: 8,
            tension: 70,
            useNativeDriver: true,
          }),
          Animated.timing(toastOp, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(1600),
        Animated.parallel([
          Animated.timing(toastY, {
            toValue: -120,
            duration: 280,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(toastOp, {
            toValue: 0,
            duration: 240,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => setDeletedToast(null));
    },
    [insets.top, toastOp, toastY],
  );

  const reload = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      setRows(await loadMyProducts());
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  // Sheet ochilganda spinner kutmaslik — katalogni oldindan yuklash
  useEffect(() => {
    void prefetchCareCatalog();
  }, []);

  const onRemove = useCallback(
    (p: MyCareProduct) => {
      const title = t("care.myProducts.removeConfirmTitle", {
        defaultValue: "O‘chirish",
      });
      const body = t("care.myProducts.removeConfirmBody", {
        defaultValue: "Rostan ham «{{name}}» ni o‘chirasizmi?",
        name: p.name,
      });

      const doRemove = () => {
        void (async () => {
          // Optimistic — tugma bosilishi bilan kartochka yo‘qoladi
          setRows((prev) => prev.filter((r) => r.id !== p.id));
          try {
            const next = await removeMyProduct(p.id);
            setRows(next);
            playDeletedToast(p.name);
          } catch {
            const restored = await loadMyProducts();
            setRows(restored);
          }
        })();
      };

      // RN Web: Alert.alert tugma callbacklarini chaqirmaydi — window.confirm kerak
      if (Platform.OS === "web" && typeof window !== "undefined") {
        if (window.confirm(`${title}\n\n${body}`)) doRemove();
        return;
      }

      Alert.alert(title, body, [
        {
          text: t("care.myProducts.removeConfirmNo", { defaultValue: "Yo‘q" }),
          style: "cancel",
        },
        {
          text: t("care.myProducts.removeConfirmYes", {
            defaultValue: "Ha, o‘chirish",
          }),
          style: "destructive",
          onPress: doRemove,
        },
      ]);
    },
    [playDeletedToast, t],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[colors.bg, colors.promo, colors.bg]}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />

      {deletedToast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.deleteToast,
            { opacity: toastOp, transform: [{ translateY: toastY }] },
          ]}
        >
          <View style={styles.deleteToastIcon}>
            <Ionicons name="trash" size={14} color="#fff" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.deleteToastEyebrow}>
              {t("care.myProducts.deletedToast", { defaultValue: "O‘chirildi" })}
            </Text>
            <Text style={styles.deleteToastTitle} numberOfLines={1}>
              {deletedToast}
            </Text>
          </View>
        </Animated.View>
      ) : null}

      <View style={styles.header}>
        <NativeBackButton
          onPress={() => {
            const routes = navigation.getState?.()?.routes;
            if (routes && routes.length > 1) navigation.goBack();
            else navigation.navigate("CareHome");
          }}
          accessibilityLabel={t("common.back")}
        />
        <View style={styles.headerCenter}>
          <Text style={styles.h1}>{t("care.myProducts.title")}</Text>
          <Text style={styles.count}>{rows.length} ta</Text>
        </View>
        <Pressable
          style={styles.scanBtn}
          onPress={() => goMorph(navigation, "MorphIngredient")}
          accessibilityLabel={t("care.myProducts.scan")}
        >
          <Ionicons name="scan-outline" size={18} color={colors.onAccent} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.fg} />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="bag-handle-outline" size={30} color={colors.fg} />
          </View>
          <Text style={styles.emptyTitle}>{t("care.myProducts.emptyTitle")}</Text>
          <Text style={styles.emptySub}>{t("care.myProducts.emptySub")}</Text>
          <View style={styles.emptyActions}>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => goMorph(navigation, "MorphIngredient")}
            >
              <Ionicons name="scan" size={16} color={colors.onAccent} />
              <Text style={styles.primaryBtnText}>{t("care.myProducts.scan")}</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => setCatalogOpen(true)}
            >
              <Text style={styles.secondaryBtnText}>{t("care.catalog.title")}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.pageScroll}
          contentContainerStyle={[
            styles.grid,
            { paddingBottom: safeBottom(insets.bottom, 20) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageSub}>{t("care.myProducts.pageSub")}</Text>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <Ionicons name="scan-outline" size={12} color={colors.fg} />
              <Text style={styles.legendText}>
                {t("care.myProducts.source.scanHint", { defaultValue: "Skan orqali" })}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Ionicons name="sparkles-outline" size={12} color={colors.fg} />
              <Text style={styles.legendText}>
                {t("care.myProducts.source.recommendedHint", {
                  defaultValue: "Morf tavsiyasi",
                })}
              </Text>
            </View>
          </View>
          <View style={styles.gridRow}>
            {rows.map((p) => {
              const meta = SOURCE_META[p.source] ?? SOURCE_META.catalog;
              const img = resolveMediaUrl(p.image_url, { width: 400 }) || p.image_url;
              return (
                <View key={p.id} style={styles.card}>
                  <Pressable
                    style={styles.cardTap}
                    onPress={() => navigation.navigate("CareProductDetail", { productId: p.id })}
                  >
                    <View style={styles.cardMedia}>
                      {img ? (
                        <Image source={{ uri: img }} style={styles.cardImg} contentFit="cover" />
                      ) : (
                        <LinearGradient
                          colors={[colors.promo, colors.promo]}
                          style={[styles.cardImg, styles.cardPh]}
                        >
                          <Ionicons name="flask-outline" size={22} color={colors.fg} />
                        </LinearGradient>
                      )}
                      <View style={[styles.sourcePill, { backgroundColor: colors.promo }]}>
                        <Ionicons name={meta.icon} size={10} color={colors.fg} />
                        <Text style={[styles.sourceText, { color: colors.fg }]}>
                          {t(`care.myProducts.source.${p.source}`, { defaultValue: p.source })}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={styles.cardName} numberOfLines={2}>
                        {p.name}
                      </Text>
                      {p.brand ? (
                        <Text style={styles.cardBrand} numberOfLines={1}>
                          {p.brand}
                        </Text>
                      ) : null}
                      <Text style={styles.cardMeta} numberOfLines={1}>
                        {t(`care.catalog.categories.${p.category}`, { defaultValue: p.category })}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    style={styles.removeBtn}
                    onPress={() => onRemove(p)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={t("care.myProducts.remove")}
                  >
                    <Ionicons name="trash-outline" size={13} color={colors.muted} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      <CareCatalogSheet
        visible={catalogOpen}
        excludeIds={rows.map((r) => r.id)}
        bottomInset={insets.bottom}
        onClose={() => setCatalogOpen(false)}
        onAdded={() => {
          void reload({ silent: true });
        }}
      />
    </View>
  );
}

function createProductStyles(colors: ShellChrome) {
  return StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: colors.bg },
  pageScroll: { flex: 1, minHeight: 0 },
  deleteToast: {
    position: "absolute",
    left: scale(16),
    right: scale(16),
    zIndex: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(16),
    backgroundColor: colors.fg,
    shadowColor: "#111111",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  deleteToastIcon: {
    width: scale(28),
    height: scale(28),
    borderRadius: moderateScale(14),
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteToastEyebrow: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "700",
    color: "rgba(255,255,255,0.65)",
  },
  deleteToastTitle: {
    ...morphFont,
    fontSize: fontSize(13),
    fontWeight: "700",
    color: colors.onAccent,
  },
  header: {
    height: verticalScale(80),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: H_PAD,
    paddingBottom: 0,
  },
  iconBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(20),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
  },
  scanBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(20),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.fg,
  },
  headerCenter: { flex: 1, alignItems: "center", gap: moderateScale(2) },
  h1: {
    ...morphFont,
    fontSize: fontSize(17),
    fontWeight: "700",
    color: colors.fg,
  },
  count: {
    ...morphFont,
    fontSize: fontSize(12),
    color: colors.muted,
    fontWeight: "600",
  },
  pageSub: {
    ...morphFont,
    width: "100%",
    marginBottom: verticalScale(8),
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: colors.muted,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: moderateScale(10),
    marginBottom: verticalScale(12),
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
    backgroundColor: colors.surface,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
  },
  legendText: { ...morphFont, fontSize: fontSize(11), fontWeight: "600", color: colors.muted },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(28),
    gap: moderateScale(8),
  },
  emptyIcon: {
    width: scale(72),
    height: scale(72),
    borderRadius: moderateScale(24),
    backgroundColor: colors.promo,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(8),
  },
  emptyTitle: { ...morphFont, fontSize: fontSize(18), fontWeight: "700", color: colors.fg, textAlign: "center" },
  emptySub: {
    ...morphFont,
    fontSize: fontSize(13),
    lineHeight: fontSize(19),
    color: colors.muted,
    textAlign: "center",
    marginBottom: verticalScale(12),
  },
  emptyActions: { width: "100%", gap: moderateScale(10) },
  primaryBtn: {
    height: verticalScale(48),
    borderRadius: 999,
    backgroundColor: colors.fg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(8),
  },
  primaryBtnText: { ...morphFont, fontSize: fontSize(14), fontWeight: "700", color: colors.onAccent },
  secondaryBtn: {
    height: verticalScale(48),
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { ...morphFont, fontSize: fontSize(14), fontWeight: "600", color: colors.fg },
  grid: { paddingHorizontal: H_PAD, paddingTop: verticalScale(4) },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
  },
  card: {
    width: COL_W,
    backgroundColor: colors.surface,
    borderRadius: moderateScale(14),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
    position: "relative",
  },
  cardTap: {
    width: "100%",
  },
  cardMedia: {
    width: "100%",
    height: COL_W * 0.78,
    backgroundColor: colors.promo,
    position: "relative",
  },
  cardImg: { width: "100%", height: "100%" },
  cardPh: { alignItems: "center", justifyContent: "center" },
  removeBtn: {
    position: "absolute",
    top: verticalScale(6),
    right: scale(6),
    zIndex: 4,
    width: scale(28),
    height: scale(28),
    borderRadius: moderateScale(14),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
  },
  sourcePill: {
    position: "absolute",
    left: scale(6),
    bottom: verticalScale(6),
    borderRadius: 999,
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(3),
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(3),
  },
  sourceText: { ...morphFont, fontSize: fontSize(9), fontWeight: "700" },
  cardBody: { paddingHorizontal: scale(8), paddingVertical: verticalScale(8), gap: 1, minHeight: verticalScale(58) },
  cardName: { ...morphFont, fontSize: fontSize(12), fontWeight: "700", color: colors.fg, lineHeight: fontSize(15) },
  cardBrand: { ...morphFont, fontSize: fontSize(10), color: colors.muted },
  cardMeta: { ...morphFont, fontSize: fontSize(9), color: colors.muted, marginTop: 1 },
  });
}
