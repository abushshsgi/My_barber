import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { WeatherShieldState } from "../../types/weatherShield";
import { SHIELD_IMAGES } from "../../services/weatherRecommendationEngine";
import { colors } from "../../theme/colors";
import { morphFont } from "../../theme/morph-font";
import { fontSize, moderateScale, scale, verticalScale } from "../../utils/responsive";
import { RecommendationCard } from "./RecommendationCard";

type Props = {
  state: WeatherShieldState;
  doneIds?: Set<string>;
  onToggleDone?: (id: string) => void;
};

/** Soft Paper header + ixcham kartalar + bajarildi checkbox. */
export function WeatherShieldContainer({ state, doneIds, onToggleDone }: Props) {
  const { width } = useWindowDimensions();
  const { recommendations, loading, error } = state;
  const hairOnly = recommendations.filter((r) => r.type !== "style");
  const [featured, ...rest] = hairOnly;
  const tileGap = moderateScale(8);
  const tileW = (width - scale(16) * 2 - tileGap) / 2;
  const tiles = rest.slice(0, 4);
  const steps = rest.slice(4);
  const doneCount = hairOnly.filter((r) => doneIds?.has(r.id)).length;
  const topAlert = state.activeAlerts[0];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Image
            source={SHIELD_IMAGES.headerShield}
            style={styles.headerImg}
            contentFit="cover"
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Morf Shield · Bugun</Text>
          <Text style={styles.title}>Soch himoyasi</Text>
          <Text style={styles.dayHint}>Har kuni belgilang — ertaga yangilanadi</Text>
        </View>
        <View style={styles.headerRight}>
          {topAlert ? (
            <View style={styles.alertPill}>
              <Ionicons name="sunny-outline" size={12} color={colors.fg} />
              <Text style={styles.alertText} numberOfLines={1}>
                {topAlert.label}
              </Text>
            </View>
          ) : null}
          {hairOnly.length > 0 ? (
            <Text style={styles.progress}>
              {doneCount}/{hairOnly.length}
            </Text>
          ) : null}
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && hairOnly.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.muted} />
          <Text style={styles.emptyTitle}>Maxsus himoya kerak emas</Text>
          <Text style={styles.emptySub}>
            Bugun ob-havo yumshoq — oddiy yuvish va yengil namlantirish yetarli.
          </Text>
        </View>
      ) : (
        <View style={styles.body}>
          {featured ? (
            <RecommendationCard
              item={featured}
              index={0}
              variant="featured"
              done={doneIds?.has(featured.id)}
              onToggleDone={onToggleDone ? () => onToggleDone(featured.id) : undefined}
            />
          ) : null}

          {tiles.length > 0 ? (
            <View style={[styles.grid, { gap: tileGap }]}>
              {tiles.map((item, i) => (
                <RecommendationCard
                  key={item.id}
                  item={item}
                  index={i + 1}
                  variant="tile"
                  tileWidth={tileW}
                  done={doneIds?.has(item.id)}
                  onToggleDone={onToggleDone ? () => onToggleDone(item.id) : undefined}
                />
              ))}
            </View>
          ) : null}

          {steps.length > 0 ? (
            <View style={styles.timeline}>
              {steps.map((item, i) => (
                <RecommendationCard
                  key={item.id}
                  item={item}
                  index={i + 1 + tiles.length}
                  variant="step"
                  done={doneIds?.has(item.id)}
                  onToggleDone={onToggleDone ? () => onToggleDone(item.id) : undefined}
                />
              ))}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: moderateScale(10) },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    backgroundColor: colors.surface,
    borderRadius: moderateScale(16),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(12),
  },
  headerIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(12),
    backgroundColor: "#F7F4EF",
    overflow: "hidden",
  },
  headerImg: { width: "100%", height: "100%" },
  headerText: { flex: 1, minWidth: 0, gap: 1 },
  eyebrow: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    ...morphFont,
    fontSize: fontSize(15),
    fontWeight: "800",
    color: colors.fg,
  },
  dayHint: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "600",
    color: colors.muted,
    marginTop: 1,
  },
  headerRight: { alignItems: "flex-end", gap: 4, maxWidth: "42%" },
  alertPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.promo,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: 999,
    maxWidth: "100%",
  },
  alertText: {
    ...morphFont,
    flexShrink: 1,
    fontSize: fontSize(10),
    fontWeight: "700",
    color: colors.fg,
  },
  progress: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "800",
    color: colors.muted,
  },
  error: { ...morphFont, fontSize: fontSize(12), color: "#B91C1C" },
  body: { gap: moderateScale(8) },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  timeline: { gap: moderateScale(6) },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(16),
    padding: moderateScale(14),
    gap: 4,
  },
  emptyTitle: {
    ...morphFont,
    fontSize: fontSize(13),
    fontWeight: "800",
    color: colors.fg,
  },
  emptySub: {
    ...morphFont,
    fontSize: fontSize(12),
    lineHeight: fontSize(16),
    color: colors.muted,
  },
});
