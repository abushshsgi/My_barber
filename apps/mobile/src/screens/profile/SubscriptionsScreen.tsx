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
import {
  formatSubDate,
  formatUzs,
  isPlanUpgrade,
  upgradeCtaLabel,
  type SubscriptionPlan,
} from "../../api/subscriptions";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useSubscriptions } from "../../hooks/useSubscriptions";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import { colors } from "../../theme/colors";

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
  const isActive = activeCode === plan.code;
  const canUpgrade = isPlanUpgrade(plan.code, activeCode);
  const blocked = Boolean(activeCode) && !canUpgrade && !isActive;

  let badge: string | null = null;
  if (isActive) badge = "Joriy";
  else if (canUpgrade && activeCode) badge = "Upgrade";
  else if (plan.highlight) badge = "Mashhur";

  const cta = isActive
    ? "Joriy obuna"
    : blocked
      ? "Pastroq tarif"
      : activeCode && canUpgrade
        ? upgradeCtaLabel(activeCode, true)
        : "Hamyondan to'lash";

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
          <Text style={styles.planName}>{plan.name_uz}</Text>
          <Text style={styles.planPeriod}>{plan.period_days} kunlik davr</Text>
        </View>
      </View>

      <Text style={styles.price}>
        {formatUzs(plan.price_uzs)}
        <Text style={styles.priceSuffix}> / oy</Text>
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
                {f.label_uz}
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
      <NativeHeader title="Obunalar" onBack={() => navigation.goBack()} />

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
                {sub.plan?.name_uz || sub.plan_code.toUpperCase()}
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
              {me.welcome_offer.label_uz || `Yangi hisob −${me.welcome_offer.discount_pct}%`}
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
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
    marginBottom: 4,
  },
  currentCard: {
    backgroundColor: colors.fg,
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  currentTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  currentLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.65)",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusOn: { backgroundColor: "rgba(255,255,255,0.18)" },
  statusOff: { backgroundColor: "rgba(255,255,255,0.1)" },
  statusText: { fontSize: 11, fontWeight: "700" },
  statusTextOn: { color: "#FFF" },
  statusTextOff: { color: "rgba(255,255,255,0.7)" },
  currentPlan: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -0.3,
  },
  currentMeta: { fontSize: 13, color: "rgba(255,255,255,0.7)" },
  emptyCurrent: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.75)",
  },
  usageBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.2)",
    gap: 4,
  },
  usageLine: { fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "600" },
  offer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
  },
  offerText: { flex: 1, fontSize: 13, fontWeight: "700", color: colors.fg },
  sectionTitle: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.3,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    padding: 16,
    gap: 12,
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
    top: 12,
    right: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 2,
  },
  badgeDark: { backgroundColor: colors.fg },
  badgeSoft: { backgroundColor: "rgba(10,10,10,0.08)" },
  badgeText: { fontSize: 10, fontWeight: "800", color: "#FFF", letterSpacing: 0.4 },
  badgeTextSoft: { color: colors.fg },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12, paddingRight: 64 },
  glyph: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeadText: { flex: 1 },
  planName: { fontSize: 18, fontWeight: "800", color: colors.fg },
  planPeriod: { marginTop: 2, fontSize: 12, color: colors.muted },
  price: { fontSize: 24, fontWeight: "800", color: colors.fg, letterSpacing: -0.4 },
  priceSuffix: { fontSize: 14, fontWeight: "600", color: colors.muted },
  features: { gap: 8 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkOff: { backgroundColor: colors.surface },
  featureText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.fg },
  featureOff: { color: colors.muted, textDecorationLine: "line-through" },
  cta: {
    marginTop: 4,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: { backgroundColor: colors.surface },
  ctaBusy: { opacity: 0.7 },
  ctaText: { fontSize: 14, fontWeight: "800", color: "#FFF" },
  ctaTextDisabled: { color: colors.muted },
  errorBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  errorText: { fontSize: 12, color: colors.muted },
  retry: {
    alignSelf: "flex-start",
    backgroundColor: colors.fg,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  toast: { textAlign: "center", color: colors.muted, fontSize: 12, marginTop: 8 },
});
