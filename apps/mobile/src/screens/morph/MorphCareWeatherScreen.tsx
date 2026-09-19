import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeModal } from "../../components/ui/SafeModal";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeBottom, safeTop } from "../../lib/safe-area";
import { weatherIconName } from "../../api/weather";
import { WeatherHeaderCard } from "../../components/morph/care/WeatherHeaderCard";
import { AppStatusBar } from "../../components/ui/AppStatusBar";
import { NativeBackButton } from "../../components/ui/NativeBackButton";
import { useCareWeather } from "../../hooks/useCareWeather";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { loadMyProducts, type MyCareProduct } from "../../lib/morph-my-products";
import {
  buildGoOutKit,
  buildGoOutSummary,
  GO_OUT_IMAGES,
  weatherLocationHeroSource,
} from "../../lib/weather-care-tips";
import {
  buildWeatherShieldState,
  shieldImageForTag,
} from "../../services/weatherRecommendationEngine";
import { WeatherShieldContainer } from "../../components/WeatherShield";
import {
  fetchWeatherShieldCatalog,
  postWeatherShieldAction,
} from "../../api/weather-shield";
import type { HairRecommendation, WeatherAlert, WeatherData } from "../../types/weatherShield";
import { regionLabel, UZ_REGIONS, type UzRegionId } from "../../lib/uz-regions";
import type { MorphCareStackParamList } from "../../navigation/MorphCareStack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../../theme/colors";
import { morphFont } from "../../theme/morph-font";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

const DONE_KEY = "mysaloon.morphAi.weatherShieldDone";

type Props = NativeStackScreenProps<MorphCareStackParamList, "CareWeather">;

export function MorphCareWeatherScreen({ navigation }: Props) {
  useHideTabBar();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    data,
    regionId,
    loading,
    refreshing,
    error,
    refresh,
    setRegion,
    clearManualRegion,
  } = useCareWeather();
  const [regionOpen, setRegionOpen] = useState(false);
  const [goOutOpen, setGoOutOpen] = useState(false);
  const [goOutExpanded, setGoOutExpanded] = useState(false);
  const { height: winH } = useWindowDimensions();
  const goOutMidH = Math.round(winH * 0.8);
  const goOutFullH = Math.round(winH * 0.96);
  const goOutSheetH = useRef(new Animated.Value(goOutMidH)).current;
  const goOutY = useRef(new Animated.Value(goOutMidH)).current;
  const goOutBackdrop = useRef(new Animated.Value(0)).current;
  const goOutExpandedRef = useRef(false);
  const goOutOpenPending = useRef(false);
  const goOutClosing = useRef(false);

  const openGoOut = () => {
    if (goOutOpen || goOutClosing.current) return;
    goOutExpandedRef.current = false;
    setGoOutExpanded(false);
    goOutSheetH.stopAnimation();
    goOutY.stopAnimation();
    goOutBackdrop.stopAnimation();
    goOutSheetH.setValue(goOutMidH);
    goOutY.setValue(goOutMidH);
    goOutBackdrop.setValue(0);
    goOutOpenPending.current = true;
    setGoOutOpen(true);
  };

  const closeGoOut = () => {
    if (!goOutOpen || goOutClosing.current) return;
    goOutClosing.current = true;
    goOutSheetH.stopAnimation();
    goOutY.stopAnimation();
    goOutBackdrop.stopAnimation();
    const slideOut = goOutExpandedRef.current ? goOutFullH : goOutMidH;
    Animated.parallel([
      Animated.timing(goOutBackdrop, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(goOutY, {
        toValue: slideOut,
        duration: 300,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      goOutClosing.current = false;
      if (!finished) return;
      setGoOutOpen(false);
      setGoOutExpanded(false);
      goOutExpandedRef.current = false;
    });
  };

  const closeGoOutRef = useRef(closeGoOut);
  closeGoOutRef.current = closeGoOut;

  useEffect(() => {
    if (!goOutOpen || !goOutOpenPending.current) return;
    goOutOpenPending.current = false;
    const frame = requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(goOutBackdrop, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(goOutY, {
          toValue: 0,
          duration: 340,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    });
    return () => cancelAnimationFrame(frame);
  }, [goOutOpen, goOutBackdrop, goOutY]);

  const goOutPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dy) > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          goOutSheetH.stopAnimation();
          goOutY.stopAnimation();
        },
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) {
            // Pastga siljitish — sheet bilan birga pastga
            goOutY.setValue(g.dy);
            return;
          }
          // Yuqoriga — balandlikni oshirish
          goOutY.setValue(0);
          const base = goOutExpandedRef.current ? goOutFullH : goOutMidH;
          const next = Math.min(goOutFullH, Math.max(goOutMidH, base - g.dy));
          goOutSheetH.setValue(next);
        },
        onPanResponderRelease: (_, g) => {
          const expanded = goOutExpandedRef.current;
          const snapHeight = (to: "mid" | "full") => {
            const h = to === "full" ? goOutFullH : goOutMidH;
            goOutExpandedRef.current = to === "full";
            setGoOutExpanded(to === "full");
            Animated.parallel([
              Animated.timing(goOutSheetH, {
                toValue: h,
                duration: 240,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
              }),
              Animated.timing(goOutY, {
                toValue: 0,
                duration: 220,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
              }),
            ]).start();
          };

          // Pastga — animatsiya bilan yopish
          if (g.dy > 70 || g.vy > 0.85) {
            if (!expanded || g.dy > 110 || g.vy > 1.1) {
              closeGoOutRef.current();
              return;
            }
            snapHeight("mid");
            return;
          }

          // Yuqoriga — to‘liq ochish
          if (g.dy < -35 || g.vy < -0.65) {
            snapHeight("full");
            return;
          }

          snapHeight(expanded ? "full" : "mid");
        },
      }),
    [goOutFullH, goOutMidH, goOutSheetH, goOutY],
  );
  const [myProducts, setMyProducts] = useState<MyCareProduct[]>([]);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [doneToast, setDoneToast] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastY = useRef(new Animated.Value(-24)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [apiRecs, setApiRecs] = useState<HairRecommendation[] | null>(null);
  const [apiAlerts, setApiAlerts] = useState<WeatherAlert[] | null>(null);

  useEffect(() => {
    void loadMyProducts()
      .then(setMyProducts)
      .catch(() => setMyProducts([]));
    void AsyncStorage.getItem(DONE_KEY)
      .then((raw) => {
        if (!raw) return;
        const arr = JSON.parse(raw) as string[];
        if (Array.isArray(arr)) setDoneIds(new Set(arr));
      })
      .catch(() => undefined);
  }, [refreshing]);

  const current = data?.current;
  const conditionKey = current?.condition_key ?? "unknown";
  const icon = weatherIconName(conditionKey);
  const cityName = regionId
    ? regionLabel(regionId)
    : t("care.weather.cityFallback", { defaultValue: "Shahar" });
  const uv = data?.uv;
  const uvIndex = uv?.index ?? current?.uv_index ?? null;

  useEffect(() => {
    if (!data?.current) return;
    let cancelled = false;
    void fetchWeatherShieldCatalog({
      temp: data.current.temperature_c,
      humidity: data.current.humidity_pct,
      uv: uvIndex,
      wind: data.current.wind_kmh,
      condition: conditionKey,
    })
      .then((res) => {
        if (cancelled) return;
        const mapped: HairRecommendation[] = (res.recommendations || []).map((r) => ({
          id: r.id,
          type: r.type === "routine" ? "routine" : "product",
          title: r.title,
          description: r.description,
          priority: r.priority,
          icon: r.icon || "flask-outline",
          productTag: r.productTag,
          image: r.image_url
            ? { uri: r.image_url }
            : shieldImageForTag(r.productTag, r.id),
          trigger: (r.trigger as HairRecommendation["trigger"]) || "high_uv_hot",
        }));
        setApiRecs(mapped.length ? mapped : null);
        setApiAlerts((res.alerts || []) as WeatherAlert[]);
        if (res.done_ids?.length) {
          setDoneIds((prev) => {
            const next = new Set(prev);
            res.done_ids.forEach((id) => next.add(id));
            return next;
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApiRecs(null);
          setApiAlerts(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [conditionKey, data?.current, refreshing, uvIndex]);

  const heroImg = weatherLocationHeroSource({
    region: data?.location_region,
    place: data?.location_place || data?.location_label,
    condition: conditionKey,
    lat: data?.latitude,
    lon: data?.longitude,
    regionId,
  });

  const goOutKit = useMemo(
    () =>
      buildGoOutKit({
        condition: conditionKey,
        temp: current?.temperature_c ?? null,
        humidity: current?.humidity_pct ?? null,
        wind: current?.wind_kmh ?? null,
        uvIndex,
        myProducts,
      }),
    [
      conditionKey,
      current?.humidity_pct,
      current?.temperature_c,
      current?.wind_kmh,
      myProducts,
      uvIndex,
    ],
  );

  const goOutSummary = useMemo(
    () =>
      buildGoOutSummary({
        condition: conditionKey,
        temp: current?.temperature_c ?? null,
        humidity: current?.humidity_pct ?? null,
        wind: current?.wind_kmh ?? null,
      }),
    [conditionKey, current?.humidity_pct, current?.temperature_c, current?.wind_kmh],
  );

  const shieldWeather = useMemo((): WeatherData | null => {
    if (!data?.current) return null;
    return {
      temp: data.current.temperature_c,
      humidity: data.current.humidity_pct,
      uvIndex: uvIndex,
      windSpeed: data.current.wind_kmh,
      aqi: null,
      location: cityName,
      condition: t(`care.weather.conditions.${conditionKey}`, {
        defaultValue: conditionKey,
      }),
    };
  }, [cityName, conditionKey, data?.current, t, uvIndex]);

  const localShield = useMemo(
    () =>
      buildWeatherShieldState(shieldWeather, {
        loading: loading && !data,
        error: error && !data ? t(error) : null,
      }),
    [data, error, loading, shieldWeather, t],
  );

  const shieldState = useMemo(() => {
    if (!apiRecs?.length) return localShield;
    return {
      ...localShield,
      recommendations: apiRecs,
      activeAlerts: apiAlerts?.length ? apiAlerts : localShield.activeAlerts,
    };
  }, [apiAlerts, apiRecs, localShield]);

  const persistDone = async (next: Set<string>) => {
    setDoneIds(next);
    await AsyncStorage.setItem(DONE_KEY, JSON.stringify([...next])).catch(() => undefined);
  };

  const showDoneToast = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setDoneToast(true);
    toastOpacity.setValue(0);
    toastY.setValue(-20);
    Animated.parallel([
      Animated.timing(toastOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(toastY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
    toastTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(toastY, { toValue: -16, duration: 280, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setDoneToast(false);
      });
    }, 2200);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const onToggleDone = (id: string) => {
    const next = new Set(doneIds);
    const completed = !next.has(id);
    if (completed) next.add(id);
    else next.delete(id);
    void persistDone(next);
    if (completed) showDoneToast();
    const productId = id.startsWith("ws-") ? Number(id.slice(3)) : undefined;
    void postWeatherShieldAction({
      product_id: Number.isFinite(productId) ? productId : undefined,
      action_key: id,
      id,
      completed,
      weather_snapshot: {
        temp: current?.temperature_c,
        humidity: current?.humidity_pct,
        uv: uvIndex,
        condition: conditionKey,
      },
    }).catch(() => undefined);
  };

  const onPickRegion = async (id: UzRegionId) => {
    setRegionOpen(false);
    await setRegion(id);
  };

  const heroContentH = verticalScale(280);

  return (
    <View style={styles.root}>
      <AppStatusBar style="light" />
      {doneToast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.doneToast,
            {
              top: safeTop(insets.top, 8),
              opacity: toastOpacity,
              transform: [{ translateY: toastY }],
            },
          ]}
        >
          <View style={styles.doneToastIcon}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
          <Text style={styles.doneToastText}>
            {t("care.weather.doneToast", { defaultValue: "Yaxshi bajardingiz!" })}
          </Text>
        </Animated.View>
      ) : null}
      <ScrollView
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.fg}
          />
        }
        contentContainerStyle={{
          paddingBottom: safeBottom(insets.bottom, 32),
        }}
      >
        <WeatherHeaderCard
          source={heroImg}
          height={heroContentH}
          edgeToEdge
          topExtra={scale(12)}
          borderRadius={0}
          paddingHorizontal={scale(16)}
          paddingBottom={verticalScale(22)}
          topLeft={
            <NativeBackButton
              onPress={() => {
                const routes = navigation.getState?.()?.routes;
                if (routes && routes.length > 1) navigation.goBack();
                else navigation.navigate("CareHome");
              }}
              accessibilityLabel={t("common.back")}
              color={colors.fg}
              backgroundColor="rgba(255,255,255,0.96)"
              style={styles.heroBack}
            />
          }
          topRight={
            <Pressable style={styles.cityChip} onPress={() => setRegionOpen(true)}>
              <Text style={styles.cityChipText} numberOfLines={1} ellipsizeMode="tail">
                {cityName}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.fg} />
            </Pressable>
          }
        >
          {loading && !data ? (
            <View style={styles.heroLoading}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : error && !data ? (
            <View style={styles.heroLoading}>
              <Text style={styles.heroError}>{t(error)}</Text>
              <Pressable style={styles.retryGhost} onPress={() => void refresh()}>
                <Text style={styles.retryGhostText}>{t("common.retry")}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.heroBody, refreshing && styles.heroBodyRefreshing]}>
              {refreshing ? (
                <View style={styles.heroRefreshBadge}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.heroRefreshText}>
                    {t("care.weather.updating", { defaultValue: "Yangilanmoqda…" })}
                  </Text>
                </View>
              ) : null}
              <Text style={styles.heroEyebrow}>{t("care.weather.title")}</Text>
              <View style={styles.heroTempRow}>
                <Text style={styles.heroTemp}>
                  {current?.temperature_c != null
                    ? `${Math.round(current.temperature_c)}°`
                    : "—"}
                </Text>
                <View style={styles.heroCondCol}>
                  <Ionicons name={icon} size={22} color="#fff" />
                  <Text style={styles.heroCond} numberOfLines={2}>
                    {t(`care.weather.conditions.${conditionKey}`)}
                  </Text>
                </View>
              </View>
              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Ionicons name="water-outline" size={14} color="rgba(255,255,255,0.95)" />
                  <Text style={styles.heroStatText}>
                    {current?.humidity_pct != null
                      ? `${Math.round(current.humidity_pct)}%`
                      : "—"}
                  </Text>
                </View>
                <View style={styles.heroStatSep} />
                <View style={styles.heroStat}>
                  <Ionicons name="navigate-outline" size={14} color="rgba(255,255,255,0.95)" />
                  <Text style={styles.heroStatText}>
                    {current?.wind_kmh != null
                      ? `${Math.round(current.wind_kmh)} km/h`
                      : "—"}
                  </Text>
                </View>
                {uvIndex != null ? (
                  <>
                    <View style={styles.heroStatSep} />
                    <View style={styles.heroStat}>
                      <Ionicons name="sunny-outline" size={14} color="rgba(255,255,255,0.95)" />
                      <Text style={styles.heroStatText}>UV {Math.round(uvIndex)}</Text>
                    </View>
                  </>
                ) : null}
              </View>
            </View>
          )}
        </WeatherHeaderCard>

        {data ? (
          <View style={styles.sheet}>
            {/* Qisqa xulosa + dumaloq tugma → uydan chiqish sheet */}
            <View style={styles.summaryRow}>
              <Text style={styles.sectionSubFlex} numberOfLines={3}>
                {goOutSummary}
              </Text>
              <Pressable
                style={styles.goOutFab}
                onPress={openGoOut}
                accessibilityLabel={t("care.weather.goOutTitle", {
                  defaultValue: "Uydan chiqishda oling",
                })}
              >
                <Image
                  source={goOutKit[0]?.image ?? GO_OUT_IMAGES.sunglasses}
                  style={styles.goOutFabImg}
                  contentFit="cover"
                />
                <View style={styles.goOutFabBadge}>
                  <Ionicons name="bag-handle" size={12} color="#fff" />
                </View>
              </Pressable>
            </View>

            {/* Asosiy: soch himoyasi */}
            <View style={styles.shieldBlock}>
              <WeatherShieldContainer
                state={shieldState}
                doneIds={doneIds}
                onToggleDone={onToggleDone}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>

      <SafeModal
        visible={regionOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setRegionOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setRegionOpen(false)} />
          <View style={[styles.modalSheet, { paddingBottom: safeBottom(insets.bottom, 0) }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {t("care.weather.pickRegion", { defaultValue: "Viloyatni tanlang" })}
            </Text>
            <Text style={styles.modalSub}>
              {t("care.weather.pickRegionSub", {
                defaultValue: "GPS noto‘g‘ri bo‘lsa — qo‘lda tanlang",
              })}
            </Text>
            <ScrollView style={{ maxHeight: verticalScale(360) }}>
              {UZ_REGIONS.map((r) => {
                const on = regionId === r.id;
                return (
                  <Pressable
                    key={r.id}
                    style={[styles.regionRow, on && styles.regionRowOn]}
                    onPress={() => void onPickRegion(r.id)}
                  >
                    <Text style={[styles.regionName, on && styles.regionNameOn]}>{r.labelUz}</Text>
                    {on ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              style={styles.gpsBtn}
              onPress={() => {
                setRegionOpen(false);
                void clearManualRegion();
              }}
            >
              <Ionicons name="locate-outline" size={16} color={colors.fg} />
              <Text style={styles.gpsBtnText}>
                {t("care.weather.useGps", { defaultValue: "GPS joylashuvini ishlatish" })}
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeModal>

      <SafeModal
        visible={goOutOpen}
        transparent
        animationType="none"
        onRequestClose={() => closeGoOutRef.current()}
      >
        <View style={styles.modalRoot}>
          <Animated.View
            pointerEvents="none"
            style={[styles.modalBackdrop, { opacity: goOutBackdrop }]}
          />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => closeGoOutRef.current()}
          />
          <Animated.View
            style={[
              styles.goOutSheet,
              {
                height: goOutSheetH,
                paddingBottom: safeBottom(insets.bottom, 12),
                transform: [{ translateY: goOutY }],
              },
            ]}
          >
            <View style={styles.goOutHandleHit} {...goOutPan.panHandlers}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>
                {t("care.weather.goOutTitle", { defaultValue: "Uydan chiqishda oling" })}
              </Text>
              <Text style={styles.modalSub}>{goOutSummary}</Text>
              <Text style={styles.goOutSwipeHint}>
                {goOutExpanded
                  ? t("care.weather.swipeDown", {
                      defaultValue: "Pastga suring — yopish yoki qisqartirish",
                    })
                  : t("care.weather.swipeUp", {
                      defaultValue: "Yuqoriga suring — to‘liq ochish · pastga — yopish",
                    })}
              </Text>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.goOutScroll}
              contentContainerStyle={styles.goOutList}
              bounces
            >
              <View style={styles.goOutGrid}>
                {goOutKit.map((item) => (
                  <View key={item.id} style={styles.goOutCard}>
                    <View style={styles.goOutImgWrap}>
                      {item.image ? (
                        <Image
                          source={item.image}
                          style={styles.goOutImg}
                          contentFit="contain"
                          transition={180}
                        />
                      ) : (
                        <Ionicons
                          name={
                            (item.icon as keyof typeof Ionicons.glyphMap) ||
                            "checkmark-circle-outline"
                          }
                          size={36}
                          color={colors.fg}
                        />
                      )}
                    </View>
                    <View style={styles.goOutBody}>
                      <Text style={styles.goOutTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {item.fromMyProduct ? (
                        <Text style={styles.kitBadge}>
                          {t("care.weather.fromMyProducts", {
                            defaultValue: "Mening mahsulotim",
                          })}
                        </Text>
                      ) : null}
                      <Text style={styles.goOutHow} numberOfLines={3}>
                        {item.howToUse}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </SafeModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  doneToast: {
    position: "absolute",
    left: scale(16),
    right: scale(16),
    zIndex: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    backgroundColor: "#16A34A",
    borderRadius: moderateScale(14),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(14),
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  doneToastIcon: {
    width: scale(26),
    height: scale(26),
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  doneToastText: {
    ...morphFont,
    flex: 1,
    fontSize: fontSize(14),
    fontWeight: "800",
    color: "#fff",
  },
  heroBack: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(6),
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(7),
    borderRadius: moderateScale(12),
    maxWidth: "100%",
    flexShrink: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.1)",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cityChipText: {
    ...morphFont,
    fontSize: fontSize(13),
    fontWeight: "800",
    color: colors.fg,
    flexShrink: 1,
  },
  heroLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(10),
    zIndex: 2,
    minHeight: verticalScale(120),
  },
  heroError: { ...morphFont, fontSize: fontSize(13), color: "#fff", textAlign: "center" },
  retryGhost: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  retryGhostText: { ...morphFont, fontSize: fontSize(12), fontWeight: "700", color: "#fff" },
  heroBody: { zIndex: 2, gap: moderateScale(6) },
  heroBodyRefreshing: { opacity: 0.92 },
  heroRefreshBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: moderateScale(6),
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: 999,
    marginBottom: verticalScale(2),
  },
  heroRefreshText: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "700",
    color: "#fff",
  },
  heroEyebrow: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "600",
    color: "rgba(255,255,255,0.88)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroTempRow: { flexDirection: "row", alignItems: "flex-end", gap: moderateScale(14) },
  heroTemp: {
    ...morphFont,
    fontSize: fontSize(64),
    fontWeight: "800",
    color: "#fff",
    lineHeight: fontSize(68),
    letterSpacing: -1.5,
  },
  heroCondCol: { flex: 1, paddingBottom: verticalScale(10), gap: moderateScale(4) },
  heroCond: { ...morphFont, fontSize: fontSize(15), fontWeight: "600", color: "#FFFFFF" },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(8),
    gap: moderateScale(8),
  },
  heroStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroStatText: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "600",
    color: "rgba(255,255,255,0.95)",
  },
  heroStatSep: { width: 1, height: verticalScale(12), backgroundColor: "rgba(255,255,255,0.4)" },

  sheet: {
    marginTop: -moderateScale(14),
    backgroundColor: colors.bg,
    borderTopLeftRadius: moderateScale(22),
    borderTopRightRadius: moderateScale(22),
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(20),
  },
  sectionEyebrow: {
    ...morphFont,
    fontSize: fontSize(13),
    fontWeight: "800",
    color: colors.fg,
    marginBottom: verticalScale(6),
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
    marginBottom: verticalScale(14),
  },
  sectionSubFlex: {
    ...morphFont,
    flex: 1,
    fontSize: fontSize(12),
    lineHeight: fontSize(17),
    color: colors.muted,
  },
  goOutFab: {
    width: scale(52),
    height: scale(52),
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: colors.promo,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  goOutFabImg: { width: "100%", height: "100%" },
  goOutFabBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: scale(20),
    height: scale(20),
    borderRadius: 999,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.bg,
  },
  kitBadge: {
    ...morphFont,
    alignSelf: "flex-start",
    fontSize: fontSize(10),
    fontWeight: "700",
    color: colors.fg,
    backgroundColor: colors.promo,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: 999,
    overflow: "hidden",
  },
  goOutSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    paddingHorizontal: scale(14),
    paddingTop: verticalScale(6),
    overflow: "hidden",
  },
  goOutHandleHit: {
    paddingBottom: verticalScale(6),
  },
  goOutSwipeHint: {
    ...morphFont,
    marginTop: verticalScale(2),
    marginBottom: verticalScale(4),
    fontSize: fontSize(11),
    fontWeight: "600",
    color: colors.muted,
  },
  goOutScroll: {
    flex: 1,
  },
  goOutList: {
    paddingBottom: verticalScale(10),
  },
  goOutGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: moderateScale(10),
  },
  goOutCard: {
    width: "48%",
    backgroundColor: colors.bg,
    borderRadius: moderateScale(18),
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  goOutImgWrap: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#F7F4EF",
    alignItems: "center",
    justifyContent: "center",
    padding: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  goOutImg: { width: "100%", height: "100%" },
  goOutBody: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(10),
    gap: 4,
    minHeight: verticalScale(88),
  },
  goOutTitle: {
    ...morphFont,
    fontSize: fontSize(13),
    fontWeight: "800",
    color: colors.fg,
  },
  goOutHow: {
    ...morphFont,
    fontSize: fontSize(11),
    lineHeight: fontSize(15),
    color: colors.muted,
  },

  shieldBlock: {
    marginBottom: verticalScale(8),
  },

  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: moderateScale(22),
    borderTopRightRadius: moderateScale(22),
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(10),
  },
  modalHandle: {
    alignSelf: "center",
    width: scale(40),
    height: 4,
    borderRadius: 99,
    backgroundColor: "#E5E5E5",
    marginBottom: verticalScale(10),
  },
  modalTitle: { ...morphFont, fontSize: fontSize(17), fontWeight: "800", color: colors.fg },
  modalSub: {
    ...morphFont,
    marginTop: 4,
    marginBottom: verticalScale(10),
    fontSize: fontSize(12),
    color: colors.muted,
  },
  regionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: verticalScale(13),
    paddingHorizontal: scale(12),
    borderRadius: moderateScale(12),
    marginBottom: 4,
    backgroundColor: colors.bg,
  },
  regionRowOn: { backgroundColor: colors.fg },
  regionName: { ...morphFont, fontSize: fontSize(14), fontWeight: "700", color: colors.fg },
  regionNameOn: { color: "#fff" },
  gpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: verticalScale(10),
    marginBottom: verticalScale(6),
    paddingVertical: verticalScale(14),
    borderRadius: moderateScale(14),
    backgroundColor: colors.bg,
  },
  gpsBtnText: { ...morphFont, fontSize: fontSize(13), fontWeight: "700", color: colors.fg },
});
