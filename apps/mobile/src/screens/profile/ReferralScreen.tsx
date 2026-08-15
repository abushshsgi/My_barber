import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  claimReferralTrial,
  fetchMyReferral,
  type ReferralInfo,
} from "../../api/referrals";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import type { MorphStackParamList } from "../../navigation/MorphStack";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import { colors } from "../../theme/colors";

type Props =
  | NativeStackScreenProps<ProfileStackParamList, "Referrals">
  | NativeStackScreenProps<MorphStackParamList, "Referrals">;

export function ReferralScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setInfo(await fetchMyReferral());
    } catch {
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const onCopy = async () => {
    if (!info?.code) return;
    await Clipboard.setStringAsync(info.code);
    showToast("Kod nusxalandi");
  };

  const onShare = async () => {
    if (!info) return;
    const message =
      `Morf AI — mening taklif kodim: ${info.code}\n` +
      `Ro'yxatdan o'tganda kodni kiriting.\n${info.invite_url}`;
    try {
      await Share.share({ message, title: "Morf AI referal" });
    } catch {
      /* ignore */
    }
  };

  const onClaim = async () => {
    if (!info?.trial?.eligible || info.trial.granted) return;
    setBusy(true);
    try {
      const next = await claimReferralTrial();
      setInfo(next);
      showToast(next.claimed ? "Sinov ochildi" : "Sinov olinmadi");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Xato");
    } finally {
      setBusy(false);
    }
  };

  const credits = info?.referral_credits ?? 0;
  const invites = info?.invites ?? [];

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <StatusBar style="dark" />
      <NativeHeader title="Do'stlarni taklif" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>1 referal = 1 generatsiya</Text>
          <Text style={styles.heroTitle}>Do&apos;stingizni chaqiring — kredit oling</Text>
          <Text style={styles.heroSub}>
            Yangi foydalanuvchi sizning kodingiz bilan kirsa, sizga 1 Morph AI generatsiya
            krediti beriladi. Yoki obuna oling — cheklovsiz ishlang.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#111" style={{ marginTop: 24 }} />
        ) : info ? (
          <>
            <View style={styles.creditRow}>
              <View style={styles.creditCard}>
                <Text style={styles.creditLabel}>Kreditlar</Text>
                <Text style={styles.creditValue}>{credits}</Text>
              </View>
              <View style={styles.creditCard}>
                <Text style={styles.creditLabel}>Takliflar</Text>
                <Text style={styles.creditValue}>{info.invite_count}</Text>
              </View>
            </View>

            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>Sizning kodingiz</Text>
              <Text style={styles.codeValue}>{info.code}</Text>
              <View style={styles.codeActions}>
                <Pressable
                  onPress={() => void onCopy()}
                  style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                >
                  <Ionicons name="copy-outline" size={16} color="#111" />
                  <Text style={styles.secondaryText}>Nusxa</Text>
                </Pressable>
                <Pressable
                  onPress={() => void onShare()}
                  style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                >
                  <Ionicons name="share-outline" size={16} color="#FFF" />
                  <Text style={styles.primaryText}>Ulashish</Text>
                </Pressable>
              </View>
            </View>

            {info.trial ? (
              <View style={styles.trialCard}>
                <Text style={styles.trialTitle}>Bonus: 3 do&apos;st → 7 kun Starter</Text>
                <Text style={styles.trialSub}>
                  Progress: {info.trial.progress}/{info.trial.required}
                  {info.trial.granted ? " · Sinov ochilgan" : ""}
                </Text>
                <View style={styles.trialTrack}>
                  <View
                    style={[
                      styles.trialFill,
                      {
                        width: `${Math.min(
                          100,
                          (info.trial.progress / Math.max(1, info.trial.required)) * 100,
                        )}%`,
                      },
                    ]}
                  />
                </View>
                {info.trial.eligible && !info.trial.granted ? (
                  <Pressable
                    onPress={() => void onClaim()}
                    disabled={busy}
                    style={({ pressed }) => [styles.claimBtn, pressed && styles.pressed]}
                  >
                    {busy ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.claimText}>Sinovni olish</Text>
                    )}
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <Text style={styles.listTitle}>Taklif qilinganlar</Text>
            {invites.length === 0 ? (
              <Text style={styles.empty}>Hali hech kim kodingiz bilan kirmagan.</Text>
            ) : (
              invites.map((row) => (
                <View key={row.id} style={styles.inviteRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(row.full_name || "?").slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inviteName}>{row.full_name}</Text>
                    <Text style={styles.inviteMeta}>
                      {row.phone_masked || "—"}
                      {row.badge ? ` · ${row.badge}` : ""}
                    </Text>
                  </View>
                  <Text style={styles.inviteBonus}>+1</Text>
                </View>
              ))
            )}
          </>
        ) : (
          <Text style={styles.empty}>Referal ma&apos;lumot yuklanmadi.</Text>
        )}
      </ScrollView>
      {toast ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  hero: { gap: 8, marginBottom: 4 },
  heroKicker: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "700",
    color: "#111",
    backgroundColor: "#FFF1E8",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
  },
  heroTitle: { fontSize: 24, fontWeight: "800", color: "#111", letterSpacing: -0.5 },
  heroSub: { fontSize: 14, lineHeight: 20, color: "#71717A" },
  creditRow: { flexDirection: "row", gap: 10 },
  creditCard: {
    flex: 1,
    backgroundColor: "#F4F4F5",
    borderRadius: 16,
    padding: 14,
  },
  creditLabel: { fontSize: 12, fontWeight: "600", color: "#71717A" },
  creditValue: { marginTop: 4, fontSize: 28, fontWeight: "800", color: "#111" },
  codeCard: {
    backgroundColor: "#111",
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  codeLabel: { fontSize: 12, fontWeight: "600", color: "#A1A1AA" },
  codeValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 3,
  },
  codeActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 11,
  },
  secondaryText: { fontSize: 14, fontWeight: "700", color: "#111" },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#3F3F46",
    borderRadius: 12,
    paddingVertical: 11,
  },
  primaryText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  trialCard: {
    backgroundColor: "#F4F4F5",
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  trialTitle: { fontSize: 14, fontWeight: "700", color: "#111" },
  trialSub: { fontSize: 12, color: "#71717A" },
  trialTrack: { height: 6, borderRadius: 999, backgroundColor: "#E4E4E7", overflow: "hidden" },
  trialFill: { height: "100%", backgroundColor: "#111" },
  claimBtn: {
    marginTop: 4,
    backgroundColor: "#111",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 12,
  },
  claimText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  listTitle: { marginTop: 8, fontSize: 13, fontWeight: "700", color: "#71717A" },
  empty: { fontSize: 13, color: "#A1A1AA" },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E4E4E7",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "700", color: "#111" },
  inviteName: { fontSize: 14, fontWeight: "600", color: "#111" },
  inviteMeta: { fontSize: 12, color: "#71717A" },
  inviteBonus: { fontSize: 13, fontWeight: "800", color: "#16A34A" },
  toast: {
    position: "absolute",
    bottom: 28,
    alignSelf: "center",
    backgroundColor: "#111",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  toastText: { color: "#FFF", fontWeight: "600", fontSize: 13 },
  pressed: { opacity: 0.82 },
});
