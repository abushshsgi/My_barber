import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { WeatherAlert, WeatherData } from "../../types/weatherShield";
import { shellChrome, useShellTheme, type ShellChrome } from "../../lib/useShellTheme";
import { morphFont } from "../../theme/morph-font";
import { fontSize, moderateScale, scale, verticalScale } from "../../utils/responsive";

type Props = {
  weather: WeatherData | null;
  alerts: WeatherAlert[];
  loading?: boolean;
};

function metric(
  label: string,
  value: string,
  icon: keyof typeof Ionicons.glyphMap,
) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={14} color={ink.muted} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

/** Sleek glass-style weather metrics + active alert badges. */
let ink: ShellChrome = {
  bg: "#FAFAFA",
  fg: "#111111",
  muted: "#737373",
  surface: "#FFFFFF",
  border: "rgba(17,17,17,0.12)",
  promo: "#F0F0F0",
  iconTile: "#F0F0F0",
  accent: "#111111",
  onAccent: "#FFFFFF",
  status: "dark",
};

export function WeatherWidget({ weather, alerts, loading }: Props) {
  const pal = useShellTheme();
  const colors = shellChrome(pal);
  ink = colors;
  styles = useMemo(
    () => createWidgetStyles(colors),
    [colors.bg, colors.fg, colors.muted, colors.surface, colors.promo],
  );
  if (loading && !weather) {
    return (
      <View style={[styles.card, styles.center]}>
        <ActivityIndicator color={colors.fg} />
        <Text style={styles.loadingText}>Ob-havo yuklanmoqda…</Text>
      </View>
    );
  }

  if (!weather) {
    return (
      <View style={[styles.card, styles.center]}>
        <Ionicons name="cloud-offline-outline" size={22} color={colors.muted} />
        <Text style={styles.loadingText}>Ob-havo ma’lumoti yo‘q</Text>
      </View>
    );
  }

  const topAlert = alerts[0];

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.eyebrow}>Smart Weather Shield</Text>
          <Text style={styles.location} numberOfLines={1}>
            {weather.location || "Shahar"}
          </Text>
          <Text style={styles.condition} numberOfLines={1}>
            {weather.condition || "—"}
          </Text>
        </View>
        <Text style={styles.temp}>
          {weather.temp != null ? `${Math.round(weather.temp)}°` : "—"}
        </Text>
      </View>

      {topAlert ? (
        <View
          style={[
            styles.badge,
            topAlert.severity === "high" && styles.badgeHigh,
            topAlert.severity === "medium" && styles.badgeMed,
          ]}
        >
          <Ionicons
            name="shield-checkmark"
            size={14}
            color={topAlert.severity === "high" ? "#fff" : colors.fg}
          />
          <Text
            style={[
              styles.badgeText,
              topAlert.severity === "high" && styles.badgeTextOn,
            ]}
            numberOfLines={1}
          >
            {topAlert.label}
          </Text>
        </View>
      ) : (
        <View style={[styles.badge, styles.badgeCalm]}>
          <Ionicons name="checkmark-circle" size={14} color={colors.fg} />
          <Text style={styles.badgeText}>Barqaror — oddiy rejim</Text>
        </View>
      )}

      <View style={styles.metrics}>
        {metric(
          "UV",
          weather.uvIndex != null ? `${Math.round(weather.uvIndex)}` : "—",
          "sunny-outline",
        )}
        {metric(
          "Namlik",
          weather.humidity != null ? `${Math.round(weather.humidity)}%` : "—",
          "water-outline",
        )}
        {metric(
          "Shamol",
          weather.windSpeed != null ? `${Math.round(weather.windSpeed)}` : "—",
          "navigate-outline",
        )}
        {metric(
          "AQI",
          weather.aqi != null ? `${Math.round(weather.aqi)}` : "—",
          "leaf-outline",
        )}
      </View>
    </View>
  );
}

let styles = createWidgetStyles({
  bg: "#FAFAFA",
  fg: "#111111",
  muted: "#737373",
  surface: "#FFFFFF",
  border: "rgba(17,17,17,0.12)",
  promo: "#F0F0F0",
  iconTile: "#F0F0F0",
  accent: "#111111",
  onAccent: "#FFFFFF",
  status: "dark",
});

function createWidgetStyles(colors: ShellChrome) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(22),
    padding: moderateScale(16),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: moderateScale(12),
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: verticalScale(120),
    gap: moderateScale(8),
  },
  loadingText: {
    ...morphFont,
    fontSize: fontSize(12),
    color: colors.muted,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: moderateScale(12) },
  eyebrow: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  location: {
    ...morphFont,
    marginTop: 2,
    fontSize: fontSize(18),
    fontWeight: "800",
    color: colors.fg,
  },
  condition: {
    ...morphFont,
    marginTop: 2,
    fontSize: fontSize(13),
    color: colors.muted,
  },
  temp: {
    ...morphFont,
    fontSize: fontSize(40),
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -1,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: 999,
    backgroundColor: colors.promo,
  },
  badgeHigh: { backgroundColor: colors.fg },
  badgeMed: { backgroundColor: "#FFE8D6" },
  badgeCalm: { backgroundColor: colors.promo },
  badgeText: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "700",
    color: colors.fg,
  },
  badgeTextOn: { color: "#fff" },
  metrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: moderateScale(6),
  },
  metric: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.bg,
    borderRadius: moderateScale(14),
    paddingVertical: verticalScale(10),
  },
  metricValue: {
    ...morphFont,
    fontSize: fontSize(14),
    fontWeight: "800",
    color: colors.fg,
  },
  metricLabel: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "600",
    color: colors.muted,
  },
  });
}
