import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeBottom, safeTop } from "../lib/safe-area";
import {
  createBooking,
  fetchBookingAvailability,
  fetchSalonBarberServices,
} from "../api/bookings";
import type { ApiService } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { ResponsiveImage } from "../components/ResponsiveImage";
import { NativeHeader } from "../components/ui/NativeHeader";
import { useSalonDetail } from "../hooks/useSalonDetail";
import {
  buildDayList,
  combineDateAndSlot,
  slotLabel,
} from "../lib/booking-days";
import { shortPrice } from "../lib/price";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { scaleFont } from "../theme/layout";
import { colors } from "../theme/colors";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../utils/responsive";

type Props = NativeStackScreenProps<RootStackParamList, "Booking">;

const STEPS = ["Usta", "Xizmat", "Vaqt", "Tasdiq"] as const;

export function BookingScreen({ route, navigation }: Props) {
  const { salonId } = route.params;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const fs = (n: number) => scaleFont(n, width);
  const { isAuthenticated, user } = useAuth();
  const { salon, loading: salonLoading } = useSalonDetail(salonId);

  const [step, setStep] = useState(0);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [services, setServices] = useState<ApiService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const days = useMemo(() => buildDayList(14), []);
  const staff = salon?.staff ?? [];

  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert("Kirish kerak", "Bron qilish uchun avval akkauntga kiring.", [
        { text: "Bekor", style: "cancel", onPress: () => navigation.goBack() },
        {
          text: "Kirish",
          onPress: () => navigation.navigate("MainTabs", { screen: "Profile" }),
        },
      ]);
    }
  }, [isAuthenticated, navigation]);

  useEffect(() => {
    if (!barberId && staff.length > 0) {
      setBarberId(staff[0].id);
    }
  }, [staff, barberId]);

  useEffect(() => {
    if (!barberId) return;
    let cancelled = false;
    setServicesLoading(true);
    setServiceIds([]);
    setSlot(null);
    void fetchSalonBarberServices(salonId, barberId)
      .then((rows) => {
        if (!cancelled) setServices(rows);
      })
      .catch(() => {
        if (!cancelled) setServices([]);
      })
      .finally(() => {
        if (!cancelled) setServicesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [salonId, barberId]);

  useEffect(() => {
    if (step !== 2 || !barberId || serviceIds.length === 0) return;
    const dateIso = days[dayIdx]?.key;
    if (!dateIso) return;
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(null);
    setSlot(null);
    void fetchBookingAvailability({
      salon: parseInt(salonId, 10),
      barber: parseInt(barberId, 10),
      date: dateIso,
      service_ids: serviceIds.join(","),
    })
      .then((data) => {
        if (cancelled) return;
        const labels = (data.slots ?? []).map(slotLabel);
        setSlots(labels);
        if (labels.length === 0) {
          setSlotsError(data.closed_reason || data.detail || "Bu kunda bo'sh vaqt yo'q");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setSlots([]);
        setSlotsError(err instanceof Error ? err.message : "Vaqtlar yuklanmadi");
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [step, barberId, serviceIds, dayIdx, days, salonId]);

  const selectedServices = useMemo(
    () => services.filter((s) => serviceIds.includes(String(s.id))),
    [services, serviceIds],
  );
  const total = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
  const selectedBarber = staff.find((s) => s.id === barberId);

  const canNext =
    (step === 0 && !!barberId) ||
    (step === 1 && serviceIds.length > 0) ||
    (step === 2 && !!slot) ||
    step === 3;

  const toggleService = useCallback((id: string) => {
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const onSubmit = useCallback(async () => {
    if (!barberId || !slot || serviceIds.length === 0 || !days[dayIdx]) return;
    setSubmitting(true);
    try {
      const start = combineDateAndSlot(days[dayIdx].full, slot);
      const created = await createBooking({
        salon: parseInt(salonId, 10),
        barber: parseInt(barberId, 10),
        start_at: start.toISOString(),
        service_ids: serviceIds.map((id) => parseInt(id, 10)),
        payment_method: "cash",
        customer_phone: user?.phone || undefined,
      });
      Alert.alert(
        "Bron qabul qilindi",
        `${salon?.name ?? "Salon"} · ${days[dayIdx].label} ${slot}`,
        [
          {
            text: "OK",
            onPress: () =>
              navigation.replace("BookingSuccess", {
                bookingId: String(created.id),
                salonName: salon?.name ?? "",
                whenLabel: `${days[dayIdx].label} · ${slot}`,
              }),
          },
        ],
      );
    } catch (err) {
      Alert.alert("Xato", err instanceof Error ? err.message : "Bron qilinmadi");
    } finally {
      setSubmitting(false);
    }
  }, [
    barberId,
    slot,
    serviceIds,
    days,
    dayIdx,
    salonId,
    user?.phone,
    salon?.name,
    navigation,
  ]);

  if (salonLoading && !salon) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.fg} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <NativeHeader
        title={salon?.name ?? "Bron"}
        onBack={() => (step > 0 ? setStep((s) => s - 1) : navigation.goBack())}
      />

      <View style={styles.steps}>
        {STEPS.map((label, i) => (
          <View key={label} style={styles.stepItem}>
            <View style={[styles.stepDot, i <= step && styles.stepDotOn]}>
              <Text style={[styles.stepNum, i <= step && styles.stepNumOn]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, { fontSize: fs(10) }, i === step && styles.stepLabelOn]}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: safeBottom(insets.bottom, 100) }]}
        showsVerticalScrollIndicator={false}
      >
        {step === 0 ? (
          <View style={styles.block}>
            <Text style={[styles.blockTitle, { fontSize: fs(16) }]}>Ustani tanlang</Text>
            {staff.length === 0 ? (
              <Text style={styles.empty}>Ustalar topilmadi</Text>
            ) : (
              staff.map((s) => {
                const on = s.id === barberId;
                return (
                  <Pressable
                    key={s.id}
                    style={[styles.rowCard, on && styles.rowCardOn]}
                    onPress={() => setBarberId(s.id)}
                  >
                    <ResponsiveImage uri={s.avatarUrl} style={styles.avatar} />
                    <View style={styles.rowInfo}>
                      <Text style={[styles.rowTitle, { fontSize: fs(14) }]}>{s.name}</Text>
                      <Text style={[styles.rowMeta, { fontSize: fs(12) }]}>{s.role}</Text>
                    </View>
                    {on ? <Ionicons name="checkmark-circle" size={22} color={colors.fg} /> : null}
                  </Pressable>
                );
              })
            )}
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.block}>
            <Text style={[styles.blockTitle, { fontSize: fs(16) }]}>Xizmatni tanlang</Text>
            {servicesLoading ? (
              <ActivityIndicator color={colors.fg} style={{ marginTop: 20 }} />
            ) : services.length === 0 ? (
              <Text style={styles.empty}>Bu usta uchun xizmat yo'q</Text>
            ) : (
              services.map((svc) => {
                const id = String(svc.id);
                const on = serviceIds.includes(id);
                return (
                  <Pressable
                    key={id}
                    style={[styles.rowCard, on && styles.rowCardOn]}
                    onPress={() => toggleService(id)}
                  >
                    <View style={styles.rowInfo}>
                      <Text style={[styles.rowTitle, { fontSize: fs(14) }]}>{svc.name}</Text>
                      <Text style={[styles.rowMeta, { fontSize: fs(12) }]}>
                        {svc.duration_minutes ? `${svc.duration_minutes} daq` : ""}
                      </Text>
                    </View>
                    <Text style={[styles.price, { fontSize: fs(14) }]}>
                      {shortPrice(svc.price)}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.block}>
            <Text style={[styles.blockTitle, { fontSize: fs(16) }]}>Kun va soat</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
              {days.map((d, i) => (
                <Pressable
                  key={d.key}
                  style={[styles.dayChip, i === dayIdx && styles.dayChipOn]}
                  onPress={() => setDayIdx(i)}
                >
                  <Text style={[styles.dayText, i === dayIdx && styles.dayTextOn, { fontSize: fs(12) }]}>
                    {d.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {slotsLoading ? (
              <ActivityIndicator color={colors.fg} style={{ marginTop: 24 }} />
            ) : slotsError && slots.length === 0 ? (
              <Text style={styles.empty}>{slotsError}</Text>
            ) : (
              <View style={styles.slotGrid}>
                {slots.map((s) => {
                  const on = s === slot;
                  return (
                    <Pressable
                      key={s}
                      style={[styles.slotChip, on && styles.slotChipOn]}
                      onPress={() => setSlot(s)}
                    >
                      <Text style={[styles.slotText, on && styles.slotTextOn, { fontSize: fs(13) }]}>
                        {s}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.block}>
            <Text style={[styles.blockTitle, { fontSize: fs(16) }]}>Tasdiqlash</Text>
            <View style={styles.summary}>
              <SummaryRow label="Salon" value={salon?.name ?? "—"} />
              <SummaryRow label="Usta" value={selectedBarber?.name ?? "—"} />
              <SummaryRow
                label="Xizmat"
                value={selectedServices.map((s) => s.name).join(", ") || "—"}
              />
              <SummaryRow
                label="Vaqt"
                value={`${days[dayIdx]?.label ?? ""} · ${slot ?? ""}`}
              />
              <SummaryRow label="To'lov" value="Naqd / joyida" />
              <SummaryRow label="Jami" value={`${shortPrice(total)} so'm`} bold />
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: safeBottom(insets.bottom, 0) }]}>
        <Pressable
          style={[styles.cta, (!canNext || submitting || !isAuthenticated) && styles.ctaDisabled]}
          disabled={!canNext || submitting || !isAuthenticated}
          onPress={() => {
            if (step < 3) setStep((s) => s + 1);
            else void onSubmit();
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={[styles.ctaText, { fontSize: fs(15) }]}>
              {step < 3 ? "Davom etish" : "Bron qilish"}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, bold && styles.summaryBold]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  steps: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  stepItem: { alignItems: "center", gap: moderateScale(4), flex: 1 },
  stepDot: {
    width: scale(24),
    height: scale(24),
    borderRadius: moderateScale(12),
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotOn: { backgroundColor: colors.fg },
  stepNum: { fontSize: fontSize(11), fontWeight: "800", color: colors.muted },
  stepNumOn: { color: "#FFF" },
  stepLabel: { color: colors.muted, fontWeight: "600" },
  stepLabelOn: { color: colors.fg },
  body: { paddingHorizontal: scale(16), paddingTop: verticalScale(16) },
  block: { gap: moderateScale(10) },
  blockTitle: { fontWeight: "800", color: colors.fg, marginBottom: verticalScale(4) },
  empty: { color: colors.muted, marginTop: verticalScale(16), textAlign: "center" },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
    padding: moderateScale(12),
    borderRadius: moderateScale(16),
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  rowCardOn: {
    borderColor: colors.fg,
    backgroundColor: "#FFF",
  },
  avatar: { width: scale(48), height: scale(48), borderRadius: moderateScale(24) },
  rowInfo: { flex: 1, minWidth: 0 },
  rowTitle: { fontWeight: "700", color: colors.fg },
  rowMeta: { marginTop: verticalScale(2), color: colors.muted },
  price: { fontWeight: "800", color: colors.fg },
  dayRow: { gap: moderateScale(8), paddingVertical: verticalScale(4) },
  dayChip: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  dayChipOn: { backgroundColor: colors.fg },
  dayText: { fontWeight: "700", color: colors.fg },
  dayTextOn: { color: "#FFF" },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: moderateScale(8),
    marginTop: verticalScale(12),
  },
  slotChip: {
    minWidth: scale(72),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(12),
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  slotChipOn: { backgroundColor: colors.fg },
  slotText: { fontWeight: "700", color: colors.fg },
  slotTextOn: { color: "#FFF" },
  summary: {
    borderRadius: moderateScale(16),
    backgroundColor: colors.surface,
    padding: moderateScale(14),
    gap: moderateScale(12),
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: moderateScale(12),
  },
  summaryLabel: { color: colors.muted, fontWeight: "600", fontSize: fontSize(13) },
  summaryValue: {
    flex: 1,
    textAlign: "right",
    color: colors.fg,
    fontWeight: "700",
    fontSize: fontSize(13),
  },
  summaryBold: { fontSize: fontSize(15), fontWeight: "800" },
  footer: {
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
  cta: {
    backgroundColor: colors.fg,
    borderRadius: moderateScale(16),
    minHeight: verticalScale(52),
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: "#FFF", fontWeight: "800" },
});
