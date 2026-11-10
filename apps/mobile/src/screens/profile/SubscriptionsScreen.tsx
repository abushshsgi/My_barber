import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  isPlanUpgrade,
  nextUpgradeCode,
} from "../../api/subscriptions";
import { PaymeCheckoutView } from "../../components/payme/PaymeCheckoutView";
import { PaymePaySheet } from "../../components/payme/PaymePaySheet";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useSubscriptions } from "../../hooks/useSubscriptions";
import { pickFeatureLabel, pickPlanName } from "../../lib/plan-labels";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import { colors } from "../../theme/colors";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<ProfileStackParamList, "Subscriptions">;

function RemainRow({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const { t } = useTranslation();
  const safeLimit = limit > 0 ? limit : 1;
  const ratio = Math.min(1, Math.max(0, used / safeLimit));
  const left = Math.max(0, safeLimit - used);
  return (
    <View style={styles.remain}>
      <View style={styles.remainTop}>
        <Text style={styles.remainLabel}>{label}</Text>
        <Text style={styles.remainCount}>{t("profile.leftCount", { count: left })}</Text>
      </View>
      <View style={styles.remainTrack}>
        <View style={[styles.remainFill, { width: `${Math.round(ratio * 100)}%` }]} />
      </View>
    </View>
  );
}

function taglineKey(code: string): string {
  if (code === "plus") return "morph.paywall.taglinePlus";
  if (code === "pro") return "morph.paywall.taglinePro";
  return "morph.paywall.taglineStarter";
}

export function SubscriptionsScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  useHideTabBar();
  const {
    plans,
    me,
    loading,
    error,
    busyCode,
    refresh,
    startPayme,
    paymeCheckout,
    closePayme,
    onPaymePaid,
    returnFromPayme,
    activeCode,
  } = useSubscriptions();
  const [toast, setToast] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [pickedUpgrade, setPickedUpgrade] = useState<string | null>(null);
  const paidAlerted = useRef(false);
  const sub = me?.subscription;
  const nextCode = me?.has_active ? nextUpgradeCode(activeCode) : null;
  const shopPlans = plans.filter((plan) => plan.code !== "free" && plan.purchasable !== false);
  const upgradeChoices = me?.has_active
    ? shopPlans.filter(
        (plan) =>
          (plan.code === "plus" || plan.code === "pro") && isPlanUpgrade(plan.code, activeCode),
      )
    : shopPlans;
  const selectedUpgrade =
    upgradeChoices.find((plan) => plan.code === pickedUpgrade) ??
    (me?.has_active
      ? upgradeChoices.find((plan) => plan.code === nextCode)
      : upgradeChoices.find((plan) => plan.code === "starter")) ??
    upgradeChoices[0] ??
    null;
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    setPickedUpgrade(null);
  }, [activeCode]);

  const onSubscribe = (code: string) => {
    setPendingCode(code);
  };

  const onPayFromSheet = async () => {
    if (!pendingCode) return;
    const res = await startPayme(pendingCode);
    if (!res.ok) {
      Alert.alert("Payme", res.message);
      return;
    }
    setPendingCode(null);
  };

  useEffect(() => {
    if (paymeCheckout?.orderId) paidAlerted.current = false;
  }, [paymeCheckout?.orderId]);

  const showPaid = () => {
    if (paidAlerted.current) return;
    paidAlerted.current = true;
    setToast(t("profile.payConfirmed"));
    Alert.alert(t("profile.payConfirmedTitle"), t("profile.payConfirmed"));
  };

  const handlePaid = async () => {
    await onPaymePaid();
    showPaid();
  };

  const handleReturnToApp = async () => {
    const result = await returnFromPayme();
    if (result === "paid") showPaid();
  };

  const usage = me?.usage;
  const isCancelled = Boolean(
    me?.has_active && (me.status === "cancelled" || sub?.status === "cancelled" || sub?.cancelled_at),
  );
  const canCancel = Boolean(me?.can_cancel ?? sub?.can_cancel);
  const currentName = me?.has_active && sub
    ? sub.plan
      ? pickPlanName(sub.plan, lang)
      : sub.plan_code.toUpperCase()
    : me?.current_plan
      ? pickPlanName(me.current_plan, lang)
      : "Free";
  const moneyLocale = lang.startsWith("ru") ? "ru-RU" : lang.startsWith("en") ? "en-US" : "uz-UZ";
  const offerFeatures = selectedUpgrade?.features ?? [];

  return (
    <View style={styles.root}>
      <NativeHeader
        title={me?.has_active ? t("profile.manage") : t("profile.subscriptions")}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.fit}>
        <View style={styles.now}>
          <View style={styles.nowTop}>
            <Text style={styles.nowEyebrow}>{t("profile.subCurrent")}</Text>
            {canCancel ? (
              <Pressable
                onPress={() => navigation.navigate("CancelSubscription")}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={styles.nowCancel}>{t("profile.cancelCta")}</Text>
              </Pressable>
            ) : (
              <Text style={styles.nowStatus}>
                {me?.has_active
                  ? isCancelled
                    ? t("profile.subCancelledActive")
                    : t("profile.subActive")
                  : "Free"}
              </Text>
            )}
          </View>
          <Text style={styles.nowName} numberOfLines={1}>
            {currentName}
          </Text>
          {me?.has_active ? (
            <Text style={styles.nowDays} numberOfLines={1}>
              {t("profile.subDaysLeft", { count: sub?.days_remaining ?? me.days_remaining ?? 0 })}
            </Text>
          ) : null}
          {usage ? (
            <View style={styles.nowMeters}>
              <RemainRow
                label={t("profile.meterAi")}
                used={usage.morph_ai_used}
                limit={usage.morph_ai_limit || 1}
              />
              {typeof usage.morph_chat_tokens_limit === "number" ? (
                <RemainRow
                  label={t("profile.meterChat")}
                  used={usage.morph_chat_tokens_used ?? 0}
                  limit={usage.morph_chat_tokens_limit}
                />
              ) : null}
            </View>
          ) : null}
        </View>

        {error ? (
          <Pressable onPress={refresh} style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </Pressable>
        ) : null}

        {loading && plans.length === 0 ? (
          <ActivityIndicator color={colors.fg} />
        ) : selectedUpgrade ? (
          <>
            {upgradeChoices.length > 1 ? (
              <View style={styles.tabs}>
                {upgradeChoices.map((plan) => {
                  const on = plan.code === selectedUpgrade.code;
                  return (
                    <Pressable
                      key={plan.code}
                      onPress={() => setPickedUpgrade(plan.code)}
                      style={[styles.tab, on && styles.tabOn]}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: on }}
                    >
                      <Text style={[styles.tabText, on && styles.tabTextOn]}>
                        {pickPlanName(plan, lang)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.offer}>
              <Text style={styles.offerName}>{pickPlanName(selectedUpgrade, lang)}</Text>
              <Text style={styles.offerTag} numberOfLines={1}>
                {t(taglineKey(selectedUpgrade.code))}
              </Text>
              <View style={styles.priceRow}>
                <Text style={styles.offerPrice}>
                  {selectedUpgrade.price_uzs.toLocaleString(moneyLocale)}
                </Text>
                <Text style={styles.offerUnit}>
                  {t("morph.paywall.currencyShort")} / {t("morph.paywall.monthShort")}
                </Text>
              </View>
              <View style={styles.divider} />
              <Text style={styles.includes}>{t("morph.paywall.includes")}</Text>
              <View style={styles.feats}>
                {offerFeatures.map((feature) => {
                  const included = feature.included !== false;
                  return (
                    <View key={feature.key} style={styles.featRow}>
                      <Ionicons
                        name={included ? "checkmark-circle" : "close-circle"}
                        size={17}
                        color={included ? colors.fg : colors.muted}
                      />
                      <Text
                        numberOfLines={1}
                        style={[styles.featText, !included && styles.featOff]}
                      >
                        {pickFeatureLabel(feature, lang)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <Pressable
              onPress={() => onSubscribe(selectedUpgrade.code)}
              disabled={isCancelled || busyCode === selectedUpgrade.code}
              style={[styles.payCta, (isCancelled || busyCode === selectedUpgrade.code) && styles.payCtaOff]}
              accessibilityRole="button"
            >
              {busyCode === selectedUpgrade.code ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.payCtaText}>
                    {isCancelled ? t("profile.upgradeWait") : t("morph.paywall.ctaCards")}
                  </Text>
                  {isCancelled ? null : (
                    <Ionicons name="arrow-forward" size={18} color="#FFF" />
                  )}
                </>
              )}
            </Pressable>
          </>
        ) : me?.has_active ? (
          <Text style={styles.stillPremium}>{t("profile.highestPlan")}</Text>
        ) : null}

        {toast ? <Text style={styles.toast}>{toast}</Text> : null}
      </View>

      <PaymePaySheet
        visible={Boolean(pendingCode) && !paymeCheckout}
        busy={Boolean(busyCode)}
        onClose={() => setPendingCode(null)}
        onPay={() => void onPayFromSheet()}
      />
      <PaymeCheckoutView
        visible={Boolean(paymeCheckout)}
        checkoutUrl={paymeCheckout?.checkoutUrl ?? null}
        orderId={paymeCheckout?.orderId ?? null}
        onClose={closePayme}
        onPaid={handlePaid}
        onReturnToApp={() => void handleReturnToApp()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  fit: {
    flex: 1,
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(12),
    gap: verticalScale(8),
  },
  now: {
    borderRadius: moderateScale(16),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    gap: verticalScale(4),
  },
  nowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  nowEyebrow: {
    fontSize: fontSize(12),
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.muted,
  },
  nowStatus: { fontSize: fontSize(14), fontWeight: "700", color: colors.fg },
  nowCancel: { fontSize: fontSize(14), fontWeight: "700", color: colors.muted },
  nowName: { fontSize: fontSize(22), fontWeight: "800", color: colors.fg },
  nowDays: { fontSize: fontSize(14), fontWeight: "600", color: colors.muted },
  nowMeters: { marginTop: verticalScale(6), gap: verticalScale(8) },
  remain: { gap: 4 },
  remainTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  remainLabel: { fontSize: fontSize(15), fontWeight: "700", color: colors.fg },
  remainCount: { fontSize: fontSize(15), fontWeight: "700", color: colors.fg },
  remainTrack: {
    height: verticalScale(5),
    borderRadius: 999,
    backgroundColor: colors.promo,
    overflow: "hidden",
  },
  remainFill: { height: "100%", borderRadius: 999, backgroundColor: colors.fg },
  tabs: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 3,
    backgroundColor: colors.promo,
  },
  tab: {
    flex: 1,
    minHeight: verticalScale(34),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  tabOn: { backgroundColor: colors.fg },
  tabText: { fontSize: fontSize(16), fontWeight: "600", color: colors.muted },
  tabTextOn: { fontWeight: "800", color: "#FFF" },
  offer: {
    borderRadius: moderateScale(18),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
  },
  offerName: { fontSize: fontSize(24), fontWeight: "800", color: colors.fg },
  offerTag: { marginTop: 2, fontSize: fontSize(14), color: colors.muted },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: verticalScale(4) },
  offerPrice: { fontSize: fontSize(32), lineHeight: fontSize(36), fontWeight: "800", color: colors.fg, letterSpacing: -0.8 },
  offerUnit: { fontSize: fontSize(15), fontWeight: "600", color: colors.muted },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: verticalScale(8) },
  includes: {
    fontSize: fontSize(12),
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 4,
  },
  feats: { gap: 3 },
  featRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featText: { flex: 1, fontSize: fontSize(15), lineHeight: fontSize(20), fontWeight: "500", color: colors.fg },
  featOff: { color: colors.muted },
  payCta: {
    marginTop: "auto",
    minHeight: verticalScale(48),
    borderRadius: 999,
    backgroundColor: colors.fg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  payCtaOff: { opacity: 0.45 },
  payCtaText: { fontSize: fontSize(16), fontWeight: "800", color: "#FFF" },
  scroll: { flex: 1, minHeight: 0 },
  content: { padding: moderateScale(16), paddingBottom: verticalScale(72), gap: moderateScale(12) },
  subtitle: {
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: colors.muted,
    marginBottom: verticalScale(4),
  },
  currentCard: {
    backgroundColor: colors.fg,
    borderRadius: moderateScale(18),
    padding: moderateScale(16),
    gap: moderateScale(6),
  },
  currentTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(4),
  },
  currentLabel: {
    fontSize: fontSize(12),
    fontWeight: "700",
    color: "rgba(255,255,255,0.65)",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statusChip: {
    borderRadius: 999,
    maxWidth: "62%",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
  },
  statusOn: { backgroundColor: "rgba(255,255,255,0.18)" },
  statusOff: { backgroundColor: "rgba(255,255,255,0.1)" },
  statusText: { fontSize: fontSize(11), fontWeight: "700" },
  statusTextOn: { color: "#FFF" },
  statusTextOff: { color: "rgba(255,255,255,0.7)" },
  currentPlan: {
    fontSize: fontSize(22),
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -0.3,
  },
  currentMeta: { fontSize: fontSize(13), color: "rgba(255,255,255,0.7)" },
  emptyCurrent: {
    marginTop: verticalScale(4),
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    color: "rgba(255,255,255,0.75)",
  },
  usageBox: {
    marginTop: verticalScale(10),
    paddingTop: verticalScale(10),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.2)",
    gap: moderateScale(4),
  },
  usageLine: { fontSize: fontSize(12), color: "rgba(255,255,255,0.8)", fontWeight: "600" },
  sectionTitle: {
    marginTop: verticalScale(8),
    fontSize: fontSize(17),
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.3,
  },
  card: {
    borderRadius: moderateScale(18),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    padding: moderateScale(16),
    gap: moderateScale(12),
  },
  cardHighlight: {
    borderColor: "rgba(10,10,10,0.2)",
    backgroundColor: "#FAFAFA",
  },
  cardActive: {
    borderColor: colors.fg,
    borderWidth: 2,
  },
  badge: {
    position: "absolute",
    top: verticalScale(12),
    right: scale(12),
    borderRadius: 999,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    zIndex: 2,
  },
  badgeDark: { backgroundColor: colors.fg },
  badgeSoft: { backgroundColor: "rgba(10,10,10,0.08)" },
  badgeText: { fontSize: fontSize(10), fontWeight: "800", color: "#FFF", letterSpacing: 0.4 },
  badgeTextSoft: { color: colors.fg },
  cardHead: { flexDirection: "row", alignItems: "center", gap: moderateScale(12), paddingRight: scale(64) },
  glyph: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(12),
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeadText: { flex: 1 },
  planName: { fontSize: fontSize(18), fontWeight: "800", color: colors.fg },
  planPeriod: { marginTop: verticalScale(2), fontSize: fontSize(12), color: colors.muted },
  price: { fontSize: fontSize(24), fontWeight: "800", color: colors.fg, letterSpacing: -0.4 },
  priceSuffix: { fontSize: fontSize(14), fontWeight: "600", color: colors.muted },
  features: { gap: moderateScale(8) },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: moderateScale(10) },
  check: {
    width: scale(20),
    height: scale(20),
    borderRadius: moderateScale(10),
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkOff: { backgroundColor: colors.surface },
  featureText: { flex: 1, fontSize: fontSize(13), lineHeight: fontSize(18), color: colors.fg },
  featureOff: { color: colors.muted, textDecorationLine: "line-through" },
  cta: {
    marginTop: verticalScale(4),
    minHeight: verticalScale(48),
    borderRadius: moderateScale(14),
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: { backgroundColor: colors.surface },
  ctaBusy: { opacity: 0.7 },
  ctaText: { fontSize: fontSize(14), fontWeight: "800", color: "#FFF" },
  ctaTextDisabled: { color: colors.muted },
  errorBox: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(12),
    padding: moderateScale(12),
    gap: moderateScale(8),
  },
  errorText: { fontSize: fontSize(12), color: colors.muted },
  retry: {
    alignSelf: "flex-start",
    backgroundColor: colors.fg,
    borderRadius: 999,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
  },
  retryText: { color: "#FFF", fontSize: fontSize(12), fontWeight: "700" },
  toast: { textAlign: "center", color: colors.muted, fontSize: fontSize(12), marginTop: verticalScale(8) },
  stillPremium: {
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: colors.muted,
    marginTop: verticalScale(-4),
  },
  cancelBtn: {
    marginTop: verticalScale(12),
    minHeight: verticalScale(44),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: { fontSize: fontSize(13), fontWeight: "700", color: "#FFF" },
  manageCard: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(18),
    borderWidth: 1,
    borderColor: colors.border,
    padding: moderateScale(16),
    gap: moderateScale(4),
  },
  manageTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(6),
  },
  manageEyebrow: {
    fontSize: fontSize(11),
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.muted,
  },
  manageStatus: { fontSize: fontSize(12), fontWeight: "700", color: colors.fg },
  managePlan: {
    fontSize: fontSize(22),
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.3,
  },
  endsLabel: {
    marginTop: verticalScale(10),
    fontSize: fontSize(12),
    fontWeight: "700",
    color: colors.muted,
  },
  endsDate: { fontSize: fontSize(20), fontWeight: "800", color: colors.fg },
  endsMeta: { fontSize: fontSize(13), color: colors.muted, lineHeight: fontSize(18) },
  meterList: { marginTop: verticalScale(12), gap: moderateScale(10) },
  meter: { gap: moderateScale(6) },
  meterTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  meterLabel: { fontSize: fontSize(13), fontWeight: "700", color: colors.fg },
  meterCount: { fontSize: fontSize(13), fontWeight: "700", color: colors.fg },
  meterTrack: {
    height: verticalScale(6),
    borderRadius: 999,
    backgroundColor: colors.promo,
    overflow: "hidden",
  },
  meterFill: { height: "100%", borderRadius: 999, backgroundColor: colors.fg },
  cancelBtnLight: {
    marginTop: verticalScale(12),
    minHeight: verticalScale(44),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnLightText: { fontSize: fontSize(13), fontWeight: "700", color: colors.fg },
  upgradeCard: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(18),
    borderWidth: 1,
    borderColor: colors.border,
    padding: moderateScale(14),
    gap: moderateScale(8),
  },
  upgradeCardPro: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },
  upgradeTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: moderateScale(12),
  },
  upgradeEyebrow: {
    flex: 1,
    fontSize: fontSize(11),
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  upgradeName: { fontSize: fontSize(22), fontWeight: "800", letterSpacing: -0.4 },
  upgradePrice: { fontSize: fontSize(16), fontWeight: "800" },
  upgradePer: { fontSize: fontSize(12), fontWeight: "600" },
  upgradeChips: { gap: moderateScale(4) },
  upgradeChipText: { fontSize: fontSize(13), fontWeight: "600", lineHeight: fontSize(18) },
  upgradeMissing: { fontSize: fontSize(12), lineHeight: fontSize(17) },
  upgradeBtn: {
    marginTop: verticalScale(2),
    minHeight: verticalScale(42),
    borderRadius: 999,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(16),
  },
  upgradeBtnLight: { backgroundColor: "#FFFFFF" },
  upgradeBtnOff: { opacity: 0.45 },
  upgradeBtnText: { fontSize: fontSize(15), fontWeight: "800", color: "#FFF" },
  upgradeBtnTextDark: { color: "#111111" },
  switchRow: { flexDirection: "row", gap: moderateScale(8) },
  switchChip: {
    flex: 1,
    minHeight: verticalScale(40),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(12),
  },
  switchChipOn: { backgroundColor: colors.fg, borderColor: colors.fg },
  switchText: { fontSize: fontSize(14), fontWeight: "800", color: colors.fg },
  switchTextOn: { color: "#FFFFFF" },
  pitch: {
    borderRadius: moderateScale(12),
    backgroundColor: colors.promo,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    gap: moderateScale(4),
  },
  pitchPro: { backgroundColor: "rgba(255,255,255,0.1)" },
  pitchText: { fontSize: fontSize(14), lineHeight: fontSize(20), fontWeight: "700" },
  pitchCount: { fontSize: fontSize(11), fontWeight: "800", letterSpacing: 0.4 },
});
