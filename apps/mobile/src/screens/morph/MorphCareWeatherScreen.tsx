import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchHairCareProfile } from "../../api/care";
import { weatherIconName } from "../../api/weather";
import { useCareWeather } from "../../hooks/useCareWeather";
import { hasSeenWeatherIntro, markWeatherIntroSeen } from "../../lib/morph-my-products";
import type { MorphCareStackParamList } from "../../navigation/MorphCareStack";
import { morphFont } from "../../theme/morph-font";

type Props = NativeStackScreenProps<MorphCareStackParamList, "CareWeather">;

export function MorphCareWeatherScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data, loading, error, refresh } = useCareWeather();
  const [showIntro, setShowIntro] = useState(false);
  const [profileLine, setProfileLine] = useState<string | null>(null);

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
  const icon = weatherIconName(current?.condition_key ?? "unknown");

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: Math.max(insets.bottom, 24) + 72,
        paddingHorizontal: 20,
      }}
    >
      <View style={styles.rowBetween}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#2a2a2a" />
        </Pressable>
        <Text style={styles.badge}>{t("care.weather.title")}</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color="#564746" />
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
              <Ionicons name="sparkles-outline" size={22} color="#5B4B8A" />
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
              <Ionicons name="person-circle-outline" size={20} color="#5B4B8A" />
              <Text style={styles.profileText}>{profileLine}</Text>
            </View>
          ) : null}

          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <Ionicons name={icon} size={42} color="#fff" />
              <Text style={styles.temp}>
                {current?.temperature_c != null ? `${Math.round(current.temperature_c)}°` : "—"}
              </Text>
            </View>
            <Text style={styles.condition}>
              {t(`care.weather.conditions.${current?.condition_key ?? "unknown"}`)}
            </Text>
            {data.location_label ? (
              <Text style={styles.location}>{data.location_label}</Text>
            ) : null}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="water-outline" size={18} color="#96605e" />
              <Text style={styles.statLabel}>{t("care.weather.humidity")}</Text>
              <Text style={styles.statValue}>
                {current?.humidity_pct != null ? `${Math.round(current.humidity_pct)}%` : "—"}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="speedometer-outline" size={18} color="#96605e" />
              <Text style={styles.statLabel}>{t("care.weather.wind")}</Text>
              <Text style={styles.statValue}>
                {current?.wind_kmh != null ? `${Math.round(current.wind_kmh)} km/h` : "—"}
              </Text>
            </View>
          </View>

          <Text style={styles.section}>{t("care.weather.today")}</Text>
          <Text style={styles.summary}>{data.summary}</Text>

          <Text style={styles.section}>{t("care.weather.recommendations")}</Text>
          {data.recommendations.map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <Ionicons name="leaf-outline" size={16} color="#96605e" />
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
                color="#564746"
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
  root: { flex: 1, backgroundColor: "#d9d9d9" },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    ...morphFont,
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(42,42,42,0.55)",
  },
  centerBox: { marginTop: 80, alignItems: "center", gap: 12 },
  errorText: { ...morphFont, fontSize: 14, color: "#564746", textAlign: "center" },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#564746",
  },
  retryText: { ...morphFont, fontSize: 13, fontWeight: "600", color: "#fff" },
  introCard: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: "#EDE4FF",
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  introTitle: { ...morphFont, fontSize: 14, fontWeight: "700", color: "#111" },
  introSub: {
    ...morphFont,
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: "rgba(26,26,26,0.55)",
  },
  introBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  introBtnText: { ...morphFont, fontSize: 12, fontWeight: "600", color: "#5B4B8A" },
  profileCard: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    backgroundColor: "#f2eeed",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  profileText: { ...morphFont, flex: 1, fontSize: 13, fontWeight: "600", color: "#2a2a2a" },
  hero: {
    marginTop: 20,
    borderRadius: 24,
    backgroundColor: "#564746",
    padding: 22,
    gap: 6,
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  temp: { ...morphFont, fontSize: 44, fontWeight: "700", color: "#fff" },
  condition: { ...morphFont, fontSize: 16, fontWeight: "600", color: "rgba(255,255,255,0.92)" },
  location: { ...morphFont, fontSize: 13, color: "rgba(255,255,255,0.65)" },
  statsRow: { marginTop: 14, flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#f2eeed",
    padding: 14,
    gap: 4,
  },
  statLabel: { ...morphFont, fontSize: 11, color: "rgba(42,42,42,0.5)" },
  statValue: { ...morphFont, fontSize: 16, fontWeight: "700", color: "#2a2a2a" },
  section: {
    marginTop: 24,
    marginBottom: 10,
    ...morphFont,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    color: "rgba(42,42,42,0.45)",
    textTransform: "uppercase",
  },
  summary: {
    ...morphFont,
    fontSize: 15,
    lineHeight: 22,
    color: "#2a2a2a",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    backgroundColor: "#f2eeed",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  tipText: { ...morphFont, flex: 1, fontSize: 14, lineHeight: 20, color: "#2a2a2a" },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    backgroundColor: "#f2eeed",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  dayLabel: {
    width: 72,
    ...morphFont,
    fontSize: 14,
    fontWeight: "600",
    color: "#2a2a2a",
  },
  dayLabelToday: { color: "#96605e" },
  dayTemp: {
    flex: 1,
    textAlign: "right",
    ...morphFont,
    fontSize: 13,
    color: "rgba(42,42,42,0.65)",
  },
});
