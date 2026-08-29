import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Keyboard,
  Modal,
  Platform,
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
import { fetchCareAccess } from "../../api/ai";
import { resolveMediaUrl } from "../../api/media";
import { weatherIconName } from "../../api/weather";
import {
  fetchCareProducts,
  fetchHairCareProfile,
  toggleCareProductLike,
  updateHairCareProfile,
  type CareProduct,
  type HairColorStatus,
  type HairCondition,
  type HairTexture,
} from "../../api/care";
import { useAuth } from "../../auth/AuthContext";
import { CareProductPreviewSheet } from "../../components/morph/care/CareProductPreviewSheet";
import { CareRoutineSheet } from "../../components/morph/care/CareRoutineSheet";
import { DarkMeshAmbientBg } from "../../components/morph/care/DarkMeshAmbientBg";
import { useCareWeather } from "../../hooks/useCareWeather";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import {
  defaultQuiz,
  estimateProductFit,
  loadCareQuiz,
  saveCareQuiz,
  type CareQuizAnswers,
} from "../../lib/morph-ai-care";
import {
  addMyProduct,
  loadMyProducts,
  markCareOnboardingSeen,
  removeMyProduct,
  type MyCareProduct,
} from "../../lib/morph-my-products";
import { careHubLayout, weatherHeroImage } from "../../lib/weather-care-tips";
import type { MorphCareStackParamList } from "../../navigation/MorphCareStack";
import { useShellNavigation } from "../../lib/shell-nav";
import { morphFont } from "../../theme/morph-font";

type Props = NativeStackScreenProps<MorphCareStackParamList, "CareHome">;
type QuizStep = 0 | 1 | 2;
type ViewMode = "hub" | "flow";

const CARE_ACCESS_DEBUG = true;

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "hair", label: "Hair Cut" },
  { id: "face", label: "Face Care" },
  { id: "eye", label: "Eye care" },
  { id: "skin", label: "Skin Care" },
];

interface FeaturedProductItem {
  id: string;
  title: string;
  price: string;
  duration?: string;
  image: string;
  bgColors: [string, string, string];
  hasPlay?: boolean;
  fitScore?: number;
}

const FEATURED_PRODUCTS: FeaturedProductItem[] = [
  {
    id: "spray-1",
    title: "Skin care Spray",
    price: "$160",
    duration: "2 Min",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80",
    bgColors: ["#F0F0F0", "#F0F0F0", "#F0F0F0"],
    hasPlay: true,
  },
  {
    id: "eye-1",
    title: "Eye Care",
    price: "$150",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80",
    bgColors: ["#FAFAFA", "#F0F0F0", "#F0F0F0"],
  },
  {
    id: "hair-1",
    title: "Hair Serum",
    price: "$135",
    duration: "3 Min",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80",
    bgColors: ["#FAFAFA", "#F0F0F0", "#F0F0F0"],
    hasPlay: true,
  },
];

const CONDITION_OPTS: HairCondition[] = ["oily", "dry", "normal", "damaged"];
const TEXTURE_OPTS: HairTexture[] = ["straight", "wavy", "curly"];
const COLOR_OPTS: HairColorStatus[] = ["natural", "colored", "bleached"];

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function formatDayNumber(iso: string): string {
  const day = Number(iso.slice(8, 10));
  return Number.isFinite(day) ? String(day) : "—";
}

function buildFallbackDays(): { date: string; weekday_key: string; is_today: boolean }[] {
  const rows: { date: string; weekday_key: string; is_today: boolean }[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    rows.push({
      date: iso,
      weekday_key: WEEKDAY_KEYS[d.getDay()],
      is_today: i === 0,
    });
  }
  return rows;
}

function greetingKey(): string {
  const h = new Date().getHours();
  if (h < 12) return "care.routine.goodMorning";
  if (h < 18) return "care.routine.goodAfternoon";
  return "care.routine.goodEvening";
}

/** 1 like = 1 yurak; 2+ = 1.5 yurak; 0 da faqat raqam (tugma alohida). */
function LikeHeartsBadge({ count }: { count: number }) {
  const n = Math.max(0, count);
  return (
    <View style={likeStyles.wrap}>
      {n === 1 ? <Ionicons name="heart" size={10} color="#EF4444" /> : null}
      {n >= 2 ? (
        <View style={likeStyles.pair}>
          <Ionicons name="heart" size={10} color="#EF4444" />
          <View style={likeStyles.halfMask}>
            <Ionicons name="heart" size={10} color="#FECACA" />
            <View style={likeStyles.halfClip}>
              <Ionicons name="heart" size={10} color="#EF4444" />
            </View>
          </View>
        </View>
      ) : null}
      <Text style={likeStyles.count}>{n}</Text>
    </View>
  );
}

const likeStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  pair: { flexDirection: "row", alignItems: "center", gap: 1 },
  halfMask: { width: 10, height: 10, position: "relative" },
  halfClip: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 5,
    height: 10,
    overflow: "hidden",
  },
  count: {
    ...morphFont,
    fontSize: 11,
    fontWeight: "700",
    color: "#111111",
  },
});

export function MorphCareScreen({ navigation, route }: Props) {
  useHideTabBar();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();
  const avatarUrl = useMemo(
    () => resolveMediaUrl(user?.avatar, { width: 240 }) || "",
    [user?.avatar],
  );
  const userInitials = useMemo(() => {
    const name = (user?.full_name || user?.first_name || user?.email || "?").trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }, [user?.full_name, user?.first_name, user?.email]);
  const { goMorph, navigateRootTab } = useShellNavigation();
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<{ allowed: boolean; detail?: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("hub");
  const [selectedCat, setSelectedCat] = useState("all");
  const [quiz, setQuiz] = useState<CareQuizAnswers>(() => defaultQuiz());
  const [step, setStep] = useState<QuizStep | "plan">(0);
  const [catalog, setCatalog] = useState<CareProduct[]>([]);
  const [myProducts, setMyProducts] = useState<MyCareProduct[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [addToast, setAddToast] = useState<{ title: string; image: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  /** Shu search sessiyasida qo‘shilganlar — qayta ochilganda tozalanadi */
  const [sessionAddedIds, setSessionAddedIds] = useState<number[]>([]);
  const addDropY = useRef(new Animated.Value(-140)).current;
  const addOpacity = useRef(new Animated.Value(0)).current;
  const addScale = useRef(new Animated.Value(0.86)).current;
  const searchSheetY = useRef(new Animated.Value(829)).current;
  const previewSheetY = useRef(new Animated.Value(Dimensions.get("window").height)).current;
  const previewBackdropOp = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);
  const { data: weather, loading: weatherLoading } = useCareWeather();
  const { width: winW, height: winH } = useWindowDimensions();
  const hubLayout = useMemo(() => careHubLayout(winW, winH), [winW, winH]);
  const weatherKey = weather?.current?.condition_key ?? "unknown";
  const weatherTemp =
    weather?.current?.temperature_c != null
      ? `${Math.round(weather.current.temperature_c)}°`
      : "—";
  const weatherImg = weatherHeroImage(weatherKey);

  /** Sheet kategoriyalarga yaqin — o‘rtadagi gap minimal */
  const searchSheetHeight = useMemo(() => {
    const winH = Dimensions.get("window").height;
    const topBlock = insets.top + 4 + 48 + 4 + 40 + 33;
    return Math.max(829, winH - topBlock);
  }, [insets.top]);

  const playAddedAnimation = useCallback(
    (prod: { title: string; image: string }) => {
      setAddToast({ title: prod.title, image: prod.image });
      addDropY.setValue(-160);
      addOpacity.setValue(0);
      addScale.setValue(0.82);
      Animated.sequence([
        Animated.parallel([
          Animated.spring(addDropY, {
            toValue: insets.top + 12,
            friction: 7,
            tension: 68,
            useNativeDriver: true,
          }),
          Animated.timing(addOpacity, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(addScale, {
            toValue: 1,
            friction: 6,
            tension: 90,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(780),
        Animated.parallel([
          Animated.timing(addDropY, {
            toValue: -180,
            duration: 420,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(addOpacity, {
            toValue: 0,
            duration: 360,
            useNativeDriver: true,
          }),
          Animated.timing(addScale, {
            toValue: 0.88,
            duration: 360,
            useNativeDriver: true,
          }),
        ]),
      ]).start(({ finished }) => {
        if (finished) setAddToast(null);
      });
    },
    [addDropY, addOpacity, addScale, insets.top],
  );

  const reloadMyProducts = useCallback(async () => {
    const list = await loadMyProducts();
    setMyProducts(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reloadMyProducts();
    }, [reloadMyProducts]),
  );

  const handleBack = useCallback(() => {
    if (viewMode === "flow") {
      setViewMode("hub");
      return;
    }
    if (step !== "plan") {
      if (typeof step === "number" && step > 0) {
        setStep((step - 1) as QuizStep);
        return;
      }
      setViewMode("hub");
      setStep("plan");
      return;
    }
    const routes = navigation.getState?.()?.routes;
    if (routes && routes.length > 1) {
      navigation.goBack();
      return;
    }
    if (route.params?.returnTo) {
      goMorph(navigation, route.params.returnTo);
    } else {
      goMorph(navigation, "MorphTryOn");
    }
  }, [viewMode, step, navigation, route.params, goMorph]);

  const dayRows = weather?.days?.length ? weather.days.slice(0, 7) : buildFallbackDays();
  const selectedDate = dayRows[selectedDayIdx]?.date ?? new Date().toISOString().slice(0, 10);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    setPreviewId(null);
    setPreviewVisible(false);
    setSessionAddedIds([]);
    searchSheetY.setValue(searchSheetHeight);
    Animated.spring(searchSheetY, {
      toValue: 0,
      friction: 9,
      tension: 68,
      useNativeDriver: true,
    }).start(() => {
      searchInputRef.current?.focus();
    });
    requestAnimationFrame(() => searchInputRef.current?.focus());
    const excludeIds = myProducts.map((p) => p.id);
    void fetchCareProducts({
      order: "likes",
      exclude_mine: true,
      exclude_ids: excludeIds.length ? excludeIds : undefined,
    })
      .then((rows) => {
        if (rows.length) setCatalog(rows);
      })
      .catch(() => {});
  }, [myProducts, searchSheetHeight, searchSheetY]);

  const openCatalog = openSearch;

  const openMyProducts = useCallback(() => {
    navigation.navigate("CareMyProducts");
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!route.params?.openSearch) return;
      const q = route.params.q?.trim();
      if (q) setSearchQuery(q);
      navigation.setParams({ openSearch: undefined, q: undefined });
      requestAnimationFrame(() => openSearch());
    }, [route.params?.openSearch, route.params?.q, navigation, openSearch]),
  );

  const closeSearch = useCallback(() => {
    Keyboard.dismiss();
    setPreviewId(null);
    setPreviewVisible(false);
    setSessionAddedIds([]);
    Animated.timing(searchSheetY, {
      toValue: searchSheetHeight,
      duration: 280,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSearchOpen(false);
      setSearchQuery("");
    });
  }, [searchSheetHeight, searchSheetY]);

  const openTarkib = useCallback(() => {
    goMorph(navigation, "MorphIngredient");
  }, [navigation, goMorph]);

  const openSubscriptions = useCallback(() => {
    goMorph(navigation, "Profile", { screen: "Subscriptions" });
  }, [navigation, goMorph]);

  const openWeather = useCallback(() => {
    navigation.navigate("CareWeather");
  }, [navigation]);

  const openAssistant = useCallback(() => {
    navigateRootTab(navigation, "MorphChat");
  }, [navigation, navigateRootTab]);

  const openProduct = useCallback(
    (productId: number) => {
      navigation.navigate("CareProductDetail", { productId });
    },
    [navigation],
  );

  const openProductGuide = useCallback(
    (prod: {
      productId?: number;
      title: string;
      brand?: string;
      category?: string;
      usageText?: string;
      durationMinutes?: number;
      image?: string;
    }) => {
      navigation.navigate("CareProductGuide", {
        productId: prod.productId,
        productTitle: prod.title,
        brand: prod.brand,
        category: prod.category,
        usageText: prod.usageText,
        durationMinutes: prod.durationMinutes || 2,
        imageUrl: prod.image,
      });
    },
    [navigation],
  );

  const openParvarish = useCallback(() => {
    setViewMode("flow");
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const accessRes = CARE_ACCESS_DEBUG
        ? { allowed: true as const, detail: undefined }
        : await fetchCareAccess().catch(() => ({ allowed: false, detail: undefined }));
      setAccess(accessRes);
      if (!accessRes.allowed) return;

      const [saved, profile, myProds] = await Promise.all([
        loadCareQuiz(),
        fetchHairCareProfile().catch(() => null),
        loadMyProducts().catch(() => []),
      ]);
      setMyProducts(myProds);

      if (profile?.complete && profile.condition && profile.texture && profile.color_status) {
        const next: CareQuizAnswers = {
          condition: profile.condition as HairCondition,
          texture: profile.texture as HairTexture,
          colorStatus: profile.color_status as HairColorStatus,
        };
        setQuiz(next);
        await saveCareQuiz(next);
        setStep("plan");
      } else if (saved) {
        setQuiz(saved);
        setStep("plan");
      } else {
        setStep(0);
      }

      const products = await fetchCareProducts({ recommended: true }).catch(() => []);
      setCatalog(products);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const finishQuiz = async () => {
    setSaving(true);
    try {
      await saveCareQuiz(quiz);
      await updateHairCareProfile({
        condition: quiz.condition,
        texture: quiz.texture,
        color_status: quiz.colorStatus,
      }).catch(() => undefined);
      await markCareOnboardingSeen();
      const products = await fetchCareProducts({ recommended: true }).catch(() => []);
      setCatalog(products);
      setStep("plan");
      setViewMode("hub");
    } finally {
      setSaving(false);
    }
  };

  const displayProducts = useMemo(() => {
    type Card = {
      id: string;
      productId?: number;
      title: string;
      brand: string;
      price: string;
      category: string;
      duration: string;
      durationMinutes: number;
      image: string;
      bgColors: [string, string, string];
      isUserAdded: boolean;
      fitScore?: number;
      usageText?: string;
    };
    const list: Card[] = [];
    const myIds = new Set(myProducts.map((p) => p.id));

    // Mening mahsulotlarim — birinchi (agar bor bo‘lsa).
    myProducts.forEach((mp) => {
      list.push({
        id: `my-${mp.id}`,
        productId: mp.id,
        title: mp.name,
        brand: mp.brand || "MORF Care",
        price: mp.brand || "MORF Care",
        category: mp.category || "spray",
        duration: "2 Min",
        durationMinutes: 2,
        image:
          mp.image_url ||
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80",
        bgColors: ["#F0F0F0", "#F0F0F0", "#F0F0F0"],
        isUserAdded: true,
      });
    });

    // Soch holatiga mos tavsiyalar — har doim (mening mahsulotlaridan tashqari).
    const rankedCatalog = [...catalog]
      .filter((cp) => !myIds.has(cp.id))
      .map((cp) => ({ product: cp, fit: estimateProductFit(cp, quiz) }))
      .sort((a, b) => b.fit - a.fit);

    rankedCatalog.forEach(({ product: cp, fit }) => {
      list.push({
        id: `cat-${cp.id}`,
        productId: cp.id,
        title: cp.name,
        brand: cp.brand || "MORF Care",
        price: cp.brand || "MORF Care",
        category: cp.category,
        duration: cp.category === "mask" ? "5 Min" : "2 Min",
        durationMinutes: cp.category === "mask" ? 5 : 2,
        image:
          cp.image_url ||
          "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80",
        bgColors:
          cp.category === "mask"
            ? ["#F0F0F0", "#F0F0F0", "#F0F0F0"]
            : ["#FAFAFA", "#FAFAFA", "#F0F0F0"],
        isUserAdded: false,
        fitScore: fit,
        usageText: cp.usage_uz,
      });
    });

    if (list.length === 0) {
      return FEATURED_PRODUCTS.map((fp) => ({
        id: fp.id,
        title: fp.title,
        price: fp.price,
        duration: fp.duration,
        image: fp.image,
        bgColors: fp.bgColors,
        productId: undefined,
        brand: "Morf Care Pro",
        category: "spray",
        durationMinutes: 2,
        isUserAdded: false,
        fitScore: undefined,
        usageText: undefined,
      }));
    }

    if (selectedCat !== "all") {
      const filtered = list.filter((p) =>
        p.category.toLowerCase().includes(selectedCat.toLowerCase()),
      );
      return filtered.length > 0 ? filtered : list;
    }

    return list;
  }, [myProducts, catalog, quiz, selectedCat]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const mine = new Set(myProducts.map((m) => m.id));
    const session = new Set(sessionAddedIds);
    // Oldindan qo‘shilganlar yashirin; faqat shu sessiyada qo‘shilganlar "Qo‘shilgan" bilan qoladi
    let rows = catalog
      .filter((p) => !mine.has(p.id) || session.has(p.id))
      .map((p) => ({
        id: p.id,
        title: p.name,
        brand: p.brand,
        category: p.category,
        image: p.image_url,
        purpose: p.purpose_uz,
        usage: p.usage_uz,
        likes_count: p.likes_count ?? 0,
        liked_by_me: Boolean(p.liked_by_me),
        added: session.has(p.id),
      }));
    if (q) {
      rows = rows.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    }
    rows.sort((a, b) => b.likes_count - a.likes_count || a.title.localeCompare(b.title));
    return rows.slice(0, 40);
  }, [catalog, myProducts, searchQuery, sessionAddedIds]);

  const previewProduct = useMemo(
    () => (previewId == null ? null : catalog.find((p) => p.id === previewId) ?? null),
    [catalog, previewId],
  );
  const previewAdded = previewProduct
    ? sessionAddedIds.includes(previewProduct.id) ||
      myProducts.some((p) => p.id === previewProduct.id)
    : false;

  const openPreview = useCallback((productId?: number) => {
    if (!productId) return;
    setPreviewId(productId);
    setPreviewVisible(true);
    previewSheetY.setValue(Dimensions.get("window").height);
    previewBackdropOp.setValue(0);
    Animated.parallel([
      Animated.timing(previewBackdropOp, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(previewSheetY, {
        toValue: 0,
        friction: 9,
        tension: 65,
        useNativeDriver: true,
      }),
    ]).start();
  }, [previewBackdropOp, previewSheetY]);

  const closePreview = useCallback(() => {
    Animated.parallel([
      Animated.timing(previewBackdropOp, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(previewSheetY, {
        toValue: Dimensions.get("window").height,
        duration: 260,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      setPreviewVisible(false);
      setPreviewId(null);
    });
  }, [previewBackdropOp, previewSheetY]);

  const openPreviewCare = useCallback(() => {
    closePreview();
    setSearchOpen(false);
    setSearchQuery("");
    setSessionAddedIds([]);
    setViewMode("flow");
  }, [closePreview]);

  const addFromSearch = useCallback(
    async (productId: number) => {
      const p = catalog.find((c) => c.id === productId);
      if (!p) return;
      const inSession = sessionAddedIds.includes(p.id);
      if (inSession) {
        const next = await removeMyProduct(p.id);
        setMyProducts(next);
        setSessionAddedIds((prev) => prev.filter((id) => id !== p.id));
        return;
      }
      const next = await addMyProduct({
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        image_url: p.image_url,
        source: "catalog",
      });
      setMyProducts(next);
      setSessionAddedIds((prev) => (prev.includes(p.id) ? prev : [...prev, p.id]));
      playAddedAnimation({
        title: p.name,
        image: p.image_url || "",
      });
    },
    [catalog, playAddedAnimation, sessionAddedIds],
  );

  const onToggleSearchLike = useCallback(
    async (productId: number) => {
      if (!isAuthenticated) {
        goMorph(navigation, "Profile");
        return;
      }
      // Optimistic UI — tugma darhol javob bersin
      setCatalog((prev) =>
        prev.map((p) => {
          if (p.id !== productId) return p;
          const liked = !p.liked_by_me;
          const count = Math.max(0, (p.likes_count ?? 0) + (liked ? 1 : -1));
          return { ...p, liked_by_me: liked, likes_count: count };
        }),
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
        // Rollback
        setCatalog((prev) =>
          prev.map((p) => {
            if (p.id !== productId) return p;
            const liked = !p.liked_by_me;
            const count = Math.max(0, (p.likes_count ?? 0) + (liked ? 1 : -1));
            return { ...p, liked_by_me: liked, likes_count: count };
          }),
        );
      }
    },
    [goMorph, isAuthenticated, navigation],
  );

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color="rgba(255,255,255,0.5)" />
      </View>
    );
  }

  if (access && !access.allowed) {
    return (
      <View style={[styles.root, styles.pad, { paddingTop: insets.top + 12 }]}>
        <View style={styles.navBarRow}>
          <Pressable
            style={styles.navCircleBtn}
            onPress={handleBack}
            accessibilityLabel={t("common.back")}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <View style={{ width: 42 }} />
        </View>
        <Text style={[styles.muted, { marginTop: 12 }]}>{t("care.badge")}</Text>
        <View style={styles.lockWrap}>
          <Ionicons name="lock-closed" size={28} color="rgba(255,255,255,0.5)" />
          <Text style={styles.lockTitle}>{t("care.badge")}</Text>
          <Text style={styles.lockSub}>{access.detail || t("care.proOnly")}</Text>
          <Pressable style={[styles.primaryBtnDark, { marginTop: 24 }]} onPress={openSubscriptions}>
            <Text style={styles.primaryBtnDarkText}>{t("care.seePlans")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (step !== "plan") {
    const quizMeta =
      step === 0
        ? {
            title: t("care.onboarding.step1Title"),
            sub: t("care.onboarding.step1Sub"),
            opts: CONDITION_OPTS,
            value: quiz.condition,
            labelKey: "care.conditions",
            set: (v: HairCondition) => setQuiz((q) => ({ ...q, condition: v })),
          }
        : step === 1
          ? {
              title: t("care.onboarding.step2Title"),
              sub: t("care.onboarding.step2Sub"),
              opts: TEXTURE_OPTS,
              value: quiz.texture,
              labelKey: "care.textures",
              set: (v: HairTexture) => setQuiz((q) => ({ ...q, texture: v })),
            }
          : {
              title: t("care.onboarding.step3Title"),
              sub: t("care.onboarding.step3Sub"),
              opts: COLOR_OPTS,
              value: quiz.colorStatus,
              labelKey: "care.colors",
              set: (v: HairColorStatus) => setQuiz((q) => ({ ...q, colorStatus: v })),
            };

    return (
      <View style={styles.onboardRoot}>
        <LinearGradient
          colors={["#F0F0F0", "#F0F0F0", "#FAFAFA"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 0.55 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.onboardPad, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.navBarRow}>
            <Pressable
              style={styles.navCircleBtnLight}
              onPress={handleBack}
              hitSlop={8}
              accessibilityLabel={t("common.back")}
            >
              <Ionicons name="chevron-back" size={20} color="#111" />
            </Pressable>
            <Text style={styles.onboardBadge}>{t("care.onboarding.badge")}</Text>
            <View style={{ width: 42 }} />
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.onboardH1}>{quizMeta.title}</Text>
            <Text style={styles.onboardSub}>{quizMeta.sub}</Text>
            <View style={styles.progressTrackLight}>
              <View style={[styles.progressFillLight, { width: `${((step + 1) / 3) * 100}%` }]} />
            </View>
            <View style={styles.optGridLight}>
              {quizMeta.opts.map((opt) => {
                const on = quizMeta.value === opt;
                return (
                  <Pressable
                    key={opt}
                    style={[styles.optCardLight, on && styles.optCardLightOn]}
                    onPress={() => quizMeta.set(opt as never)}
                  >
                    <Text style={[styles.optTextLight, on && styles.optTextLightOn]}>
                      {t(`${quizMeta.labelKey}.${opt}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <View style={styles.onboardFooter}>
            {typeof step === "number" && step > 0 ? (
              <Pressable
                style={styles.ghostBtnLight}
                onPress={() => setStep((s) => (typeof s === "number" && s > 0 ? ((s - 1) as QuizStep) : 0))}
              >
                <Text style={styles.ghostBtnLightText}>{t("common.back")}</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.primaryBtnLight, styles.flexGrow, saving && styles.disabled]}
              disabled={saving}
              onPress={() => {
                if (step === 2) void finishQuiz();
                else setStep((step + 1) as QuizStep);
              }}
            >
              <Text style={styles.primaryBtnLightText}>
                {step === 2 ? t("care.onboarding.finish") : t("common.next")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (viewMode === "hub") {
    return (
      <View style={styles.hubRoot}>
        <StatusBar style="dark" />
        {addToast ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.addToast,
              {
                opacity: addOpacity,
                transform: [{ translateY: addDropY }, { scale: addScale }],
              },
            ]}
          >
            <Image source={{ uri: addToast.image }} style={styles.addToastImg} />
            <View style={styles.addToastBody}>
              <Text style={styles.addToastEyebrow}>{t("care.myProducts.addedTitle")}</Text>
              <Text style={styles.addToastTitle} numberOfLines={1}>
                {addToast.title}
              </Text>
            </View>
            <View style={styles.addToastCheck}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
          </Animated.View>
        ) : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#FAFAFA" }]} />

        <ScrollView
          style={styles.hubScroll}
          contentContainerStyle={{
            paddingTop: searchOpen ? insets.top + 6 : 0,
            paddingBottom: searchOpen ? 16 : 0,
          }}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={true}
          overScrollMode="never"
        >
          {/* Hero — ob-havo + ambient */}
          {!searchOpen ? (
          <View style={[styles.promoWrap, { paddingTop: insets.top + 6, paddingHorizontal: hubLayout.hPad }]}>
            <View style={[styles.promoCard, { height: hubLayout.promoH }]}>
              <Image
                source={{ uri: weatherImg }}
                style={styles.promoHeroImg}
                resizeMode="cover"
              />
              <LinearGradient
                colors={["rgba(8,12,20,0.35)", "rgba(8,12,20,0.15)", "rgba(8,12,20,0.82)"]}
                locations={[0, 0.38, 1]}
                style={StyleSheet.absoluteFill}
              />

              <View style={styles.promoTop}>
                <Pressable
                  style={styles.promoBackBtn}
                  onPress={handleBack}
                  accessibilityLabel={t("common.back")}
                  hitSlop={8}
                >
                  <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
                </Pressable>
                <Text style={styles.promoLogoText}>PARVARISH</Text>
                <View style={styles.promoAvatarRing}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.promoAvatar} resizeMode="cover" />
                  ) : (
                    <View style={[styles.promoAvatar, styles.promoAvatarFallback]}>
                      <Text style={styles.promoAvatarInitials}>{userInitials}</Text>
                    </View>
                  )}
                </View>
              </View>

              <Pressable
                style={styles.promoCopy}
                onPress={openWeather}
                accessibilityRole="button"
                accessibilityLabel={t("care.weather.title")}
              >
                <View style={styles.promoChipRow}>
                  <View style={styles.promoStatusChip}>
                    <Ionicons name={weatherIconName(weatherKey)} size={12} color="#FFFFFF" />
                    <Text style={styles.promoStatusChipText} numberOfLines={1}>
                      {weatherLoading
                        ? "…"
                        : t(`care.weather.conditions.${weatherKey}`)}
                    </Text>
                  </View>
                  {weather?.current?.humidity_pct != null ? (
                    <Text style={styles.promoEyebrow}>
                      {t("care.weather.humidityShort")} {Math.round(weather.current.humidity_pct)}%
                    </Text>
                  ) : (
                    <Text style={styles.promoEyebrow}>{t("care.weather.title")}</Text>
                  )}
                </View>
                <View style={styles.promoWeatherRow}>
                  <Text style={styles.promoTemp}>{weatherTemp}</Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.promoTitle} numberOfLines={2}>
                      {t("care.promoTitle")}
                    </Text>
                    <Text style={styles.promoHint} numberOfLines={1}>
                      {weather?.location_label || t("care.promoHint")}
                    </Text>
                  </View>
                </View>
                <View style={styles.promoBtn}>
                  <Text style={styles.promoBtnText}>{t("care.promoCta")}</Text>
                  <Ionicons name="arrow-forward" size={13} color="#0A0A0A" />
                </View>
              </Pressable>
            </View>
          </View>
          ) : (
            <View style={{ height: 4 }} />
          )}

          {/* Search Bar — filter icon ichida */}
          <View style={styles.searchSection}>
            <View style={[styles.searchBar, searchOpen && styles.searchBarActive]}>
              <Ionicons name="search-outline" size={18} color={searchOpen ? "#111111" : "#737373"} />
              {searchOpen ? (
                <TextInput
                  ref={searchInputRef}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={t("care.catalog.search")}
                  placeholderTextColor="#737373"
                  style={styles.searchInput}
                  autoFocus
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
              ) : (
                <Pressable style={styles.searchMain} onPress={openSearch}>
                  <Text style={styles.searchPlaceholder}>{t("care.catalog.search")}...</Text>
                </Pressable>
              )}
              {searchOpen ? (
                <Pressable
                  style={styles.searchCloseBtn}
                  onPress={closeSearch}
                  accessibilityLabel={t("common.back")}
                >
                  <Ionicons name="close" size={16} color="#111111" />
                </Pressable>
              ) : (
                <Pressable
                  style={styles.filterBtn}
                  onPress={openSearch}
                  accessibilityLabel={t("care.catalog.title")}
                  hitSlop={4}
                >
                  <LinearGradient
                    colors={["#111111", "#111111"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.filterBtnGrad}
                  >
                    <Ionicons name="options-outline" size={15} color="#fff" />
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          </View>

          {/* Category Pills (All, Hair Cut, Face Care, Eye care, etc.) */}
          <ScrollView
            horizontal
            nestedScrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.categoryScroll,
              searchOpen && styles.categoryScrollCompact,
            ]}
          >
            {CATEGORIES.map((cat) => {
              const active = selectedCat === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  style={[styles.catPill, active ? styles.catPillActive : styles.catPillInactive]}
                  onPress={() => setSelectedCat(cat.id)}
                >
                  <Text
                    style={[
                      styles.catText,
                      active ? styles.catTextActive : styles.catTextInactive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Featured — qidiruv ochiq bo‘lsa yashirin */}
          {!searchOpen ? (
          <ScrollView
            horizontal
            nestedScrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredProductsScroll}
          >
            {displayProducts.map((prod) => {
              const isMine =
                prod.isUserAdded ||
                (prod.productId ? myProducts.some((p) => p.id === prod.productId) : false);
              const catalogRow = prod.productId
                ? catalog.find((c) => c.id === prod.productId)
                : undefined;
              const liked = Boolean(catalogRow?.liked_by_me);

              return (
                <Pressable
                  key={prod.id}
                  style={styles.featuredCard}
                  onPress={() => {
                    if (isMine) {
                      openProductGuide(prod);
                    } else if (prod.productId) {
                      openProduct(prod.productId);
                    } else {
                      openCatalog();
                    }
                  }}
                >
                  <View style={styles.featuredMedia}>
                    <Image
                      source={{ uri: prod.image }}
                      style={styles.featuredCardImg}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.25)", "rgba(0,0,0,0.88)"]}
                      locations={[0.35, 0.65, 1]}
                      style={styles.featuredScrim}
                    />

                    <Pressable
                      style={[
                        styles.featuredActionBtn,
                        liked ? styles.featuredActionBtnActive : null,
                        styles.featuredAddBtn,
                      ]}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        if (prod.productId) void onToggleSearchLike(prod.productId);
                      }}
                      hitSlop={8}
                      accessibilityLabel="Like"
                    >
                      <Ionicons
                        name={liked ? "heart" : "heart-outline"}
                        size={14}
                        color={liked ? "#EF4444" : "#111111"}
                      />
                    </Pressable>

                    {isMine && prod.duration ? (
                      <View style={styles.featuredDurationPill}>
                        <Ionicons name="time-outline" size={10} color="#111111" />
                        <Text style={styles.featuredDurationText}>{prod.duration}</Text>
                      </View>
                    ) : null}

                    {isMine ? (
                      <Pressable
                        style={styles.featuredPlayBtn}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          openProductGuide(prod);
                        }}
                        hitSlop={6}
                        accessibilityLabel="Play guide"
                      >
                        <Ionicons name="play" size={12} color="#0A0A0A" style={{ marginLeft: 1 }} />
                      </Pressable>
                    ) : (
                      <Pressable
                        style={[styles.featuredActionBtn, styles.featuredSaveBtn]}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          openPreview(prod.productId);
                        }}
                        hitSlop={6}
                        accessibilityLabel={t("care.myProducts.addShort", { defaultValue: "Qo‘shish" })}
                      >
                        <Ionicons name="add" size={14} color="#111111" />
                      </Pressable>
                    )}

                    <View style={styles.featuredMeta}>
                      <Text style={styles.featuredProdBrand} numberOfLines={1}>
                        {prod.brand || "MORF Care"}
                      </Text>
                      <Text style={styles.featuredProdTitle} numberOfLines={2}>
                        {prod.title}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          ) : null}

          {/* Hisobot sheet — featured kartochkalar ostida (scroll ichida) */}
          {!searchOpen ? (
            <View style={styles.hubDockOuter}>
              <View
                style={[
                  styles.hubSheet,
                  {
                    paddingBottom: Math.max(insets.bottom, 12),
                  },
                ]}
              >
                <View style={styles.reportHead}>
                  <Text style={styles.reportTitle}>{t("care.hubReport")}</Text>
                  <Pressable style={styles.reportFilter} onPress={openMyProducts}>
                    <Text style={styles.reportFilterText}>{t("care.myProducts.title")}</Text>
                    <Ionicons name="chevron-forward" size={13} color="#737373" />
                  </Pressable>
                </View>

                <View style={[styles.hubCards, { height: hubLayout.hubCardH }]}>
                  <Pressable style={styles.hubCard} onPress={openParvarish}>
                    <Image
                      source={{
                        uri: "https://images.unsplash.com/photo-1522338242992-e1a639acd9c4?auto=format&fit=crop&w=280&q=80",
                      }}
                      style={styles.hubCardArt}
                      resizeMode="cover"
                    />
                    <View style={styles.hubCardBody}>
                      <View style={styles.hubCardHead}>
                        <View style={styles.hubCardIconLg}>
                          <Ionicons name="sparkles" size={16} color="#111111" />
                        </View>
                        <View style={styles.hubStatusBadge}>
                          <Text style={styles.hubStatusText}>
                            {t("care.hubStatusActive", { defaultValue: "Faol" })}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.hubCardTitle}>{t("care.hubParvarish")}</Text>
                      <Text style={styles.hubCardMetric} numberOfLines={1}>
                        {t(`care.conditions.${quiz.condition}`)}
                      </Text>
                      <Text style={styles.hubCardSub} numberOfLines={2}>
                        {t("care.hubParvarishSub")}
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable style={styles.hubCard} onPress={openTarkib}>
                    <Image
                      source={{
                        uri: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=280&q=80",
                      }}
                      style={styles.hubCardArt}
                      resizeMode="cover"
                    />
                    <View style={styles.hubCardBody}>
                      <View style={styles.hubCardHead}>
                        <View style={styles.hubCardIconLg}>
                          <Ionicons name="scan-outline" size={16} color="#111111" />
                        </View>
                        <View style={styles.hubStatusBadge}>
                          <Text style={styles.hubStatusText}>
                            {t("care.hubStatusAnalyzed", { defaultValue: "Tahlil qilingan" })}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.hubCardTitle}>{t("care.hubTarkib")}</Text>
                      <Text style={styles.hubCardMetric} numberOfLines={1}>
                        {t("care.hubTarkibMetric")}
                      </Text>
                      <Text style={styles.hubCardSub} numberOfLines={2}>
                        {t("care.hubTarkibSub")}
                      </Text>
                    </View>
                  </Pressable>
                </View>

                <Pressable
                  style={[styles.aiAssistant, { height: hubLayout.aiH }]}
                  onPress={openAssistant}
                  accessibilityLabel={t("care.hubAiAssistant")}
                >
                  <LinearGradient
                    colors={["#111111", "#111111"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.aiAssistantIcon}
                  >
                    <Ionicons name="sparkles" size={14} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.aiAssistantText}>{t("care.hubAiAssistant")}</Text>
                  <Ionicons name="arrow-forward" size={15} color="#111111" />
                </Pressable>
              </View>
            </View>
          ) : null}
        </ScrollView>

        {searchOpen ? (
          <Animated.View
            style={[
              styles.searchSheet,
              {
                height: searchSheetHeight,
                paddingBottom: Math.max(insets.bottom, 14),
                transform: [{ translateY: searchSheetY }],
              },
            ]}
          >
            <View style={styles.searchSheetHandle} />
            <Text style={styles.searchSheetTitle}>{t("care.catalog.title")}</Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.searchSheetList}
            >
              {searchResults.length === 0 ? (
                <Text style={styles.searchEmpty}>{t("care.catalog.empty")}</Text>
              ) : (
                <View style={styles.searchGrid}>
                  {searchResults.map((item) => {
                    return (
                      <Pressable
                        key={`search-${item.id}`}
                        style={styles.searchCard}
                        onPress={() => openPreview(item.id)}
                      >
                        <View style={styles.searchCardMedia}>
                          {item.image ? (
                            <Image source={{ uri: item.image }} style={styles.searchCardImg} />
                          ) : (
                            <View style={[styles.searchCardImg, styles.searchRowPh]}>
                              <Ionicons name="flask-outline" size={22} color="#111111" />
                            </View>
                          )}
                          <Pressable
                            style={styles.searchLikeBtn}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              void onToggleSearchLike(item.id);
                            }}
                            hitSlop={6}
                            accessibilityLabel="Like"
                          >
                            <Ionicons
                              name={item.liked_by_me ? "heart" : "heart-outline"}
                              size={13}
                              color={item.liked_by_me ? "#EF4444" : "#111111"}
                            />
                          </Pressable>
                          <View style={styles.searchLikeCount}>
                            <LikeHeartsBadge count={item.likes_count} />
                          </View>
                        </View>
                        <Text style={styles.searchCardTitle} numberOfLines={2}>
                          {item.title}
                        </Text>
                        {item.brand ? (
                          <Text style={styles.searchCardBrand} numberOfLines={1}>
                            {item.brand}
                          </Text>
                        ) : null}
                        <View style={styles.searchAddBtnRow}>
                          <Pressable
                            style={[
                              styles.searchAddBtn,
                              item.added && styles.searchAddBtnAdded,
                            ]}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              openPreview(item.id);
                            }}
                          >
                            <Ionicons
                              name={item.added ? "checkmark-circle" : "bag-add-outline"}
                              size={13}
                              color={item.added ? "#111111" : "#fff"}
                            />
                            <Text
                              style={[
                                styles.searchAddBtnText,
                                item.added && styles.searchAddBtnTextAdded,
                              ]}
                              numberOfLines={1}
                            >
                              {item.added
                                ? t("care.myProducts.alreadyAdded")
                                : t("care.myProducts.addShort", { defaultValue: "Qo‘shish" })}
                            </Text>
                          </Pressable>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </Animated.View>
        ) : null}

        <Modal
          visible={previewVisible}
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={closePreview}
        >
          <View style={styles.previewBackdrop} pointerEvents="box-none">
            <Animated.View
              style={[styles.previewBackdropFill, { opacity: previewBackdropOp }]}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={closePreview} />
            </Animated.View>
            <Animated.View
              style={[
                styles.previewSheetWrap,
                { transform: [{ translateY: previewSheetY }] },
              ]}
            >
              {previewProduct ? (
                <CareProductPreviewSheet
                  product={previewProduct}
                  quiz={quiz}
                  added={previewAdded}
                  bottomInset={Math.max(insets.bottom, 12)}
                  onClose={closePreview}
                  onAdd={() => {
                    if (previewAdded) return;
                    void addFromSearch(previewProduct.id);
                  }}
                  onUseInCare={previewAdded ? openPreviewCare : undefined}
                />
              ) : null}
            </Animated.View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.routineRoot}>
      <LinearGradient
        colors={["#F0F0F0", "#F0F0F0", "#FAFAFA"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 0.55 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.routineTop, { paddingTop: insets.top + 8 }]}>
        <View style={styles.navBarRow}>
          <Pressable
            style={styles.navCircleBtnLight}
            onPress={() => setViewMode("hub")}
            hitSlop={8}
            accessibilityLabel={t("common.back")}
          >
            <Ionicons name="chevron-back" size={20} color="#111" />
          </Pressable>
          <Text style={styles.routineTopTitle}>{t("care.hubParvarish")}</Text>
          <Pressable
            style={styles.navCircleBtnLight}
            onPress={openAssistant}
            hitSlop={8}
            accessibilityLabel="Help"
          >
            <Ionicons name="help-outline" size={18} color="#111" />
          </Pressable>
        </View>
        <Text style={styles.routineHeadline}>{t(greetingKey())}</Text>
      </View>

      <View style={[styles.hubSheet, styles.hubSheetFlow, { flex: 1, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <CareRoutineSheet
          quiz={quiz}
          catalog={catalog}
          selectedDate={selectedDate}
          onOpenCatalog={openCatalog}
          onOpenScan={openTarkib}
          onOpenProduct={openProduct}
          onOpenAssistant={openAssistant}
          onRetakeQuiz={() => setStep(0)}
        />
      </View>

      <Pressable
        style={[styles.fab, { bottom: Math.max(insets.bottom, 16) + 16 }]}
        onPress={openAssistant}
        accessibilityLabel={t("care.hubAiAssistant")}
      >
        <LinearGradient
          colors={["#111111", "#111111"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabInner}
        >
          <Ionicons name="happy-outline" size={24} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFA" },
  routineRoot: { flex: 1, backgroundColor: "#FAFAFA" },
  onboardRoot: { flex: 1, backgroundColor: "#FAFAFA" },
  center: { alignItems: "center", justifyContent: "center" },
  pad: { flex: 1, paddingHorizontal: 20 },
  onboardPad: { flex: 1, paddingHorizontal: 20 },
  hubRoot: { flex: 1, backgroundColor: "#FAFAFA" },
  hubScroll: { flex: 1 },
  addToast: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    zIndex: 40,
    elevation: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.18)",
    shadowColor: "#111111",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
  },
  addToastImg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F0F0F0",
  },
  addToastBody: { flex: 1, minWidth: 0, gap: 1 },
  addToastEyebrow: {
    ...morphFont,
    fontSize: 11,
    fontWeight: "700",
    color: "#111111",
  },
  addToastTitle: {
    ...morphFont,
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
  },
  addToastCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  navBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 4,
  },
  navCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
  },
  navCircleBtnLight: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
  },
  promoWrap: {
    marginTop: 0,
    marginBottom: 10,
  },
  promoCard: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#0B1220",
    justifyContent: "space-between",
    paddingBottom: 14,
    paddingHorizontal: 14,
  },
  promoHeroImg: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
  },
  promoDecor: {
    ...StyleSheet.absoluteFill,
  },
  promoBlob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  promoBlobA: {
    width: 160,
    height: 160,
    top: -40,
    right: -36,
  },
  promoBlobB: {
    width: 100,
    height: 100,
    bottom: -28,
    left: -20,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  promoTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    zIndex: 2,
    paddingTop: 2,
  },
  promoBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
  },
  promoLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  promoLogoMark: {
    fontFamily: Platform.OS === "web" ? "Georgia, 'Times New Roman', serif" : undefined,
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    fontStyle: "italic",
    lineHeight: 28,
  },
  promoLogoText: {
    ...morphFont,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.92)",
    letterSpacing: 3,
  },
  promoBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    zIndex: 2,
  },
  promoAvatarRing: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.55)",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  promoAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 17,
  },
  promoAvatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  promoAvatarInitials: {
    ...morphFont,
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  promoCopy: {
    zIndex: 2,
    gap: 5,
    maxWidth: "92%",
  },
  promoChipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  promoStatusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.28)",
  },
  promoStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#86EFAC",
  },
  promoStatusChipText: {
    ...morphFont,
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  promoWeatherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  promoTemp: {
    ...morphFont,
    fontSize: 42,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -1.5,
    lineHeight: 46,
  },
  promoLeft: {
    flex: 1,
    gap: 12,
    paddingRight: 10,
    zIndex: 1,
  },
  promoEyebrow: {
    ...morphFont,
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  promoTitle: {
    ...morphFont,
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 20,
    letterSpacing: -0.3,
  },
  promoHint: {
    ...morphFont,
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.72)",
    lineHeight: 16,
    marginTop: 2,
  },
  promoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  promoChipText: {
    ...morphFont,
    fontSize: 12,
    fontWeight: "700",
    color: "#111111",
  },
  promoBtn: {
    marginTop: 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  promoBtnText: {
    ...morphFont,
    fontSize: 12,
    fontWeight: "700",
    color: "#0A0A0A",
  },
  promoImg: {
    width: 112,
    height: 128,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 10,
  },
  dotActive: {
    width: 18,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#111111",
  },
  dotInactive: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  searchSection: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  searchBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingLeft: 14,
    paddingRight: 5,
    height: 48,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.12)",
    gap: 8,
  },
  searchBarActive: {
    borderColor: "#111111",
  },
  searchMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
  },
  searchInput: {
    ...morphFont,
    flex: 1,
    fontSize: 15,
    color: "#111111",
    paddingVertical: 0,
    height: "100%",
  },
  searchPlaceholder: {
    ...morphFont,
    flex: 1,
    fontSize: 14,
    color: "#737373",
  },
  searchCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F0F0",
    marginRight: 2,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    marginRight: 1,
  },
  filterBtnGrad: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  searchSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
  searchSheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(15,23,42,0.12)",
    marginBottom: 10,
  },
  searchSheetTitle: {
    ...morphFont,
    paddingHorizontal: 16,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
  },
  searchSheetList: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  searchEmpty: {
    ...morphFont,
    paddingVertical: 28,
    textAlign: "center",
    color: "rgba(15,23,42,0.45)",
    fontSize: 13,
  },
  searchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  searchCard: {
    width: "47.5%",
    flexGrow: 0,
    maxWidth: "47.5%",
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
    paddingBottom: 0,
  },
  searchCardMedia: {
    width: "100%",
    aspectRatio: 1.15,
    backgroundColor: "#F0F0F0",
    position: "relative",
  },
  searchCardImg: {
    width: "100%",
    height: "100%",
  },
  searchLikeBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchLikeCount: {
    position: "absolute",
    left: 6,
    bottom: 6,
  },
  searchLikeCountText: {
    ...morphFont,
    fontSize: 11,
    fontWeight: "700",
    color: "#111111",
  },
  searchCardTitle: {
    ...morphFont,
    marginTop: 6,
    paddingHorizontal: 8,
    fontSize: 11,
    fontWeight: "700",
    color: "#111111",
    lineHeight: 14,
    minHeight: 28,
  },
  searchCardBrand: {
    ...morphFont,
    marginTop: 1,
    paddingHorizontal: 8,
    fontSize: 10,
    color: "rgba(15,23,42,0.5)",
    marginBottom: 6,
  },
  searchAddBtnRow: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  searchAddBtn: {
    height: 30,
    borderRadius: 10,
    backgroundColor: "#111111",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 8,
  },
  searchAddBtnAdded: {
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "rgba(79,70,229,0.25)",
  },
  searchAddBtnDone: {
    backgroundColor: "#111111",
  },
  searchAddBtnText: {
    ...morphFont,
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  searchAddBtnTextAdded: {
    color: "#111111",
  },
  searchAddBtnTextDone: {
    color: "#fff",
  },
  previewBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  previewBackdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  previewSheetWrap: {
    width: "100%",
    backgroundColor: "transparent",
    overflow: "visible",
    maxHeight: 560,
  },
  previewCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    maxHeight: "88%",
  },
  previewGrab: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(15,23,42,0.14)",
    marginBottom: 10,
  },
  previewScroll: { gap: 4, paddingBottom: 12 },
  previewMedia: {
    width: "100%",
    height: 180,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#F0F0F0",
    marginBottom: 8,
  },
  previewImg: { width: "100%", height: "100%" },
  previewClose: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewTitle: {
    ...morphFont,
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
  },
  previewBrand: {
    ...morphFont,
    fontSize: 13,
    color: "rgba(15,23,42,0.55)",
    marginTop: 2,
  },
  previewCat: {
    ...morphFont,
    marginTop: 6,
    alignSelf: "flex-start",
    fontSize: 12,
    fontWeight: "700",
    color: "#111111",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 4,
  },
  previewSection: {
    marginTop: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FAFAFA",
    gap: 4,
  },
  previewSectionTitle: {
    ...morphFont,
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  previewBody: {
    ...morphFont,
    fontSize: 13,
    lineHeight: 19,
    color: "#334155",
  },
  previewIngredients: {
    ...morphFont,
    fontSize: 12,
    lineHeight: 18,
    color: "#475569",
  },
  previewWarn: {
    ...morphFont,
    fontSize: 12,
    lineHeight: 17,
    color: "#111111",
  },
  previewUsage: {
    ...morphFont,
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(15,23,42,0.55)",
  },
  previewAddBtn: {
    height: 50,
    borderRadius: 16,
    backgroundColor: "#111111",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  previewActions: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  previewAddBtnFlex: {
    flex: 1,
  },
  previewCareBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#111111",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  previewCareBtnText: {
    ...morphFont,
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  previewAddBtnAdded: {
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "rgba(79,70,229,0.25)",
  },
  previewAddBtnText: {
    ...morphFont,
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  previewAddBtnTextAdded: {
    color: "#111111",
  },
  searchRowPh: { alignItems: "center", justifyContent: "center" },
  categoryScroll: {
    paddingHorizontal: 20,
    gap: 8,
    paddingVertical: 10,
  },
  categoryScrollCompact: {
    paddingVertical: 4,
    paddingBottom: 2,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  catPillActive: {
    backgroundColor: "#111111",
  },
  catPillInactive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.12)",
  },
  catText: {
    ...morphFont,
    fontSize: 13,
  },
  catTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  catTextInactive: {
    color: "#111111",
    fontWeight: "600",
  },
  featuredProductsScroll: {
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 4,
    paddingBottom: 6,
  },
  featuredGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  featuredCard: {
    width: 196,
    height: 220,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.08)",
  },
  featuredMedia: {
    width: "100%",
    height: "100%",
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#F0F0F0",
  },
  featuredCardImg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  featuredScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.08)",
  },
  featuredActionBtnActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(17,17,17,0.12)",
  },
  featuredAddBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
  },
  featuredSaveBtn: {
    position: "absolute",
    right: 10,
    bottom: 64,
    zIndex: 2,
  },
  featuredPlayBtn: {
    position: "absolute",
    right: 10,
    bottom: 64,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  featuredDurationPill: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    zIndex: 2,
  },
  featuredDurationText: {
    ...morphFont,
    fontSize: 10,
    fontWeight: "700",
    color: "#111111",
  },
  featuredMeta: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 24,
    paddingBottom: 12,
    gap: 3,
    zIndex: 2,
  },
  featuredProdTitle: {
    ...morphFont,
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
    lineHeight: 17,
    letterSpacing: -0.2,
  },
  featuredProdBrand: {
    ...morphFont,
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  featuredProdPrice: {
    ...morphFont,
    fontSize: 12,
    fontWeight: "500",
    color: "#94A3B8",
  },
  routineTop: { paddingHorizontal: 20, paddingBottom: 8, gap: 10 },
  routineTopTitle: { ...morphFont, fontSize: 16, fontWeight: "700", color: "#111" },
  routineHeadline: {
    ...morphFont,
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  hubDockOuter: {
    marginTop: 8,
    paddingHorizontal: 0,
    paddingTop: 0,
    backgroundColor: "transparent",
  },
  hubSheet: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 0,
    gap: 10,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: "hidden",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.08)",
  },
  hubSheetFlow: {
    marginTop: 12,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  reportHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reportTitle: { ...morphFont, fontSize: 14, fontWeight: "700", color: "#111111" },
  reportFilter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#F0F0F0",
  },
  reportFilterText: { ...morphFont, fontSize: 11, fontWeight: "600", color: "#737373" },
  hubCards: {
    flexDirection: "row",
    gap: 8,
  },
  hubCard: {
    flex: 1,
    height: "100%",
    borderRadius: 14,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.08)",
    overflow: "hidden",
  },
  hubCardArt: {
    position: "absolute",
    right: -8,
    bottom: -6,
    width: 72,
    height: 84,
    borderRadius: 12,
    opacity: 0.9,
  },
  hubCardBody: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 2,
    zIndex: 1,
    paddingRight: 58,
    justifyContent: "flex-start",
  },
  hubCardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 4,
  },
  hubCardIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  hubCardIconLg: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  hubStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: "#FFFFFF",
  },
  hubStatusText: {
    ...morphFont,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.2,
    color: "#737373",
  },
  hubCardTitle: {
    ...morphFont,
    fontSize: 11,
    fontWeight: "600",
    color: "#737373",
  },
  hubCardMetric: {
    ...morphFont,
    fontSize: 15,
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -0.3,
  },
  hubCardSub: {
    ...morphFont,
    fontSize: 10,
    lineHeight: 13,
    color: "#737373",
    marginTop: "auto",
  },
  aiAssistant: {
    borderRadius: 14,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.08)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
  },
  aiAssistantIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  aiAssistantText: { ...morphFont, flex: 1, fontSize: 13, fontWeight: "600", color: "#111111" },
  rowBetweenLight: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  onboardBadge: { ...morphFont, fontSize: 12, fontWeight: "600", color: "#111111" },
  onboardH1: { ...morphFont, fontSize: 28, fontWeight: "700", color: "#111", letterSpacing: -0.6, lineHeight: 34 },
  onboardSub: { marginTop: 10, ...morphFont, fontSize: 15, lineHeight: 22, color: "rgba(26,26,26,0.55)" },
  progressTrackLight: {
    marginTop: 20,
    height: 4,
    borderRadius: 99,
    backgroundColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  progressFillLight: { height: "100%", backgroundColor: "#111111", borderRadius: 99 },
  optGridLight: { marginTop: 24, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  optCardLight: {
    width: "47%",
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    backgroundColor: "rgba(255,255,255,0.65)",
    padding: 14,
    justifyContent: "center",
  },
  optCardLightOn: { borderColor: "#111111", backgroundColor: "#fff" },
  optTextLight: { ...morphFont, fontSize: 14, fontWeight: "600", color: "rgba(26,26,26,0.65)" },
  optTextLightOn: { color: "#111" },
  onboardFooter: { flexDirection: "row", gap: 8 },
  primaryBtnLight: {
    height: 48,
    borderRadius: 999,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  primaryBtnLightText: { ...morphFont, fontSize: 14, fontWeight: "600", color: "#fff" },
  ghostBtnLight: {
    height: 48,
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  ghostBtnLightText: { ...morphFont, fontSize: 14, fontWeight: "600", color: "#111" },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#111111",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  fabInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  flexGrow: { flex: 1.6 },
  disabled: { opacity: 0.5 },
  muted: { ...morphFont, fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: "500" },
  lockWrap: { marginTop: 80, alignItems: "center", paddingHorizontal: 24 },
  lockTitle: { marginTop: 16, ...morphFont, fontSize: 18, fontWeight: "600", color: "#fff" },
  lockSub: {
    marginTop: 8,
    ...morphFont,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },
  primaryBtnDark: {
    height: 48,
    borderRadius: 999,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  primaryBtnDarkText: { ...morphFont, fontSize: 14, fontWeight: "600", color: "#000" },
});
