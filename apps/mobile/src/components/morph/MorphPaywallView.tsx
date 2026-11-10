import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeTop } from "../../lib/safe-area";
import {
  isPlanUpgrade,
  type SubscriptionPlan,
} from "../../api/subscriptions";
import { PaymeCheckoutView } from "../payme/PaymeCheckoutView";
import { PaymePaySheet } from "../payme/PaymePaySheet";
import { useAuth } from "../../auth/AuthContext";
import { useSubscriptions } from "../../hooks/useSubscriptions";
import { useMorphAppearance } from "../../lib/MorphAppearanceContext";
import { pickFeatureLabel, pickPlanName } from "../../lib/plan-labels";
import type { PaywallReason } from "../../lib/morph-return";
import { pickPaywallHero } from "../../lib/paywall-copy";
import { TELEGRAM_SUPPORT_URL } from "../../lib/support-contact";
import { morphFont } from "../../theme/morph-font";
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

const HIDDEN_FEATURE_KEYS = new Set(["voice", "family", "badge", "priority", "sos"]);

export function MorphPaywallView({
  reason = "subscription",
  onClose,
  onSuccess,
  onNeedLogin,
  onOpenReferral,
}: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const numberLocale = lang.startsWith("en") ? "en-US" : lang.startsWith("ru") ? "ru-RU" : "uz-UZ";
  const insets = useSafeAreaInsets();
  const { colors: pal, theme } = useMorphAppearance();
  const dark = theme === "dark";
  const { isAuthenticated } = useAuth();
  const {
    plans,
    loading,
    busyCode,
    startPayme,
    paymeCheckout,
    closePayme,
    onPaymePaid,
    returnFromPayme,
    activeCode,
  } = useSubscriptions();
  const [error, setError] = useState<string | null>(null);
  const [paySheetOpen, setPaySheetOpen] = useState(false);
  const heroKind = reason === "limit" ? "chat" : "subscribe";
  const heroKindRef = useRef(heroKind);
  const langRef = useRef(lang);
  heroKindRef.current = heroKind;
  langRef.current = lang;
  const [hero, setHero] = useState(() => pickPaywallHero(heroKind, lang));
  const skipHeroRotate = useRef(true);
  const skipFirstFocus = useRef(true);

  useEffect(() => {
    if (skipHeroRotate.current) {
      skipHeroRotate.current = false;
      return;
    }
    setHero(pickPaywallHero(heroKind, lang));
  }, [heroKind, lang]);

  useFocusEffect(
    useCallback(() => {
      if (skipFirstFocus.current) {
        skipFirstFocus.current = false;
        return;
      }
      setHero(pickPaywallHero(heroKindRef.current, langRef.current));
    }, []),
  );

  const cards = useMemo(() => pickCards(plans), [plans]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (selected && cards.some((p) => p.code === selected)) return;
    const starter = cards.find(
      (p) => p.code === "starter" && isPlanUpgrade(p.code, activeCode),
    )?.code;
    const next =
      starter ||
      cards.find((p) => isPlanUpgrade(p.code, activeCode))?.code ||
      cards[0]?.code ||
      null;
    if (next !== selected) setSelected(next);
  }, [activeCode, cards, selected]);

  const selectedPlan = cards.find((p) => p.code === selected) ?? cards[0] ?? null;
  const canBuy = Boolean(
    selectedPlan && isPlanUpgrade(selectedPlan.code, activeCode) && !busyCode,
  );
  const ctaDisabled = Boolean(busyCode) || (!canBuy && isAuthenticated);
  const bottomPad = Math.max(insets.bottom, 12);

  const openPaySheet = () => {
    if (!selectedPlan) return;
    if (!isAuthenticated) {
      onNeedLogin();
      return;
    }
    if (!canBuy) return;
    setError(null);
    setPaySheetOpen(true);
  };

  const onBuy = async () => {
    if (!selectedPlan) return;
    if (!isAuthenticated) {
      onNeedLogin();
      return;
    }
    if (!canBuy) return;
    setError(null);
    const res = await startPayme(selectedPlan.code);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setPaySheetOpen(false);
  };

  const handlePaid = async () => {
    await onPaymePaid();
    onSuccess();
  };

  const handleReturnToApp = async () => {
    const result = await returnFromPayme();
    if (result === "paid") onSuccess();
  };

  const visibleFeatures = (selectedPlan?.features ?? []).filter(
    (f) => !HIDDEN_FEATURE_KEYS.has(f.key),
  );
  const included = visibleFeatures.filter((f) => f.included !== false);

  return (
    <View style={[styles.root, { backgroundColor: pal.bg, paddingTop: safeTop(insets.top, 4) }]}>
      <StatusBar style={dark ? "light" : "dark"} />

      <View style={styles.topBar}>
        <Pressable
          onPress={onClose}
          style={[styles.backBtn, { backgroundColor: pal.card }]}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
        >
          <Ionicons name="chevron-back" size={20} color={pal.fg} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.heroMarket}>
          <Text style={[styles.kicker, { color: pal.muted }]}>{hero.kicker}</Text>
          <Text style={[styles.titleMarket, { color: pal.fg }]} numberOfLines={2}>
            {hero.title}
          </Text>
          <Text style={[styles.heroSub, { color: pal.muted }]} numberOfLines={2}>
            {hero.subtitle}
          </Text>
        </View>
        {loading && cards.length === 0 ? (
          <ActivityIndicator color={pal.fg} style={{ marginTop: 48 }} />
        ) : (
          <>
            <View style={[styles.tabs, { backgroundColor: pal.cardStrong }]}>
              {cards.map((plan) => {
                const on = plan.code === selectedPlan?.code;
                return (
                  <Pressable
                    key={plan.code}
                    onPress={() => setSelected(plan.code)}
                    style={[
                      styles.tab,
                      on && {
                        backgroundColor: pal.fg,
                      },
                    ]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        { color: on ? pal.bg : pal.muted },
                        on && styles.tabTextOn,
                      ]}
                    >
                      {pickPlanName(plan, lang)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {selectedPlan ? (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: pal.card,
                    borderColor: pal.line,
                  },
                ]}
              >
                {selectedPlan.highlight ? (
                  <View style={[styles.bestBadge, { backgroundColor: pal.fg }]}>
                    <Ionicons name="star" size={11} color={pal.bg} />
                    <Text style={[styles.bestBadgeText, { color: pal.bg }]}>
                      {t("morph.paywall.bestValue")}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.priceRow}>
                  <Text style={[styles.price, { color: pal.fg }]}>
                    {selectedPlan.price_uzs.toLocaleString(numberLocale)}
                  </Text>
                  <Text style={[styles.priceUnit, { color: pal.muted }]}>
                    {t("morph.paywall.currencyShort")} / {t("morph.paywall.monthShort")}
                  </Text>
                </View>

                <ScrollView
                  style={styles.featsScroll}
                  contentContainerStyle={styles.feats}
                  showsVerticalScrollIndicator={false}
                >
                  {included.map((f) => (
                    <View key={f.key} style={styles.featRow}>
                      <Ionicons name="checkmark-circle" size={16} color={pal.fg} />
                      <Text style={[styles.featText, { color: pal.fg }]} numberOfLines={1}>
                        {pickFeatureLabel(f, lang)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View
        style={[
          styles.sticky,
          { backgroundColor: pal.bg, paddingBottom: bottomPad },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.trustRow}>
          <View
            style={[styles.trustChip, { backgroundColor: pal.cardStrong }]}
            accessibilityLabel={t("morph.paywall.autoRenew")}
          >
            <Ionicons name="shield-checkmark-outline" size={14} color={pal.muted} />
            <Text style={[styles.trustText, { color: pal.muted }]} numberOfLines={1}>
              {t("morph.paywall.autoRenewShort")}
            </Text>
          </View>
          <View
            style={[styles.trustChip, { backgroundColor: pal.cardStrong }]}
            accessibilityLabel={t("morph.paywall.cancelAnytime")}
          >
            <Ionicons name="refresh-outline" size={14} color={pal.muted} />
            <Text style={[styles.trustText, { color: pal.muted }]} numberOfLines={1}>
              {t("morph.paywall.cancelAnytimeShort")}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={openPaySheet}
          disabled={ctaDisabled}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: pal.fg },
            ctaDisabled && styles.ctaOff,
            pressed && !ctaDisabled && styles.pressed,
          ]}
        >
          {busyCode ? (
            <ActivityIndicator color={pal.bg} />
          ) : (
            <>
              <Text style={[styles.ctaText, { color: pal.bg }]}>
                {isAuthenticated ? t("morph.paywall.ctaCards") : t("morph.paywall.ctaLogin")}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={pal.bg} />
            </>
          )}
        </Pressable>
        <Pressable
          onPress={() => void Linking.openURL(TELEGRAM_SUPPORT_URL)}
          style={styles.skipBtn}
        >
          <Text style={[styles.skipText, { color: pal.muted }]}>
            {t("morph.paywall.askSupport")}
          </Text>
        </Pressable>
        {onOpenReferral ? (
          <Pressable onPress={onOpenReferral} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: pal.muted }]}>
              {t("morph.paywall.cantPay")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <PaymePaySheet
        visible={paySheetOpen && !paymeCheckout}
        busy={Boolean(busyCode)}
        onClose={() => setPaySheetOpen(false)}
        onPay={() => void onBuy()}
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
  root: { flex: 1 },
  topBar: {
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(6),
    alignItems: "flex-start",
  },
  backBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    paddingHorizontal: scale(16),
    gap: verticalScale(8),
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: verticalScale(12),
  },
  heroIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: { flex: 1, gap: 2 },
  heroMarket: {
    marginBottom: verticalScale(8),
    gap: 2,
  },
  kicker: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  title: {
    ...morphFont,
    fontSize: fontSize(20),
    lineHeight: fontSize(24),
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  titleMarket: {
    ...morphFont,
    fontSize: fontSize(22),
    lineHeight: fontSize(26),
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  heroSub: {
    ...morphFont,
    fontSize: fontSize(15),
    lineHeight: fontSize(20),
    fontWeight: "500",
  },
  tabs: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 4,
  },
  tab: {
    flex: 1,
    minHeight: verticalScale(38),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    ...morphFont,
    fontSize: fontSize(16),
    fontWeight: "600",
  },
  tabTextOn: {
    fontWeight: "800",
  },
  card: {
    borderRadius: moderateScale(22),
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(14),
    paddingBottom: verticalScale(10),
    borderWidth: 1,
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  bestBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  bestBadgeText: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "800",
  },
  planName: {
    ...morphFont,
    fontSize: fontSize(24),
    fontWeight: "800",
  },
  tagline: {
    ...morphFont,
    marginTop: 4,
    fontSize: fontSize(15),
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  price: {
    ...morphFont,
    fontSize: fontSize(38),
    lineHeight: fontSize(42),
    fontWeight: "800",
    letterSpacing: -1.2,
  },
  priceUnit: {
    ...morphFont,
    fontSize: fontSize(16),
    fontWeight: "600",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: verticalScale(10),
    marginBottom: verticalScale(8),
  },
  includes: {
    ...morphFont,
    fontSize: fontSize(13),
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  featsScroll: { flexGrow: 1, flexShrink: 1 },
  feats: { gap: 4, marginTop: verticalScale(8), paddingBottom: 2 },
  featRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  featText: {
    ...morphFont,
    flex: 1,
    fontSize: fontSize(16),
    lineHeight: fontSize(22),
    fontWeight: "500",
  },
  error: {
    ...morphFont,
    marginTop: 12,
    textAlign: "center",
    color: "#EF4444",
    fontSize: fontSize(12),
  },
  sticky: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(8),
    gap: 8,
  },
  trustRow: {
    flexDirection: "row",
    gap: 8,
  },
  trustChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  trustText: {
    ...morphFont,
    flex: 1,
    fontSize: fontSize(13),
    fontWeight: "600",
  },
  cta: {
    minHeight: verticalScale(52),
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaOff: { opacity: 0.4 },
  pressed: { opacity: 0.88 },
  ctaText: {
    ...morphFont,
    fontSize: fontSize(17),
    fontWeight: "800",
  },
  skipBtn: { alignItems: "center", paddingVertical: 2 },
  skipText: {
    ...morphFont,
    fontSize: fontSize(13),
    textDecorationLine: "underline",
  },
});
