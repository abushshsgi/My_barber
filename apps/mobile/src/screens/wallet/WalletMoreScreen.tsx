import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useWalletMe } from "../../hooks/useWallet";
import type { WalletStackParamList } from "../../navigation/WalletStack";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletMore">;

const INK = "#1A1A1A";
const MUTED = "#9CA3AF";
const SOFT_BG = "#F7F5F2";
const CARD_SHADOW = {
  shadowColor: "#B8A99A",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 20,
  elevation: 4,
};

type GridItem = {
  key: keyof WalletStackParamList;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
};

const GRID: GridItem[] = [
  {
    key: "WalletTopUp",
    title: "To'ldirish",
    subtitle: "Balansni oshirish",
    icon: "add-circle-outline",
    tone: "#FDE68A",
  },
  {
    key: "WalletGift",
    title: "O'tkazma",
    subtitle: "Do'stga yuborish",
    icon: "paper-plane-outline",
    tone: "#C7D2FE",
  },
  {
    key: "WalletGifts",
    title: "Olingan sovg'alar",
    subtitle: "Kelgan sovg'alar",
    icon: "gift-outline",
    tone: "#FBCFE8",
  },
  {
    key: "WalletTransactions",
    title: "Tarix",
    subtitle: "Kirim va chiqim",
    icon: "receipt-outline",
    tone: "#BBF7D0",
  },
  {
    key: "WalletRequisites",
    title: "Mening kartam",
    subtitle: "Rekvizitlar",
    icon: "card-outline",
    tone: "#A5F3FC",
  },
  {
    key: "WalletQrPay",
    title: "QR to'lov",
    subtitle: "Skaner orqali",
    icon: "qr-code-outline",
    tone: "#F5D0C5",
  },
  {
    key: "WalletLimits",
    title: "Limitlar",
    subtitle: "Kunlik cheklov",
    icon: "speedometer-outline",
    tone: "#E9D5FF",
  },
  {
    key: "WalletAlerts",
    title: "Bildirishnomalar",
    subtitle: "Hamyon signalari",
    icon: "notifications-outline",
    tone: "#FED7AA",
  },
];

function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return "0.00";
  return Math.round(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function maskWallet(raw?: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `•••• ${digits.slice(-4)}`;
}

/** Ko'proq — balans + 2 ustunli grid (wallet home palitrasi). */
export function WalletMoreScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const me = useWalletMe();
  const [hidden, setHidden] = useState(false);

  const balanceText = useMemo(
    () => (hidden ? "••••••" : formatMoney(me.balance)),
    [hidden, me.balance],
  );

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <LinearGradient
          colors={["#F8E8DC", "#F3E4F0", "#E8EEF8", "#F7F5F2"]}
          locations={[0, 0.35, 0.7, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 8 }, CARD_SHADOW]}
        >
          <View style={styles.header}>
            <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()} hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color={INK} />
            </Pressable>
            <Text style={styles.headerTitle}>Ko'proq</Text>
            <Pressable
              style={styles.iconBtn}
              onPress={() => navigation.navigate("WalletRequisites")}
              hitSlop={8}
            >
              <Ionicons name="card-outline" size={20} color={INK} />
            </Pressable>
          </View>

          <View style={styles.balanceBlock}>
            {me.loading && !me.wallet ? (
              <ActivityIndicator color={INK} />
            ) : (
              <Pressable onPress={() => setHidden((v) => !v)} style={styles.balancePress}>
                <Text style={styles.balance}>{balanceText}</Text>
                <Ionicons
                  name={hidden ? "eye-off-outline" : "eye-outline"}
                  size={16}
                  color={MUTED}
                  style={{ marginLeft: 8, marginBottom: 4 }}
                />
              </Pressable>
            )}
            <Text style={styles.balanceLabel}>Hamyon balansi</Text>
            <Pressable onPress={() => navigation.navigate("WalletRequisites")}>
              <Text style={styles.walletHint}>{maskWallet(me.walletNumber)}</Text>
            </Pressable>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <Text style={styles.section}>Amallar</Text>
          <View style={styles.grid}>
            {GRID.map((item) => (
              <Pressable
                key={item.key}
                style={[styles.tile, CARD_SHADOW]}
                onPress={() => navigation.navigate(item.key as never)}
              >
                <View style={[styles.tileIcon, { backgroundColor: item.tone }]}>
                  <Ionicons name={item.icon} size={22} color={INK} />
                </View>
                <Text style={styles.tileTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.tileSub} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SOFT_BG },
  scroll: { paddingBottom: 28 },
  hero: {
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingBottom: 22,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.55)",
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
  balanceBlock: { alignItems: "center", paddingBottom: 4 },
  balancePress: { flexDirection: "row", alignItems: "flex-end" },
  balance: {
    fontSize: 36,
    fontWeight: "800",
    color: INK,
    letterSpacing: -1,
  },
  balanceLabel: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
    color: MUTED,
  },
  walletHint: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: INK,
    letterSpacing: 1.2,
    opacity: 0.55,
  },
  content: { paddingHorizontal: 16, marginTop: 22 },
  section: {
    marginBottom: 12,
    fontSize: 12,
    fontWeight: "700",
    color: MUTED,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  tile: {
    width: "47.5%",
    flexGrow: 1,
    minWidth: "45%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 14,
    gap: 6,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: INK,
    letterSpacing: -0.2,
  },
  tileSub: {
    fontSize: 11,
    color: MUTED,
    fontWeight: "500",
  },
});
