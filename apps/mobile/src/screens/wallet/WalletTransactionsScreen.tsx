import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WalletTransactionReceiptSheet } from "../../components/wallet/WalletTransactionReceiptSheet";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useWalletTransactions } from "../../hooks/useWallet";
import { formatSomLabel, type WalletTx } from "../../lib/wallet-format";
import type { WalletStackParamList } from "../../navigation/WalletStack";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletTransactions">;

const TABS = [
  { id: "all" as const, label: "Hammasi" },
  { id: "in" as const, label: "Kirim" },
  { id: "out" as const, label: "Chiqim" },
];

const TONES = ["#E5E5E5", "#D4D4D4", "#A3A3A3", "#F0F0F0", "#737373"];

function tone(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h += id.charCodeAt(i);
  return TONES[h % TONES.length]!;
}

function dayKey(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" });
}

/** Tranzaksiyalar — guruhlangan timeline UI. */
export function WalletTransactionsScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"all" | "in" | "out">("all");
  const { items, loading } = useWalletTransactions(tab);
  const [selected, setSelected] = useState<WalletTx | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, WalletTx[]>();
    for (const item of items) {
      const k = dayKey(item.createdAt);
      const list = map.get(k) || [];
      list.push(item);
      map.set(k, list);
    }
    return [...map.entries()];
  }, [items]);

  const inSum = items.filter((i) => i.kind === "in").reduce((s, i) => s + i.amount, 0);
  const outSum = items.filter((i) => i.kind === "out").reduce((s, i) => s + Math.abs(i.amount), 0);

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <LinearGradient colors={["#F0F0F0", "#FAFAFA"]} style={[styles.hero, { paddingTop: insets.top + 6 }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color="#111" />
          </Pressable>
          <Text style={styles.headerTitle}>Tarix</Text>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.stats}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Kirim</Text>
            <Text style={[styles.statVal, { color: "#16A34A" }]}>+{formatSomLabel(inSum)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Chiqim</Text>
            <Text style={[styles.statVal, { color: "#EF4444" }]}>−{formatSomLabel(outSum)}</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          {TABS.map((t) => (
            <Pressable
              key={t.id}
              style={[styles.tab, tab === t.id && styles.tabOn]}
              onPress={() => setTab(t.id)}
            >
              <Text style={[styles.tabText, tab === t.id && styles.tabTextOn]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#111" />
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={([day]) => day}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="receipt-outline" size={36} color="#D1D5DB" />
              <Text style={styles.empty}>Hali harakatlar yo'q</Text>
            </View>
          }
          renderItem={({ item: [day, rows] }) => (
            <View style={styles.dayBlock}>
              <Text style={styles.dayTitle}>{day}</Text>
              <View style={styles.dayCard}>
                {rows.map((tx, idx) => (
                  <Pressable
                    key={tx.id}
                    style={[styles.row, idx < rows.length - 1 && styles.rowBorder]}
                    onPress={() => setSelected(tx)}
                  >
                    <View style={[styles.avatar, { backgroundColor: tone(tx.id) }]}>
                      <Ionicons
                        name={tx.kind === "in" ? "arrow-down" : "arrow-up"}
                        size={16}
                        color="#111"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.title} numberOfLines={1}>
                        {tx.title.replace(/^Sovg'a · /, "")}
                      </Text>
                      <Text style={styles.date} numberOfLines={1}>
                        {tx.subtitle || tx.date}
                      </Text>
                    </View>
                    <Text style={[styles.amt, tx.kind === "in" ? styles.in : styles.out]}>
                      {tx.kind === "in" ? "+" : "−"}
                      {formatSomLabel(Math.abs(tx.amount))}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      <WalletTransactionReceiptSheet
        tx={selected}
        visible={!!selected}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFA" },
  hero: { paddingHorizontal: 16, paddingBottom: 14 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
  },
  stats: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 18,
    padding: 14,
  },
  statLabel: { fontSize: 12, fontWeight: "600", color: "#9CA3AF" },
  statVal: { marginTop: 4, fontSize: 15, fontWeight: "800" },
  tabs: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: "center",
  },
  tabOn: { backgroundColor: "#111" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  tabTextOn: { color: "#FFF" },
  list: { padding: 16, paddingBottom: 32 },
  emptyBox: { alignItems: "center", paddingTop: 48, gap: 10 },
  empty: { color: "#9CA3AF", fontSize: 14 },
  dayBlock: { marginBottom: 18 },
  dayTitle: {
    marginBottom: 8,
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "capitalize",
  },
  dayCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 14, fontWeight: "700", color: "#111" },
  date: { marginTop: 2, fontSize: 11, color: "#9CA3AF" },
  amt: { fontSize: 14, fontWeight: "800" },
  in: { color: "#16A34A" },
  out: { color: "#EF4444" },
});
