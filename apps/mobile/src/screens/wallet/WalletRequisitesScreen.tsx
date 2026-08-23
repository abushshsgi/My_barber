import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../auth/AuthContext";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useWalletMe } from "../../hooks/useWallet";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import { NativeHeader } from "../../components/ui/NativeHeader";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletRequisites">;

function formatWalletNumber(raw: string): string {
  const digits = raw.replace(/\s+/g, "");
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

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
  const walletNumber = me.walletNumber ? formatWalletNumber(me.walletNumber) : "—";

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

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + 12 }]}>
      <NativeHeader title="Rekvizitlar" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Hamyon raqami, shaxsiy ism-familya va karta egasi maʼlumotlari.
        </Text>

        {me.loading && !me.wallet ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#5B4ED6" />
        ) : (
          <View style={styles.card}>
            <Row
              label="Hamyon raqami"
              value={walletNumber}
              onCopy={() => void copy(me.walletNumber, "number")}
              copied={copied === "number"}
            />
            <View style={styles.divider} />
            <Row
              label="Ism familiya"
              value={fullName}
              onCopy={() => void copy(fullName, "name")}
              copied={copied === "name"}
            />
            <View style={styles.divider} />
            <Row
              label="Karta egasi"
              value={cardholder}
              onCopy={() => void copy(cardholder, "holder")}
              copied={copied === "holder"}
            />
          </View>
        )}

        {me.error ? <Text style={styles.err}>{me.error}</Text> : null}
      </ScrollView>
    </View>
  );
}

function Row({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      <Pressable style={styles.copyBtn} onPress={onCopy} hitSlop={8}>
        <Ionicons
          name={copied ? "checkmark" : "copy-outline"}
          size={18}
          color={copied ? "#16A34A" : "#5B4ED6"}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  body: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  lead: {
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.08)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    color: "#94A3B8",
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: 0.2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(15,23,42,0.08)",
  },
  copyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  err: {
    marginTop: 16,
    color: "#DC2626",
    fontSize: 13,
    textAlign: "center",
  },
});
