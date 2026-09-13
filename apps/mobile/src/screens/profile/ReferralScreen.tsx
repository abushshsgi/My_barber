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
import { safeBottom, safeTop } from "../../lib/safe-area";
import { fetchMyReferral, type ReferralInfo } from "../../api/referrals";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import type { MorphStackParamList } from "../../navigation/MorphStack";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import { colors } from "../../theme/colors";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props =
  | NativeStackScreenProps<ProfileStackParamList, "Referrals">
  | NativeStackScreenProps<MorphStackParamList, "Referrals">;

export function ReferralScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
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

  const refGenOn = info?.referral_generation_enabled !== false;
  const credits = info?.referral_credits ?? 0;
  const invites = info?.invites ?? [];

  return (
    <View style={[styles.root, { paddingBottom: safeBottom(insets.bottom, 0) }]}>
      <StatusBar style="dark" />
      <NativeHeader title="Do'stlarni taklif" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          {refGenOn ? (
            <Text style={styles.heroKicker}>1 referal = 1 generatsiya</Text>
          ) : null}
          <Text style={styles.heroTitle}>Do&apos;stingizni chaqiring</Text>
          <Text style={styles.heroSub}>
            {refGenOn
              ? "Yangi foydalanuvchi sizning kodingiz bilan kirsa, sizga 1 Morph AI generatsiya krediti beriladi. Yoki obuna oling."
              : "Do'stlaringizni MySaloon ga taklif qiling. Kodingizni ulashing."}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#111" style={{ marginTop: 24 }} />
        ) : info ? (
          <>
            <View style={styles.creditRow}>
              {refGenOn ? (
                <View style={styles.creditCard}>
                  <Text style={styles.creditLabel}>Kreditlar</Text>
                  <Text style={styles.creditValue}>{credits}</Text>
                </View>
              ) : null}
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
                  {refGenOn ? <Text style={styles.inviteBonus}>+1</Text> : null}
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
  content: { padding: moderateScale(16), paddingBottom: verticalScale(40), gap: moderateScale(12) },
  hero: { gap: moderateScale(8), marginBottom: verticalScale(4) },
  heroKicker: {
    alignSelf: "flex-start",
    fontSize: fontSize(11),
    fontWeight: "700",
    color: "#111",
    backgroundColor: "#FFF1E8",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: 999,
    overflow: "hidden",
  },
  heroTitle: { fontSize: fontSize(24), fontWeight: "800", color: "#111", letterSpacing: -0.5 },
  heroSub: { fontSize: fontSize(14), lineHeight: fontSize(20), color: "#71717A" },
  creditRow: { flexDirection: "row", gap: moderateScale(10) },
  creditCard: {
    flex: 1,
    backgroundColor: "#F4F4F5",
    borderRadius: moderateScale(16),
    padding: moderateScale(14),
  },
  creditLabel: { fontSize: fontSize(12), fontWeight: "600", color: "#71717A" },
  creditValue: { marginTop: verticalScale(4), fontSize: fontSize(28), fontWeight: "800", color: "#111" },
  codeCard: {
    backgroundColor: "#111",
    borderRadius: moderateScale(20),
    padding: moderateScale(16),
    gap: moderateScale(10),
  },
  codeLabel: { fontSize: fontSize(12), fontWeight: "600", color: "#A1A1AA" },
  codeValue: {
    fontSize: fontSize(28),
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 3,
  },
  codeActions: { flexDirection: "row", gap: moderateScale(8), marginTop: verticalScale(4) },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(6),
    backgroundColor: "#FFF",
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(11),
  },
  secondaryText: { fontSize: fontSize(14), fontWeight: "700", color: "#111" },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(6),
    backgroundColor: "#3F3F46",
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(11),
  },
  primaryText: { fontSize: fontSize(14), fontWeight: "700", color: "#FFF" },
  listTitle: { marginTop: verticalScale(8), fontSize: fontSize(13), fontWeight: "700", color: "#71717A" },
  empty: { fontSize: fontSize(13), color: "#A1A1AA" },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    paddingVertical: verticalScale(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E4E4E7",
  },
  avatar: {
    width: scale(36),
    height: scale(36),
    borderRadius: moderateScale(18),
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "700", color: "#111" },
  inviteName: { fontSize: fontSize(14), fontWeight: "600", color: "#111" },
  inviteMeta: { fontSize: fontSize(12), color: "#71717A" },
  inviteBonus: { fontSize: fontSize(13), fontWeight: "800", color: "#16A34A" },
  toast: {
    position: "absolute",
    bottom: verticalScale(28),
    alignSelf: "center",
    backgroundColor: "#111",
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    borderRadius: 999,
  },
  toastText: { color: "#FFF", fontWeight: "600", fontSize: fontSize(13) },
  pressed: { opacity: 0.82 },
});
