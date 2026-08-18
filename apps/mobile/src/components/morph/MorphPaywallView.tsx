import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
import {
  isPlanUpgrade,
  type SubscriptionPlan,
} from "../../api/subscriptions";
import { useAuth } from "../../auth/AuthContext";
import { useSubscriptions } from "../../hooks/useSubscriptions";
import type { PaywallReason } from "../../lib/morph-return";

type Props = {
  reason?: PaywallReason;
  onClose: () => void;
  onSuccess: () => void;
  onNeedLogin: () => void;
  onOpenReferral?: () => void;
};

function planIcon(code: string): keyof typeof Ionicons.glyphMap {
  if (code === "pro") return "diamond-outline";
  if (code === "plus") return "flash-outline";
  return "sparkles-outline";
}

function pickCards(plans: SubscriptionPlan[]): SubscriptionPlan[] {
  return [...plans].sort((a, b) => a.sort_order - b.sort_order);
}

function formatTokenShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

function planQuota(plan: SubscriptionPlan): string {
  const parts = [`Morph AI ${plan.morph_ai_monthly}`];
  const tokens = plan.morph_chat_tokens_monthly ?? 0;
  if (tokens > 0) parts.push(`Chat ${formatTokenShort(tokens)}`);
  if (plan.morph_studio_monthly > 0) parts.push(`Studio ${plan.morph_studio_monthly}`);
  return parts.join(" · ");
}

export function MorphPaywallView({
  reason = "subscription",
  onClose,
  onSuccess,
  onNeedLogin,
  onOpenReferral,
}: Props) {
  const { t } = useTranslation();
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
    setSelected(next);
  }, [activeCode, cards, selected]);

  const selectedPlan = cards.find((p) => p.code === selected) ?? cards[0] ?? null;
  const canBuy = Boolean(
    selectedPlan && isPlanUpgrade(selectedPlan.code, activeCode) && !busyCode,
  );
  const savePct = me?.welcome_offer?.eligible ? me.welcome_offer.discount_pct : 0;
  const saveOn = (code: string) =>
    savePct > 0 && (me?.welcome_offer?.plans?.includes(code) ?? true);

  const titleKey =
    reason === "limit"
      ? "morph.paywall.titleLimit"
      : reason === "studio"
        ? "morph.paywall.titleStudio"
        : "morph.paywall.titleSubscribe";

  const taglineKey =
    selectedPlan?.code === "pro"
      ? "morph.paywall.taglinePro"
      : selectedPlan?.code === "plus"
        ? "morph.paywall.taglinePlus"
        : "morph.paywall.taglineStarter";

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

  const features = (selectedPlan?.features ?? []).filter((f) => f.included !== false);
  const refGenOn =
    me?.referral_generation_enabled ?? me?.access?.referral_generation_enabled ?? true;
  const credits = me?.referral_credits ?? me?.access?.referral_credits ?? 0;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={["#F6F1EC", "#F3F5FA", "#F8EEE8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16) + 12 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
        >
          <Ionicons name="close" size={18} color="#111111" />
        </Pressable>

        <Text style={styles.title}>{t(titleKey)}</Text>
        <Text style={styles.lead}>{t("morph.paywall.subtitle")}</Text>
        {refGenOn ? <Text style={styles.orHint}>{t("morph.paywall.orReferral")}</Text> : null}

        {me?.usage && (reason === "limit" || me.has_active) ? (
          <Text style={styles.usage}>
            {t("morph.paywall.usage", {
              used: me.usage.morph_ai_used,
              limit: me.usage.morph_ai_limit,
            })}
          </Text>
        ) : null}
        {refGenOn && credits > 0 ? (
          <Text style={styles.usage}>
            {t("morph.paywall.credits", {
              count: credits,
            })}
          </Text>
        ) : null}

        <View style={styles.planCard}>
          <Text style={styles.planName}>{selectedPlan?.name_uz ?? "Plus"}</Text>
          <Text style={styles.planTag}>{t(taglineKey)}</Text>

          {loading && cards.length === 0 ? (
            <ActivityIndicator color="#111" style={{ marginVertical: 24 }} />
          ) : (
            <View style={styles.billingRow}>
              {cards.map((plan) => {
                const on = plan.code === selectedPlan?.code;
                const current = activeCode === plan.code;
                const inner = (
                  <Pressable
                    onPress={() => setSelected(plan.code)}
                    style={[styles.billingInner, !on && styles.billingInnerOff]}
                  >
                    <View style={styles.billingTop}>
                      <Ionicons name={planIcon(plan.code)} size={16} color="#111111" />
                      {saveOn(plan.code) ? (
                        <View style={styles.saveBadge}>
                          <Text style={styles.saveText}>
                            {t("morph.paywall.savePct", { pct: savePct })}
                          </Text>
                        </View>
                      ) : current ? (
                        <View style={styles.nowBadge}>
                          <Text style={styles.nowText}>{t("morph.paywall.currentPlan")}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.cardName}>{plan.name_uz}</Text>
                    <Text style={styles.price}>
                      {plan.price_uzs.toLocaleString("uz-UZ")}
                    </Text>
                    <Text style={styles.priceUnit}>
                      {t("morph.paywall.currencyShort")}/{t("morph.paywall.monthShort")}
                    </Text>
                    <Text style={styles.billed}>{t("morph.paywall.billedMonthly")}</Text>
                    <Text style={styles.quota}>{planQuota(plan)}</Text>
                  </Pressable>
                );

                if (on) {
                  return (
                    <LinearGradient
                      key={plan.code}
                      colors={["#6EA8FF", "#FF9A56"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.billingWrapOn}
                    >
                      {inner}
                    </LinearGradient>
                  );
                }
                return (
                  <View key={plan.code} style={styles.billingWrapOff}>
                    {inner}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.featCard}>
          <Text style={styles.featTitle}>{t("morph.paywall.featuresTitle")}</Text>
          {(features.length ? features : [{ key: "ai", label_uz: t("morph.paywall.fallbackFeature") }]).map(
            (item) => (
              <View key={item.key} style={styles.featRow}>
                <View style={styles.check}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
                <Text style={styles.featText}>{item.label_uz}</Text>
              </View>
            ),
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {!canBuy && selectedPlan && activeCode === selectedPlan.code && reason === "limit" ? (
            <Text style={styles.maxHint}>{t("morph.paywall.maxPlanLimit")}</Text>
          ) : null}

          <Pressable
            onPress={() => void onBuy()}
            disabled={Boolean(busyCode) || (!canBuy && isAuthenticated)}
            style={({ pressed }) => [pressed && styles.pressed, { marginTop: 14 }]}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={["#5B9DFF", "#FF8A3D"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[
                styles.cta,
                ((!canBuy && isAuthenticated) || busyCode) && styles.ctaOff,
              ]}
            >
              {busyCode ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.ctaText}>
                  {isAuthenticated
                    ? t("morph.paywall.cta", { plan: selectedPlan?.name_uz ?? "Plus" })
                    : t("morph.paywall.ctaLogin")}
                </Text>
              )}
            </LinearGradient>
          </Pressable>

          {refGenOn && onOpenReferral ? (
            <Pressable
              onPress={onOpenReferral}
              style={({ pressed }) => [styles.referralBtn, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Ionicons name="people-outline" size={16} color="#111111" />
              <Text style={styles.referralText}>{t("morph.paywall.referralCta")}</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F5F4F2",
  },
  body: {
    paddingHorizontal: 20,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  pressed: {
    opacity: 0.82,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -0.6,
    textAlign: "center",
  },
  lead: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#8A8A8E",
    textAlign: "center",
  },
  orHint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#52525B",
    textAlign: "center",
  },
  usage: {
    marginTop: 8,
    fontSize: 12,
    color: "#6B6B70",
    textAlign: "center",
    fontWeight: "600",
  },
  planCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
  },
  planName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -0.3,
  },
  planTag: {
    marginTop: 2,
    fontSize: 12,
    color: "#8A8A8E",
  },
  billingRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  billingWrapOn: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    padding: 2,
  },
  billingWrapOff: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    backgroundColor: "#F2F2F4",
    padding: 2,
  },
  billingInner: {
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 10,
    minHeight: 168,
  },
  billingInnerOff: {
    backgroundColor: "transparent",
  },
  billingTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 22,
  },
  saveBadge: {
    backgroundColor: "#FDE7D2",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  saveText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#C2410C",
  },
  nowBadge: {
    backgroundColor: "#E5E5EA",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  nowText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#3F3F46",
  },
  cardName: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "800",
    color: "#111111",
  },
  price: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -0.4,
  },
  priceUnit: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: "#8A8A8E",
  },
  billed: {
    marginTop: 4,
    fontSize: 11,
    color: "#8A8A8E",
  },
  quota: {
    marginTop: 8,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "600",
    color: "#52525B",
  },
  featCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
  },
  featTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111111",
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  featRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  featText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#1F1F1F",
  },
  error: {
    marginTop: 4,
    marginBottom: 4,
    fontSize: 12,
    lineHeight: 16,
    color: "#B91C1C",
  },
  maxHint: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: "#8A8A8E",
  },
  cta: {
    minHeight: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  ctaOff: {
    opacity: 0.45,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  referralBtn: {
    marginTop: 10,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    backgroundColor: "#FAFAFA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  referralText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111111",
  },
});
