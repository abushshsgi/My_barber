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
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ApiWalletRecipient } from "../../api/wallet";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useRecipientSearch, useWalletTransactions } from "../../hooks/useWallet";
import type { WalletStackParamList } from "../../navigation/WalletStack";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletGift">;

const PURPLE = "#7C5CFF";
const AVATAR = ["#F5C542", "#A78BFA", "#34D399", "#FB923C", "#60A5FA", "#F472B6"];

const HINTS = [
  { icon: "person-outline" as const, label: "Ism" },
  { icon: "call-outline" as const, label: "Telefon" },
  { icon: "wallet-outline" as const, label: "Hamyon" },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
  }
  return (name.charAt(0) || "?").toUpperCase();
}

function avatarTone(id: number | string): string {
  const n = typeof id === "number" ? id : [...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR[Math.abs(n) % AVATAR.length]!;
}

type Recent = { key: string; name: string; subtitle?: string };

/** 1-qadam: kimga yuborish. */
export function WalletGiftScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const { results, loading } = useRecipientSearch(query);
  const tx = useWalletTransactions("out");

  const recent = useMemo(() => {
    const seen = new Set<string>();
    const list: Recent[] = [];
    for (const item of tx.items) {
      if (!item.entryType.startsWith("gift")) continue;
      const name = (item.recipientName || item.title.replace(/^Sovg'a · /, "")).trim();
      if (!name || name.length < 2) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({
        key: item.id,
        name,
        subtitle: item.recipientWalletMasked || item.subtitle,
      });
      if (list.length >= 6) break;
    }
    return list;
  }, [tx.items]);

  const pick = (r: ApiWalletRecipient) => {
    navigation.navigate("WalletGiftAmount", {
      recipientUserId: r.user_id,
      recipientName: r.full_name,
      recipientPhone: r.phone,
      recipientWallet: r.wallet_number,
    });
  };

  const fillHint = (label: string) => {
    if (label === "Telefon") setQuery("+998");
    else if (label === "Hamyon") setQuery("7700");
    else setQuery("");
  };

  const searching = query.trim().length >= 2;

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + 12 }]}>
      <LinearGradient
        colors={["#EDE7FF", "#F3EEFF", "#F7F5FF"]}
        style={[styles.hero, { paddingTop: insets.top + 6 }]}
      >
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color="#0A0A0A" />
          </Pressable>
          <Text style={styles.headerTitle}>Kimga yuborish</Text>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="paper-plane" size={22} color={PURPLE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Qabul qiluvchini toping</Text>
            <Text style={styles.heroSub}>
              Ism, telefon (+998…) yoki 16 xonali hamyon raqami bilan qidiring
            </Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={PURPLE} />
          <TextInput
            style={styles.searchInput}
            placeholder="Masalan: +99890… yoki 7700 …"
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            keyboardType="default"
            autoFocus
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.hints}>
          {HINTS.map((h) => (
            <Pressable key={h.label} style={styles.hintChip} onPress={() => fillHint(h.label)}>
              <Ionicons name={h.icon} size={14} color={PURPLE} />
              <Text style={styles.hintText}>{h.label}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {!searching && recent.length > 0 ? (
          <>
            <Text style={styles.section}>So‘nggi oluvchilar</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentRow}
            >
              {recent.map((r) => (
                <Pressable
                  key={r.key}
                  style={styles.recentItem}
                  onPress={() => setQuery(r.name)}
                >
                  <View style={[styles.recentAvatar, { backgroundColor: avatarTone(r.key) }]}>
                    <Text style={styles.avatarText}>{initials(r.name)}</Text>
                  </View>
                  <Text style={styles.recentName} numberOfLines={1}>
                    {r.name.split(/\s+/)[0]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {searching ? <Text style={styles.section}>Natijalar</Text> : null}

        {loading && searching ? (
          <ActivityIndicator style={{ marginTop: 28 }} color={PURPLE} />
        ) : searching && results.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Ionicons name="search-outline" size={28} color="#C4B5FD" />
            </View>
            <Text style={styles.emptyTitle}>Topilmadi</Text>
            <Text style={styles.empty}>
              To‘liq telefon (+998901234567) yoki hamyon raqamini (bo‘shliqlar bilan yoki
              bo‘shliqsiz) qayta kiriting
            </Text>
          </View>
        ) : searching ? (
          results.map((r) => (
            <Pressable key={r.user_id} style={styles.row} onPress={() => pick(r)}>
              <View style={[styles.avatar, { backgroundColor: avatarTone(r.user_id) }]}>
                <Text style={styles.avatarText}>{initials(r.full_name || "?")}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {r.full_name || "Foydalanuvchi"}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {[r.phone, r.wallet_number].filter(Boolean).join(" · ")}
                </Text>
              </View>
              <View style={styles.sendPill}>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </View>
            </Pressable>
          ))
        ) : recent.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={28} color="#C4B5FD" />
            </View>
            <Text style={styles.emptyTitle}>Qidiruvni boshlang</Text>
            <Text style={styles.empty}>
              Do‘stingiz ismi, telefoni yoki Mysaloon hamyon raqamini yozing
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7F5FF" },
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
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
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 15, fontWeight: "800", color: "#0A0A0A" },
  heroSub: { marginTop: 3, fontSize: 12, lineHeight: 17, color: "#6B7280" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1.5,
    borderColor: "rgba(124,92,255,0.22)",
    shadowColor: "#7C5CFF",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#0A0A0A", padding: 0 },
  hints: { flexDirection: "row", gap: 8, marginTop: 12 },
  hintChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  hintText: { fontSize: 12, fontWeight: "600", color: "#4B5563" },
  list: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 28 },
  section: {
    marginBottom: 12,
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.2,
  },
  recentRow: { gap: 14, paddingBottom: 8, marginBottom: 8 },
  recentItem: { alignItems: "center", width: 64, gap: 6 },
  recentAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  recentName: { fontSize: 11, fontWeight: "600", color: "#4B5563", textAlign: "center" },
  emptyBox: { alignItems: "center", paddingVertical: 36, paddingHorizontal: 24 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#0A0A0A", marginBottom: 6 },
  empty: {
    textAlign: "center",
    fontSize: 13,
    color: "#9CA3AF",
    lineHeight: 19,
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
    shadowColor: "#7C5CFF",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
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
  sendPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
  },
});
