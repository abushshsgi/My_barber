import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import { useShellTheme, type ShellTheme } from "../../lib/useShellTheme";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeBackButton } from "../../components/ui/NativeBackButton";
import { safeBottom, safeTop } from "../../lib/safe-area";
import { WalletTransactionReceiptSheet } from "../../components/wallet/WalletTransactionReceiptSheet";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useWalletTransactions } from "../../hooks/useWallet";
import { formatSomLabel, type WalletTx } from "../../lib/wallet-format";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

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
  const { t } = useTranslation();
  const pal = useShellTheme();
  const styles = useMemo(
    () => createTxStyles(pal),
    [pal.bg, pal.fg, pal.muted, pal.card, pal.border, pal.iconTile, pal.onAccent],
  );
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
      <LinearGradient colors={[pal.iconTile, pal.bg]} style={[styles.hero, { paddingTop: safeTop(insets.top, 6) }]}>
        <View style={styles.header}>
          <NativeBackButton onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>{t("walletPages.historyTitle")}</Text>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.stats}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t("wallet.income")}</Text>
            <Text style={[styles.statVal, { color: "#16A34A" }]}>+{formatSomLabel(inSum)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t("wallet.expense")}</Text>
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
        <ActivityIndicator style={{ marginTop: 40 }} color={pal.fg} />
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={([day]) => day}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="receipt-outline" size={36} color={pal.muted} />
              <Text style={styles.empty}>{t("wallet.noActivity")}</Text>
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
                        color="#111111"
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

function createTxStyles(pal: ShellTheme) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: pal.bg },
  hero: { paddingHorizontal: scale(16), paddingBottom: verticalScale(14) },
  header: { flexDirection: "row", alignItems: "center", marginBottom: verticalScale(14) },
  backBtn: { width: scale(40), height: scale(40), alignItems: "center", justifyContent: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: fontSize(18),
    fontWeight: "800",
    color: pal.fg,
  },
  stats: { flexDirection: "row", gap: moderateScale(10), marginBottom: verticalScale(14) },
  statCard: {
    flex: 1,
    backgroundColor: pal.card,
    borderRadius: moderateScale(18),
    padding: moderateScale(14),
  },
  statLabel: { fontSize: fontSize(12), fontWeight: "600", color: pal.muted },
  statVal: { marginTop: verticalScale(4), fontSize: fontSize(15), fontWeight: "800" },
  tabs: {
    flexDirection: "row",
    backgroundColor: pal.card,
    borderRadius: moderateScale(14),
    padding: moderateScale(4),
    gap: moderateScale(4),
  },
  tab: {
    flex: 1,
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(11),
    alignItems: "center",
  },
  tabOn: { backgroundColor: pal.fg },
  tabText: { fontSize: fontSize(13), fontWeight: "600", color: pal.muted },
  tabTextOn: { color: pal.onAccent },
  list: { padding: moderateScale(16), paddingBottom: verticalScale(32) },
  emptyBox: { alignItems: "center", paddingTop: verticalScale(48), gap: moderateScale(10) },
  empty: { color: pal.muted, fontSize: fontSize(14) },
  dayBlock: { marginBottom: verticalScale(18) },
  dayTitle: {
    marginBottom: verticalScale(8),
    marginLeft: scale(4),
    fontSize: fontSize(12),
    fontWeight: "700",
    color: pal.muted,
    textTransform: "capitalize",
  },
  dayCard: {
    backgroundColor: pal.card,
    borderRadius: moderateScale(20),
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(14),
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: pal.border,
  },
  avatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(14),
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: fontSize(14), fontWeight: "700", color: pal.fg },
  date: { marginTop: verticalScale(2), fontSize: fontSize(11), color: pal.muted },
  amt: { fontSize: fontSize(14), fontWeight: "800" },
  in: { color: "#16A34A" },
  out: { color: "#EF4444" },
  });
}
