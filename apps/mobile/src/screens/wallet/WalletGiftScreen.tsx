import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ApiWalletRecipient } from "../../api/wallet";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useRecipientSearch } from "../../hooks/useWallet";
import type { WalletStackParamList } from "../../navigation/WalletStack";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletGift">;

const PURPLE = "#7C5CFF";
const AVATAR = ["#F5C542", "#A78BFA", "#34D399", "#FB923C", "#60A5FA", "#F472B6"];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
  }
  return (name.charAt(0) || "?").toUpperCase();
}

function avatarTone(id: number): string {
  return AVATAR[Math.abs(id) % AVATAR.length]!;
}

/** 1-qadam: kimga yuborish. */
export function WalletGiftScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const { results, loading } = useRecipientSearch(query);

  const pick = (r: ApiWalletRecipient) => {
    navigation.navigate("WalletGiftAmount", {
      recipientUserId: r.user_id,
      recipientName: r.full_name,
      recipientPhone: r.phone,
      recipientWallet: r.wallet_number,
    });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="#0A0A0A" />
        </Pressable>
        <Text style={styles.headerTitle}>Kimga yuborish</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Ism, telefon yoki hamyon"
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoFocus
        />
        {query ? (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={PURPLE} />
        ) : results.length === 0 ? (
          <Text style={styles.empty}>
            {query.trim().length < 2
              ? "Qidirish uchun kamida 2 belgi yozing"
              : "Natija topilmadi"}
          </Text>
        ) : (
          results.map((r) => (
            <Pressable key={r.user_id} style={styles.row} onPress={() => pick(r)}>
              <View style={[styles.avatar, { backgroundColor: avatarTone(r.user_id) }]}>
                <Text style={styles.avatarText}>{initials(r.full_name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {r.full_name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {r.phone || r.wallet_number}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7F5FF", paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#0A0A0A",
    letterSpacing: -0.3,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.08)",
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#0A0A0A", padding: 0 },
  list: { paddingBottom: 24 },
  empty: {
    marginTop: 48,
    textAlign: "center",
    fontSize: 14,
    color: "#9CA3AF",
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 14, fontWeight: "800", color: "#FFF" },
  name: { fontSize: 15, fontWeight: "700", color: "#0A0A0A" },
  meta: { marginTop: 2, fontSize: 12, color: "#9CA3AF" },
});
