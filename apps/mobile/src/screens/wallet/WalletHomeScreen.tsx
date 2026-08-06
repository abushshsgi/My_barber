import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeBackButton } from "../../components/ui/NativeBackButton";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useReceivedGifts, useWalletMe, useWalletTransactions } from "../../hooks/useWallet";
import { formatSomAmount, formatSomLabel } from "../../lib/wallet-format";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletHome">;

const PINK = "#FF6B9D";

export function WalletHomeScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const me = useWalletMe();
  const tx = useWalletTransactions("all");
  const gifts = useReceivedGifts();
  const [refreshing, setRefreshing] = useState(false);

  const inSum = useMemo(
    () => tx.items.filter((t) => t.kind === "in").reduce((s, t) => s + Math.abs(t.amount), 0),
    [tx.items],
  );
  const outSum = useMemo(
    () => tx.items.filter((t) => t.kind === "out").reduce((s, t) => s + Math.abs(t.amount), 0),
    [tx.items],
  );
  const giftSum = useMemo(
    () =>
      gifts.gifts.reduce((s, g) => {
        const n =
          typeof g.gift_amount === "number"
            ? g.gift_amount
            : parseFloat(String(g.gift_amount ?? g.amount)) || 0;
        return s + n;
      }, 0),
    [gifts.gifts],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    me.refresh();
    tx.refresh();
    gifts.refresh();
    setTimeout(() => setRefreshing(false), 700);
  }, [me, tx, gifts]);

  const recent = tx.items.slice(0, 6);

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 10) }]}>
      <View style={styles.topBar}>
        <NativeBackButton onPress={() => navigation.goBack()} />
        <Text style={styles.logo}>
          Mysaloon<Text style={styles.logoDot}>.</Text>
        </Text>
        <Pressable
          style={styles.menuPill}
          onPress={() => navigation.navigate("WalletTransactions")}
          hitSlop={8}
        >
          <Ionicons name="search-outline" size={18} color={colors.fg} />
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.fg} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 28) }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.balanceLabel}>Sizning balansingiz</Text>
        <View style={styles.currencyRow}>
          <View style={styles.currencyBadge}>
            <Ionicons name="wallet" size={14} color="#FFF" />
          </View>
          <Text style={styles.currencyText}>so'm</Text>
        </View>

        {me.loading && !me.wallet ? (
          <ActivityIndicator style={{ marginVertical: 28 }} color={colors.fg} />
        ) : (
          <Text style={styles.balance}>{formatSomAmount(me.balance)}</Text>
        )}

        {me.walletNumber ? (
          <Text style={styles.walletNo}>{me.walletNumber.replace(/(.{4})/g, "$1 ").trim()}</Text>
        ) : null}

        <View style={styles.circles}>
          <Pressable style={styles.circleItem} onPress={() => navigation.navigate("WalletGift")}>
            <View style={[styles.circle, styles.circlePink]}>
              <Ionicons name="heart" size={26} color={colors.fg} />
            </View>
            <Text style={styles.circleLabel}>Bonus</Text>
            <Text style={styles.circleValue}>{formatSomAmount(inSum)}</Text>
          </Pressable>
          <Pressable style={styles.circleItem} onPress={() => navigation.navigate("WalletGifts")}>
            <View style={[styles.circle, styles.circleDark]}>
              <Ionicons name="bar-chart" size={24} color="#FFF" />
            </View>
            <Text style={styles.circleLabel}>Sovg'alar</Text>
            <Text style={styles.circleValue}>{formatSomAmount(giftSum || gifts.gifts.length)}</Text>
          </Pressable>
          <Pressable style={styles.circleItem} onPress={() => navigation.navigate("WalletTopUp")}>
            <View style={[styles.circle, styles.circleDark]}>
              <Ionicons name="cash-outline" size={26} color="#FFF" />
            </View>
            <Text style={styles.circleLabel}>Naqd</Text>
            <Text style={styles.circleValue}>{formatSomAmount(me.balance)}</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>Tezkor amallar</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.orderRow}
        >
          <Pressable style={styles.orderCard} onPress={() => navigation.navigate("WalletTopUp")}>
            <View style={styles.orderTop}>
              <View style={styles.orderIcon}>
                <Ionicons name="add" size={16} color="#FFF" />
              </View>
              <Text style={styles.orderTitle}>To'ldirish</Text>
            </View>
            <Text style={styles.orderBody}>Balansni oshirish</Text>
            <Text style={styles.orderMeta}>min 10 000 so'm</Text>
          </Pressable>
          <Pressable style={styles.orderCard} onPress={() => navigation.navigate("WalletGift")}>
            <View style={styles.orderTop}>
              <View style={[styles.orderIcon, styles.orderIconPink]}>
                <Ionicons name="gift" size={14} color={colors.fg} />
              </View>
              <Text style={styles.orderTitle}>Sovg'a</Text>
            </View>
            <Text style={styles.orderBody}>Do'stga yuborish</Text>
            <Text style={styles.orderMeta}>5k — 1M so'm</Text>
          </Pressable>
          <Pressable style={styles.orderCard} onPress={() => navigation.navigate("WalletQrPay")}>
            <View style={styles.orderTop}>
              <View style={styles.orderIcon}>
                <Ionicons name="qr-code" size={14} color="#FFF" />
              </View>
              <Text style={styles.orderTitle}>QR to'lov</Text>
            </View>
            <Text style={styles.orderBody}>Sartaroshga to'lang</Text>
            <Text style={styles.orderMeta}>imzolangan QR</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.txHead}>
          <Text style={styles.section}>Oxirgi harakatlar</Text>
          <Pressable onPress={() => navigation.navigate("WalletTransactions")}>
            <Text style={styles.link}>Hammasi</Text>
          </Pressable>
        </View>

        {tx.loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} color={colors.fg} />
        ) : recent.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.empty}>Hali harakatlar yo'q</Text>
            <Pressable style={styles.emptyCta} onPress={() => navigation.navigate("WalletTopUp")}>
              <Text style={styles.emptyCtaText}>Birinchi to'ldirish</Text>
            </Pressable>
          </View>
        ) : (
          recent.map((item) => (
            <View key={item.id} style={styles.txRow}>
              <View style={[styles.txIcon, item.kind === "in" && styles.txIconIn]}>
                <Ionicons
                  name={item.kind === "in" ? "arrow-down" : "arrow-up"}
                  size={16}
                  color={item.kind === "in" ? "#FFF" : colors.fg}
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

        {me.error ? <Text style={styles.err}>{me.error}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  logo: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.4,
  },
  logoDot: { color: colors.brandDot },
  menuPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  content: { paddingHorizontal: 20, paddingTop: 18 },
  balanceLabel: {
    textAlign: "center",
    fontSize: 15,
    color: colors.muted,
    fontWeight: "500",
  },
  currencyRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  currencyBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  currencyText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.fg,
  },
  balance: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 36,
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -1.2,
  },
  walletNo: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1,
    fontVariant: ["tabular-nums"],
  },
  circles: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  circleItem: { alignItems: "center", flex: 1 },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  circlePink: { backgroundColor: PINK },
  circleDark: { backgroundColor: colors.fg },
  circleLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: colors.fg,
  },
  circleValue: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
  },
  section: {
    marginTop: 24,
    fontSize: 16,
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.3,
  },
  orderRow: { gap: 12, paddingTop: 14, paddingRight: 8 },
  orderCard: {
    width: 168,
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 16,
    gap: 8,
  },
  orderTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  orderIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  orderIconPink: { backgroundColor: PINK },
  orderTitle: { fontSize: 15, fontWeight: "800", color: colors.fg },
  orderBody: { fontSize: 13, color: colors.fg, fontWeight: "500" },
  orderMeta: { fontSize: 12, color: colors.muted, marginTop: 4 },
  txHead: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  link: { fontSize: 13, fontWeight: "700", color: colors.muted, marginBottom: 2 },
  emptyBox: { alignItems: "center", marginTop: 28, gap: 14 },
  empty: { color: colors.muted, fontSize: 14 },
  emptyCta: {
    backgroundColor: colors.fg,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyCtaText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  txRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  txIconIn: { backgroundColor: colors.fg },
  txTitle: { fontSize: 14, fontWeight: "700", color: colors.fg },
  txDate: { fontSize: 11, color: colors.muted, marginTop: 2 },
  txAmt: { fontSize: 13, fontWeight: "700", color: colors.fg },
  txAmtIn: { fontWeight: "800" },
  err: { marginTop: 16, color: "#EF4444", fontSize: 12, textAlign: "center" },
});
