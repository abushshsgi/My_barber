import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Asset } from "expo-asset";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  PanResponder,
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
import { resolveMediaUrl } from "../../api/media";
import { useAuth } from "../../auth/AuthContext";
import { CareProductPreviewSheet } from "../../components/morph/care/CareProductPreviewSheet";
import { CareCatalogMark } from "../../components/morph/care/CareCatalogMark";
import { CareRoutineSheet } from "../../components/morph/care/CareRoutineSheet";
import { CareSosSheet } from "../../components/morph/care/CareSosSheet";
import { CareShelfTrackerSheet } from "../../components/morph/care/CareShelfTrackerSheet";
import { DarkMeshAmbientBg } from "../../components/morph/care/DarkMeshAmbientBg";
import { WeatherHeaderCard } from "../../components/morph/care/WeatherHeaderCard";
import { AppStatusBar, safeBottom, safeTop } from "../../components/ui/AppStatusBar";
import { SafeModal } from "../../components/ui/SafeModal";
import { useCareWeather } from "../../hooks/useCareWeather";
import { useHideTabBarWhen } from "../../hooks/useHideTabBar";
import {
  defaultQuiz,
  estimateProductFit,
  isCareQuizComplete,
  loadCachedCarePlan,
  loadCareQuiz,
  loadCareSchedule,
  saveCareQuiz,
  saveCareSchedule,
  MORNING_TIME_OPTIONS,
  EVENING_TIME_OPTIONS,
  type CareQuizAnswers,
} from "../../lib/morph-ai-care";
import { scheduleCareWelcomeNotification } from "../../lib/care-reminders";
import {
  addMyProduct,
  loadMyProducts,
  loadMyProductsLocal,
  markCareOnboardingSeen,
  type MyCareProduct,
} from "../../lib/morph-my-products";
import { setCareCatalogCache, getCareCatalogCache, hydrateCareCatalogCache, prefetchCareCatalog } from "../../lib/care-catalog-cache";
import { careHubLayout, weatherLocationHeroSource } from "../../lib/weather-care-tips";
import { regionLabel } from "../../lib/uz-regions";
import type { MorphCareStackParamList } from "../../navigation/MorphCareStack";
import { useShellNavigation } from "../../lib/shell-nav";
import { morphFont } from "../../theme/morph-font";
import {
  ASPECT,
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<MorphCareStackParamList, "CareHome">;
type QuizStep = 0 | 1 | 2 | 3;
type ViewMode = "hub" | "flow";

const CARE_ACCESS_DEBUG = true;

const QUICK_SOS = require("../../../assets/care/care-quick-sos.png");
const QUICK_SHELF = require("../../../assets/care/care-quick-shelf.png");
const QUICK_GROWTH = require("../../../assets/care/care-quick-growth.png");
const QUICK_ALBUM = require("../../../assets/care/care-quick-album.png");
const HUB_ROUTINE = require("../../../assets/care/care-hub-routine-v2.png");
const HUB_SCAN = require("../../../assets/care/care-hub-scan-v2.png");

const CARE_HUB_LOCAL_ASSETS = [
  QUICK_SOS,
  QUICK_SHELF,
  QUICK_GROWTH,
  QUICK_ALBUM,
  HUB_ROUTINE,
  HUB_SCAN,
] as const;

/** Local PNG lar modul yuklanganda xotiraga olinadi — UI ochilganda darhol. */
void Asset.loadAsync([...CARE_HUB_LOCAL_ASSETS]).catch(() => undefined);

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
    gap: moderateScale(3),
    paddingHorizontal: scale(7),
    paddingVertical: verticalScale(3),
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  pair: { flexDirection: "row", alignItems: "center", gap: 1 },
  halfMask: { width: scale(10), height: scale(10), position: "relative" },
  halfClip: {
    position: "absolute",
    left: 0,
    top: 0,
    width: scale(5),
    height: verticalScale(10),
    overflow: "hidden",
  },
  count: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "700",
    color: "#111111",
  },
});

export function MorphCareScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();
  const { goMorph } = useShellNavigation();
  const [access, setAccess] = useState<{ allowed: boolean; detail?: string } | null>({
    allowed: true,
  });
  const [viewMode, setViewMode] = useState<ViewMode>("hub");
  const [quiz, setQuiz] = useState<CareQuizAnswers>(() => defaultQuiz());
  const [step, setStep] = useState<QuizStep | "plan" | "boot">("boot");
  const [catalog, setCatalog] = useState<CareProduct[]>(
    () => getCareCatalogCache() ?? [],
  );
  const [myProducts, setMyProducts] = useState<MyCareProduct[]>([]);
  const [catalogReady, setCatalogReady] = useState(
    () => Boolean(getCareCatalogCache()?.length),
  );
  const [saving, setSaving] = useState(false);
  const [draftMorning, setDraftMorning] = useState("07:30");
  const [draftEvening, setDraftEvening] = useState("21:00");
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [addToast, setAddToast] = useState<{ title: string; image: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  /** Sheet ochilib bo‘lgach grid — ochilish animatsiyasini bloklamaslik uchun. */
  const [searchListReady, setSearchListReady] = useState(false);
  /** Hubda tab yashirin; quiz/search ham — soch tahlili to‘liq ekran. */
  useHideTabBarWhen(
    viewMode === "hub" ||
      searchOpen ||
      step === "boot" ||
      typeof step === "number",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sosOpen, setSosOpen] = useState(false);
  const [shelfOpen, setShelfOpen] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  /** Shu search sessiyasida qo‘shilganlar — qayta ochilganda tozalanadi */
  const [sessionAddedIds, setSessionAddedIds] = useState<number[]>([]);
  const addDropY = useRef(new Animated.Value(-140)).current;
  const addOpacity = useRef(new Animated.Value(0)).current;
  const addScale = useRef(new Animated.Value(0.86)).current;
  const addHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSheetY = useRef(new Animated.Value(Dimensions.get("window").height)).current;
  const searchBackdropOp = useRef(new Animated.Value(0)).current;
  const searchAnimPending = useRef(false);
  const retakeQuizRef = useRef(false);
  const previewSheetY = useRef(new Animated.Value(Dimensions.get("window").height)).current;
  const previewBackdropOp = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);
  const { data: weather, regionId: weatherRegionId } = useCareWeather();
  const { width: winW, height: winH } = useWindowDimensions();
  const [kbH, setKbH] = useState(0);
  const fullWinH = useRef(winH);
  if (kbH === 0) fullWinH.current = Math.max(fullWinH.current, winH);
  const hubLayout = useMemo(
    () => careHubLayout(winW, winH, insets.top, insets.bottom),
    [winW, winH, insets.top, insets.bottom],
  );
  const weatherKey = weather?.current?.condition_key ?? "unknown";
  const weatherTemp =
    weather?.current?.temperature_c != null
      ? `${Math.round(weather.current.temperature_c)}°`
      : "—";
  const weatherImg = weatherLocationHeroSource({
    region: weather?.location_region,
    place: weather?.location_place || weather?.location_label,
    condition: weatherKey,
    lat: weather?.latitude,
    lon: weather?.longitude,
    regionId: weatherRegionId,
  });
  const weatherCityName = useMemo(() => {
    if (weatherRegionId) return regionLabel(weatherRegionId);
    const raw = `${weather?.location_region || ""} ${weather?.location_label || ""}`.trim();
    if (!raw) return t("care.weather.cityFallback", { defaultValue: "Shahar" });
    const cleaned = raw
      .replace(/\b(shahri|viloyati|viloyat|область|город|шаҳри)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    const first = cleaned.split(/[,·|/]/)[0]?.trim() || cleaned;
    if (/\b(махалл|mahalla|ko'cha|куча|улица)\b/i.test(first)) {
      return t("care.weather.cityFallback", { defaultValue: "Shahar" });
    }
    return first.slice(0, 18) || t("care.weather.cityFallback", { defaultValue: "Shahar" });
  }, [t, weather?.location_label, weather?.location_region, weatherRegionId]);

  /** Search sheet — klaviatura va safe area ustida, overshoot yo‘q. */
  const keyboardCover = useMemo(() => {
    if (kbH <= 0) return 0;
    const resizedByOs = fullWinH.current - winH > 80;
    return resizedByOs ? 0 : kbH;
  }, [kbH, winH]);

  const searchSheetHeight = useMemo(() => {
    const visible = Math.max(320, winH - keyboardCover);
    const topGap = Math.max(insets.top + 12, Math.round(visible * 0.14));
    return Math.max(260, visible - topGap);
  }, [insets.top, winH, keyboardCover]);

  const searchCols = winW < 340 ? 1 : winW >= 720 ? 3 : 2;
  const searchCardW = useMemo(() => {
    const hPad = 24;
    const gap = 8;
    return Math.floor((winW - hPad - gap * (searchCols - 1)) / searchCols);
  }, [winW, searchCols]);

  const playAddedAnimation = useCallback(
    (prod: { title: string; image: string }) => {
      if (addHideTimer.current) {
        clearTimeout(addHideTimer.current);
        addHideTimer.current = null;
      }
      addDropY.stopAnimation();
      addOpacity.stopAnimation();
      addScale.stopAnimation();
      setAddToast({ title: prod.title, image: prod.image });
      addDropY.setValue(-160);
      addOpacity.setValue(0);
      addScale.setValue(0.82);
      const native = Platform.OS !== "web";
      const restY = insets.top + 10;
      Animated.parallel([
        Animated.timing(addDropY, {
          toValue: restY,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: native,
        }),
        Animated.timing(addOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: native,
        }),
        Animated.timing(addScale, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: native,
        }),
      ]).start();
      addHideTimer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(addDropY, {
            toValue: -180,
            duration: 280,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: native,
          }),
          Animated.timing(addOpacity, {
            toValue: 0,
            duration: 240,
            useNativeDriver: native,
          }),
          Animated.timing(addScale, {
            toValue: 0.9,
            duration: 240,
            useNativeDriver: native,
          }),
        ]).start();
        addHideTimer.current = setTimeout(() => {
          setAddToast(null);
          addHideTimer.current = null;
        }, 320);
      }, 1600);
    },
    [addDropY, addOpacity, addScale, insets.top],
  );

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, (e) => {
      setKbH(Math.round(e.endCoordinates?.height ?? 0));
    });
    const hide = Keyboard.addListener(hideEvt, () => setKbH(0));
    return () => {
      show.remove();
      hide.remove();
      if (addHideTimer.current) clearTimeout(addHideTimer.current);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKbH(covered > 60 ? Math.round(covered) : 0);
    };
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, []);

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
    // Soch holati quiz tugamaguncha Care hub/plan ochilmasin.
    if (typeof step === "number") {
      if (step > 0) {
        setStep((step - 1) as QuizStep);
        setViewMode("flow");
        return;
      }
      const routes = navigation.getState?.()?.routes;
      if (routes && routes.length > 1) {
        navigation.goBack();
        return;
      }
      goMorph(navigation, route.params?.returnTo || "MorphTryOn");
      return;
    }
    if (viewMode === "flow") {
      if (!isCareQuizComplete(quiz)) {
        setStep(0);
        setViewMode("flow");
        return;
      }
      setViewMode("hub");
      return;
    }
    const routes = navigation.getState?.()?.routes;
    if (routes && routes.length > 1) {
      navigation.goBack();
      return;
    }
    // MySaloon Home ga otmasin — Morph ichida qoladi.
    goMorph(navigation, route.params?.returnTo || "MorphTryOn");
  }, [viewMode, step, quiz, navigation, route.params, goMorph]);

  // Hub/plan faqat to‘liq quizdan keyin — aks holda qayta quizga.
  useEffect(() => {
    if (step === "boot") return;
    if ((step === "plan" || viewMode === "hub") && !isCareQuizComplete(quiz)) {
      setStep(0);
      setViewMode("flow");
    }
  }, [step, viewMode, quiz]);

  const dayRows = weather?.days?.length ? weather.days.slice(0, 7) : buildFallbackDays();
  const selectedDate = dayRows[selectedDayIdx]?.date ?? new Date().toISOString().slice(0, 10);

  const openSearch = useCallback(() => {
    setPreviewId(null);
    setPreviewVisible(false);
    setSessionAddedIds([]);
    setSearchListReady(false);
    searchSheetY.stopAnimation();
    searchBackdropOp.stopAnimation();
    searchSheetY.setValue(searchSheetHeight);
    searchBackdropOp.setValue(0);
    searchAnimPending.current = true;
    setSearchOpen(true);
  }, [searchSheetHeight, searchSheetY, searchBackdropOp]);

  useEffect(() => {
    if (!searchOpen || !searchAnimPending.current) return;
    searchAnimPending.current = false;
    const native = Platform.OS !== "web";
    let listTimer: ReturnType<typeof setTimeout> | null = null;
    let fetchTimer: ReturnType<typeof setTimeout> | null = null;
    const frame = requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(searchBackdropOp, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.quad),
          useNativeDriver: native,
        }),
        Animated.timing(searchSheetY, {
          toValue: 0,
          duration: 340,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: native,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          searchInputRef.current?.focus();
        }
      });
      listTimer = setTimeout(() => setSearchListReady(true), 90);
      fetchTimer = setTimeout(() => {
        const excludeIds = myProducts.map((p) => p.id);
        void fetchCareProducts({
          order: "likes",
          exclude_mine: true,
          exclude_ids: excludeIds.length ? excludeIds : undefined,
        })
          .then((rows) => {
            if (rows.length) {
              setCatalog(rows);
              setCareCatalogCache(rows);
            }
          })
          .catch(() => {});
      }, 220);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (listTimer) clearTimeout(listTimer);
      if (fetchTimer) clearTimeout(fetchTimer);
    };
  }, [searchOpen, searchSheetY, searchBackdropOp, myProducts]);

  const openCatalog = openSearch;

  const openMyProducts = useCallback(() => {
    navigation.navigate("CareMyProducts");
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.retakeQuiz) {
        retakeQuizRef.current = true;
        navigation.setParams({ retakeQuiz: undefined });
        setStep(0);
        setViewMode("flow");
      }
      if (!route.params?.openSearch) return;
      const q = route.params.q?.trim();
      if (q) setSearchQuery(q);
      navigation.setParams({ openSearch: undefined, q: undefined });
      requestAnimationFrame(() => openSearch());
    }, [route.params?.openSearch, route.params?.q, route.params?.retakeQuiz, navigation, openSearch]),
  );

  const closeSearch = useCallback(() => {
    Keyboard.dismiss();
    setPreviewId(null);
    setPreviewVisible(false);
    setSessionAddedIds([]);
    searchSheetY.stopAnimation();
    searchBackdropOp.stopAnimation();
    const native = Platform.OS !== "web";
    Animated.parallel([
      Animated.timing(searchBackdropOp, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver: native,
      }),
      Animated.timing(searchSheetY, {
        toValue: searchSheetHeight,
        duration: 280,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: native,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      setSearchOpen(false);
      setSearchListReady(false);
      setSearchQuery("");
    });
  }, [searchSheetHeight, searchSheetY, searchBackdropOp]);

  const closeSearchRef = useRef(closeSearch);
  closeSearchRef.current = closeSearch;

  const searchPan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.15,
        onPanResponderGrant: () => {
          searchSheetY.stopAnimation();
          Keyboard.dismiss();
        },
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) searchSheetY.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > 100 || g.vy > 1.05) {
            closeSearchRef.current();
            return;
          }
          const native = Platform.OS !== "web";
          Animated.timing(searchSheetY, {
            toValue: 0,
            duration: 240,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: native,
          }).start();
        },
      }),
    [searchSheetY],
  );

  const openTarkib = useCallback(() => {
    goMorph(navigation, "MorphIngredient");
  }, [navigation, goMorph]);

  const openSubscriptions = useCallback(() => {
    goMorph(navigation, "Profile", { screen: "Subscriptions" });
  }, [navigation, goMorph]);

  const openWeather = useCallback(() => {
    navigation.navigate("CareWeather");
  }, [navigation]);

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

  const openGrowthTracker = useCallback(() => {
    navigation.navigate("CareGrowthTracker");
  }, [navigation]);

  const openCareAlbum = useCallback(() => {
    navigation.navigate("CareAlbum");
  }, [navigation]);

  const openParvarish = useCallback(() => {
    setViewMode("flow");
  }, []);

  const bootstrap = useCallback(async () => {
    // 1) Disk cache — hub ochilishi bilan bizning rasmlar (demo emas).
    const [saved, localMine, diskCatalog] = await Promise.all([
      loadCareQuiz().catch(() => null),
      loadMyProductsLocal().catch(() => []),
      hydrateCareCatalogCache().catch(() => [] as CareProduct[]),
      loadCachedCarePlan().catch(() => null),
    ]);
    if (localMine.length) setMyProducts(localMine);
    if (diskCatalog.length) {
      setCatalog(diskCatalog);
      setCatalogReady(true);
    }
    if (isCareQuizComplete(saved) && !retakeQuizRef.current) {
      setQuiz(saved);
      setStep("plan");
      setViewMode("flow");
    } else {
      setStep(0);
      setViewMode("flow");
    }
    const sched = await loadCareSchedule().catch(() => null);
    if (sched?.morningTime) setDraftMorning(sched.morningTime);
    if (sched?.eveningTime) setDraftEvening(sched.eveningTime);
    if (!sched?.morningTime || !sched?.eveningTime) {
      // Eski foydalanuvchilar — default oynani saqlab qo‘yamiz
      void saveCareSchedule({ morningTime: "07:30", eveningTime: "21:00" });
    }

    try {
      const accessRes = CARE_ACCESS_DEBUG
        ? { allowed: true as const, detail: undefined }
        : await fetchCareAccess().catch(() => ({ allowed: false, detail: undefined }));
      setAccess(accessRes);
      if (!accessRes.allowed) return;

      // 2) Network parallel — my products + recommended catalog.
      const [myProds, products, profile] = await Promise.all([
        loadMyProducts().catch(() => localMine),
        prefetchCareCatalog({ recommended: true }).catch(() => diskCatalog),
        fetchHairCareProfile().catch(() => null),
      ]);
      setMyProducts(myProds);
      if (products.length) {
        setCatalog(products);
        setCareCatalogCache(products);
      }
      setCatalogReady(true);

      if (profile?.complete && profile.condition && profile.texture && profile.color_status) {
        const next: CareQuizAnswers = {
          condition: profile.condition as HairCondition,
          texture: profile.texture as HairTexture,
          colorStatus: profile.color_status as HairColorStatus,
        };
        setQuiz(next);
        void saveCareQuiz(next);
        if (!profile.complete) {
          void updateHairCareProfile({
            condition: next.condition,
            texture: next.texture,
            color_status: next.colorStatus,
          }).catch(() => undefined);
        }
        if (!retakeQuizRef.current) {
          setStep("plan");
          setViewMode("flow");
        }
      } else if (!isCareQuizComplete(saved)) {
        setStep(0);
        setViewMode("flow");
      }
    } catch {
      setCatalogReady(true);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const finishQuiz = async () => {
    if (!isCareQuizComplete(quiz)) return;
    setSaving(true);
    try {
      await saveCareQuiz(quiz);
      await saveCareSchedule({
        morningTime: draftMorning,
        eveningTime: draftEvening,
      });
      await updateHairCareProfile({
        condition: quiz.condition,
        texture: quiz.texture,
        color_status: quiz.colorStatus,
        scalp:
          quiz.condition === "oily"
            ? "oily"
            : quiz.condition === "dry" || quiz.condition === "damaged"
              ? "dry"
              : "normal",
      });
      void markCareOnboardingSeen();
      const greet =
        user?.full_name ||
        [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
        user?.first_name ||
        null;
      void scheduleCareWelcomeNotification({
        userName: greet,
        morningTime: draftMorning,
        eveningTime: draftEvening,
      });
      setStep("plan");
      setViewMode("flow");
      // Catalog fonida — reja darrov ochiladi.
      void prefetchCareCatalog({ recommended: true, force: true })
        .then((products) => {
          if (products.length) {
            setCatalog(products);
            setCareCatalogCache(products);
          }
          setCatalogReady(true);
        })
        .catch(() => setCatalogReady(true));
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
      const fromCatalog = catalog.find((c) => c.id === mp.id);
      const rawImg = mp.image_url || fromCatalog?.image_url;
      list.push({
        id: `my-${mp.id}`,
        productId: mp.id,
        title: mp.name,
        brand: mp.brand || "MORF Care",
        price: mp.brand || "MORF Care",
        category: mp.category || "spray",
        duration: "2 Min",
        durationMinutes: 2,
        image: resolveMediaUrl(rawImg, { width: 480 }) || rawImg || "",
        bgColors: ["#F0F0F0", "#F0F0F0", "#F0F0F0"],
        isUserAdded: true,
        usageText: mp.usage_uz || fromCatalog?.usage_uz,
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
        image: resolveMediaUrl(cp.image_url, { width: 480 }) || cp.image_url || "",
        bgColors:
          cp.category === "mask"
            ? ["#F0F0F0", "#F0F0F0", "#F0F0F0"]
            : ["#FAFAFA", "#FAFAFA", "#F0F0F0"],
        isUserAdded: false,
        fitScore: typeof cp.match_percent === "number" ? cp.match_percent : fit,
        usageText: cp.usage_uz,
      });
    });

    // Demo/Unsplash yo‘q — bo‘sh yoki skeleton.
    return list;
  }, [myProducts, catalog, quiz]);

  useEffect(() => {
    displayProducts.slice(0, 16).forEach((p) => {
      if (p.image) void Image.prefetch(p.image).catch(() => undefined);
    });
  }, [displayProducts]);

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
        image: resolveMediaUrl(p.image_url, { width: 360 }) || p.image_url,
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
      if (sessionAddedIds.includes(p.id) || myProducts.some((row) => row.id === p.id)) return;
      setSessionAddedIds((prev) => (prev.includes(p.id) ? prev : [...prev, p.id]));
      setMyProducts((prev) =>
        prev.some((row) => row.id === p.id)
          ? prev
          : [
              {
                id: p.id,
                name: p.name,
                brand: p.brand,
                category: p.category,
                image_url: p.image_url,
                added_at: new Date().toISOString(),
                source: "catalog",
              },
              ...prev,
            ],
      );
      playAddedAnimation({
        title: p.name,
        image: p.image_url || "",
      });
      const next = await addMyProduct({
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        image_url: p.image_url,
        source: "catalog",
      });
      setMyProducts(next);
    },
    [catalog, myProducts, playAddedAnimation, sessionAddedIds],
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

  if (step === "boot") {
    return <View style={[styles.root, { backgroundColor: "#FAFAFA" }]} />;
  }

  if (access && !access.allowed) {
    return (
      <View style={[styles.root, styles.pad, { paddingTop: safeTop(insets.top, 12) }]}>
        <AppStatusBar style="dark" />
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
    const isScheduleStep = step === 3;
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
          : step === 2
            ? {
                title: t("care.onboarding.step3Title"),
                sub: t("care.onboarding.step3Sub"),
                opts: COLOR_OPTS,
                value: quiz.colorStatus,
                labelKey: "care.colors",
                set: (v: HairColorStatus) => setQuiz((q) => ({ ...q, colorStatus: v })),
              }
            : {
                title: t("care.onboarding.step4Title", { defaultValue: "Qulay vaqtingiz" }),
                sub: t("care.onboarding.step4Sub", {
                  defaultValue:
                    "Ertalab va kechqurun qachon parvarish qilasiz? Shu asosida reja va eslatmalar tuziladi.",
                }),
                opts: [] as string[],
                value: "ok",
                labelKey: "",
                set: (_v: never) => undefined,
              };

    return (
      <View style={styles.onboardRoot}>
        <AppStatusBar style="dark" />
        <LinearGradient
          colors={["#F0F0F0", "#F0F0F0", "#FAFAFA"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 0.55 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.onboardPad,
            {
              paddingTop: safeTop(insets.top, 12),
              paddingBottom: safeBottom(insets.bottom, 16),
            },
          ]}
        >
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
            style={{ flex: 1, minHeight: 0 }}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: verticalScale(16) }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.onboardH1}>{quizMeta.title}</Text>
            <Text style={styles.onboardSub}>{quizMeta.sub}</Text>
            <View style={styles.progressTrackLight}>
              <View
                style={[
                  styles.progressFillLight,
                  { width: `${((Number(step) + 1) / 4) * 100}%` },
                ]}
              />
            </View>
            {isScheduleStep ? (
              <View style={styles.scheduleOnboard}>
                <Text style={styles.scheduleOnboardLabel}>{t("care.routine.slots.morning")}</Text>
                <View style={styles.scheduleOnboardRow}>
                  {MORNING_TIME_OPTIONS.map((opt) => {
                    const on = draftMorning === opt;
                    return (
                      <Pressable
                        key={opt}
                        style={[styles.scheduleOnboardChip, on && styles.scheduleOnboardChipOn]}
                        onPress={() => setDraftMorning(opt)}
                      >
                        <Text
                          style={[
                            styles.scheduleOnboardChipText,
                            on && styles.scheduleOnboardChipTextOn,
                          ]}
                        >
                          {opt}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.scheduleOnboardLabel}>{t("care.routine.slots.evening")}</Text>
                <View style={styles.scheduleOnboardRow}>
                  {EVENING_TIME_OPTIONS.map((opt) => {
                    const on = draftEvening === opt;
                    return (
                      <Pressable
                        key={opt}
                        style={[styles.scheduleOnboardChip, on && styles.scheduleOnboardChipOn]}
                        onPress={() => setDraftEvening(opt)}
                      >
                        <Text
                          style={[
                            styles.scheduleOnboardChipText,
                            on && styles.scheduleOnboardChipTextOn,
                          ]}
                        >
                          {opt}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
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
            )}
          </ScrollView>
          <View style={styles.onboardFooter}>
            {typeof step === "number" && step > 0 ? (
              <Pressable
                style={styles.ghostBtnLight}
                onPress={() =>
                  setStep((s) => (typeof s === "number" && s > 0 ? ((s - 1) as QuizStep) : 0))
                }
              >
                <Text style={styles.ghostBtnLightText}>{t("common.back")}</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[
                styles.primaryBtnLight,
                styles.primaryBtnLightGrow,
                (saving || (!isScheduleStep && !quizMeta.value)) && styles.disabled,
              ]}
              disabled={saving || (!isScheduleStep && !quizMeta.value)}
              onPress={() => {
                if (step === 3) void finishQuiz();
                else setStep((step + 1) as QuizStep);
              }}
            >
              <Text style={styles.primaryBtnLightText}>
                {step === 3 ? t("care.onboarding.finish") : t("common.next")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (viewMode === "hub") {
    const hubTopPad = safeTop(insets.top, 10);
    const hubBottomPad = Math.max(hubLayout.dockClearance, safeBottom(insets.bottom, 28));
    return (
      <View style={[styles.hubRoot, { paddingBottom: hubBottomPad }]}>
        <AppStatusBar style="dark" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#FAFAFA" }]} />

        <ScrollView
          style={styles.hubScroll}
          contentContainerStyle={[
            styles.hubScrollContent,
            { paddingTop: hubTopPad },
          ]}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          pointerEvents={searchOpen ? "none" : "auto"}
        >
            <WeatherHeaderCard
              source={weatherImg}
              height={hubLayout.promoH}
              edgeToEdge={false}
              topExtra={scale(12)}
              borderRadius={hubLayout.promoRadius}
              paddingHorizontal={hubLayout.promoPad}
              paddingBottom={verticalScale(12)}
              lightStatusBar={false}
              style={{
                width: "100%",
                maxWidth: hubLayout.promoMaxW,
                alignSelf: "center",
                marginBottom: verticalScale(4),
              }}
              topLeft={
                <Pressable
                  style={[
                    styles.promoBackBtn,
                    {
                      width: hubLayout.promoUi.back,
                      height: hubLayout.promoUi.back,
                      borderRadius: moderateScale(10),
                    },
                  ]}
                  onPress={handleBack}
                  accessibilityLabel={t("common.back")}
                  hitSlop={8}
                >
                  <Ionicons
                    name="arrow-back"
                    size={hubLayout.promoUi.backIcon}
                    color="#111111"
                  />
                </Pressable>
              }
              topRight={
                <View style={styles.promoRegionChip} pointerEvents="none">
                  <Text
                    style={[styles.promoRegionLabel, { fontSize: hubLayout.promoUi.locFs }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {weatherCityName}
                  </Text>
                </View>
              }
            >
              <Pressable
                style={[
                  styles.promoCopy,
                  {
                    marginTop: hubLayout.weatherNudge,
                    gap: hubLayout.promoUi.gap,
                  },
                ]}
                onPress={openWeather}
                accessibilityRole="button"
                accessibilityLabel={t("care.weather.title")}
              >
                <View style={styles.promoWeatherRow}>
                  <Text
                    style={[
                      styles.promoTemp,
                      {
                        fontSize: hubLayout.promoUi.tempFs,
                        lineHeight: hubLayout.promoUi.tempFs + 4,
                      },
                    ]}
                  >
                    {weatherTemp}
                  </Text>
                  <View style={styles.promoMeta}>
                    <Text
                      style={[
                        styles.promoCondition,
                        { fontSize: hubLayout.promoUi.conditionFs },
                      ]}
                      numberOfLines={1}
                    >
                      {t(`care.weather.conditions.${weatherKey}`)}
                    </Text>
                    {weather?.current?.humidity_pct != null ? (
                      <Text
                        style={[
                          styles.promoHumidity,
                          { fontSize: hubLayout.promoUi.hintFs },
                        ]}
                        numberOfLines={1}
                      >
                        {t("care.weather.humidity")} {Math.round(weather.current.humidity_pct)}%
                      </Text>
                    ) : (
                      <Text
                        style={[
                          styles.promoHumidity,
                          { fontSize: hubLayout.promoUi.hintFs },
                        ]}
                        numberOfLines={1}
                      >
                        {t("care.promoHint")}
                      </Text>
                    )}
                  </View>
                </View>

                {hubLayout.promoShowCta ? (
                  <View
                    style={[
                      styles.promoBtn,
                      {
                        minHeight: hubLayout.promoUi.btnMinH,
                        paddingVertical: hubLayout.promoUi.btnPadV,
                        paddingLeft: hubLayout.promoUi.btnPadH,
                        paddingRight: hubLayout.promoUi.btnPadH - 1,
                        gap: moderateScale(4),
                      },
                    ]}
                  >
                    <Text
                      style={[styles.promoBtnText, { fontSize: hubLayout.promoUi.btnFs }]}
                      numberOfLines={1}
                    >
                      {t("care.promoCta")}
                    </Text>
                    <Text
                      style={[
                        styles.promoBtnArrow,
                        {
                          fontSize: hubLayout.promoUi.btnArrow,
                          lineHeight: hubLayout.promoUi.btnArrow + 3,
                        },
                      ]}
                    >
                      →
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            </WeatherHeaderCard>

          {/* Tezkor kartochkalar — SOS, shelf, growth, album */}
            <ScrollView
              horizontal
              nestedScrollEnabled={true}
              showsHorizontalScrollIndicator={false}
                style={{
                height: hubLayout.quickActionH,
                flexGrow: 0,
                flexShrink: 0,
                marginTop: hubLayout.sectionGap,
                marginBottom: Math.max(4, Math.round(hubLayout.sectionGap * 0.4)),
              }}
              contentContainerStyle={[
                styles.quickActionScroll,
                {
                  height: hubLayout.quickActionH,
                  paddingHorizontal: hubLayout.hPad,
                },
              ]}
            >
              {(
                [
                  {
                    key: "sos",
                    img: QUICK_SOS,
                    a11y: t("care.sos.cta", {
                      defaultValue: "Sochim bugun yomon ko‘rinayapti (SOS)",
                    }),
                    onPress: () => setSosOpen(true),
                  },
                  {
                    key: "shelf",
                    img: QUICK_SHELF,
                    a11y: t("care.shelf.title", {
                      defaultValue: "Mening parvarish vositalarim",
                    }),
                    onPress: () => setShelfOpen(true),
                  },
                  {
                    key: "growth",
                    img: QUICK_GROWTH,
                    a11y: t("care.growthTracker.title", {
                      defaultValue: "Hair Growth & Health Tracker",
                    }),
                    onPress: openGrowthTracker,
                  },
                  {
                    key: "album",
                    img: QUICK_ALBUM,
                    a11y: t("care.album.screenTitle", {
                      defaultValue: "Parvarish Albomi",
                    }),
                    onPress: openCareAlbum,
                  },
                ] as const
              ).map((card) => (
                <Pressable
                  key={card.key}
                  style={[
                    styles.quickActionCard,
                    {
                      width: hubLayout.quickActionW,
                      height: hubLayout.quickActionH,
                    },
                  ]}
                  onPress={card.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={card.a11y}
                >
                  <Image
                    source={card.img}
                    style={styles.quickActionImg}
                    contentFit="cover"
                    contentPosition="center"
                    cachePolicy="memory-disk"
                    priority="high"
                    transition={0}
                    recyclingKey={`quick-${card.key}`}
                  />
                </Pressable>
              ))}
            </ScrollView>

          {/* Search Bar */}
          <View
            style={[
              styles.searchSection,
              {
                paddingHorizontal: hubLayout.hPad,
                marginTop: hubLayout.sectionGap,
                marginBottom: hubLayout.searchCatGap,
              },
            ]}
          >
            <Pressable
              style={[
                styles.searchBar,
                styles.searchHubBtn,
                {
                  width: "100%",
                  height: hubLayout.searchUi.h,
                  paddingLeft: hubLayout.searchUi.padL,
                  paddingRight: hubLayout.searchUi.padR,
                },
              ]}
              onPress={openSearch}
              accessibilityRole="button"
              accessibilityLabel={t("care.catalog.title")}
            >
              <Ionicons name="search-outline" size={hubLayout.searchUi.icon} color="#111111" />
              <Text style={[styles.searchPlaceholder, { fontSize: hubLayout.searchUi.fs }]}>
                {t("care.catalog.search")}...
              </Text>
              <View
                style={[
                  styles.searchHubTail,
                  {
                    width: hubLayout.searchUi.tail,
                    height: hubLayout.searchUi.tail,
                    borderRadius: hubLayout.searchUi.tail / 2,
                  },
                ]}
              >
                <Ionicons name="options-outline" size={hubLayout.searchUi.filterIcon} color="#fff" />
              </View>
            </Pressable>
          </View>

          {/* Featured */}
          <ScrollView
            horizontal
            nestedScrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            style={{
              height: hubLayout.featuredH + Math.max(2, Math.round(hubLayout.sectionGap * 0.35)),
              flexGrow: 0,
              flexShrink: 0,
              marginTop: Math.max(4, Math.round(hubLayout.sectionGap * 0.55)),
              marginBottom: hubLayout.sectionGap,
            }}
            contentContainerStyle={[
              styles.featuredProductsScroll,
              {
                height: hubLayout.featuredH,
                alignItems: "stretch",
                paddingVertical: verticalScale(4),
              },
            ]}
          >
            {displayProducts.length === 0 && !catalogReady
              ? [0, 1, 2].map((i) => (
                  <View
                    key={`sk-${i}`}
                    style={[
                      styles.featuredCard,
                      {
                        width: hubLayout.featuredW,
                        height: hubLayout.featuredH,
                        backgroundColor: "#ECECEC",
                      },
                    ]}
                  />
                ))
              : null}
            {displayProducts.map((prod) => {
              const isMine =
                prod.isUserAdded ||
                (prod.productId ? myProducts.some((p) => p.id === prod.productId) : false);
              const catalogRow = prod.productId
                ? catalog.find((c) => c.id === prod.productId)
                : undefined;
              const liked = Boolean(catalogRow?.liked_by_me);
              const fui = hubLayout.featuredUi;

              return (
                <Pressable
                  key={prod.id}
                  style={[
                    styles.featuredCard,
                    {
                      width: hubLayout.featuredW,
                      height: hubLayout.featuredH,
                    },
                  ]}
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
                    {prod.image ? (
                      <Image
                        source={{ uri: prod.image }}
                        style={styles.featuredCardImg}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        priority="high"
                        recyclingKey={prod.id}
                        transition={0}
                        placeholderContentFit="cover"
                      />
                    ) : (
                      <View style={[styles.featuredCardImg, { backgroundColor: "#E8E8E8" }]} />
                    )}
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.25)", "rgba(0,0,0,0.88)"]}
                      locations={[0.35, 0.65, 1]}
                      style={styles.featuredScrim}
                    />

                    <Pressable
                      style={[
                        styles.featuredActionBtn,
                        {
                          width: fui.btn,
                          height: fui.btn,
                          borderRadius: fui.btn / 2,
                          top: fui.ctrlInset,
                          right: fui.ctrlInset,
                        },
                        liked ? styles.featuredActionBtnActive : null,
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
                        size={fui.icon}
                        color={liked ? "#EF4444" : "#111111"}
                      />
                    </Pressable>

                    {isMine && prod.duration ? (
                      <View
                        style={[
                          styles.featuredDurationPill,
                          {
                            top: fui.ctrlInset,
                            left: fui.ctrlInset,
                            paddingHorizontal: Math.max(6, Math.round(8 * fui.k)),
                            paddingVertical: Math.max(3, Math.round(4 * fui.k)),
                            gap: Math.max(2, Math.round(4 * fui.k)),
                          },
                        ]}
                      >
                        <Ionicons name="time-outline" size={fui.durationIcon} color="#111111" />
                        <Text style={[styles.featuredDurationText, { fontSize: fui.durationFs }]}>
                          {prod.duration}
                        </Text>
                      </View>
                    ) : null}

                    {isMine ? (
                      <Pressable
                        style={[
                          styles.featuredPlayBtn,
                          {
                            width: fui.play,
                            height: fui.play,
                            borderRadius: fui.play / 2,
                            right: fui.ctrlInset,
                            bottom: "30%",
                          },
                        ]}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          openProductGuide(prod);
                        }}
                        hitSlop={6}
                        accessibilityLabel="Play guide"
                      >
                        <Ionicons
                          name="play"
                          size={fui.playIcon}
                          color="#0A0A0A"
                          style={{ marginLeft: 1 }}
                        />
                      </Pressable>
                    ) : (
                      <Pressable
                        style={[
                          styles.featuredActionBtn,
                          {
                            width: fui.btn,
                            height: fui.btn,
                            borderRadius: fui.btn / 2,
                            right: fui.ctrlInset,
                            bottom: "30%",
                          },
                        ]}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          openPreview(prod.productId);
                        }}
                        hitSlop={6}
                        accessibilityLabel={t("care.myProducts.addShort", { defaultValue: "Qo‘shish" })}
                      >
                        <Ionicons name="add" size={fui.icon} color="#111111" />
                      </Pressable>
                    )}

                    <View
                      style={[
                        styles.featuredMeta,
                        {
                          paddingHorizontal: fui.metaPadH,
                          paddingTop: fui.metaPadV,
                          paddingBottom: fui.metaPadV + 2,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.featuredProdBrand, { fontSize: fui.brandFs }]}
                        numberOfLines={1}
                      >
                        {prod.brand || "MORF Care"}
                      </Text>
                      <Text
                        style={[
                          styles.featuredProdTitle,
                          { fontSize: fui.titleFs, lineHeight: fui.titleFs + 3 },
                        ]}
                        numberOfLines={hubLayout.featuredRich ? 2 : 1}
                      >
                        {prod.title}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Hisobot sheet — featured kartochkalar ostida */}
            <View style={styles.hubDockOuter}>
              <View
                style={[
                  styles.hubSheet,
                  {
                    gap: hubLayout.sheetGap,
                    paddingTop: hubLayout.sheetTop,
                    paddingBottom: Math.max(8, Math.round(hubLayout.sheetGap * 0.75)),
                    minHeight: hubLayout.sheetH,
                    paddingHorizontal: Math.max(12, hubLayout.hPad - 2),
                    borderRadius: hubLayout.narrow ? 18 : 24,
                  },
                ]}
              >
                <View style={styles.reportHead}>
                  <Pressable
                    style={[
                      styles.reportFilter,
                      {
                        paddingHorizontal: hubLayout.sheetUi.filterPadH,
                        paddingVertical: hubLayout.sheetUi.filterPadV,
                      },
                    ]}
                    onPress={openMyProducts}
                  >
                    <Ionicons
                      name="bag-handle-outline"
                      size={hubLayout.sheetUi.filterIcon}
                      color="#111111"
                    />
                    <Text
                      style={[
                        styles.reportFilterText,
                        { fontSize: hubLayout.sheetUi.filterFs },
                      ]}
                    >
                      {t("care.myProducts.title")}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={Math.max(10, hubLayout.sheetUi.filterIcon - 2)}
                      color="#737373"
                    />
                  </Pressable>
                </View>

                <View style={[styles.hubCards, { height: hubLayout.hubCardH }]}>
                  <Pressable
                    style={styles.hubCard}
                    onPress={openParvarish}
                    accessibilityRole="button"
                    accessibilityLabel={t("care.hubParvarish")}
                  >
                    <Image
                      source={HUB_ROUTINE}
                      style={styles.hubCardImg}
                      contentFit="cover"
                      contentPosition="center"
                      cachePolicy="memory-disk"
                      priority="high"
                      transition={0}
                      recyclingKey="hub-routine"
                    />
                    <LinearGradient
                      colors={["transparent", "rgba(17,17,17,0.58)"]}
                      style={styles.hubCardScrim}
                      pointerEvents="none"
                    />
                    <View style={styles.hubCardBody}>
                      <View style={styles.hubStatusBadge}>
                        <Text style={[styles.hubStatusText, { fontSize: hubLayout.sheetUi.statusFs }]}>
                          {t("care.hubStatusActive", { defaultValue: "Faol" })}
                        </Text>
                      </View>
                      <View style={styles.hubCardFooter}>
                        <Text
                          style={[styles.hubCardTitle, { fontSize: hubLayout.sheetUi.cardTitleFs }]}
                          numberOfLines={1}
                        >
                          {t("care.hubParvarish")}
                        </Text>
                        <Text
                          style={[styles.hubCardMetric, { fontSize: hubLayout.sheetUi.cardMetricFs }]}
                          numberOfLines={1}
                        >
                          {t(`care.conditions.${quiz.condition}`)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>

                  <Pressable
                    style={styles.hubCard}
                    onPress={openTarkib}
                    accessibilityRole="button"
                    accessibilityLabel={t("care.hubTarkib")}
                  >
                    <Image
                      source={HUB_SCAN}
                      style={styles.hubCardImg}
                      contentFit="cover"
                      contentPosition="center"
                      cachePolicy="memory-disk"
                      priority="high"
                      transition={0}
                      recyclingKey="hub-scan"
                    />
                    <LinearGradient
                      colors={["transparent", "rgba(17,17,17,0.58)"]}
                      style={styles.hubCardScrim}
                      pointerEvents="none"
                    />
                    <View style={styles.hubCardBody}>
                      <View style={styles.hubStatusBadge}>
                        <Text style={[styles.hubStatusText, { fontSize: hubLayout.sheetUi.statusFs }]}>
                          {t("care.hubStatusAnalyzed", { defaultValue: "Tahlil qilingan" })}
                        </Text>
                      </View>
                      <View style={styles.hubCardFooter}>
                        <Text
                          style={[styles.hubCardTitle, { fontSize: hubLayout.sheetUi.cardTitleFs }]}
                          numberOfLines={1}
                        >
                          {t("care.hubTarkib")}
                        </Text>
                        <Text
                          style={[styles.hubCardMetric, { fontSize: hubLayout.sheetUi.cardMetricFs }]}
                          numberOfLines={1}
                        >
                          {t("care.hubTarkibMetric")}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                </View>

              </View>
            </View>
        </ScrollView>

        {searchOpen ? (
          <>
            <Animated.View
              pointerEvents="box-none"
              style={[styles.searchBackdrop, { opacity: searchBackdropOp }]}
            >
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={closeSearch}
                accessibilityLabel={t("common.back")}
              />
            </Animated.View>
            <Animated.View
              style={[
                styles.searchSheet,
                {
                  height: searchSheetHeight,
                  bottom: keyboardCover,
                  paddingBottom: safeBottom(insets.bottom, 0),
                  transform: [{ translateY: searchSheetY }],
                },
              ]}
            >
              <View {...searchPan.panHandlers} style={styles.searchSheetChrome}>
                <View style={styles.searchSheetHandle} />
                <View style={styles.searchSheetHeader}>
                  <View style={[styles.searchBar, styles.searchBarInSheet, styles.searchBarActive]}>
                    <Ionicons name="search-outline" size={18} color="#111111" />
                    <TextInput
                      ref={searchInputRef}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder={t("care.catalog.search")}
                      placeholderTextColor="#737373"
                      style={styles.searchInput}
                      autoFocus={false}
                      returnKeyType="search"
                      blurOnSubmit
                      onFocus={() => {
                        if (Platform.OS === "web" && typeof window !== "undefined") {
                          window.scrollTo(0, 0);
                        }
                      }}
                    />
                  </View>
                  <Pressable
                    style={styles.searchCloseBtn}
                    onPress={closeSearch}
                    accessibilityLabel={t("common.back")}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={18} color="#111111" />
                  </Pressable>
                </View>
                <Text style={styles.searchSheetTitle}>{t("care.catalog.title")}</Text>
              </View>

              <ScrollView
                style={styles.searchSheetScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.searchSheetList}
                bounces
              >
                {!searchListReady ? (
                  <View style={styles.searchLoading}>
                    <ActivityIndicator color="#111111" />
                  </View>
                ) : searchResults.length === 0 ? (
                  <Text style={styles.searchEmpty}>{t("care.catalog.empty")}</Text>
                ) : (
                  <View style={[styles.searchGrid, { gap: searchCols === 1 ? 10 : 8 }]}>
                    {searchResults.map((item) => {
                      return (
                        <Pressable
                          key={`search-${item.id}`}
                          style={[styles.searchCard, { width: searchCardW, maxWidth: searchCardW }]}
                          onPress={() => openPreview(item.id)}
                        >
                          <View style={styles.searchCardMedia}>
                            {item.image ? (
                              <Image
                                source={{ uri: item.image }}
                                style={styles.searchCardImg}
                                contentFit="contain"
                                cachePolicy="memory-disk"
                                priority="high"
                                recyclingKey={String(item.id)}
                                transition={60}
                              />
                            ) : (
                              <View style={[styles.searchCardImg, styles.searchRowPh]}>
                                <Ionicons name="flask-outline" size={22} color="#111111" />
                              </View>
                            )}
                            <CareCatalogMark />
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
                                if (item.added) return;
                                void addFromSearch(item.id);
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
          </>
        ) : null}

        <CareSosSheet visible={sosOpen} onClose={() => setSosOpen(false)} />
        <CareShelfTrackerSheet visible={shelfOpen} onClose={() => setShelfOpen(false)} />

        <SafeModal
          visible={previewVisible}
          transparent
          animationType="none"
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
                {
                  transform: [{ translateY: previewSheetY }],
                  maxHeight: Math.round(winH * 0.92),
                },
              ]}
            >
              {previewProduct ? (
                <CareProductPreviewSheet
                  product={previewProduct}
                  quiz={quiz}
                  added={previewAdded}
                  bottomInset={insets.bottom}
                  onClose={closePreview}
                  onAdd={() => {
                    if (previewAdded) return;
                    return addFromSearch(previewProduct.id);
                  }}
                  onUseInCare={previewAdded ? openPreviewCare : undefined}
                />
              ) : null}
            </Animated.View>
          </View>
        </SafeModal>
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
            <Image source={{ uri: addToast.image }} style={styles.addToastImg} contentFit="cover" cachePolicy="memory-disk" />
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

      </View>
    );
  }

  return (
    <View style={styles.routineRoot}>
      <AppStatusBar style="dark" />
      <View style={[styles.routineHeader, { paddingTop: safeTop(insets.top, 6) }]}>
        <Pressable
          style={styles.routineHeaderBtn}
          onPress={() => setViewMode("hub")}
          hitSlop={8}
          accessibilityLabel={t("common.back")}
        >
          <Ionicons name="arrow-back" size={18} color="#111" />
        </Pressable>
        <View style={styles.routineHeaderCenter}>
          <Text style={styles.routineHeaderTitle} numberOfLines={1}>
            {t("care.routine.planTitle", { defaultValue: "Morf AI Parvarish Rejasi" })}
          </Text>
          <Text style={styles.routineHeaderSub} numberOfLines={1}>
            {t(`care.conditions.${quiz.condition}`)} · {t(`care.textures.${quiz.texture}`)}
          </Text>
        </View>
        <View style={styles.routineHeaderBtnSpacer} />
      </View>

      <CareRoutineSheet
        quiz={quiz}
        catalog={catalog}
        selectedDate={selectedDate}
        userName={
          user?.full_name ||
          [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
          user?.first_name ||
          null
        }
        onOpenCatalog={() => {
          // Search sheet faqat hubda render — hubga o‘tib ochamiz
          setViewMode("hub");
          setTimeout(() => openSearch(), 80);
        }}
        onOpenScan={openTarkib}
        onOpenProduct={openProduct}
        onOpenGuide={openProductGuide}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFA" },
  quickActionScroll: {
    gap: moderateScale(8),
    alignItems: "stretch",
  },
  quickActionCard: {
    borderRadius: moderateScale(16),
    overflow: "hidden",
    position: "relative",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.08)",
    shadowColor: "#111111",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    backgroundColor: "#F0F0F0",
  },
  /** Android expo-image: absoluteFill yetarli emas — 100% W/H majburiy. */
  quickActionImg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  routineRoot: { flex: 1, minHeight: 0, backgroundColor: "#FAFAFA" },
  onboardRoot: { flex: 1, minHeight: 0, backgroundColor: "#FAFAFA" },
  center: { alignItems: "center", justifyContent: "center" },
  pad: { flex: 1, paddingHorizontal: scale(20) },
  onboardPad: { flex: 1, paddingHorizontal: scale(20) },
  hubRoot: { flex: 1, minHeight: 0, backgroundColor: "#FAFAFA", overflow: "hidden" },
  hubScroll: {
    flex: 1,
    minHeight: 0,
  },
  hubScrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  addToast: {
    position: "absolute",
    top: 0,
    left: scale(16),
    right: scale(16),
    zIndex: 80,
    elevation: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(12),
    borderRadius: moderateScale(18),
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.18)",
    shadowColor: "#111111",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
  },
  addToastImg: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(12),
    backgroundColor: "#F0F0F0",
  },
  addToastBody: { flex: 1, minWidth: 0, gap: 1 },
  addToastEyebrow: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "700",
    color: "#111111",
  },
  addToastTitle: {
    ...morphFont,
    fontSize: fontSize(14),
    fontWeight: "700",
    color: "#111111",
  },
  addToastCheck: {
    width: scale(26),
    height: scale(26),
    borderRadius: moderateScale(13),
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  navBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: verticalScale(4),
  },
  navCircleBtn: {
    width: scale(42),
    height: scale(42),
    borderRadius: moderateScale(21),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
  },
  navCircleBtnLight: {
    width: scale(38),
    height: scale(38),
    borderRadius: moderateScale(19),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
  },
  promoCard: {
    width: "100%",
    alignSelf: "stretch",
    overflow: "hidden",
    backgroundColor: "#0B1220",
    justifyContent: "space-between",
    paddingBottom: verticalScale(10),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.12)",
  },
  promoHeroBg: {
    width: "100%",
    height: "100%",
  },
  promoHeroImg: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
  },
  promoScrim: {
    ...StyleSheet.absoluteFill,
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
    width: scale(160),
    height: scale(160),
    top: -verticalScale(40),
    right: -scale(36),
  },
  promoBlobB: {
    width: scale(100),
    height: scale(100),
    bottom: -verticalScale(28),
    left: -scale(20),
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  promoTop: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: moderateScale(10),
    marginBottom: verticalScale(6),
    zIndex: 2,
    paddingTop: verticalScale(2),
  },
  promoBackBtn: {
    width: scale(42),
    height: scale(42),
    borderRadius: moderateScale(12),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(15,23,42,0.18)",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  promoRegionChip: {
    flexShrink: 1,
    maxWidth: "72%",
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingVertical: verticalScale(4),
    paddingHorizontal: scale(8),
    borderRadius: moderateScale(9),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.1)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  promoRegionLabel: {
    ...morphFont,
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -0.15,
    textAlign: "right",
    includeFontPadding: false,
  },
  promoBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(16),
    zIndex: 2,
  },
  promoCopy: {
    zIndex: 2,
    flex: 1,
    flexShrink: 1,
    minHeight: 0,
    gap: moderateScale(8),
    maxWidth: "100%",
    justifyContent: "flex-end",
  },
  promoMeta: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 2,
  },
  promoCondition: {
    ...morphFont,
    fontSize: fontSize(15),
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  promoHumidity: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "700",
    color: "rgba(255,255,255,0.95)",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  promoChipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    /** Wrap qilinsa qator balandligi oshib, hero kontenti kesiladi. */
    flexWrap: "nowrap",
  },
  promoStatusChip: {
    flexShrink: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(5),
    paddingHorizontal: scale(9),
    paddingVertical: verticalScale(4),
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.28)",
  },
  promoStatusDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: moderateScale(3),
    backgroundColor: "#86EFAC",
  },
  promoStatusChipText: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "700",
    color: "#FFFFFF",
  },
  promoWeatherRow: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
  },
  promoTemp: {
    ...morphFont,
    fontSize: fontSize(42),
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1.5,
    lineHeight: fontSize(46),
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  promoLeft: {
    flex: 1,
    gap: moderateScale(12),
    paddingRight: scale(10),
    zIndex: 1,
  },
  promoEyebrow: {
    ...morphFont,
    flexShrink: 0,
    fontSize: fontSize(10),
    fontWeight: "700",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  promoTitle: {
    ...morphFont,
    fontSize: fontSize(16),
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: fontSize(20),
    letterSpacing: -0.3,
  },
  promoHint: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "500",
    color: "rgba(255,255,255,0.72)",
    lineHeight: fontSize(16),
    marginTop: verticalScale(2),
  },
  promoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 999,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
  },
  promoChipText: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "700",
    color: "#111111",
  },
  promoBtn: {
    flexShrink: 0,
    marginTop: verticalScale(2),
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingLeft: scale(10),
    paddingRight: scale(9),
    paddingVertical: verticalScale(5),
    minHeight: 28,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
    maxWidth: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  promoBtnText: {
    ...morphFont,
    flexShrink: 1,
    fontSize: fontSize(11),
    fontWeight: "700",
    color: "#0A0A0A",
    letterSpacing: -0.2,
  },
  promoBtnArrow: {
    ...morphFont,
    flexShrink: 0,
    fontSize: fontSize(12),
    fontWeight: "700",
    color: "#0A0A0A",
    lineHeight: fontSize(15),
    marginTop: -1,
  },
  promoImg: {
    width: scale(112),
    height: verticalScale(128),
    borderRadius: moderateScale(20),
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(5),
    marginTop: verticalScale(10),
  },
  dotActive: {
    width: scale(18),
    height: verticalScale(5),
    borderRadius: moderateScale(2.5),
    backgroundColor: "#111111",
  },
  dotInactive: {
    width: scale(5),
    height: scale(5),
    borderRadius: moderateScale(2.5),
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  searchSection: {
    paddingHorizontal: scale(10),
    marginTop: verticalScale(12),
    marginBottom: verticalScale(10),
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(20),
    paddingLeft: scale(14),
    paddingRight: scale(6),
    height: verticalScale(48),
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.12)",
    gap: moderateScale(8),
    shadowColor: "#111111",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchBarActive: {
    borderColor: "#111111",
  },
  searchHubBtn: {
    display: "flex",
  },
  searchHubTail: {
    width: scale(32),
    height: scale(32),
    borderRadius: moderateScale(16),
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: fontSize(15),
    color: "#111111",
    paddingVertical: 0,
    height: "100%",
  },
  searchPlaceholder: {
    ...morphFont,
    flex: 1,
    fontSize: fontSize(13),
    fontWeight: "500",
    color: "#525252",
  },
  searchCloseBtn: {
    width: scale(40),
    height: scale(40),
    flexShrink: 0,
    borderRadius: moderateScale(20),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F3F5",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.08)",
  },
  filterBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: moderateScale(18),
    overflow: "hidden",
    marginRight: 1,
  },
  filterBtnGrad: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(8,12,20,0.35)",
    zIndex: 20,
  },
  searchSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 21,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: moderateScale(22),
    borderTopRightRadius: moderateScale(22),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
    overflow: "hidden",
  },
  searchSheetChrome: {
    flexShrink: 0,
    paddingTop: verticalScale(8),
    paddingHorizontal: scale(12),
    gap: moderateScale(10),
    backgroundColor: "#FFFFFF",
  },
  searchSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: moderateScale(8),
    minHeight: 44,
  },
  searchBarInSheet: {
    flex: 1,
    minWidth: 0,
    paddingRight: scale(12),
  },
  searchSheetHandle: {
    alignSelf: "center",
    width: scale(40),
    height: verticalScale(4),
    borderRadius: moderateScale(2),
    backgroundColor: "rgba(15,23,42,0.18)",
  },
  searchSheetTitle: {
    ...morphFont,
    marginBottom: verticalScale(4),
    fontSize: fontSize(15),
    fontWeight: "700",
    color: "#111111",
  },
  searchSheetScroll: {
    flex: 1,
    minHeight: 0,
  },
  searchSheetList: {
    paddingHorizontal: scale(12),
    paddingTop: verticalScale(4),
    paddingBottom: verticalScale(16),
  },
  searchEmpty: {
    ...morphFont,
    paddingVertical: verticalScale(28),
    textAlign: "center",
    color: "rgba(15,23,42,0.45)",
    fontSize: fontSize(13),
  },
  searchLoading: {
    paddingVertical: verticalScale(40),
    alignItems: "center",
    justifyContent: "center",
  },
  searchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  searchCard: {
    flexGrow: 0,
    backgroundColor: "#FAFAFA",
    borderRadius: moderateScale(14),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
    paddingBottom: 0,
  },
  searchCardMedia: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#FFFFFF",
    position: "relative",
  },
  searchCardImg: {
    width: "100%",
    height: "100%",
  },
  searchLikeBtn: {
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
  searchLikeCount: {
    position: "absolute",
    left: scale(6),
    bottom: verticalScale(6),
  },
  searchLikeCountText: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "700",
    color: "#111111",
  },
  searchCardTitle: {
    ...morphFont,
    marginTop: verticalScale(6),
    paddingHorizontal: scale(8),
    fontSize: fontSize(11),
    fontWeight: "700",
    color: "#111111",
    lineHeight: fontSize(14),
    minHeight: verticalScale(28),
  },
  searchCardBrand: {
    ...morphFont,
    marginTop: 1,
    paddingHorizontal: scale(8),
    fontSize: fontSize(10),
    color: "rgba(15,23,42,0.5)",
    marginBottom: verticalScale(6),
  },
  searchAddBtnRow: {
    paddingHorizontal: scale(8),
    paddingBottom: verticalScale(8),
  },
  searchAddBtn: {
    height: verticalScale(30),
    borderRadius: moderateScale(10),
    backgroundColor: "#111111",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(4),
    paddingHorizontal: scale(8),
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
    fontSize: fontSize(11),
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  previewSheetWrap: {
    width: "100%",
    zIndex: 2,
    backgroundColor: "transparent",
    overflow: "visible",
  },
  previewCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(16),
    maxHeight: "88%",
  },
  previewGrab: {
    alignSelf: "center",
    width: scale(40),
    height: verticalScale(4),
    borderRadius: moderateScale(2),
    backgroundColor: "rgba(15,23,42,0.14)",
    marginBottom: verticalScale(10),
  },
  previewScroll: { gap: moderateScale(4), paddingBottom: verticalScale(12) },
  previewMedia: {
    width: "100%",
    aspectRatio: ASPECT.landscape,
    borderRadius: moderateScale(18),
    overflow: "hidden",
    backgroundColor: "#F0F0F0",
    marginBottom: verticalScale(8),
  },
  previewImg: { width: "100%", height: "100%" },
  previewClose: {
    position: "absolute",
    top: verticalScale(10),
    right: scale(10),
    width: scale(32),
    height: scale(32),
    borderRadius: moderateScale(16),
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewTitle: {
    ...morphFont,
    fontSize: fontSize(18),
    fontWeight: "800",
    color: "#111111",
  },
  previewBrand: {
    ...morphFont,
    fontSize: fontSize(13),
    color: "rgba(15,23,42,0.55)",
    marginTop: verticalScale(2),
  },
  previewCat: {
    ...morphFont,
    marginTop: verticalScale(6),
    alignSelf: "flex-start",
    fontSize: fontSize(12),
    fontWeight: "700",
    color: "#111111",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: verticalScale(4),
  },
  previewSection: {
    marginTop: verticalScale(8),
    padding: moderateScale(12),
    borderRadius: moderateScale(14),
    backgroundColor: "#FAFAFA",
    gap: moderateScale(4),
  },
  previewSectionTitle: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  previewBody: {
    ...morphFont,
    fontSize: fontSize(13),
    lineHeight: fontSize(19),
    color: "#334155",
  },
  previewIngredients: {
    ...morphFont,
    fontSize: fontSize(12),
    lineHeight: fontSize(18),
    color: "#475569",
  },
  previewWarn: {
    ...morphFont,
    fontSize: fontSize(12),
    lineHeight: fontSize(17),
    color: "#111111",
  },
  previewUsage: {
    ...morphFont,
    fontSize: fontSize(12),
    lineHeight: fontSize(17),
    color: "rgba(15,23,42,0.55)",
  },
  previewAddBtn: {
    height: verticalScale(50),
    borderRadius: moderateScale(16),
    backgroundColor: "#111111",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(8),
  },
  previewActions: {
    marginTop: verticalScale(8),
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
  },
  previewAddBtnFlex: {
    flex: 1,
  },
  previewCareBtn: {
    flex: 1,
    height: verticalScale(50),
    borderRadius: moderateScale(16),
    backgroundColor: "#111111",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(8),
  },
  previewCareBtnText: {
    ...morphFont,
    fontSize: fontSize(15),
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
    fontSize: fontSize(15),
    fontWeight: "700",
    color: "#fff",
  },
  previewAddBtnTextAdded: {
    color: "#111111",
  },
  searchRowPh: { alignItems: "center", justifyContent: "center" },
  featuredProductsScroll: {
    paddingHorizontal: scale(16),
    gap: moderateScale(12),
    alignItems: "stretch",
  },
  featuredGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: moderateScale(12),
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(4),
    paddingBottom: verticalScale(8),
  },
  featuredCard: {
    borderRadius: moderateScale(20),
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.1)",
  },
  featuredMedia: {
    flex: 1,
    width: "100%",
    position: "relative",
    /** Matn bloki oddiy oqimda — karta pasti hech qachon kesilmaydi. */
    justifyContent: "flex-end",
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  featuredActionBtn: {
    position: "absolute",
    zIndex: 2,
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
  featuredPlayBtn: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  featuredDurationPill: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    zIndex: 2,
  },
  featuredDurationText: {
    ...morphFont,
    fontWeight: "700",
    color: "#111111",
  },
  featuredMeta: {
    flexShrink: 0,
    gap: moderateScale(2),
    zIndex: 2,
  },
  featuredProdTitle: {
    ...morphFont,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  featuredProdBrand: {
    ...morphFont,
    fontWeight: "600",
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  featuredProdPrice: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "500",
    color: "#94A3B8",
  },
  routineTop: { paddingHorizontal: scale(20), paddingBottom: verticalScale(8), gap: moderateScale(10) },
  routineTopTitle: { ...morphFont, fontSize: fontSize(16), fontWeight: "700", color: "#111" },
  routineHeadline: {
    ...morphFont,
    fontSize: fontSize(28),
    fontWeight: "700",
    color: "#111",
    letterSpacing: -0.6,
    lineHeight: fontSize(32),
  },
  routineHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(10),
    backgroundColor: "#FAFAFA",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(17,17,17,0.06)",
    zIndex: 2,
  },
  routineHeaderBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.08)",
    shadowColor: "#111111",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  routineHeaderBtnSpacer: {
    width: scale(40),
    height: scale(40),
  },
  routineHeaderCenter: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  routineHeaderTitle: {
    ...morphFont,
    fontSize: fontSize(17),
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -0.3,
  },
  routineHeaderSub: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "500",
    color: "rgba(17,17,17,0.45)",
  },
  hubDockOuter: {
    marginTop: verticalScale(6),
    flexGrow: 1,
    paddingHorizontal: scale(10),
    paddingTop: 0,
    paddingBottom: verticalScale(4),
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  hubSheet: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: scale(14),
    paddingTop: verticalScale(16),
    paddingBottom: 0,
    gap: moderateScale(14),
    borderRadius: moderateScale(24),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.1)",
  },
  hubSheetFlow: {
    marginTop: verticalScale(12),
    borderRadius: moderateScale(26),
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(12),
    gap: moderateScale(12),
  },
  reportHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: moderateScale(8),
    marginBottom: verticalScale(0),
  },
  reportTitle: {
    ...morphFont,
    flex: 1,
    minWidth: 0,
    fontSize: fontSize(18),
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -0.3,
  },
  reportFilter: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
    paddingHorizontal: scale(9),
    paddingVertical: verticalScale(5),
    borderRadius: 999,
    backgroundColor: "#F4F4F5",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.08)",
    flexShrink: 0,
  },
  reportFilterText: { ...morphFont, fontSize: fontSize(11), fontWeight: "700", color: "#111111" },
  hubCards: {
    flexDirection: "row",
    gap: moderateScale(12),
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  hubCard: {
    flex: 1,
    height: "100%",
    borderRadius: moderateScale(16),
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.12)",
    overflow: "hidden",
    position: "relative",
  },
  hubCardImg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  hubCardScrim: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  hubCardBody: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: scale(10),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(10),
    zIndex: 2,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  hubCardFooter: {
    gap: 2,
    alignSelf: "stretch",
  },
  hubStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  hubStatusText: {
    ...morphFont,
    fontSize: fontSize(9),
    fontWeight: "700",
    letterSpacing: 0.2,
    color: "#111111",
  },
  hubCardTitle: {
    ...morphFont,
    flexShrink: 0,
    fontSize: fontSize(12),
    lineHeight: fontSize(15),
    fontWeight: "600",
    color: "rgba(255,255,255,0.82)",
  },
  hubCardMetric: {
    ...morphFont,
    flexShrink: 0,
    fontSize: fontSize(17),
    lineHeight: fontSize(21),
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.35,
  },
  rowBetweenLight: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  onboardBadge: { ...morphFont, fontSize: fontSize(12), fontWeight: "600", color: "#111111" },
  onboardH1: { ...morphFont, fontSize: fontSize(28), fontWeight: "700", color: "#111", letterSpacing: -0.6, lineHeight: fontSize(34) },
  onboardSub: { marginTop: verticalScale(10), ...morphFont, fontSize: fontSize(15), lineHeight: fontSize(22), color: "rgba(26,26,26,0.55)" },
  progressTrackLight: {
    marginTop: verticalScale(20),
    height: verticalScale(4),
    borderRadius: moderateScale(99),
    backgroundColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  progressFillLight: { height: "100%", backgroundColor: "#111111", borderRadius: moderateScale(99) },
  optGridLight: { marginTop: verticalScale(24), flexDirection: "row", flexWrap: "wrap", gap: moderateScale(10) },
  scheduleOnboard: { marginTop: verticalScale(20), gap: moderateScale(10) },
  scheduleOnboardLabel: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "700",
    color: "rgba(17,17,17,0.45)",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: verticalScale(4),
  },
  scheduleOnboardRow: { flexDirection: "row", flexWrap: "wrap", gap: moderateScale(8) },
  scheduleOnboardChip: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.1)",
  },
  scheduleOnboardChipOn: { backgroundColor: "#111", borderColor: "#111" },
  scheduleOnboardChipText: {
    ...morphFont,
    fontSize: fontSize(13),
    fontWeight: "700",
    color: "#111",
  },
  scheduleOnboardChipTextOn: { color: "#fff" },
  optCardLight: {
    width: "47%",
    minHeight: verticalScale(72),
    borderRadius: moderateScale(18),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    backgroundColor: "rgba(255,255,255,0.65)",
    padding: moderateScale(14),
    justifyContent: "center",
  },
  optCardLightOn: { borderColor: "#111111", backgroundColor: "#fff" },
  optTextLight: { ...morphFont, fontSize: fontSize(14), fontWeight: "600", color: "rgba(26,26,26,0.65)" },
  optTextLightOn: { color: "#111" },
  onboardFooter: { flexDirection: "row", gap: moderateScale(8), width: "100%" },
  primaryBtnLight: {
    height: verticalScale(52),
    borderRadius: 999,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(24),
  },
  primaryBtnLightGrow: { flex: 1 },
  primaryBtnLightText: { ...morphFont, fontSize: fontSize(14), fontWeight: "600", color: "#fff" },
  ghostBtnLight: {
    height: verticalScale(52),
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  ghostBtnLightText: { ...morphFont, fontSize: fontSize(14), fontWeight: "600", color: "#111" },
  flexGrow: { flex: 1.6 },
  disabled: { opacity: 0.5 },
  muted: { ...morphFont, fontSize: fontSize(12), color: "rgba(255,255,255,0.35)", fontWeight: "500" },
  lockWrap: { marginTop: verticalScale(80), alignItems: "center", paddingHorizontal: scale(24) },
  lockTitle: { marginTop: verticalScale(16), ...morphFont, fontSize: fontSize(18), fontWeight: "600", color: "#fff" },
  lockSub: {
    marginTop: verticalScale(8),
    ...morphFont,
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },
  primaryBtnDark: {
    height: verticalScale(48),
    borderRadius: 999,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(24),
  },
  primaryBtnDarkText: { ...morphFont, fontSize: fontSize(14), fontWeight: "600", color: "#000" },
});
