import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useRef, useState } from "react";
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
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useShellNavigation } from "../../lib/shell-nav";
import {
  loadMyProducts,
  removeMyProduct,
  type MyCareProduct,
} from "../../lib/morph-my-products";
import type { MorphCareStackParamList } from "../../navigation/MorphCareStack";
import { morphFont } from "../../theme/morph-font";

type Props = NativeStackScreenProps<MorphCareStackParamList, "CareMyProducts">;

const GAP = 8;
const H_PAD = 14;
const COL_W = (Dimensions.get("window").width - H_PAD * 2 - GAP) / 2;

const SOURCE_META: Record<
  MyCareProduct["source"],
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  scan: { icon: "scan-outline", color: "#111111", bg: "#F0F0F0" },
  recommended: { icon: "sparkles-outline", color: "#111111", bg: "#F0F0F0" },
  catalog: { icon: "grid-outline", color: "#334155", bg: "#F0F0F0" },
};

export function MorphCareMyProductsScreen({ navigation }: Props) {
  useHideTabBar();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { goMorph } = useShellNavigation();
  const [rows, setRows] = useState<MyCareProduct[]>([]);
  const [loading, setLoading] = useState(true);
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

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await loadMyProducts());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

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
        colors={["#FAFAFA", "#F0F0F0", "#FAFAFA"]}
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
        <Pressable
          style={styles.iconBtn}
          onPress={() => {
            const routes = navigation.getState?.()?.routes;
            if (routes && routes.length > 1) navigation.goBack();
            else navigation.navigate("CareHome");
          }}
          hitSlop={8}
          accessibilityLabel={t("common.back")}
        >
          <Ionicons name="chevron-back" size={20} color="#111111" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.h1}>{t("care.myProducts.title")}</Text>
          <Text style={styles.count}>{rows.length} ta</Text>
        </View>
        <Pressable
          style={styles.scanBtn}
          onPress={() => goMorph(navigation, "MorphIngredient")}
          accessibilityLabel={t("care.myProducts.scan")}
        >
          <Ionicons name="scan-outline" size={18} color="#fff" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#111111" />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="bag-handle-outline" size={30} color="#111111" />
          </View>
          <Text style={styles.emptyTitle}>{t("care.myProducts.emptyTitle")}</Text>
          <Text style={styles.emptySub}>{t("care.myProducts.emptySub")}</Text>
          <View style={styles.emptyActions}>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => goMorph(navigation, "MorphIngredient")}
            >
              <Ionicons name="scan" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>{t("care.myProducts.scan")}</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate("CareHome", { openSearch: true })}
            >
              <Text style={styles.secondaryBtnText}>{t("care.catalog.title")}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.grid,
            { paddingBottom: Math.max(insets.bottom, 20) + 20 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageSub}>{t("care.myProducts.pageSub")}</Text>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <Ionicons name="scan-outline" size={12} color="#111111" />
              <Text style={styles.legendText}>
                {t("care.myProducts.source.scanHint", { defaultValue: "Skan orqali" })}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Ionicons name="sparkles-outline" size={12} color="#111111" />
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
              return (
                <View key={p.id} style={styles.card}>
                  <Pressable
                    style={styles.cardTap}
                    onPress={() => navigation.navigate("CareProductDetail", { productId: p.id })}
                  >
                    <View style={styles.cardMedia}>
                      {p.image_url ? (
                        <Image source={{ uri: p.image_url }} style={styles.cardImg} contentFit="cover" />
                      ) : (
                        <LinearGradient
                          colors={["#F0F0F0", "#F0F0F0"]}
                          style={[styles.cardImg, styles.cardPh]}
                        >
                          <Ionicons name="flask-outline" size={22} color="#111111" />
                        </LinearGradient>
                      )}
                      <View style={[styles.sourcePill, { backgroundColor: meta.bg }]}>
                        <Ionicons name={meta.icon} size={10} color={meta.color} />
                        <Text style={[styles.sourceText, { color: meta.color }]}>
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
                    <Ionicons name="trash-outline" size={13} color="#64748B" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFA" },
  deleteToast: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "#111111",
    shadowColor: "#111111",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  deleteToastIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteToastEyebrow: {
    ...morphFont,
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.65)",
  },
  deleteToastTitle: {
    ...morphFont,
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  header: {
    height: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: H_PAD,
    paddingBottom: 0,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
  },
  scanBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
  },
  headerCenter: { flex: 1, alignItems: "center", gap: 2 },
  h1: {
    ...morphFont,
    fontSize: 17,
    fontWeight: "700",
    color: "#111111",
  },
  count: {
    ...morphFont,
    fontSize: 12,
    color: "rgba(15,23,42,0.45)",
    fontWeight: "600",
  },
  pageSub: {
    ...morphFont,
    width: "100%",
    marginBottom: 8,
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(15,23,42,0.5)",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
  },
  legendText: { ...morphFont, fontSize: 11, fontWeight: "600", color: "#475569" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 8,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { ...morphFont, fontSize: 18, fontWeight: "700", color: "#111111", textAlign: "center" },
  emptySub: {
    ...morphFont,
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(15,23,42,0.5)",
    textAlign: "center",
    marginBottom: 12,
  },
  emptyActions: { width: "100%", gap: 10 },
  primaryBtn: {
    height: 48,
    borderRadius: 999,
    backgroundColor: "#111111",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: { ...morphFont, fontSize: 14, fontWeight: "700", color: "#fff" },
  secondaryBtn: {
    height: 48,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { ...morphFont, fontSize: 14, fontWeight: "600", color: "#111111" },
  grid: { paddingHorizontal: H_PAD, paddingTop: 4 },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
  },
  card: {
    width: COL_W,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
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
    backgroundColor: "#F0F0F0",
    position: "relative",
  },
  cardImg: { width: "100%", height: "100%" },
  cardPh: { alignItems: "center", justifyContent: "center" },
  removeBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    zIndex: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
  },
  sourcePill: {
    position: "absolute",
    left: 6,
    bottom: 6,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  sourceText: { ...morphFont, fontSize: 9, fontWeight: "700" },
  cardBody: { paddingHorizontal: 8, paddingVertical: 8, gap: 1, minHeight: 58 },
  cardName: { ...morphFont, fontSize: 12, fontWeight: "700", color: "#111111", lineHeight: 15 },
  cardBrand: { ...morphFont, fontSize: 10, color: "rgba(15,23,42,0.55)" },
  cardMeta: { ...morphFont, fontSize: 9, color: "rgba(15,23,42,0.4)", marginTop: 1 },
});
