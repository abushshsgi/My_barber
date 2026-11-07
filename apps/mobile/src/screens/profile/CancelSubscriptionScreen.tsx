import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { formatSubDate } from "../../api/subscriptions";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useSubscriptions } from "../../hooks/useSubscriptions";
import { pickPlanName } from "../../lib/plan-labels";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import { colors } from "../../theme/colors";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<ProfileStackParamList, "CancelSubscription">;

export function CancelSubscriptionScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { me, loading, refresh, cancelCurrent } = useSubscriptions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const sub = me?.subscription;
  const endsAt = formatSubDate(
    sub?.expires_at ?? sub?.ends_at ?? me?.expires_at ?? me?.last_subscription?.expires_at,
  );
  const planLabel = sub?.plan
    ? pickPlanName(sub.plan, i18n.language)
    : sub?.plan_code
      ? sub.plan_code.toUpperCase()
      : t("profile.premiumName");
  const isCancelled = Boolean(
    done ||
      (me?.has_active &&
        (me.status === "cancelled" || sub?.status === "cancelled" || sub?.cancelled_at)),
  );
  const canCancel = Boolean(me?.can_cancel ?? sub?.can_cancel) && !done;
  const isExpired =
    !done &&
    !me?.has_active &&
    (me?.status === "expired" ||
      me?.last_subscription?.status === "expired" ||
      me?.last_subscription?.status === "cancelled" ||
      me?.status === "cancelled");

  const onConfirm = async () => {
    if (busy || !canCancel) return;
    setBusy(true);
    setError(null);
    try {
      await cancelCurrent();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profile.cancelFail"));
    } finally {
      setBusy(false);
    }
  };

  const title = isCancelled
    ? t("profile.subCancelledActive")
    : isExpired
      ? t("profile.subExpired")
      : t("profile.cancelTitle");
  const body = isCancelled
    ? t("profile.subCancelledBody", { date: endsAt })
    : isExpired
      ? t("profile.subExpiredBody")
      : t("profile.cancelBody");

  return (
    <View style={styles.root}>
      <NativeHeader title={t("profile.cancelPageTitle")} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && !me ? (
          <ActivityIndicator color={colors.fg} style={{ marginTop: 32 }} />
        ) : (
          <>
            <View style={styles.iconBox}>
              <Ionicons
                name={isCancelled ? "checkmark-circle" : isExpired ? "time-outline" : "pause-circle-outline"}
                size={36}
                color="#FFF"
              />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{body}</Text>

            <View style={styles.facts}>
              <Fact icon="sparkles-outline" text={`${t("profile.premiumName")} · ${planLabel}`} />
              <Fact icon="calendar-outline" text={t("profile.cancelKeepUntil", { date: endsAt })} />
              <Fact icon="refresh-outline" text={t("profile.subAutoRenewOff")} />
              <Fact icon="card-outline" text={t("profile.cancelNoRefund")} />
              <Fact icon="shield-checkmark-outline" text={t("profile.cancelPaymeSafe")} />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {canCancel ? (
              <Pressable
                onPress={() => void onConfirm()}
                disabled={busy}
                style={[styles.primary, busy && styles.busy]}
                accessibilityRole="button"
              >
                {busy ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryText}>{t("profile.cancelConfirm")}</Text>
                )}
              </Pressable>
            ) : isExpired ? (
              <Pressable
                onPress={() => navigation.navigate("Subscriptions")}
                style={styles.primary}
                accessibilityRole="button"
              >
                <Text style={styles.primaryText}>{t("profile.subBuy")}</Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => navigation.goBack()}
              disabled={busy}
              style={styles.secondary}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryText}>{t("profile.cancelBack")}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Fact({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.factRow}>
      <Ionicons name={icon} size={18} color={colors.fg} />
      <Text style={styles.factText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: moderateScale(20),
    paddingBottom: verticalScale(40),
    gap: moderateScale(12),
  },
  iconBox: {
    width: scale(64),
    height: scale(64),
    borderRadius: moderateScale(20),
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(4),
  },
  title: {
    fontSize: fontSize(24),
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.4,
  },
  body: {
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    color: colors.muted,
  },
  facts: {
    marginTop: verticalScale(8),
    backgroundColor: colors.surface,
    borderRadius: moderateScale(16),
    padding: moderateScale(14),
    gap: moderateScale(12),
  },
  factRow: { flexDirection: "row", alignItems: "flex-start", gap: moderateScale(10) },
  factText: {
    flex: 1,
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: colors.fg,
    fontWeight: "600",
  },
  error: { fontSize: fontSize(13), color: "#B42318", fontWeight: "600" },
  primary: {
    marginTop: verticalScale(8),
    minHeight: verticalScale(52),
    borderRadius: moderateScale(14),
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  busy: { opacity: 0.7 },
  primaryText: { fontSize: fontSize(15), fontWeight: "800", color: "#FFF" },
  secondary: {
    minHeight: verticalScale(48),
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { fontSize: fontSize(15), fontWeight: "700", color: colors.fg },
});
