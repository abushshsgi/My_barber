import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../auth/AuthContext";
import { WalletTransactionReceiptSheet } from "../../components/wallet/WalletTransactionReceiptSheet";
import { TAB_DOCK_CLEARANCE } from "../../hooks/useHideTabBar";
import { useWalletMe, useWalletTransactions } from "../../hooks/useWallet";
import type { WalletTx } from "../../lib/wallet-format";
import type { WalletStackParamList } from "../../navigation/WalletStack";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletHome">;

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
const AVATAR_TONES = ["#F5D0C5", "#C7D2FE", "#BBF7D0", "#FBCFE8", "#FDE68A", "#A5F3FC"];

const QUICK: {
  key: "WalletGift" | "WalletTopUp" | "WalletQrPay" | "WalletRequisites";
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "WalletGift", label: "O'tkazma", icon: "arrow-up-outline" },
  { key: "WalletQrPay", label: "To'lov", icon: "arrow-down-outline" },
  { key: "WalletTopUp", label: "To'ldirish", icon: "add" },
  { key: "WalletRequisites", label: "Ko'proq", icon: "grid-outline" },
];

type QuickContact = { id: string; name: string; short: string };

function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return "0.00";
  return Math.round(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTxTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function txStatusLabel(item: WalletTx): string {
  if (item.kind === "in") return "Qabul";
  if (item.entryType === "topup") return "To'ldirish";
  if (item.entryType.startsWith("gift")) return "Yuborildi";
  return "To'lov";
}

function firstName(full?: string | null): string {
  const clean = (full || "").trim();
  if (!clean) return "do'st";
  return clean.split(/\s+/)[0]!;
}

function initials(title: string): string {
  const clean = title.replace(/^Sovg'a · /, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
  }
  return (clean.charAt(0) || "?").toUpperCase();
}

function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h + id.charCodeAt(i) * (i + 1)) % AVATAR_TONES.length;
  return AVATAR_TONES[h]!;
}

function contactFromTx(item: WalletTx): QuickContact | null {
  const raw =
    item.kind === "out"
      ? item.recipientName || item.title.replace(/^Sovg'a · /, "")
      : item.senderName || item.title.replace(/^Sovg'a · /, "");
  const name = raw.trim();
  if (!name || name.startsWith("Hamyon") || name.startsWith("QR") || name.startsWith("Obuna")) {
    return null;
  }
  const short = name.split(/\s+/)[0]!;
  return { id: item.id, name, short };
}

export function WalletHomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const me = useWalletMe();
  const tx = useWalletTransactions("all");
  const [refreshing, setRefreshing] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [selectedTx, setSelectedTx] = useState<WalletTx | null>(null);

  const recent = tx.items.slice(0, 8);
  const greetName = firstName(user?.first_name || user?.full_name);
  const balanceText = useMemo(
    () => (hidden ? "••••••" : formatMoney(me.balance)),
    [hidden, me.balance],
  );

  const quickContacts = useMemo(() => {
    const seen = new Set<string>();
    const list: QuickContact[] = [];
    for (const item of tx.items) {
      if (!item.entryType.startsWith("gift")) continue;
      const c = contactFromTx(item);
      if (!c) continue;
      const key = c.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(c);
      if (list.length >= 5) break;
    }
    return list;
  }, [tx.items]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    me.refresh();
    tx.refresh();
    setTimeout(() => setRefreshing(false), 700);
  }, [me, tx]);

  useFocusEffect(
    useCallback(() => {
      me.refresh();
      tx.refresh();
    }, [me.refresh, tx.refresh]),
  );

  const requireAuth = useCallback(() => {
    if (isAuthenticated) return true;
    navigation.getParent()?.navigate("Profile" as never);
    return false;
  }, [isAuthenticated, navigation]);

  const goBackSafe = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: TAB_DOCK_CLEARANCE + Math.max(insets.bottom, 8) + 16,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={INK} />
        }
      >
        <LinearGradient
          colors={["#F8E8DC", "#F3E4F0", "#E8EEF8", "#F7F5F2"]}
          locations={[0, 0.35, 0.7, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.heroCard, { paddingTop: Math.max(insets.top, 12) + 8 }, CARD_SHADOW]}
        >
          <View style={styles.header}>
            <Pressable style={styles.profileRow} onPress={goBackSafe} hitSlop={8}>
              <View style={styles.profileAvatar}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.profileImg} contentFit="cover" />
                ) : (
                  <Text style={styles.profileInitials}>{initials(greetName)}</Text>
                )}
              </View>
              <View>
                <Text style={styles.hello}>Salom, {greetName}</Text>
                <Text style={styles.welcome}>Xush kelibsiz</Text>
              </View>
            </Pressable>
            <Pressable
              style={styles.bellBtn}
              onPress={() => navigation.navigate("WalletRequisites")}
              accessibilityLabel="Rekvizitlar"
            >
              <Ionicons name="notifications-outline" size={20} color={INK} />
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
          </View>

          <View style={styles.quickRow}>
            {QUICK.map((item) => (
              <Pressable
                key={item.key}
                style={styles.quickItem}
                onPress={() => {
                  if (!requireAuth()) return;
                  navigation.navigate(item.key);
                }}
              >
                <View style={styles.quickBtn}>
                  <Ionicons name={item.icon} size={22} color={INK} />
                </View>
                <Text style={styles.quickLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Tezkor yuborish</Text>
            <Pressable onPress={() => navigation.navigate("WalletGift")}>
              <Text style={styles.seeAll}>Hammasi</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.contactsRow}
          >
            {quickContacts.map((c) => (
              <Pressable
                key={c.id}
                style={styles.contactItem}
                onPress={() => {
                  if (!requireAuth()) return;
                  navigation.navigate("WalletGift");
                }}
              >
                <View style={[styles.contactAvatar, { backgroundColor: avatarColor(c.id) }]}>
                  <Text style={styles.contactInitials}>{initials(c.name)}</Text>
                </View>
                <Text style={styles.contactName} numberOfLines={1}>
                  {c.short}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.contactItem}
              onPress={() => {
                if (!requireAuth()) return;
                navigation.navigate("WalletGift");
              }}
            >
              <View style={styles.addContact}>
                <Ionicons name="add" size={22} color="#6B7280" />
              </View>
              <Text style={styles.contactName}>Yangi</Text>
            </Pressable>
          </ScrollView>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promoRow}
        >
          <LinearGradient
            colors={["#D4E4F7", "#E8D4F0", "#F5D0E0"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.promoCard}
          >
            <View style={styles.promoTextCol}>
              <Text style={styles.promoTitle}>Sovg'a bonusi</Text>
              <Text style={styles.promoDesc}>
                Do'stlarga sovg'a yuboring — har bir yuborish bilan bonus o'sadi!
              </Text>
            </View>
            <Pressable style={styles.promoGift} onPress={() => navigation.navigate("WalletGifts")}>
              <Ionicons name="gift" size={28} color="#E11D48" />
            </Pressable>
          </LinearGradient>

          <LinearGradient
            colors={["#FDE8D0", "#F5E6D3", "#E8F0E8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.promoCard}
          >
            <View style={styles.promoTextCol}>
              <Text style={styles.promoTitle}>Rekvizitlar</Text>
              <Text style={styles.promoDesc}>
                Hamyon raqami va karta ma'lumotlarini bir joydan ko'ring.
              </Text>
            </View>
            <Pressable
              style={styles.promoGift}
              onPress={() => navigation.navigate("WalletRequisites")}
            >
              <Ionicons name="card-outline" size={26} color="#B45309" />
            </Pressable>
          </LinearGradient>
        </ScrollView>

        <View style={[styles.section, { marginTop: 8 }]}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Tranzaksiyalar</Text>
            <Pressable onPress={() => navigation.navigate("WalletTransactions")}>
              <Text style={styles.seeAll}>Hammasi</Text>
            </Pressable>
          </View>

          {tx.loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color={INK} />
          ) : recent.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.empty}>Hali tranzaksiya yo'q</Text>
              <Pressable style={styles.emptyCta} onPress={() => navigation.navigate("WalletTopUp")}>
                <Text style={styles.emptyCtaText}>To'ldirish</Text>
              </Pressable>
            </View>
          ) : (
            recent.map((item) => (
              <TxRow key={item.id} item={item} onPress={() => setSelectedTx(item)} />
            ))
          )}

          {me.error ? <Text style={styles.err}>{me.error}</Text> : null}
        </View>
      </ScrollView>

      <WalletTransactionReceiptSheet
        tx={selectedTx}
        visible={!!selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </View>
  );
}

function TxRow({ item, onPress }: { item: WalletTx; onPress: () => void }) {
  const out = item.kind === "out";
  return (
    <Pressable style={styles.txRow} onPress={onPress}>
      <View style={[styles.avatar, { backgroundColor: avatarColor(item.id) }]}>
        <Text style={styles.avatarText}>{initials(item.title)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.txTitle} numberOfLines={1}>
          {item.title.replace(/^Sovg'a · /, "")}
        </Text>
        <Text style={styles.txDate}>{formatTxTime(item.createdAt)}</Text>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmt, out ? styles.txOut : styles.txIn]}>
          {out ? "-" : "+"}
          {formatMoney(Math.abs(item.amount))}
        </Text>
        <Text style={styles.txKind}>{txStatusLabel(item)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SOFT_BG },
  heroCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 22,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileImg: { width: 44, height: 44 },
  profileInitials: { fontSize: 15, fontWeight: "700", color: INK },
  hello: { fontSize: 16, fontWeight: "700", color: INK },
  welcome: { marginTop: 2, fontSize: 13, color: MUTED, fontWeight: "400" },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  balanceBlock: { alignItems: "center", marginBottom: 28 },
  balancePress: { flexDirection: "row", alignItems: "flex-end" },
  balance: {
    fontSize: 36,
    fontWeight: "700",
    color: INK,
    letterSpacing: -0.8,
  },
  balanceLabel: {
    marginTop: 6,
    fontSize: 13,
    color: MUTED,
    fontWeight: "500",
  },
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  quickItem: { alignItems: "center", gap: 8, width: 68 },
  quickBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#A89B8C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 3,
  },
  quickLabel: { fontSize: 12, fontWeight: "500", color: "#4B5563", textAlign: "center" },
  section: { paddingHorizontal: 20, marginTop: 18 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: INK },
  seeAll: { fontSize: 13, fontWeight: "500", color: MUTED },
  contactsRow: { gap: 16, paddingRight: 8 },
  contactItem: { alignItems: "center", width: 64, gap: 8 },
  contactAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  contactInitials: { fontSize: 15, fontWeight: "700", color: INK },
  contactName: { fontSize: 12, fontWeight: "500", color: "#4B5563", textAlign: "center" },
  addContact: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  promoRow: { paddingHorizontal: 20, gap: 12, marginTop: 20, paddingBottom: 4 },
  promoCard: {
    width: 280,
    minHeight: 110,
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  promoTextCol: { flex: 1 },
  promoTitle: { fontSize: 16, fontWeight: "700", color: INK, marginBottom: 6 },
  promoDesc: { fontSize: 12, lineHeight: 17, color: "#6B7280", fontWeight: "400" },
  promoGift: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: { alignItems: "center", paddingVertical: 28, gap: 12 },
  empty: { color: MUTED, fontSize: 14 },
  emptyCta: {
    backgroundColor: INK,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  emptyCtaText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  err: { marginTop: 12, color: "#DC2626", fontSize: 13, textAlign: "center" },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "700", fontSize: 14, color: INK },
  txTitle: { fontSize: 15, fontWeight: "600", color: INK },
  txDate: { marginTop: 3, fontSize: 12, color: MUTED },
  txRight: { alignItems: "flex-end" },
  txAmt: { fontSize: 15, fontWeight: "700" },
  txOut: { color: "#EF4444" },
  txIn: { color: "#16A34A" },
  txKind: { marginTop: 3, fontSize: 12, color: MUTED },
});
