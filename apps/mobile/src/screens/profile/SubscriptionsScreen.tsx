import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  formatSubDate,
  formatUzs,
  isPlanUpgrade,
  type SubscriptionPlan,
} from "../../api/subscriptions";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useSubscriptions } from "../../hooks/useSubscriptions";
import { pickFeatureLabel, pickLocalizedLabel, pickPlanName } from "../../lib/plan-labels";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import { colors } from "../../theme/colors";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<ProfileStackParamList, "Subscriptions">;

function PlanGlyph({ code }: { code: string }) {
  const name =
    code === "pro" ? "diamond" : code === "plus" ? "sparkles" : "flash";
  return (
    <View style={styles.glyph}>
      <Ionicons name={name as keyof typeof Ionicons.glyphMap} size={20} color="#FFF" />
    </View>
  );
}

function PlanCard({
  plan,
  activeCode,
  busy,
  onSubscribe,
}: {
  plan: SubscriptionPlan;
  activeCode: string | null;
  busy: boolean;
  onSubscribe: (code: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isActive = activeCode === plan.code;
  const canUpgrade = isPlanUpgrade(plan.code, activeCode);
  const blocked = Boolean(activeCode) && !canUpgrade && !isActive;

  let badge: string | null = null;
  if (isActive) badge = t("morph.paywall.currentPlan");
  else if (canUpgrade && activeCode) badge = t("morph.paywall.plansUpgrade", { defaultValue: "Upgrade" });
  else if (plan.highlight) badge = t("morph.paywall.popular");

  const cta = isActive
    ? t("morph.paywall.ctaCurrent")
    : blocked
      ? t("morph.paywall.ctaLower")
      : activeCode && canUpgrade
        ? t("morph.paywall.cta", { plan: pickPlanName(plan, lang) })
        : t("morph.paywall.ctaWallet");

  return (
    <View style={[styles.card, plan.highlight && styles.cardHighlight, isActive && styles.cardActive]}>
      {badge ? (
        <View style={[styles.badge, isActive ? styles.badgeSoft : styles.badgeDark]}>
          <Text style={[styles.badgeText, isActive && styles.badgeTextSoft]}>{badge}</Text>
        </View>
      ) : null}

      <View style={styles.cardHead}>
        <PlanGlyph code={plan.code} />
        <View style={styles.cardHeadText}>
          <Text style={styles.planName}>{pickPlanName(plan, lang)}</Text>
          <Text style={styles.planPeriod}>
            {t("morph.paywall.periodDays", { count: plan.period_days })}
          </Text>
        </View>
      </View>

      <Text style={styles.price}>
        {formatUzs(plan.price_uzs)}
        <Text style={styles.priceSuffix}> / {t("morph.paywall.monthShort")}</Text>
      </Text>

      <View style={styles.features}>
        {plan.features.map((f) => {
          const included = f.included !== false;
          return (
            <View key={f.key} style={styles.featureRow}>
              <View style={[styles.check, !included && styles.checkOff]}>
                <Ionicons
                  name={included ? "checkmark" : "close"}
                  size={12}
                  color={included ? "#FFF" : colors.muted}
                />
              </View>
              <Text style={[styles.featureText, !included && styles.featureOff]}>
                {pickFeatureLabel(f, lang)}
              </Text>
            </View>
          );
        })}
      </View>

      <Pressable
        disabled={isActive || blocked || busy}
        onPress={() => onSubscribe(plan.code)}
        style={[
          styles.cta,
          (isActive || blocked) && styles.ctaDisabled,
          busy && styles.ctaBusy,
        ]}
      >
        {busy ? (
          <ActivityIndicator color={isActive || blocked ? colors.fg : "#FFF"} />
        ) : (
          <Text style={[styles.ctaText, (isActive || blocked) && styles.ctaTextDisabled]}>
            {cta}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

export function SubscriptionsScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { plans, me, loading, error, busyCode, refresh, subscribeWallet, activeCode } =
    useSubscriptions();
  const [toast, setToast] = useState<string | null>(null);

  const onSubscribe = async (code: string) => {
    const res = await subscribeWallet(code);
    if (res.ok) {
      setToast(res.message);
      Alert.alert("Obuna", res.message);
    } else {
      Alert.alert("Xato", res.message);
    }
  };

  const sub = me?.subscription;
  const usage = me?.usage;

  return (
    <View style={styles.root}>
      <NativeHeader title={t("profile.subscriptions")} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        <Text style={styles.subtitle}>
          Morph AI va premium imkoniyatlar. Joriy obuna, tariflar va hamyondan to'lov.
        </Text>

        {/* Joriy obuna */}
        <View style={styles.currentCard}>
          <View style={styles.currentTop}>
            <Text style={styles.currentLabel}>Joriy obuna</Text>
            <View
              style={[
                styles.statusChip,
                me?.has_active ? styles.statusOn : styles.statusOff,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  me?.has_active ? styles.statusTextOn : styles.statusTextOff,
                ]}
              >
                {me?.has_active ? "Faol" : "Faol emas"}
                {sub?.is_trial ? " · Sinov" : ""}
              </Text>
            </View>
          </View>

          {me?.has_active && sub ? (
            <>
              <Text style={styles.currentPlan}>
                {sub.plan ? pickPlanName(sub.plan, lang) : sub.plan_code.toUpperCase()}
              </Text>
              <Text style={styles.currentMeta}>
                {formatUzs(sub.price_uzs)} · {sub.days_remaining ?? me.days_remaining ?? "—"} kun
                qoldi
              </Text>
              <Text style={styles.currentMeta}>
                Tugash: {formatSubDate(sub.ends_at)}
              </Text>
              {usage ? (
                <View style={styles.usageBox}>
                  <Text style={styles.usageLine}>
                    Morph AI: {usage.morph_ai_used}/{usage.morph_ai_limit}
                  </Text>
                  <Text style={styles.usageLine}>
                    Studio: {usage.morph_studio_used}/{usage.morph_studio_limit}
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.emptyCurrent}>
              Yo'q — Morph AI yopiq. Tarif tanlab obuna bo'ling.
            </Text>
          )}
        </View>

        {me?.welcome_offer?.eligible ? (
          <View style={styles.offer}>
            <Ionicons name="gift-outline" size={18} color={colors.fg} />
            <Text style={styles.offerText}>
              {pickLocalizedLabel(
                me.welcome_offer,
                lang,
                `−${me.welcome_offer.discount_pct}%`,
              )}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={refresh} style={styles.retry}>
              <Text style={styles.retryText}>Qayta urinish</Text>
            </Pressable>
          </View>
        ) : null}

        {loading && plans.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={colors.fg} />
        ) : null}

        <Text style={styles.sectionTitle}>Tariflar</Text>

        {plans.map((plan) => (
          <PlanCard
            key={plan.code}
            plan={plan}
            activeCode={activeCode}
            busy={busyCode === plan.code}
            onSubscribe={onSubscribe}
          />
        ))}

        {toast ? <Text style={styles.toast}>{toast}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: moderateScale(16), paddingBottom: verticalScale(40), gap: moderateScale(12) },
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
  offer: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    backgroundColor: colors.surface,
    borderRadius: moderateScale(14),
    padding: moderateScale(12),
  },
  offerText: { flex: 1, fontSize: fontSize(13), fontWeight: "700", color: colors.fg },
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
    backgroundColor: colors.fg,
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
});
