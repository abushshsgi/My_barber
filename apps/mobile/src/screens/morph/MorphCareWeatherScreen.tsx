import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchHairCareProfile } from "../../api/care";
import { weatherIconName } from "../../api/weather";
import { useCareWeather } from "../../hooks/useCareWeather";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import {
  hasSeenWeatherIntro,
  loadMyProducts,
  markWeatherIntroSeen,
  type MyCareProduct,
} from "../../lib/morph-my-products";
import {
  buildProductWeatherTips,
  generalWeatherExtras,
  weatherHeroImage,
} from "../../lib/weather-care-tips";
import type { MorphCareStackParamList } from "../../navigation/MorphCareStack";
import { morphFont } from "../../theme/morph-font";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<MorphCareStackParamList, "CareWeather">;

export function MorphCareWeatherScreen({ navigation }: Props) {
  useHideTabBar();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data, loading, error, refresh } = useCareWeather();
  const [showIntro, setShowIntro] = useState(false);
  const [profileLine, setProfileLine] = useState<string | null>(null);
  const [myProducts, setMyProducts] = useState<MyCareProduct[]>([]);

  useEffect(() => {
    void (async () => {
      const seen = await hasSeenWeatherIntro();
      setShowIntro(!seen);
      const [profile, products] = await Promise.all([
        fetchHairCareProfile().catch(() => null),
        loadMyProducts().catch(() => [] as MyCareProduct[]),
      ]);
      if (profile?.complete && profile.condition && profile.texture && profile.color_status) {
        setProfileLine(
          `${t(`care.conditions.${profile.condition}`)} · ${t(`care.textures.${profile.texture}`)} · ${t(`care.colors.${profile.color_status}`)}`,
        );
      }
      setMyProducts(products);
    })();
  }, [t]);

  const dismissIntro = () => {
    void markWeatherIntroSeen();
    setShowIntro(false);
  };

  const current = data?.current;
  const conditionKey = current?.condition_key ?? "unknown";
  const icon = weatherIconName(conditionKey);
  const heroImg = weatherHeroImage(conditionKey);

  const productTips = useMemo(
    () => buildProductWeatherTips(myProducts, data),
    [myProducts, data],
  );

  const extras = useMemo(
    () =>
      generalWeatherExtras({
        condition: conditionKey,
        temp: current?.temperature_c ?? null,
        humidity: current?.humidity_pct ?? null,
        wind: current?.wind_kmh ?? null,
      }),
    [conditionKey, current?.humidity_pct, current?.temperature_c, current?.wind_kmh],
  );

  return (
    <ScrollView
      style={styles.root}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: Math.max(insets.bottom, 24) + 72,
        paddingHorizontal: 20,
      }}
    >
      <View style={styles.rowBetween}>
        <Pressable
          style={styles.navCircleBtn}
          onPress={() => {
            const routes = navigation.getState?.()?.routes;
            if (routes && routes.length > 1) {
              navigation.goBack();
            } else {
              navigation.navigate("CareHome");
            }
          }}
          hitSlop={8}
          accessibilityLabel={t("common.back")}
        >
          <Ionicons name="chevron-back" size={20} color="#2a2a2a" />
        </Pressable>
        <Text style={styles.badge}>{t("care.weather.title")}</Text>
        <View style={{ width: 42 }} />
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color="#111111" />
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{t(error)}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void refresh()}>
            <Text style={styles.retryText}>{t("common.retry")}</Text>
          </Pressable>
        </View>
      ) : data ? (
        <>
          {showIntro ? (
            <View style={styles.introCard}>
              <Ionicons name="sparkles-outline" size={22} color="#111111" />
              <View style={{ flex: 1 }}>
                <Text style={styles.introTitle}>{t("care.weather.introTitle")}</Text>
                <Text style={styles.introSub}>{t("care.weather.introSub")}</Text>
              </View>
              <Pressable style={styles.introBtn} onPress={dismissIntro}>
                <Text style={styles.introBtnText}>{t("common.ok")}</Text>
              </Pressable>
            </View>
          ) : null}

          {profileLine ? (
            <View style={styles.profileCard}>
              <Ionicons name="person-circle-outline" size={20} color="#111111" />
              <Text style={styles.profileText}>{profileLine}</Text>
            </View>
          ) : null}

          <View style={styles.hero}>
            <Image source={{ uri: heroImg }} style={styles.heroImg} resizeMode="cover" />
            <LinearGradient
              colors={["rgba(8,12,20,0.25)", "rgba(8,12,20,0.75)"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroTop}>
              <Ionicons name={icon} size={42} color="#fff" />
              <Text style={styles.temp}>
                {current?.temperature_c != null ? `${Math.round(current.temperature_c)}°` : "—"}
              </Text>
            </View>
            <Text style={styles.condition}>
              {t(`care.weather.conditions.${conditionKey}`)}
            </Text>
            {data.location_region || data.location_place || data.location_label ? (
              <View style={styles.locationBlock}>
                {data.location_region ? (
                  <Text style={styles.locationRegion} numberOfLines={1}>
                    {data.location_region}
                  </Text>
                ) : null}
                {(data.location_place && data.location_place !== data.location_region) ||
                (!data.location_region && data.location_label) ? (
                  <Text style={styles.location} numberOfLines={1}>
                    {data.location_place || data.location_label}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="water-outline" size={18} color="#737373" />
              <Text style={styles.statLabel}>{t("care.weather.humidity")}</Text>
              <Text style={styles.statValue}>
                {current?.humidity_pct != null ? `${Math.round(current.humidity_pct)}%` : "—"}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="speedometer-outline" size={18} color="#737373" />
              <Text style={styles.statLabel}>{t("care.weather.wind")}</Text>
              <Text style={styles.statValue}>
                {current?.wind_kmh != null ? `${Math.round(current.wind_kmh)} km/h` : "—"}
              </Text>
            </View>
          </View>

          <Text style={styles.section}>{t("care.weather.today")}</Text>
          <Text style={styles.summary}>{data.summary}</Text>

          <Text style={styles.section}>{t("care.weather.myProductsTitle")}</Text>
          {productTips.length === 0 ? (
            <View style={styles.emptyProducts}>
              <Ionicons name="bag-handle-outline" size={22} color="#737373" />
              <Text style={styles.emptyProductsTitle}>{t("care.weather.myProductsEmptyTitle")}</Text>
              <Text style={styles.emptyProductsSub}>{t("care.weather.myProductsEmptySub")}</Text>
              <Pressable
                style={styles.emptyProductsBtn}
                onPress={() => navigation.navigate("CareMyProducts")}
              >
                <Text style={styles.emptyProductsBtnText}>{t("care.myProducts.title")}</Text>
              </Pressable>
            </View>
          ) : (
            productTips.map((tip) => (
              <View key={tip.productId} style={styles.productTipCard}>
                {tip.imageUrl ? (
                  <Image source={{ uri: tip.imageUrl }} style={styles.productTipImg} />
                ) : (
                  <View style={[styles.productTipImg, styles.productTipImgFallback]}>
                    <Ionicons name="flask-outline" size={18} color="#737373" />
                  </View>
                )}
                <View style={styles.productTipBody}>
                  <Text style={styles.productTipBrand} numberOfLines={1}>
                    {tip.brand || "MORF"}
                  </Text>
                  <Text style={styles.productTipName} numberOfLines={1}>
                    {tip.name}
                  </Text>
                  <Text style={styles.productTipHow}>{tip.howToUse}</Text>
                  <View style={styles.productTipHintRow}>
                    <Ionicons name="bulb-outline" size={14} color="#737373" />
                    <Text style={styles.productTipHint}>{tip.tip}</Text>
                  </View>
                </View>
              </View>
            ))
          )}

          <Text style={styles.section}>{t("care.weather.extrasTitle")}</Text>
          {extras.map((line) => (
            <View key={line} style={styles.tipRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#737373" />
              <Text style={styles.tipText}>{line}</Text>
            </View>
          ))}

          <Text style={styles.section}>{t("care.weather.recommendations")}</Text>
          {data.recommendations.map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <Ionicons name="leaf-outline" size={16} color="#737373" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}

          <Text style={styles.section}>{t("care.weather.week")}</Text>
          {data.days.map((day) => (
            <View key={day.date} style={styles.dayRow}>
              <Text style={[styles.dayLabel, day.is_today && styles.dayLabelToday]}>
                {t(`care.weather.weekdays.${day.weekday_key}`)}
              </Text>
              <Ionicons
                name={weatherIconName(day.condition_key)}
                size={18}
                color="#111111"
              />
              <Text style={styles.dayTemp}>
                {day.temperature_max_c != null ? `${Math.round(day.temperature_max_c)}°` : "—"}
                {" / "}
                {day.temperature_min_c != null ? `${Math.round(day.temperature_min_c)}°` : "—"}
              </Text>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFA" },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navCircleBtn: {
    width: scale(42),
    height: scale(42),
    borderRadius: moderateScale(21),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
  },
  badge: {
    ...morphFont,
    fontSize: fontSize(13),
    fontWeight: "600",
    color: "rgba(42,42,42,0.55)",
  },
  centerBox: { marginTop: verticalScale(80), alignItems: "center", gap: moderateScale(12) },
  errorText: { ...morphFont, fontSize: fontSize(14), color: "#111111", textAlign: "center" },
  retryBtn: {
    marginTop: verticalScale(8),
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(10),
    borderRadius: 999,
    backgroundColor: "#111111",
  },
  retryText: { ...morphFont, fontSize: fontSize(13), fontWeight: "600", color: "#fff" },
  introCard: {
    marginTop: verticalScale(16),
    borderRadius: moderateScale(18),
    backgroundColor: "#F0F0F0",
    padding: moderateScale(14),
    flexDirection: "row",
    alignItems: "flex-start",
    gap: moderateScale(10),
  },
  introTitle: { ...morphFont, fontSize: fontSize(14), fontWeight: "700", color: "#111" },
  introSub: {
    ...morphFont,
    marginTop: verticalScale(4),
    fontSize: fontSize(12),
    lineHeight: fontSize(16),
    color: "rgba(26,26,26,0.55)",
  },
  introBtn: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  introBtnText: { ...morphFont, fontSize: fontSize(12), fontWeight: "600", color: "#111111" },
  profileCard: {
    marginTop: verticalScale(12),
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    borderRadius: moderateScale(14),
    backgroundColor: "#F0F0F0",
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
  },
  profileText: { ...morphFont, flex: 1, fontSize: fontSize(13), fontWeight: "600", color: "#2a2a2a" },
  hero: {
    marginTop: verticalScale(20),
    borderRadius: moderateScale(24),
    overflow: "hidden",
    backgroundColor: "#0B1220",
    padding: moderateScale(22),
    gap: moderateScale(6),
    minHeight: verticalScale(168),
    justifyContent: "flex-end",
  },
  heroImg: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: moderateScale(14), zIndex: 1 },
  temp: { ...morphFont, fontSize: fontSize(44), fontWeight: "700", color: "#fff" },
  condition: {
    ...morphFont,
    fontSize: fontSize(16),
    fontWeight: "600",
    color: "rgba(255,255,255,0.92)",
    zIndex: 1,
  },
  locationBlock: {
    zIndex: 1,
    marginTop: verticalScale(4),
    gap: 2,
  },
  locationRegion: {
    ...morphFont,
    fontSize: fontSize(14),
    fontWeight: "700",
    color: "rgba(255,255,255,0.92)",
  },
  location: {
    ...morphFont,
    fontSize: fontSize(13),
    color: "rgba(255,255,255,0.65)",
    zIndex: 1,
  },
  statsRow: { marginTop: verticalScale(14), flexDirection: "row", gap: moderateScale(10) },
  statCard: {
    flex: 1,
    borderRadius: moderateScale(18),
    backgroundColor: "#F0F0F0",
    padding: moderateScale(14),
    gap: moderateScale(4),
  },
  statLabel: { ...morphFont, fontSize: fontSize(11), color: "rgba(42,42,42,0.5)" },
  statValue: { ...morphFont, fontSize: fontSize(16), fontWeight: "700", color: "#2a2a2a" },
  section: {
    marginTop: verticalScale(24),
    marginBottom: verticalScale(10),
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "600",
    letterSpacing: 0.3,
    color: "rgba(42,42,42,0.45)",
    textTransform: "uppercase",
  },
  summary: {
    ...morphFont,
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    color: "#2a2a2a",
  },
  emptyProducts: {
    borderRadius: moderateScale(18),
    backgroundColor: "#F0F0F0",
    padding: moderateScale(18),
    alignItems: "center",
    gap: moderateScale(6),
  },
  emptyProductsTitle: {
    ...morphFont,
    fontSize: fontSize(14),
    fontWeight: "700",
    color: "#111",
    marginTop: verticalScale(4),
  },
  emptyProductsSub: {
    ...morphFont,
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: "rgba(26,26,26,0.55)",
    textAlign: "center",
  },
  emptyProductsBtn: {
    marginTop: verticalScale(8),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderRadius: 999,
    backgroundColor: "#111111",
  },
  emptyProductsBtnText: { ...morphFont, fontSize: fontSize(13), fontWeight: "600", color: "#fff" },
  productTipCard: {
    flexDirection: "row",
    gap: moderateScale(12),
    borderRadius: moderateScale(18),
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.08)",
    padding: moderateScale(12),
    marginBottom: verticalScale(10),
  },
  productTipImg: {
    width: scale(56),
    height: scale(56),
    borderRadius: moderateScale(14),
    backgroundColor: "#F0F0F0",
  },
  productTipImgFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  productTipBody: { flex: 1, minWidth: 0, gap: moderateScale(3) },
  productTipBrand: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "700",
    color: "#737373",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  productTipName: {
    ...morphFont,
    fontSize: fontSize(14),
    fontWeight: "700",
    color: "#111111",
  },
  productTipHow: {
    ...morphFont,
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: "#2a2a2a",
    marginTop: verticalScale(2),
  },
  productTipHintRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: moderateScale(6),
    marginTop: verticalScale(4),
  },
  productTipHint: {
    ...morphFont,
    flex: 1,
    fontSize: fontSize(12),
    lineHeight: fontSize(16),
    color: "#737373",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: moderateScale(10),
    borderRadius: moderateScale(14),
    backgroundColor: "#F0F0F0",
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    marginBottom: verticalScale(8),
  },
  tipText: { ...morphFont, flex: 1, fontSize: fontSize(14), lineHeight: fontSize(20), color: "#2a2a2a" },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    borderRadius: moderateScale(14),
    backgroundColor: "#F0F0F0",
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    marginBottom: verticalScale(6),
  },
  dayLabel: {
    width: scale(72),
    ...morphFont,
    fontSize: fontSize(14),
    fontWeight: "600",
    color: "#2a2a2a",
  },
  dayLabelToday: { color: "#737373" },
  dayTemp: {
    flex: 1,
    textAlign: "right",
    ...morphFont,
    fontSize: fontSize(13),
    color: "rgba(42,42,42,0.65)",
  },
});
