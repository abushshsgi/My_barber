import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../auth/AuthContext";
import type { ApiWalletRecipient } from "../../api/wallet";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useRecipientSearch } from "../../hooks/useWallet";
import {
  loadRecipientHistory,
  maskWalletDisplay,
  rememberRecipientSearch,
  type RecipientHistoryItem,
} from "../../lib/recipient-history";
import type { WalletStackParamList } from "../../navigation/WalletStack";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletGift">;

const PURPLE = "#7C5CFF";
const AVATAR = ["#F5C542", "#A78BFA", "#34D399", "#FB923C", "#60A5FA", "#F472B6"];

const HINTS = [
  { icon: "person-outline" as const, label: "Ism", hint: "" },
  { icon: "call-outline" as const, label: "Telefon", hint: "+998" },
  { icon: "wallet-outline" as const, label: "Hamyon", hint: "7700" },
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

/** 1-qadam: kimga yuborish — tarix + maxfiy mask. */
export function WalletGiftScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<RecipientHistoryItem[]>([]);
  const { results, loading } = useRecipientSearch(query);

  const reloadHistory = useCallback(() => {
    if (!user?.id) {
      setHistory([]);
      return;
    }
    void loadRecipientHistory(user.id).then(setHistory);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      reloadHistory();
    }, [reloadHistory]),
  );

  useEffect(() => {
    reloadHistory();
  }, [reloadHistory]);

  const goAmount = async (r: {
    userId: number;
    fullName: string;
    walletMasked?: string | null;
  }) => {
    if (user?.id) {
      const next = await rememberRecipientSearch(user.id, r);
      setHistory(next);
    }
    navigation.navigate("WalletGiftAmount", {
      recipientUserId: r.userId,
      recipientName: r.fullName,
      recipientPhone: null,
      recipientWallet: maskWalletDisplay(r.walletMasked),
    });
  };

  const pickApi = (r: ApiWalletRecipient) => {
    void goAmount({
      userId: r.user_id,
      fullName: r.full_name || "Foydalanuvchi",
      walletMasked: r.wallet_number,
    });
  };

  const pickHistory = (h: RecipientHistoryItem) => {
    void goAmount({
      userId: h.userId,
      fullName: h.fullName,
      walletMasked: h.walletMasked,
    });
  };

  const searching = query.trim().length >= 2;
  const sentFirst = history.filter((h) => (h.lastSentAt ?? 0) > 0);
  const searchedOnly = history.filter((h) => !(h.lastSentAt ?? 0));

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
            <Ionicons name="shield-checkmark" size={22} color={PURPLE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Maxfiy qidiruv</Text>
            <Text style={styles.heroSub}>
              Telefon ko‘rinmaydi. Hamyon faqat oxirgi 4 raqam. To‘liq 16 xona kiritsangiz — egasi
              chiqadi.
            </Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={PURPLE} />
          <TextInput
            style={styles.searchInput}
            placeholder="Ism, telefon yoki to‘liq hamyon"
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
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
            <Pressable
              key={h.label}
              style={styles.hintChip}
              onPress={() => setQuery(h.hint)}
            >
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
        {!searching && sentFirst.length > 0 ? (
          <>
            <Text style={styles.section}>Oxirgi yuborilganlar</Text>
            {sentFirst.map((h) => (
              <HistoryRow
                key={`sent-${h.userId}`}
                item={h}
                badge="Yuborilgan"
                onPress={() => pickHistory(h)}
              />
            ))}
          </>
        ) : null}

        {!searching && searchedOnly.length > 0 ? (
          <>
            <Text style={[styles.section, sentFirst.length ? { marginTop: 16 } : null]}>
              So‘nggi qidiruvlar
            </Text>
            {searchedOnly.map((h) => (
              <HistoryRow
                key={`search-${h.userId}`}
                item={h}
                onPress={() => pickHistory(h)}
              />
            ))}
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
              Ismning bir qismini yozing yoki to‘liq 16 xonali hamyon / telefon kiriting
            </Text>
          </View>
        ) : searching ? (
          results.map((r) => (
            <Pressable key={r.user_id} style={styles.row} onPress={() => pickApi(r)}>
              <View style={[styles.avatar, { backgroundColor: avatarTone(r.user_id) }]}>
                <Text style={styles.avatarText}>{initials(r.full_name || "?")}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {r.full_name || "Foydalanuvchi"}
                </Text>
                <Text style={styles.meta}>{maskWalletDisplay(r.wallet_number)}</Text>
              </View>
              <View style={styles.sendPill}>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </View>
            </Pressable>
          ))
        ) : history.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={28} color="#C4B5FD" />
            </View>
            <Text style={styles.emptyTitle}>Qidiruvni boshlang</Text>
            <Text style={styles.empty}>
              Topilgan odamlar shu yerda saqlanadi. Pul yuborganlaringiz eng yuqorida turadi.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function HistoryRow({
  item,
  badge,
  onPress,
}: {
  item: RecipientHistoryItem;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.avatar, { backgroundColor: avatarTone(item.userId) }]}>
        <Text style={styles.avatarText}>{initials(item.fullName)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {item.fullName}
          </Text>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.meta}>{maskWalletDisplay(item.walletMasked)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
    </Pressable>
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
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flexShrink: 1, fontSize: 15, fontWeight: "700", color: "#0A0A0A" },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#EDE9FE",
  },
  badgeText: { fontSize: 10, fontWeight: "700", color: PURPLE },
  meta: { marginTop: 2, fontSize: 12, color: "#9CA3AF", letterSpacing: 0.6 },
  sendPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
  },
});
