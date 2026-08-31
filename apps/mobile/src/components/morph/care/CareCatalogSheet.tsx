import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { fetchCareProducts, toggleCareProductLike, type CareProduct } from "../../../api/care";
import { resolveMediaUrl } from "../../../api/media";
import { useAuth } from "../../../auth/AuthContext";
import { addMyProduct } from "../../../lib/morph-my-products";
import { morphFont } from "../../../theme/morph-font";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../../utils/responsive";
import { CareProductPreviewSheet } from "./CareProductPreviewSheet";
import { CareCatalogMark } from "./CareCatalogMark";

type Props = {
  visible: boolean;
  excludeIds: number[];
  bottomInset: number;
  onClose: () => void;
  onAdded: () => void;
};

const DEFAULT_QUIZ = {
  condition: "normal" as const,
  texture: "straight" as const,
  colorStatus: "natural" as const,
};

export function CareCatalogSheet({
  visible,
  excludeIds,
  bottomInset,
  onClose,
  onAdded,
}: Props) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { width: winW, height: winH } = useWindowDimensions();
  const [catalog, setCatalog] = useState<CareProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [sessionAddedIds, setSessionAddedIds] = useState<number[]>([]);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const sheetY = useRef(new Animated.Value(winH)).current;
  const inputRef = useRef<TextInput>(null);

  const sheetH = useMemo(() => {
    const topGap = Math.max(48, Math.round(winH * 0.08));
    return Math.max(360, winH - topGap);
  }, [winH]);

  const cols = winW >= 720 ? 3 : 2;
  const gap = 8;
  const hPad = 24;
  const cardW = Math.floor((winW - hPad - gap * (cols - 1)) / cols);

  const excludeRef = useRef(excludeIds);
  excludeRef.current = excludeIds;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ids = excludeRef.current;
      const rows = await fetchCareProducts({
        order: "likes",
        exclude_mine: true,
        exclude_ids: ids.length ? ids : undefined,
      });
      setCatalog(rows);
    } catch {
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setQuery("");
    setSessionAddedIds([]);
    setPreviewId(null);
    sheetY.setValue(sheetH);
    Animated.spring(sheetY, {
      toValue: 0,
      friction: 9,
      tension: 68,
      useNativeDriver: true,
    }).start(() => inputRef.current?.focus());
    void load();
  }, [visible, load, sheetH, sheetY]);

  const close = useCallback(() => {
    Keyboard.dismiss();
    setPreviewId(null);
    Animated.timing(sheetY, {
      toValue: sheetH,
      duration: 260,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setQuery("");
      onClose();
    });
  }, [onClose, sheetH, sheetY]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.15,
        onPanResponderGrant: () => {
          sheetY.stopAnimation();
          Keyboard.dismiss();
        },
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) sheetY.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > 80 || g.vy > 0.8) {
            close();
            return;
          }
          Animated.spring(sheetY, {
            toValue: 0,
            friction: 9,
            tension: 68,
            useNativeDriver: true,
          }).start();
        },
      }),
    [close, sheetY],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const mine = new Set(excludeIds);
    const session = new Set(sessionAddedIds);
    let list = catalog
      .filter((p) => !mine.has(p.id) || session.has(p.id))
      .map((p) => ({
        ...p,
        added: session.has(p.id),
        image: resolveMediaUrl(p.image_url, { width: 360 }) || p.image_url,
      }));
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.brand || "").toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q),
      );
    }
    list.sort(
      (a, b) =>
        (b.likes_count ?? 0) - (a.likes_count ?? 0) || a.name.localeCompare(b.name),
    );
    return list.slice(0, 40);
  }, [catalog, excludeIds, query, sessionAddedIds]);

  const preview = previewId == null ? null : catalog.find((p) => p.id === previewId) ?? null;
  const previewAdded = preview
    ? sessionAddedIds.includes(preview.id) || excludeIds.includes(preview.id)
    : false;

  const addProduct = useCallback(
    async (product: CareProduct) => {
      if (sessionAddedIds.includes(product.id)) return;
      await addMyProduct({
        id: product.id,
        name: product.name,
        brand: product.brand,
        category: product.category,
        image_url: product.image_url,
        source: "catalog",
      });
      setSessionAddedIds((prev) => (prev.includes(product.id) ? prev : [...prev, product.id]));
      onAdded();
    },
    [onAdded, sessionAddedIds],
  );

  const onLike = useCallback(
    async (productId: number) => {
      if (!isAuthenticated) return;
      setCatalog((prev) =>
        prev.map((p) =>
          p.id === productId
            ? {
                ...p,
                liked_by_me: !p.liked_by_me,
                likes_count: Math.max(0, (p.likes_count ?? 0) + (p.liked_by_me ? -1 : 1)),
              }
            : p,
        ),
      );
      try {
        const res = await toggleCareProductLike(productId);
        setCatalog((prev) =>
          prev.map((p) =>
            p.id === productId
              ? { ...p, liked_by_me: res.liked, likes_count: res.likes_count }
              : p,
          ),
        );
      } catch {
        void load();
      }
    },
    [isAuthenticated, load],
  );

  if (!visible) return null;

  return (
    <>
      <Pressable
        style={styles.backdrop}
        onPress={close}
        accessibilityLabel={t("common.back")}
      />
      <Animated.View
        style={[
          styles.sheet,
          {
            height: sheetH,
            paddingBottom: Math.max(bottomInset, 12),
            transform: [{ translateY: sheetY }],
          },
        ]}
      >
        <View {...pan.panHandlers} style={styles.chrome}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color="#111111" />
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={setQuery}
                placeholder={t("care.catalog.search")}
                placeholderTextColor="#737373"
                style={styles.searchInput}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>
            <Pressable
              style={styles.closeBtn}
              onPress={close}
              accessibilityLabel={t("common.back")}
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color="#111111" />
            </Pressable>
          </View>
          <Text style={styles.title}>{t("care.catalog.title")}</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#111111" />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
          >
            {rows.length === 0 ? (
              <Text style={styles.empty}>{t("care.catalog.empty")}</Text>
            ) : (
              <View style={[styles.grid, { gap }]}>
                {rows.map((item) => (
                  <Pressable
                    key={item.id}
                    style={[styles.card, { width: cardW, maxWidth: cardW }]}
                    onPress={() => setPreviewId(item.id)}
                  >
                    <View style={styles.media}>
                      {item.image ? (
                        <Image source={{ uri: item.image }} style={styles.img} contentFit="contain" />
                      ) : (
                        <View style={[styles.img, styles.ph]}>
                          <Ionicons name="flask-outline" size={22} color="#111111" />
                        </View>
                      )}
                      <CareCatalogMark />
                      <Pressable
                        style={styles.likeBtn}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          void onLike(item.id);
                        }}
                        hitSlop={6}
                      >
                        <Ionicons
                          name={item.liked_by_me ? "heart" : "heart-outline"}
                          size={13}
                          color={item.liked_by_me ? "#EF4444" : "#111111"}
                        />
                      </Pressable>
                      <View style={styles.likeCount}>
                        <Text style={styles.likeCountText}>{item.likes_count ?? 0}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.name}
                    </Text>
                    {item.brand ? (
                      <Text style={styles.cardBrand} numberOfLines={1}>
                        {item.brand}
                      </Text>
                    ) : null}
                    <View style={styles.addWrap}>
                      <Pressable
                        style={[styles.addBtn, item.added && styles.addBtnAdded]}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          if (item.added) return;
                          void addProduct(item);
                        }}
                      >
                        <Ionicons
                          name={item.added ? "checkmark-circle" : "add-outline"}
                          size={14}
                          color={item.added ? "#111111" : "#fff"}
                        />
                        <Text
                          style={[styles.addBtnText, item.added && styles.addBtnTextAdded]}
                          numberOfLines={1}
                        >
                          {item.added
                            ? t("care.myProducts.alreadyAdded")
                            : t("care.myProducts.addShort", { defaultValue: "Qo‘shish" })}
                        </Text>
                      </Pressable>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </Animated.View>

      <Modal
        visible={preview != null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPreviewId(null)}
      >
        <View style={styles.previewWrap} pointerEvents="box-none">
          <Pressable style={styles.previewBackdrop} onPress={() => setPreviewId(null)} />
          {preview ? (
            <CareProductPreviewSheet
              product={preview}
              quiz={DEFAULT_QUIZ}
              added={previewAdded}
              bottomInset={Math.max(bottomInset, 12)}
              onClose={() => setPreviewId(null)}
              onAdd={() => {
                if (previewAdded) return;
                void addProduct(preview);
              }}
            />
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(8,12,20,0.35)",
    zIndex: 20,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 21,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: moderateScale(22),
    borderTopRightRadius: moderateScale(22),
    overflow: "hidden",
  },
  chrome: {
    paddingTop: verticalScale(8),
    paddingHorizontal: scale(12),
    gap: moderateScale(10),
    backgroundColor: "#FFFFFF",
  },
  handle: {
    alignSelf: "center",
    width: scale(40),
    height: verticalScale(4),
    borderRadius: moderateScale(2),
    backgroundColor: "rgba(15,23,42,0.18)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
  },
  searchBar: {
    flex: 1,
    minWidth: 0,
    height: verticalScale(42),
    borderRadius: 999,
    backgroundColor: "#F4F4F5",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(12),
    gap: moderateScale(8),
  },
  searchInput: {
    ...morphFont,
    flex: 1,
    fontSize: fontSize(14),
    color: "#111111",
    paddingVertical: 0,
  },
  closeBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: moderateScale(18),
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...morphFont,
    marginBottom: verticalScale(4),
    fontSize: fontSize(15),
    fontWeight: "700",
    color: "#111111",
  },
  scroll: { flex: 1, minHeight: 0 },
  list: {
    paddingHorizontal: scale(12),
    paddingTop: verticalScale(4),
    paddingBottom: verticalScale(16),
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: {
    ...morphFont,
    paddingVertical: verticalScale(28),
    textAlign: "center",
    color: "rgba(15,23,42,0.45)",
    fontSize: fontSize(13),
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  card: {
    backgroundColor: "#FAFAFA",
    borderRadius: moderateScale(14),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
  },
  media: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#FFFFFF",
    position: "relative",
  },
  img: { width: "100%", height: "100%" },
  ph: { alignItems: "center", justifyContent: "center" },
  likeBtn: {
    position: "absolute",
    top: verticalScale(6),
    right: scale(6),
    width: scale(26),
    height: scale(26),
    borderRadius: moderateScale(13),
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  likeCount: {
    position: "absolute",
    left: scale(6),
    bottom: verticalScale(6),
    minWidth: scale(22),
    height: scale(22),
    borderRadius: moderateScale(11),
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(6),
  },
  likeCountText: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "700",
    color: "#111111",
  },
  cardTitle: {
    ...morphFont,
    marginTop: verticalScale(6),
    paddingHorizontal: scale(8),
    fontSize: fontSize(11),
    fontWeight: "700",
    color: "#111111",
    lineHeight: fontSize(14),
    minHeight: verticalScale(28),
  },
  cardBrand: {
    ...morphFont,
    marginTop: 1,
    paddingHorizontal: scale(8),
    fontSize: fontSize(10),
    color: "rgba(15,23,42,0.5)",
    marginBottom: verticalScale(6),
  },
  addWrap: {
    paddingHorizontal: scale(8),
    paddingBottom: verticalScale(8),
  },
  addBtn: {
    height: verticalScale(30),
    borderRadius: moderateScale(10),
    backgroundColor: "#111111",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(4),
    paddingHorizontal: scale(8),
  },
  addBtnAdded: {
    backgroundColor: "#F0F0F0",
  },
  addBtnText: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "700",
    color: "#fff",
  },
  addBtnTextAdded: {
    color: "#111111",
  },
  previewWrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  previewBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(8,12,20,0.4)",
  },
});
