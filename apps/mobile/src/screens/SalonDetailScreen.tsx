import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ResponsiveImage } from "../components/ResponsiveImage";
import { NativeBackButton } from "../components/ui/NativeBackButton";
import { useSalonDetail } from "../hooks/useSalonDetail";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { WEEKDAY_UZ } from "../lib/salon-detail";
import { shortPrice } from "../lib/price";
import { scaleFont } from "../theme/layout";
import { colors } from "../theme/colors";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../utils/responsive";

type Props = NativeStackScreenProps<RootStackParamList, "SalonDetail">;

export function SalonDetailScreen({ route, navigation }: Props) {
  const { salonId, distanceKm = 0 } = route.params;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const fs = (n: number) => scaleFont(n, width);
  const { salon, loading, error, refresh } = useSalonDetail(salonId, distanceKm);
  const [heroIndex, setHeroIndex] = useState(0);

  const onBook = useCallback(() => {
    navigation.navigate("Booking", { salonId });
  }, [navigation, salonId]);

  if (loading && !salon) {
    return (
      <View style={[styles.boot, { paddingTop: insets.top }]}>
        <NativeBackButton onPress={() => navigation.goBack()} />
        <ActivityIndicator color={colors.fg} size="large" style={{ marginTop: 48 }} />
      </View>
    );
  }

  if (error || !salon) {
    return (
      <View style={[styles.boot, { paddingTop: insets.top }]}>
        <NativeBackButton onPress={() => navigation.goBack()} />
        <Text style={[styles.errorText, { fontSize: fs(14) }]}>{error ?? "Topilmadi"}</Text>
        <Pressable style={styles.retryBtn} onPress={refresh}>
          <Text style={[styles.retryText, { fontSize: fs(13) }]}>Qayta urinish</Text>
        </Pressable>
      </View>
    );
  }

  const images = salon.portfolio.length > 0 ? salon.portfolio : salon.coverUrl ? [salon.coverUrl] : [];

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
      >
        <View style={styles.heroWrap}>
          {images.length > 0 ? (
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(uri, i) => `${uri}-${i}`}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                setHeroIndex(idx);
              }}
              renderItem={({ item, index }) => (
                <ResponsiveImage
                  uri={item}
                  style={{ width, height: width * 0.72 }}
                  recyclingKey={`salon-${salon.id}-${index}`}
                />
              )}
            />
          ) : (
            <View style={[styles.heroPlaceholder, { width, height: width * 0.72 }]} />
          )}

          <View style={[styles.heroChrome, { paddingTop: Math.max(insets.top, 10) }]}>
            <NativeBackButton onPress={() => navigation.goBack()} />
            <View style={styles.heroActions}>
              <Pressable style={styles.glassBtn} accessibilityLabel="Ulashish">
                <Ionicons name="share-outline" size={18} color={colors.fg} />
              </Pressable>
              <Pressable style={styles.glassBtn} accessibilityLabel="Sevimli">
                <Ionicons name="heart-outline" size={18} color={colors.fg} />
              </Pressable>
            </View>
          </View>

          {images.length > 1 ? (
            <View style={styles.dots}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, i === heroIndex && styles.dotOn]} />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={[styles.kicker, { fontSize: fs(10) }]}>{salon.categoryLabel}</Text>
          <Text style={[styles.title, { fontSize: fs(24) }]}>{salon.name}</Text>

          <View style={styles.metaRow}>
            {salon.rating > 0 ? (
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={12} color="#FFF" />
                <Text style={[styles.ratingText, { fontSize: fs(12) }]}>
                  {salon.rating.toFixed(1)}
                </Text>
              </View>
            ) : null}
            {salon.reviewCount > 0 ? (
              <Text style={[styles.metaText, { fontSize: fs(12) }]}>
                {salon.reviewCount} sharh
              </Text>
            ) : null}
            {salon.distanceKm > 0 ? (
              <Text style={[styles.metaText, { fontSize: fs(12) }]}>
                · {salon.distanceKm.toFixed(1)} km
              </Text>
            ) : null}
          </View>

          {salon.address ? (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={16} color={colors.muted} />
              <Text style={[styles.address, { fontSize: fs(13) }]}>{salon.address}</Text>
            </View>
          ) : null}

          {salon.priceFrom > 0 ? (
            <Text style={[styles.priceLine, { fontSize: fs(14) }]}>
              {shortPrice(salon.priceFrom)}
              {salon.priceTo > salon.priceFrom ? ` – ${shortPrice(salon.priceTo)}` : ""} so'm dan
            </Text>
          ) : null}

          {salon.about ? (
            <View style={styles.block}>
              <Text style={[styles.blockTitle, { fontSize: fs(15) }]}>Haqida</Text>
              <Text style={[styles.body, { fontSize: fs(13) }]}>{salon.about}</Text>
            </View>
          ) : null}

          {salon.services.length > 0 ? (
            <View style={styles.block}>
              <Text style={[styles.blockTitle, { fontSize: fs(15) }]}>Xizmatlar</Text>
              {salon.services.slice(0, 8).map((svc) => (
                <View key={svc.id} style={styles.serviceRow}>
                  <View style={styles.serviceInfo}>
                    <Text style={[styles.serviceName, { fontSize: fs(13) }]} numberOfLines={1}>
                      {svc.name}
                    </Text>
                    {svc.duration > 0 ? (
                      <Text style={[styles.serviceMeta, { fontSize: fs(11) }]}>
                        {svc.duration} daq
                        {svc.barberName ? ` · ${svc.barberName}` : ""}
                      </Text>
                    ) : null}
                  </View>
                  {svc.price > 0 ? (
                    <Text style={[styles.servicePrice, { fontSize: fs(13) }]}>
                      {shortPrice(svc.price)}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          {salon.staff.length > 0 ? (
            <View style={styles.block}>
              <Text style={[styles.blockTitle, { fontSize: fs(15) }]}>Ustalar</Text>
              <FlatList
                data={salon.staff}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.staffRow}
                renderItem={({ item }) => (
                  <View style={styles.staffCard}>
                    <ResponsiveImage
                      uri={item.avatarUrl}
                      style={styles.staffAvatar}
                      recyclingKey={`staff-${item.id}`}
                    />
                    <Text style={[styles.staffName, { fontSize: fs(12) }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.staffRole, { fontSize: fs(10) }]} numberOfLines={1}>
                      {item.role}
                    </Text>
                  </View>
                )}
              />
            </View>
          ) : null}

          {salon.amenities.length > 0 ? (
            <View style={styles.block}>
              <Text style={[styles.blockTitle, { fontSize: fs(15) }]}>Qulayliklar</Text>
              <View style={styles.chips}>
                {salon.amenities.map((a) => (
                  <View key={a.code} style={styles.chip}>
                    <Text style={[styles.chipText, { fontSize: fs(11) }]}>{a.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {salon.hours.length > 0 ? (
            <View style={styles.block}>
              <Text style={[styles.blockTitle, { fontSize: fs(15) }]}>Ish vaqti</Text>
              {salon.hours.map((h) => (
                <View key={h.weekday} style={styles.hourRow}>
                  <Text style={[styles.hourDay, { fontSize: fs(13) }]}>
                    {WEEKDAY_UZ[h.weekday] ?? h.weekday}
                  </Text>
                  <Text style={[styles.hourTime, { fontSize: fs(13) }]}>
                    {h.openTime && h.closeTime ? `${h.openTime} – ${h.closeTime}` : "Yopiq"}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable style={styles.ctaBtn} onPress={onBook}>
          <Text style={[styles.ctaText, { fontSize: fs(15) }]}>Boshlash</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  boot: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: scale(16),
  },
  errorText: {
    marginTop: verticalScale(24),
    color: colors.muted,
    textAlign: "center",
  },
  retryBtn: {
    alignSelf: "center",
    marginTop: verticalScale(16),
    backgroundColor: colors.fg,
    borderRadius: 999,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
  },
  retryText: { color: "#FFF", fontWeight: "700" },
  heroWrap: { position: "relative" },
  heroPlaceholder: { backgroundColor: colors.surface },
  heroChrome: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scale(12),
  },
  heroActions: { flexDirection: "row", gap: moderateScale(8) },
  glassBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(20),
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
  },
  dots: {
    position: "absolute",
    bottom: verticalScale(28),
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: moderateScale(6),
  },
  dot: {
    width: scale(6),
    height: scale(6),
    borderRadius: moderateScale(3),
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotOn: { backgroundColor: "#FFF", width: scale(18) },
  sheet: {
    marginTop: -verticalScale(24),
    borderTopLeftRadius: moderateScale(28),
    borderTopRightRadius: moderateScale(28),
    backgroundColor: colors.bg,
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(8),
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -8 },
    elevation: 8,
  },
  handle: {
    alignSelf: "center",
    width: scale(40),
    height: verticalScale(4),
    borderRadius: moderateScale(2),
    backgroundColor: colors.border,
    marginBottom: verticalScale(12),
  },
  kicker: {
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.muted,
  },
  title: {
    marginTop: verticalScale(4),
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.5,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: moderateScale(8),
    marginTop: verticalScale(10),
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
    backgroundColor: colors.fg,
    borderRadius: 999,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
  },
  ratingText: { color: "#FFF", fontWeight: "700" },
  metaText: { color: colors.muted, fontWeight: "600" },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: moderateScale(6),
    marginTop: verticalScale(10),
  },
  address: { flex: 1, color: colors.muted, lineHeight: fontSize(18) },
  priceLine: {
    marginTop: verticalScale(10),
    fontWeight: "700",
    color: colors.fg,
  },
  block: { marginTop: verticalScale(20) },
  blockTitle: { fontWeight: "800", color: colors.fg, marginBottom: verticalScale(10) },
  body: { color: colors.muted, lineHeight: fontSize(20) },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: moderateScale(12),
    paddingVertical: verticalScale(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  serviceInfo: { flex: 1, minWidth: 0 },
  serviceName: { fontWeight: "700", color: colors.fg },
  serviceMeta: { marginTop: verticalScale(2), color: colors.muted },
  servicePrice: { fontWeight: "800", color: colors.fg },
  staffRow: { gap: moderateScale(12) },
  staffCard: { width: scale(88), alignItems: "center" },
  staffAvatar: {
    width: scale(72),
    height: scale(72),
    borderRadius: moderateScale(36),
  },
  staffName: {
    marginTop: verticalScale(6),
    fontWeight: "700",
    color: colors.fg,
    textAlign: "center",
  },
  staffRole: { marginTop: verticalScale(2), color: colors.muted, textAlign: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: moderateScale(8) },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
  },
  chipText: { fontWeight: "600", color: colors.fg },
  hourRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: verticalScale(6),
  },
  hourDay: { fontWeight: "700", color: colors.fg },
  hourTime: { color: colors.muted, fontWeight: "600" },
  ctaBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(10),
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  ctaBtn: {
    backgroundColor: colors.fg,
    borderRadius: moderateScale(16),
    minHeight: verticalScale(52),
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: "#FFF", fontWeight: "800" },
});
