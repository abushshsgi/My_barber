import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WalletPlasticCard } from "../../components/wallet/WalletPlasticCard";
import { NativeBackButton } from "../../components/ui/NativeBackButton";
import { useWalletMe, useWalletTransactions } from "../../hooks/useWallet";
import { formatSomLabel } from "../../lib/wallet-format";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletHome">;

const QUICK = [
  { id: "payments", label: "To'lov", icon: "card-outline" as const, route: "WalletTopUp" as const },
  { id: "bonus", label: "Bonus", icon: "sparkles-outline" as const, route: null },
  { id: "received", label: "Kelgan", icon: "file-tray-outline" as const, route: "WalletGifts" as const },
  { id: "sub", label: "Obuna", icon: "diamond-outline" as const, route: null },
] as const;

export function WalletHomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"all" | "in" | "out">("all");
  const me = useWalletMe();
  const tx = useWalletTransactions(tab);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    me.refresh();
    tx.refresh();
    setTimeout(() => setRefreshing(false), 600);
  }, [me, tx]);

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) }]}>
      <View style={styles.header}>
        <NativeBackButton onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Hamyon</Text>
          <Text style={styles.hint}>Pastga tortib yangilang</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.cardPad}>
          {me.loading && !me.wallet ? (
            <View style={styles.cardSkeleton}>
              <ActivityIndicator color="#FFF" />
            </View>
          ) : (
            <WalletPlasticCard
              balance={me.balance}
              cardholderName={me.card?.cardholder_name}
              walletNumber={me.walletNumber}
            />
          )}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={styles.actionDark}
            onPress={() => navigation.navigate("WalletTopUp")}
          >
            <View style={styles.actionIconDark}>
              <Ionicons name="add" size={22} color="#FFF" />
            </View>
            <View>
              <Text style={styles.actionTitleDark}>To'ldirish</Text>
              <Text style={styles.actionHintDark}>Balansni to'ldiring</Text>
            </View>
          </Pressable>
          <Pressable
            style={styles.actionLight}
            onPress={() => navigation.navigate("WalletGift")}
          >
            <View style={styles.actionIconLight}>
              <Ionicons name="gift-outline" size={20} color={colors.fg} />
            </View>
            <View>
              <Text style={styles.actionTitle}>Sovg'a</Text>
              <Text style={styles.actionHint}>Do'stingizga yuboring</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.quickRow}>
          {QUICK.map((q) => (
            <Pressable
              key={q.id}
              style={styles.quickItem}
              onPress={() => {
                if (q.route) navigation.navigate(q.route);
                else if (q.id === "sub") navigation.getParent()?.navigate("Profile" as never);
              }}
            >
              <View style={styles.quickIcon}>
                <Ionicons name={q.icon} size={18} color={colors.fg} />
              </View>
              <Text style={styles.quickLabel}>{q.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.qrBar} onPress={() => navigation.navigate("WalletQrPay")}>
          <View style={styles.qrIcon}>
            <Ionicons name="qr-code-outline" size={20} color={colors.fg} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.qrTitle}>QR to'lov</Text>
            <Text style={styles.qrHint}>Sartaroshga hamyondan to'lang</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        <View style={styles.newsHead}>
          <Text style={styles.sectionTitle}>Yangiliklar</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.newsRow}>
          <View style={[styles.newsCard, styles.newsDark]}>
            <Ionicons name="calendar-outline" size={18} color="#FFF" />
            <Text style={styles.newsTitleDark}>Balans bilan bron</Text>
            <Text style={styles.newsBodyDark}>Yaqin atrofdagi ustani tanlang — hamyondan to'lang.</Text>
          </View>
          <View style={styles.newsCard}>
            <Ionicons name="sparkles-outline" size={18} color={colors.fg} />
            <Text style={styles.newsTitle}>Pro imtiyozlar</Text>
            <Text style={styles.newsBody}>Obuna bilan AI stil va bonuslar ochiladi.</Text>
          </View>
        </ScrollView>

        <View style={styles.txHead}>
          <Text style={styles.sectionTitle}>Oxirgi harakatlar</Text>
          <Pressable onPress={() => navigation.navigate("WalletTransactions")}>
            <Text style={styles.link}>To'liq tarix</Text>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          {(
            [
              ["all", "Hammasi"],
              ["in", "Kirim"],
              ["out", "Chiqim"],
            ] as const
          ).map(([k, label]) => (
            <Pressable
              key={k}
              style={[styles.tab, tab === k && styles.tabActive]}
              onPress={() => setTab(k)}
            >
              <Text style={[styles.tabText, tab === k && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {tx.loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={colors.fg} />
        ) : tx.items.length === 0 ? (
          <Text style={styles.empty}>Hali harakatlar yo'q</Text>
        ) : (
          tx.items.slice(0, 8).map((item) => (
            <View key={item.id} style={styles.txRow}>
              <View style={styles.txIcon}>
                <Ionicons
                  name={item.kind === "in" ? "arrow-down-outline" : "arrow-up-outline"}
                  size={18}
                  color={colors.fg}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.txTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.txDate}>{item.date}</Text>
              </View>
              <Text style={[styles.txAmt, item.kind === "in" && styles.txAmtIn]}>
                {item.kind === "in" ? "+" : "−"}
                {formatSomLabel(Math.abs(item.amount))}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 18, fontWeight: "800", color: colors.fg },
  hint: { fontSize: 11, color: colors.muted, marginTop: 1 },
  content: { paddingBottom: 40 },
  cardPad: { paddingHorizontal: 16, paddingTop: 4 },
  cardSkeleton: {
    aspectRatio: 1.586,
    borderRadius: 28,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  actionDark: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.fg,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  actionLight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.bg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  actionIconDark: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconLight: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitleDark: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  actionHintDark: { color: "rgba(255,255,255,0.55)", fontSize: 10, marginTop: 2 },
  actionTitle: { color: colors.fg, fontSize: 13, fontWeight: "800" },
  actionHint: { color: colors.muted, fontSize: 10, marginTop: 2 },
  quickRow: {
    marginHorizontal: 16,
    marginTop: 12,
    flexDirection: "row",
    backgroundColor: "rgba(242,242,242,0.85)",
    borderRadius: 22,
    padding: 6,
  },
  quickItem: { flex: 1, alignItems: "center", paddingVertical: 10, gap: 6 },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { fontSize: 10, fontWeight: "700", color: colors.fg },
  qrBar: {
    marginHorizontal: 16,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 12,
  },
  qrIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  qrTitle: { fontSize: 13, fontWeight: "800", color: colors.fg },
  qrHint: { fontSize: 11, color: colors.muted, marginTop: 2 },
  newsHead: { paddingHorizontal: 16, marginTop: 28 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.fg },
  newsRow: { paddingHorizontal: 16, gap: 10, paddingTop: 12 },
  newsCard: {
    width: 200,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
    backgroundColor: colors.bg,
  },
  newsDark: { backgroundColor: colors.fg, borderColor: colors.fg },
  newsTitle: { fontSize: 14, fontWeight: "800", color: colors.fg },
  newsBody: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  newsTitleDark: { fontSize: 14, fontWeight: "800", color: "#FFF" },
  newsBodyDark: { fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 17 },
  txHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    marginTop: 28,
  },
  link: { fontSize: 11, fontWeight: "700", color: colors.muted },
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  tabActive: { backgroundColor: colors.fg },
  tabText: { fontSize: 12, fontWeight: "700", color: colors.fg },
  tabTextActive: { color: "#FFF" },
  empty: {
    textAlign: "center",
    color: colors.muted,
    marginTop: 24,
    fontSize: 13,
  },
  txRow: {
    marginHorizontal: 16,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    backgroundColor: colors.bg,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  txTitle: { fontSize: 14, fontWeight: "700", color: colors.fg },
  txDate: { fontSize: 11, color: colors.muted, marginTop: 2 },
  txAmt: { fontSize: 13, fontWeight: "700", color: colors.fg },
  txAmtIn: { fontWeight: "800" },
});
