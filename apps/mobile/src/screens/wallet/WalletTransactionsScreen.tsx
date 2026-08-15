import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useWalletTransactions } from "../../hooks/useWallet";
import { formatSomLabel } from "../../lib/wallet-format";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletTransactions">;

export function WalletTransactionsScreen({ navigation }: Props) {
  useHideTabBar();
  const [tab, setTab] = useState<"all" | "in" | "out">("all");
  const { items, loading } = useWalletTransactions(tab);

  return (
    <View style={styles.root}>
      <NativeHeader title="Tarix" onBack={() => navigation.goBack()} />
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
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.fg} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Harakatlar yo'q</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.icon}>
                <Ionicons
                  name={item.kind === "in" ? "arrow-down-outline" : "arrow-up-outline"}
                  size={18}
                  color={colors.fg}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.date}>{item.date}</Text>
              </View>
              <Text style={styles.amt}>
                {item.kind === "in" ? "+" : "−"}
                {formatSomLabel(Math.abs(item.amount))}
              </Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  tabActive: { backgroundColor: colors.fg },
  tabText: { fontSize: 12, fontWeight: "700", color: colors.fg },
  tabTextActive: { color: "#FFF" },
  list: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 14, fontWeight: "700", color: colors.fg },
  date: { fontSize: 11, color: colors.muted, marginTop: 2 },
  amt: { fontSize: 13, fontWeight: "800", color: colors.fg },
});
