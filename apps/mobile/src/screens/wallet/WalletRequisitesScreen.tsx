import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useState } from "react";
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
import { useAuth } from "../../auth/AuthContext";
import { WalletPlasticCard } from "../../components/wallet/WalletPlasticCard";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useWalletMe } from "../../hooks/useWallet";
import { formatSomLabel } from "../../lib/wallet-format";
import type { WalletStackParamList } from "../../navigation/WalletStack";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletRequisites">;

/** Rekvizitlar — karta + nusxa / ulashish. */
export function WalletRequisitesScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const me = useWalletMe();
  const [copied, setCopied] = useState<string | null>(null);

  const fullName = useMemo(() => {
    const fromParts = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
    return fromParts || user?.full_name?.trim() || "—";
  }, [user]);

  const cardholder = me.card?.cardholder_name?.trim() || fullName;
  const walletRaw = me.walletNumber || "";

  const copy = useCallback(async (value: string, key: string) => {
    if (!value || value === "—") return;
    try {
      await Clipboard.setStringAsync(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* ignore */
    }
  }, []);

  const onShare = useCallback(async () => {
    if (!walletRaw) return;
    try {
      await Share.share({
        message: `Mening Mysaloon hamyon raqamim: ${walletRaw}`,
        title: "Hamyon rekvizitlari",
      });
    } catch {
      /* ignore */
    }
  }, [walletRaw]);

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + 12 }]}>
      <LinearGradient colors={["#111827", "#1F2937", "#F7F5F2"]} locations={[0, 0.35, 0.55]} style={styles.topBg}>
        <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Mening kartam</Text>
          <Pressable style={styles.backBtn} onPress={() => void onShare()} hitSlop={8}>
            <Ionicons name="share-outline" size={20} color="#FFF" />
          </Pressable>
        </View>

        <View style={styles.cardPad}>
          {me.loading && !me.wallet ? (
            <ActivityIndicator color="#FFF" style={{ marginVertical: 48 }} />
          ) : (
            <WalletPlasticCard
              balance={me.balance}
              cardholderName={cardholder}
              walletNumber={walletRaw}
            />
          )}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>Rekvizitlar</Text>

        <View style={styles.panel}>
          <InfoRow
            icon="person-outline"
            label="Karta egasi"
            value={cardholder}
            onCopy={() => void copy(cardholder, "holder")}
            copied={copied === "holder"}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="card-outline"
            label="Hamyon raqami"
            value={walletRaw || "—"}
            onCopy={() => void copy(walletRaw, "number")}
            copied={copied === "number"}
            mono
          />
          <View style={styles.divider} />
          <InfoRow
            icon="wallet-outline"
            label="Balans"
            value={formatSomLabel(me.balance)}
          />
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.actionBtn} onPress={() => void copy(walletRaw, "number")}>
            <Ionicons name="copy-outline" size={18} color="#111" />
            <Text style={styles.actionText}>
              {copied === "number" ? "Nusxa olindi" : "Nusxa olish"}
            </Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, styles.actionDark]} onPress={() => void onShare()}>
            <Ionicons name="share-social-outline" size={18} color="#FFF" />
            <Text style={[styles.actionText, { color: "#FFF" }]}>Ulashish</Text>
          </Pressable>
        </View>

        {me.error ? <Text style={styles.err}>{me.error}</Text> : null}
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  onCopy,
  copied,
  mono,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onCopy?: () => void;
  copied?: boolean;
  mono?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color="#111" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, mono && styles.mono]} numberOfLines={2}>
          {value}
        </Text>
      </View>
      {onCopy ? (
        <Pressable onPress={onCopy} hitSlop={8} style={styles.copyMini}>
          <Ionicons
            name={copied ? "checkmark" : "copy-outline"}
            size={16}
            color={copied ? "#16A34A" : "#6B7280"}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7F5F2" },
  topBg: { paddingBottom: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
    color: "#FFF",
  },
  cardPad: { paddingHorizontal: 16, marginBottom: 8 },
  body: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28 },
  section: {
    marginBottom: 10,
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
  panel: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    paddingVertical: 4,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: { fontSize: 11, fontWeight: "600", color: "#9CA3AF" },
  infoValue: { marginTop: 2, fontSize: 15, fontWeight: "700", color: "#111" },
  mono: { letterSpacing: 0.6, fontSize: 13 },
  copyMini: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginLeft: 66,
  },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionDark: { backgroundColor: "#111" },
  actionText: { fontSize: 14, fontWeight: "700", color: "#111" },
  err: { marginTop: 12, color: "#DC2626", textAlign: "center" },
});
