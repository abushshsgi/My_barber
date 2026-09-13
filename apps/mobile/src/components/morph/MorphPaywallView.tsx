import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeBottom, safeTop } from "../../lib/safe-area";
import {
  isPlanUpgrade,
  type SubscriptionPlan,
} from "../../api/subscriptions";
import { useAuth } from "../../auth/AuthContext";
import { useSubscriptions } from "../../hooks/useSubscriptions";
import { pickFeatureLabel, pickPlanName } from "../../lib/plan-labels";
import type { PaywallReason } from "../../lib/morph-return";
import { morphFont } from "../../theme/morph-font";
import { colors } from "../../theme/colors";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = {
  reason?: PaywallReason;
  onClose: () => void;
  onSuccess: () => void;
  onNeedLogin: () => void;
  onOpenReferral?: () => void;
};

function pickCards(plans: SubscriptionPlan[]): SubscriptionPlan[] {
  return [...plans].sort((a, b) => a.sort_order - b.sort_order);
}

function planQuotaLine(
  plan: SubscriptionPlan,
  t: (key: string, opts?: Record<string, string | number>) => string,
): string {
  const parts = [t("morph.paywall.quotaTryOn", { count: plan.morph_ai_monthly })];
  if ((plan.morph_chat_tokens_monthly ?? 0) > 0) {
    parts.push(t("morph.paywall.quotaChat"));
  }
  if (plan.morph_studio_monthly > 0) {
    parts.push(t("morph.paywall.quotaStudio", { count: plan.morph_studio_monthly }));
  }
  return parts.join(" · ");
}

export function MorphPaywallView({
  reason = "subscription",
  onClose,
  onSuccess,
  onNeedLogin,
  onOpenReferral,
}: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const numberLocale = lang.startsWith("ru") ? "ru-RU" : "uz-UZ";
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { plans, me, loading, busyCode, subscribeWallet, activeCode } = useSubscriptions();
  const [error, setError] = useState<string | null>(null);

  const cards = useMemo(() => pickCards(plans), [plans]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (selected && cards.some((p) => p.code === selected)) return;
    const next =
      cards.find((p) => isPlanUpgrade(p.code, activeCode) && p.highlight)?.code ||
      cards.find((p) => isPlanUpgrade(p.code, activeCode))?.code ||
      cards[0]?.code ||
      null;
    if (next !== selected) setSelected(next);
  }, [activeCode, cards, selected]);

  const selectedPlan = cards.find((p) => p.code === selected) ?? cards[0] ?? null;
  const canBuy = Boolean(
    selectedPlan && isPlanUpgrade(selectedPlan.code, activeCode) && !busyCode,
  );
  const savePct = me?.welcome_offer?.eligible ? me.welcome_offer.discount_pct : 0;
  const saveOn = (code: string) =>
    savePct > 0 && (me?.welcome_offer?.plans?.includes(code) ?? true);

  const features = (selectedPlan?.features ?? []).filter((f) => f.included !== false);
  const chatBlocked =
    typeof me?.usage?.morph_chat_tokens_remaining === "number" &&
    me.usage.morph_chat_tokens_remaining < 200;
  const refGenOn =
    !chatBlocked &&
    (me?.referral_generation_enabled ?? me?.access?.referral_generation_enabled ?? true);
  const credits = me?.referral_credits ?? me?.access?.referral_credits ?? 0;

  const titleKey =
    chatBlocked
      ? "morph.paywall.titleChat"
      : reason === "limit"
        ? "morph.paywall.titleLimit"
        : reason === "studio"
          ? "morph.paywall.titleStudio"
          : "morph.paywall.titleSubscribe";

  const onBuy = async () => {
    if (!selectedPlan) return;
    if (!isAuthenticated) {
      onNeedLogin();
      return;
    }
    if (!canBuy) return;
    setError(null);
    const res = await subscribeWallet(selectedPlan.code);
    if (res.ok) {
      onSuccess();
      return;
    }
    setError(res.message);
  };

  const ctaDisabled = Boolean(busyCode) || (!canBuy && isAuthenticated);
  const bottomPad = Math.max(insets.bottom, 12);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={[styles.topBar, { paddingTop: safeTop(insets.top, 8) }]}>
        <View style={styles.topBarSide}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
          >
            <Ionicons name="close" size={18} color={colors.fg} />
          </Pressable>
        </View>
        <Text style={styles.topTitle} numberOfLines={1}>
          Morf AI
        </Text>
        <View style={styles.topBarSide} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{t(titleKey)}</Text>
        <Text style={styles.lead}>{t("morph.paywall.subtitle")}</Text>

        {(me?.usage && (reason === "limit" || me.has_active)) || (refGenOn && credits > 0) ? (
          <View style={styles.metaRow}>
            {me?.usage && (reason === "limit" || me.has_active) ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>
                  {chatBlocked
                    ? t("morph.paywall.usageChat", {
                        used: me.usage.morph_chat_tokens_used ?? 0,
                        limit: me.usage.morph_chat_tokens_limit ?? 0,
                      })
                    : t("morph.paywall.usage", {
                        used: me.usage.morph_ai_used,
                        limit: me.usage.morph_ai_limit,
                      })}
                </Text>
              </View>
            ) : null}
            {refGenOn && credits > 0 ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>
                  {t("morph.paywall.credits", { count: credits })}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {loading && cards.length === 0 ? (
          <ActivityIndicator color={colors.fg} style={styles.loader} />
        ) : (
          <View style={styles.planList}>
            {cards.map((plan) => {
              const on = plan.code === selectedPlan?.code;
              const isCurrent = activeCode === plan.code;
              const popular = Boolean(plan.highlight) && !isCurrent;
              const discount = saveOn(plan.code);

              return (
                <Pressable
                  key={plan.code}
                  onPress={() => setSelected(plan.code)}
                  style={({ pressed }) => [
                    styles.planCard,
                    on && styles.planCardOn,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                >
                  <View style={styles.planLeft}>
                    <View style={[styles.radio, on && styles.radioOn]}>
                      {on ? <View style={styles.radioDot} /> : null}
                    </View>
                    <View style={styles.planCopy}>
                      <View style={styles.planNameRow}>
                        <Text style={[styles.planName, on && styles.planNameOn]}>
                          {pickPlanName(plan, lang)}
                        </Text>
                        {popular ? (
                          <View style={styles.badgeHot}>
                            <Text style={styles.badgeHotText}>{t("morph.paywall.popular")}</Text>
                          </View>
                        ) : null}
                        {isCurrent ? (
                          <View style={styles.badgeNow}>
                            <Text style={styles.badgeNowText}>
                              {t("morph.paywall.currentPlan")}
                            </Text>
                          </View>
                        ) : null}
                        {discount ? (
                          <View style={styles.badgeSave}>
                            <Text style={styles.badgeSaveText}>
                              {t("morph.paywall.savePct", { pct: savePct })}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.planQuota} numberOfLines={2}>
                        {planQuotaLine(plan, t)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.planPriceCol}>
                    <Text style={[styles.planPrice, on && styles.planPriceOn]}>
                      {plan.price_uzs.toLocaleString(numberLocale)}
                    </Text>
                    <Text style={styles.planUnit}>
                      {t("morph.paywall.currencyShort")}/{t("morph.paywall.monthShort")}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {selectedPlan ? (
          <View style={styles.featCard}>
            <Text style={styles.featTitle}>{t("morph.paywall.featuresTitle")}</Text>
            <Text style={styles.featSub}>{t("morph.paywall.billedMonthly")}</Text>
            <View style={styles.featList}>
              {(features.length
                ? features
                : [{ key: "ai", label_uz: t("morph.paywall.fallbackFeature") }]
              ).map((item) => (
                <View key={item.key} style={styles.featRow}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.fg} />
                  <Text style={styles.featText}>{pickFeatureLabel(item, lang)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!canBuy && selectedPlan && activeCode === selectedPlan.code && reason === "limit" ? (
          <Text style={styles.maxHint}>{t("morph.paywall.maxPlanLimit")}</Text>
        ) : null}

        {refGenOn ? <Text style={styles.orHint}>{t("morph.paywall.orReferral")}</Text> : null}
      </ScrollView>

      <View style={[styles.sticky, { paddingBottom: bottomPad }]}>
        <Pressable
          onPress={() => void onBuy()}
          disabled={ctaDisabled}
          style={({ pressed }) => [
            styles.cta,
            ctaDisabled && styles.ctaOff,
            pressed && !ctaDisabled && styles.pressed,
          ]}
          accessibilityRole="button"
        >
          {busyCode ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.ctaText}>
                {isAuthenticated
                  ? t("morph.paywall.cta", {
                      plan: selectedPlan ? pickPlanName(selectedPlan, lang) : "Plus",
                    })
                  : t("morph.paywall.ctaLogin")}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </Pressable>

        {refGenOn && onOpenReferral ? (
          <Pressable
            onPress={onOpenReferral}
            style={({ pressed }) => [styles.referralBtn, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.referralText}>{t("morph.paywall.referralCta")}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(6),
  },
  topBarSide: {
    width: scale(40),
  },
  topTitle: {
    ...morphFont,
    flex: 1,
    textAlign: "center",
    fontSize: fontSize(15),
    fontWeight: "700",
    color: colors.fg,
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(20),
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.82,
  },
  scroll: {
    flex: 1,
  },
  body: {
    paddingHorizontal: scale(18),
    paddingBottom: verticalScale(28),
  },
  title: {
    ...morphFont,
    marginTop: verticalScale(8),
    fontSize: fontSize(28),
    lineHeight: fontSize(34),
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.8,
  },
  lead: {
    ...morphFont,
    marginTop: verticalScale(8),
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    color: colors.muted,
  },
  orHint: {
    ...morphFont,
    marginTop: verticalScale(18),
    textAlign: "center",
    fontSize: fontSize(12),
    lineHeight: fontSize(17),
    fontWeight: "600",
    color: colors.muted,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: moderateScale(8),
    marginTop: verticalScale(14),
  },
  metaChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(999),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.12)",
  },
  metaChipText: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "600",
    color: colors.fg,
  },
  loader: {
    marginTop: verticalScale(48),
  },
  planList: {
    marginTop: verticalScale(20),
    gap: moderateScale(10),
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: moderateScale(12),
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(18),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(14),
    borderWidth: 1.5,
    borderColor: "rgba(17,17,17,0.1)",
  },
  planCardOn: {
    borderColor: "#111111",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  planLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: moderateScale(12),
  },
  radio: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    borderWidth: 1.5,
    borderColor: "rgba(17,17,17,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: verticalScale(2),
  },
  radioOn: {
    borderColor: "#111111",
  },
  radioDot: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: "#111111",
  },
  planCopy: {
    flex: 1,
    minWidth: 0,
    gap: moderateScale(4),
  },
  planNameRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: moderateScale(6),
  },
  planName: {
    ...morphFont,
    fontSize: fontSize(16),
    fontWeight: "700",
    color: colors.fg,
    letterSpacing: -0.3,
  },
  planNameOn: {
    fontWeight: "800",
  },
  planQuota: {
    ...morphFont,
    fontSize: fontSize(12),
    lineHeight: fontSize(16),
    color: colors.muted,
  },
  planPriceCol: {
    alignItems: "flex-end",
  },
  planPrice: {
    ...morphFont,
    fontSize: fontSize(16),
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.4,
  },
  planPriceOn: {
    fontSize: fontSize(17),
  },
  planUnit: {
    ...morphFont,
    marginTop: verticalScale(2),
    fontSize: fontSize(11),
    fontWeight: "600",
    color: colors.muted,
  },
  badgeHot: {
    backgroundColor: "#111111",
    borderRadius: moderateScale(6),
    paddingHorizontal: scale(7),
    paddingVertical: verticalScale(3),
  },
  badgeHotText: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "800",
    color: "#FFFFFF",
  },
  badgeNow: {
    backgroundColor: "#F4F4F5",
    borderRadius: moderateScale(6),
    paddingHorizontal: scale(7),
    paddingVertical: verticalScale(3),
  },
  badgeNowText: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "700",
    color: colors.fg,
  },
  badgeSave: {
    backgroundColor: "#F5E6D8",
    borderRadius: moderateScale(6),
    paddingHorizontal: scale(7),
    paddingVertical: verticalScale(3),
  },
  badgeSaveText: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "800",
    color: "#9A5220",
  },
  featCard: {
    marginTop: verticalScale(18),
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(18),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.1)",
  },
  featTitle: {
    ...morphFont,
    fontSize: fontSize(15),
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.2,
  },
  featSub: {
    ...morphFont,
    marginTop: verticalScale(4),
    marginBottom: verticalScale(12),
    fontSize: fontSize(12),
    color: colors.muted,
  },
  featList: {
    gap: moderateScale(10),
  },
  featRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: moderateScale(10),
  },
  featText: {
    ...morphFont,
    flex: 1,
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    color: colors.fg,
  },
  error: {
    ...morphFont,
    marginTop: verticalScale(14),
    fontSize: fontSize(12),
    lineHeight: fontSize(16),
    color: "#B91C1C",
  },
  maxHint: {
    ...morphFont,
    marginTop: verticalScale(12),
    fontSize: fontSize(12),
    lineHeight: fontSize(16),
    color: colors.muted,
  },
  sticky: {
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(12),
    backgroundColor: "#FAFAFA",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(17,17,17,0.08)",
    gap: moderateScale(8),
  },
  cta: {
    minHeight: verticalScale(52),
    borderRadius: moderateScale(16),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: moderateScale(8),
    paddingHorizontal: scale(16),
    backgroundColor: "#111111",
  },
  ctaOff: {
    opacity: 0.4,
  },
  ctaText: {
    ...morphFont,
    color: "#FFFFFF",
    fontSize: fontSize(15),
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  referralBtn: {
    minHeight: verticalScale(44),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(14),
  },
  referralText: {
    ...morphFont,
    fontSize: fontSize(14),
    fontWeight: "700",
    color: colors.fg,
    textDecorationLine: "underline",
  },
});
