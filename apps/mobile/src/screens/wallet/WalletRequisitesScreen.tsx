import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useCallback, useMemo, useState, type ReactNode } from "react";
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
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useWalletMe } from "../../hooks/useWallet";
import { formatSomLabel } from "../../lib/wallet-format";
import type { WalletStackParamList } from "../../navigation/WalletStack";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletRequisites">;

const INK = "#1A1A1A";
const MUTED = "#8A8A8E";
const SOFT_BG = "#F7F5F2";
const ICON_BG = "#F0EEEA";

function groupNumber(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (!d) return "—";
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

/** Mening kartam — soft list layout (plastic cardsiz). */
export function WalletRequisitesScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const me = useWalletMe();
  const [copied, setCopied] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const fullName = useMemo(() => {
    const fromParts = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
    return fromParts || user?.full_name?.trim() || "—";
  }, [user]);

  const cardholder = me.card?.cardholder_name?.trim() || fullName;
  const walletRaw = me.walletNumber || "";
  const masked = walletRaw
    ? `•••• •••• •••• ${walletRaw.replace(/\D/g, "").slice(-4) || "----"}`
    : "—";
  const displayNumber = revealed ? groupNumber(walletRaw) : masked;

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
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={INK} />
        </Pressable>
        <Text style={styles.headerTitle}>Mening kartam</Text>
        <Pressable style={styles.iconBtn} onPress={() => void onShare()} hitSlop={8}>
          <Ionicons name="share-outline" size={18} color={INK} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {me.loading && !me.wallet ? (
          <ActivityIndicator color={INK} style={{ marginVertical: 40 }} />
        ) : (
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>Hamyon raqami</Text>
            <Text style={styles.heroNumber}>{displayNumber}</Text>
            <Text style={styles.heroBal}>{formatSomLabel(me.balance)}</Text>
            {me.isFrozen ? (
              <View style={styles.frozenChip}>
                <Ionicons name="snow-outline" size={14} color={INK} />
                <Text style={styles.frozenText}>Muzlatilgan</Text>
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.list}>
          <Row
            icon="card-outline"
            title="Karta ma'lumotlari"
            subtitle="Raqam, egasi va balans"
            trailing={
              <Pressable onPress={() => setRevealed((v) => !v)} hitSlop={8} style={styles.eyeBtn}>
                <Ionicons name={revealed ? "eye-off-outline" : "eye-outline"} size={18} color={MUTED} />
              </Pressable>
            }
            onPress={() => setRevealed((v) => !v)}
          />
          <Divider />
          <Row
            icon="person-outline"
            title="Karta egasi"
            subtitle={cardholder}
            onPress={() => void copy(cardholder, "holder")}
            trailing={
              <Ionicons
                name={copied === "holder" ? "checkmark" : "copy-outline"}
                size={16}
                color={copied === "holder" ? "#16A34A" : MUTED}
              />
            }
          />
          <Divider />
          <Row
            icon="keypad-outline"
            title="Hamyon raqami"
            subtitle={revealed ? groupNumber(walletRaw) : masked}
            onPress={() => void copy(walletRaw, "number")}
            trailing={
              <Ionicons
                name={copied === "number" ? "checkmark" : "copy-outline"}
                size={16}
                color={copied === "number" ? "#16A34A" : MUTED}
              />
            }
          />
        </View>

        <View style={[styles.list, { marginTop: 12 }]}>
          <Row
            icon="share-social-outline"
            title="Ulashish"
            subtitle="Raqamni do'stga yuborish"
            onPress={() => void onShare()}
            chevron
          />
          <Divider />
          <Row
            icon="snow-outline"
            title={me.isFrozen ? "Kartani ochish" : "Kartani muzlatish"}
            subtitle={me.isFrozen ? "Hamyonni yana faollashtirish" : "Har doim ochishingiz mumkin"}
            onPress={() => navigation.navigate("WalletFreeze")}
            chevron
          />
          <Divider />
          <Row
            icon="time-outline"
            title="Tarix"
            subtitle="Kirim va chiqimlar"
            onPress={() => navigation.navigate("WalletTransactions")}
            chevron
          />
        </View>

        {me.error ? <Text style={styles.err}>{me.error}</Text> : null}
      </ScrollView>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function Row({
  icon,
  title,
  subtitle,
  onPress,
  trailing,
  chevron,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress?: () => void;
  trailing?: ReactNode;
  chevron?: boolean;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={INK} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {trailing}
      {chevron ? <Ionicons name="chevron-forward" size={18} color="#D1D5DB" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SOFT_BG, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
    color: INK,
  },
  scroll: { paddingBottom: 28 },
  hero: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  heroLabel: { fontSize: 12, fontWeight: "600", color: MUTED, marginBottom: 8 },
  heroNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: INK,
    letterSpacing: 1.4,
    textAlign: "center",
  },
  heroBal: { marginTop: 10, fontSize: 15, fontWeight: "700", color: MUTED },
  frozenChip: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: ICON_BG,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  frozenText: { fontSize: 12, fontWeight: "700", color: INK },
  list: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: ICON_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 15, fontWeight: "700", color: INK },
  rowSub: { marginTop: 2, fontSize: 12, color: MUTED },
  eyeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginLeft: 68,
  },
  err: { marginTop: 14, color: "#B91C1C", fontSize: 13, textAlign: "center" },
});
