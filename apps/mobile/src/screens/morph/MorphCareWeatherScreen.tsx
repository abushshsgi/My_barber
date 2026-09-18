import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeModal } from "../../components/ui/SafeModal";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeBottom, safeTop } from "../../lib/safe-area";
import { fetchHairCareProfile } from "../../api/care";
import { weatherIconName, type WeatherDay } from "../../api/weather";
import { WeatherHeaderCard } from "../../components/morph/care/WeatherHeaderCard";
import { AppStatusBar } from "../../components/ui/AppStatusBar";
import { NativeBackButton } from "../../components/ui/NativeBackButton";
import { useCareWeather } from "../../hooks/useCareWeather";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import {
  hasSeenWeatherIntro,
  markWeatherIntroSeen,
} from "../../lib/morph-my-products";
import { weatherLocationHeroSource } from "../../lib/weather-care-tips";
import { regionLabel, UZ_REGIONS, type UzRegionId } from "../../lib/uz-regions";
import type { MorphCareStackParamList } from "../../navigation/MorphCareStack";
import { morphFont } from "../../theme/morph-font";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<MorphCareStackParamList, "CareWeather">;

function takeThreeDays(days: WeatherDay[]): WeatherDay[] {
  if (!days.length) return [];
  const todayIdx = days.findIndex((d) => d.is_today);
  const start = todayIdx >= 0 ? todayIdx : 0;
  return days.slice(start, start + 3);
}

function dayTitle(
  day: WeatherDay,
  index: number,
  t: (key: string, opts?: { defaultValue?: string }) => string,
): string {
  if (day.is_today || index === 0) return t("care.weather.today", { defaultValue: "Bugun" });
  if (index === 1) return t("care.weather.tomorrow", { defaultValue: "Ertaga" });
  return t(`care.weather.weekdaysShort.${day.weekday_key}`);
}

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
  const [showIntro, setShowIntro] = useState(false);
  const [profileLine, setProfileLine] = useState<string | null>(null);
  const [regionOpen, setRegionOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      const seen = await hasSeenWeatherIntro();
      setShowIntro(!seen);
      const profile = await fetchHairCareProfile().catch(() => null);
      if (profile?.complete && profile.condition && profile.texture && profile.color_status) {
        setProfileLine(
          `${t(`care.conditions.${profile.condition}`)} · ${t(`care.textures.${profile.texture}`)} · ${t(`care.colors.${profile.color_status}`)}`,
        );
      }
    })();
  }, [t]);

  const dismissIntro = () => {
    void markWeatherIntroSeen();
    setShowIntro(false);
  };

  const current = data?.current;
  const conditionKey = current?.condition_key ?? "unknown";
  const icon = weatherIconName(conditionKey);
  const cityName = regionId
    ? regionLabel(regionId)
    : t("care.weather.cityFallback", { defaultValue: "Shahar" });

  const heroImg = weatherLocationHeroSource({
    region: data?.location_region,
    place: data?.location_place || data?.location_label,
    condition: conditionKey,
    lat: data?.latitude,
    lon: data?.longitude,
    regionId,
  });

  const threeDays = useMemo(() => takeThreeDays(data?.days ?? []), [data?.days]);
  const hours = data?.hours?.slice(0, 8) ?? [];
  const productPlan = data?.product_plan ?? [];
  const primary = data?.primary_action;
  const uv = data?.uv;

  const onPickRegion = async (id: UzRegionId) => {
    setRegionOpen(false);
    await setRegion(id);
  };

  const heroContentH = verticalScale(280);

  return (
    <View style={styles.root}>
      <AppStatusBar style="light" />
      <ScrollView
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor="#111"
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
              color="#111111"
              backgroundColor="rgba(255,255,255,0.96)"
              style={styles.heroBack}
            />
          }
          topRight={
            <Pressable style={styles.cityChip} onPress={() => setRegionOpen(true)}>
              <Text style={styles.cityChipText} numberOfLines={1} ellipsizeMode="tail">
                {cityName}
              </Text>
              <Ionicons name="chevron-down" size={14} color="#111" />
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
                {uv?.index != null ? (
                  <>
                    <View style={styles.heroStatSep} />
                    <View style={styles.heroStat}>
                      <Ionicons name="sunny-outline" size={14} color="rgba(255,255,255,0.95)" />
                      <Text style={styles.heroStatText}>UV {Math.round(uv.index)}</Text>
                    </View>
                  </>
                ) : null}
                {profileLine ? (
                  <>
                    <View style={styles.heroStatSep} />
                    <Text style={styles.heroProfile} numberOfLines={1}>
                      {profileLine}
                    </Text>
                  </>
                ) : null}
              </View>
            </View>
          )}
        </WeatherHeaderCard>

        {data ? (
          <View style={styles.sheet}>
            {showIntro ? (
              <Pressable style={styles.introStrip} onPress={dismissIntro}>
                <Ionicons name="sparkles" size={14} color="#111" />
                <Text style={styles.introStripText} numberOfLines={2}>
                  {t("care.weather.introSub")}
                </Text>
                <Text style={styles.introOk}>{t("common.ok")}</Text>
              </Pressable>
            ) : null}

            {/* Bugun nima qilish — CTA */}
            {primary ? (
              <View style={styles.ctaCard}>
                <View style={styles.ctaIcon}>
                  <Ionicons
                    name={(primary.icon as keyof typeof Ionicons.glyphMap) || "sparkles-outline"}
                    size={22}
                    color="#fff"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ctaEyebrow}>
                    {t("care.weather.todayAction", { defaultValue: "Bugun nima qilish" })}
                  </Text>
                  <Text style={styles.ctaTitle}>{primary.title}</Text>
                  <Text style={styles.ctaSub}>{primary.subtitle}</Text>
                </View>
              </View>
            ) : null}

            {/* UV tip — har doim (yuqori UV da kuchliroq) */}
            {uv?.tip ? (
              <View
                style={[
                  styles.uvCard,
                  (uv.level === "high" || uv.level === "very_high" || uv.level === "extreme") &&
                    styles.uvCardHot,
                ]}
              >
                <Ionicons name="sunny" size={18} color="#111" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.uvTitle}>
                    UV {uv.index != null ? Math.round(uv.index) : "—"} · {uv.level}
                  </Text>
                  <Text style={styles.uvText}>{uv.tip}</Text>
                </View>
              </View>
            ) : null}

            {/* Soatlik */}
            {hours.length > 0 ? (
              <>
                <Text style={styles.blockTitle}>
                  {t("care.weather.hourly", { defaultValue: "Bugun — soatlik" })}
                </Text>
                {data.hourly_highlight ? (
                  <Text style={styles.highlight}>{data.hourly_highlight}</Text>
                ) : null}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hoursRow}
                >
                  {hours.map((h) => (
                    <View key={h.time} style={styles.hourCard}>
                      <Text style={styles.hourTime}>{h.time}</Text>
                      <Ionicons
                        name={weatherIconName(h.condition_key)}
                        size={18}
                        color="#111"
                      />
                      <Text style={styles.hourTemp}>
                        {h.temperature_c != null ? `${Math.round(h.temperature_c)}°` : "—"}
                      </Text>
                      {h.precip_probability != null && h.precip_probability >= 30 ? (
                        <Text style={styles.hourPop}>{Math.round(h.precip_probability)}%</Text>
                      ) : (
                        <Text style={styles.hourPopMuted}> </Text>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </>
            ) : null}

            {/* 3 kun */}
            <Text style={styles.blockTitle}>
              {t("care.weather.nextDays", { defaultValue: "Bugun va keyingi 2 kun" })}
            </Text>
            <View style={styles.daysRow}>
              {threeDays.map((day, index) => {
                const active = day.is_today || index === 0;
                return (
                  <View key={day.date} style={[styles.dayCard, active && styles.dayCardActive]}>
                    <Text style={[styles.dayName, active && styles.dayNameActive]}>
                      {dayTitle(day, index, t)}
                    </Text>
                    <Ionicons
                      name={weatherIconName(day.condition_key)}
                      size={22}
                      color={active ? "#fff" : "#111"}
                    />
                    <Text style={[styles.dayHi, active && styles.dayHiActive]}>
                      {day.temperature_max_c != null
                        ? `${Math.round(day.temperature_max_c)}°`
                        : "—"}
                    </Text>
                    <Text style={[styles.dayLo, active && styles.dayLoActive]}>
                      {day.temperature_min_c != null
                        ? `${Math.round(day.temperature_min_c)}°`
                        : "—"}
                    </Text>
                  </View>
                );
              })}
            </View>

            {data.summary ? <Text style={styles.summaryOne}>{data.summary}</Text> : null}

            {/* Mening mahsulotlarim rejasi */}
            <Text style={styles.blockTitle}>
              {t("care.weather.myProductsTitle", {
                defaultValue: "Mahsulotlaringiz — bugungi reja",
              })}
            </Text>
            {productPlan.length === 0 ? (
              <Pressable
                style={styles.emptyProducts}
                onPress={() => navigation.navigate("CareMyProducts")}
              >
                <Ionicons name="bag-add-outline" size={20} color="#737373" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.emptyProductsTitle}>
                    {t("care.weather.myProductsEmptyTitle")}
                  </Text>
                  <Text style={styles.emptyProductsSub} numberOfLines={2}>
                    {t("care.weather.myProductsEmptySub")}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#111" />
              </Pressable>
            ) : (
              productPlan.map((tip) => (
                <View key={`${tip.product_id}-${tip.name}`} style={styles.productTipCard}>
                  {tip.image_url ? (
                    <Image source={{ uri: tip.image_url }} style={styles.productTipImg} />
                  ) : (
                    <View style={[styles.productTipImg, styles.productTipImgFallback]}>
                      <Ionicons name="flask-outline" size={18} color="#737373" />
                    </View>
                  )}
                  <View style={styles.productTipBody}>
                    <Text style={styles.productTipName} numberOfLines={1}>
                      {tip.name}
                    </Text>
                    <Text style={styles.productTipHow} numberOfLines={2}>
                      {tip.how_to_use}
                    </Text>
                    <Text style={styles.productTipHint} numberOfLines={2}>
                      {tip.tip}
                    </Text>
                  </View>
                </View>
              ))
            )}

            {data.tomorrow_alert ? (
              <View style={styles.alertCard}>
                <Ionicons name="notifications-outline" size={16} color="#111" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>{data.tomorrow_alert.title}</Text>
                  <Text style={styles.alertBody}>{data.tomorrow_alert.body}</Text>
                  <Text style={styles.alertMeta}>
                    {t("care.weather.alertScheduled", {
                      defaultValue: "Ertaga ertalab eslatma rejalashtirildi",
                    })}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <SafeModal visible={regionOpen} transparent animationType="slide" onRequestClose={() => setRegionOpen(false)}>
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
              <Ionicons name="locate-outline" size={16} color="#111" />
              <Text style={styles.gpsBtnText}>
                {t("care.weather.useGps", { defaultValue: "GPS joylashuvini ishlatish" })}
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFA" },
  heroBack: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.12)",
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
    color: "#111",
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
  heroStats: { flexDirection: "row", alignItems: "center", marginTop: verticalScale(8), gap: moderateScale(8) },
  heroStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroStatText: { ...morphFont, fontSize: fontSize(12), fontWeight: "600", color: "rgba(255,255,255,0.95)" },
  heroStatSep: { width: 1, height: verticalScale(12), backgroundColor: "rgba(255,255,255,0.4)" },
  heroProfile: { ...morphFont, flex: 1, fontSize: fontSize(11), fontWeight: "600", color: "rgba(255,255,255,0.9)" },

  sheet: {
    marginTop: -moderateScale(14),
    backgroundColor: "#FAFAFA",
    borderTopLeftRadius: moderateScale(22),
    borderTopRightRadius: moderateScale(22),
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(18),
  },
  introStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    backgroundColor: "#fff",
    borderRadius: moderateScale(14),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    marginBottom: verticalScale(10),
  },
  introStripText: { ...morphFont, flex: 1, fontSize: fontSize(12), color: "#525252", lineHeight: fontSize(16) },
  introOk: { ...morphFont, fontSize: fontSize(12), fontWeight: "800", color: "#111" },

  ctaCard: {
    flexDirection: "row",
    gap: moderateScale(12),
    backgroundColor: "#111",
    borderRadius: moderateScale(18),
    padding: moderateScale(14),
    marginBottom: verticalScale(10),
  },
  ctaIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(14),
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaEyebrow: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "700",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  ctaTitle: { ...morphFont, marginTop: 2, fontSize: fontSize(17), fontWeight: "800", color: "#fff" },
  ctaSub: { ...morphFont, marginTop: 4, fontSize: fontSize(12), lineHeight: fontSize(17), color: "rgba(255,255,255,0.7)" },

  uvCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    backgroundColor: "#FFF7ED",
    borderRadius: moderateScale(14),
    padding: moderateScale(12),
    marginBottom: verticalScale(8),
  },
  uvCardHot: {
    backgroundColor: "#FFEDD5",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(234,88,12,0.25)",
  },
  uvTitle: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "800",
    color: "#111",
    marginBottom: 2,
    textTransform: "capitalize",
  },
  uvText: { ...morphFont, flex: 1, fontSize: fontSize(12), lineHeight: fontSize(17), color: "#111", fontWeight: "600" },

  blockTitle: {
    ...morphFont,
    marginTop: verticalScale(14),
    marginBottom: verticalScale(10),
    fontSize: fontSize(13),
    fontWeight: "800",
    color: "#111",
  },
  highlight: {
    ...morphFont,
    marginTop: -verticalScale(4),
    marginBottom: verticalScale(8),
    fontSize: fontSize(12),
    color: "#525252",
    lineHeight: fontSize(17),
  },
  hoursRow: { gap: moderateScale(8), paddingRight: scale(8) },
  hourCard: {
    width: scale(64),
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    borderRadius: moderateScale(14),
    paddingVertical: verticalScale(10),
  },
  hourTime: { ...morphFont, fontSize: fontSize(10), fontWeight: "700", color: "#737373" },
  hourTemp: { ...morphFont, fontSize: fontSize(14), fontWeight: "800", color: "#111" },
  hourPop: { ...morphFont, fontSize: fontSize(10), fontWeight: "600", color: "#3B82F6" },
  hourPopMuted: { ...morphFont, fontSize: fontSize(10), color: "transparent" },

  daysRow: { flexDirection: "row", gap: moderateScale(8) },
  dayCard: {
    flex: 1,
    alignItems: "center",
    gap: moderateScale(6),
    backgroundColor: "#fff",
    borderRadius: moderateScale(16),
    paddingVertical: verticalScale(14),
  },
  dayCardActive: { backgroundColor: "#111" },
  dayName: { ...morphFont, fontSize: fontSize(11), fontWeight: "700", color: "#737373" },
  dayNameActive: { color: "rgba(255,255,255,0.7)" },
  dayHi: { ...morphFont, fontSize: fontSize(18), fontWeight: "800", color: "#111" },
  dayHiActive: { color: "#fff" },
  dayLo: { ...morphFont, fontSize: fontSize(12), fontWeight: "600", color: "#A3A3A3" },
  dayLoActive: { color: "rgba(255,255,255,0.45)" },
  summaryOne: {
    ...morphFont,
    marginTop: verticalScale(12),
    fontSize: fontSize(13),
    lineHeight: fontSize(19),
    color: "#525252",
  },

  emptyProducts: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    backgroundColor: "#fff",
    borderRadius: moderateScale(16),
    padding: moderateScale(14),
  },
  emptyProductsTitle: { ...morphFont, fontSize: fontSize(13), fontWeight: "700", color: "#111" },
  emptyProductsSub: { ...morphFont, marginTop: 2, fontSize: fontSize(11), color: "#737373", lineHeight: fontSize(15) },
  productTipCard: {
    flexDirection: "row",
    gap: moderateScale(12),
    backgroundColor: "#fff",
    borderRadius: moderateScale(16),
    padding: moderateScale(12),
    marginBottom: verticalScale(8),
  },
  productTipImg: { width: scale(48), height: scale(48), borderRadius: moderateScale(12), backgroundColor: "#F0F0F0" },
  productTipImgFallback: { alignItems: "center", justifyContent: "center" },
  productTipBody: { flex: 1, minWidth: 0, gap: 3, justifyContent: "center" },
  productTipName: { ...morphFont, fontSize: fontSize(13), fontWeight: "700", color: "#111" },
  productTipHow: { ...morphFont, fontSize: fontSize(12), lineHeight: fontSize(16), color: "#404040" },
  productTipHint: { ...morphFont, fontSize: fontSize(11), lineHeight: fontSize(15), color: "#737373" },

  alertCard: {
    flexDirection: "row",
    gap: moderateScale(10),
    marginTop: verticalScale(12),
    backgroundColor: "#fff",
    borderRadius: moderateScale(16),
    padding: moderateScale(14),
  },
  alertTitle: { ...morphFont, fontSize: fontSize(13), fontWeight: "800", color: "#111" },
  alertBody: { ...morphFont, marginTop: 2, fontSize: fontSize(12), lineHeight: fontSize(16), color: "#525252" },
  alertMeta: { ...morphFont, marginTop: 6, fontSize: fontSize(10), fontWeight: "600", color: "#A3A3A3" },

  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    backgroundColor: "#fff",
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
  modalTitle: { ...morphFont, fontSize: fontSize(17), fontWeight: "800", color: "#111" },
  modalSub: { ...morphFont, marginTop: 4, marginBottom: verticalScale(10), fontSize: fontSize(12), color: "#737373" },
  regionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: verticalScale(13),
    paddingHorizontal: scale(12),
    borderRadius: moderateScale(12),
    marginBottom: 4,
    backgroundColor: "#FAFAFA",
  },
  regionRowOn: { backgroundColor: "#111" },
  regionName: { ...morphFont, fontSize: fontSize(14), fontWeight: "700", color: "#111" },
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
    backgroundColor: "#FAFAFA",
  },
  gpsBtnText: { ...morphFont, fontSize: fontSize(13), fontWeight: "700", color: "#111" },
});
