import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useSubscriptions } from "../../hooks/useSubscriptions";
import {
  formatUzs,
  isPlanUpgrade,
  upgradeCtaLabel,
} from "../../api/subscriptions";
import { colors } from "../../theme/colors";

type Props = {
  navigation: {
    goBack: () => void;
  };
};

export function MorphPaywallScreen({ navigation }: Props) {
  useHideTabBar();
  const { plans, me, loading, busyCode, subscribeWallet, activeCode } =
    useSubscriptions();

  const onBuy = async (code: string) => {
    if (!isPlanUpgrade(code, activeCode) && me?.has_active) {
      Alert.alert("Joriy", "Bu tarif allaqachon faol yoki pastroq.");
      return;
    }
    const res = await subscribeWallet(code);
    Alert.alert(res.ok ? "Tayyor" : "Xato", res.message);
    if (res.ok) navigation.goBack();
  };

  return (
    <View style={styles.root}>
      <NativeHeader title="Morph AI tariflar" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.lead}>
          Try-on oylik limiti obuna bilan. Studio Plus/Pro da. To'lov hamyondan.
        </Text>

        {me?.usage ? (
          <View style={styles.usage}>
            <Text style={styles.usageText}>
              Morph AI: {me.usage.morph_ai_used}/{me.usage.morph_ai_limit} (
              {me.usage.morph_ai_remaining} qoldi)
            </Text>
            <Text style={styles.usageText}>
              Studio: {me.usage.morph_studio_used}/{me.usage.morph_studio_limit} (
              {me.usage.morph_studio_remaining} qoldi)
            </Text>
          </View>
        ) : null}

        {loading ? <ActivityIndicator color={colors.fg} /> : null}

        {plans.map((plan) => {
          const active = activeCode === plan.code;
          const busy = busyCode === plan.code;
          return (
            <View key={plan.code} style={[styles.card, plan.highlight && styles.cardHi]}>
              <Text style={styles.planName}>{plan.name_uz}</Text>
              <Text style={styles.price}>{formatUzs(plan.price_uzs)} / oy</Text>
              <Text style={styles.feat}>
                Morph AI: {plan.morph_ai_monthly} · Studio: {plan.morph_studio_monthly}
                {plan.morph_care ? " · Care" : ""}
              </Text>
              <Pressable
                style={[styles.cta, active && styles.ctaActive]}
                disabled={busy || active}
                onPress={() => void onBuy(plan.code)}
              >
                {busy ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.ctaText}>
                    {active
                      ? "Joriy obuna"
                      : upgradeCtaLabel(activeCode, Boolean(me?.has_active))}
                  </Text>
                )}
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  lead: { color: colors.muted, fontSize: 13, lineHeight: 18, marginBottom: 4 },
  usage: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  usageText: { fontWeight: "600", fontSize: 12, color: colors.fg },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 6,
  },
  cardHi: { borderColor: colors.fg, borderWidth: 2 },
  planName: { fontWeight: "800", fontSize: 18, color: colors.fg },
  price: { fontWeight: "700", fontSize: 15, color: colors.fg },
  feat: { color: colors.muted, fontSize: 12, marginBottom: 8 },
  cta: {
    backgroundColor: colors.fg,
    borderRadius: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaActive: { opacity: 0.45 },
  ctaText: { color: "#FFF", fontWeight: "800" },
});
