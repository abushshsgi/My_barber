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
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletGift">;

const PURPLE = "#111111";
const AVATAR = ["#111111", "#737373", "#A3A3A3", "#D4D4D4", "#525252", "#E5E5E5"];

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
        colors={["#F0F0F0", "#F3EEFF", "#FAFAFA"]}
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
              <Ionicons name="search-outline" size={28} color="#737373" />
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
              <Ionicons name="people-outline" size={28} color="#737373" />
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
  root: { flex: 1, backgroundColor: "#FAFAFA" },
  hero: {
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(16),
    borderBottomLeftRadius: moderateScale(24),
    borderBottomRightRadius: moderateScale(24),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(14),
  },
  backBtn: {
    width: scale(36),
    height: scale(36),
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: fontSize(18),
    fontWeight: "800",
    color: "#0A0A0A",
    letterSpacing: -0.3,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: moderateScale(18),
    padding: moderateScale(14),
    marginBottom: verticalScale(12),
  },
  heroIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(14),
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: fontSize(15), fontWeight: "800", color: "#0A0A0A" },
  heroSub: { marginTop: verticalScale(3), fontSize: fontSize(12), lineHeight: fontSize(17), color: "#6B7280" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    backgroundColor: "#FFF",
    borderRadius: moderateScale(16),
    paddingHorizontal: scale(14),
    height: verticalScale(52),
    borderWidth: 1.5,
    borderColor: "rgba(124,92,255,0.22)",
    shadowColor: "#111111",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: fontSize(15), color: "#0A0A0A", padding: 0 },
  hints: { flexDirection: "row", gap: moderateScale(8), marginTop: verticalScale(12) },
  hintChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(5),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(7),
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  hintText: { fontSize: fontSize(12), fontWeight: "600", color: "#4B5563" },
  list: { paddingHorizontal: scale(16), paddingTop: verticalScale(18), paddingBottom: verticalScale(28) },
  section: {
    marginBottom: verticalScale(12),
    fontSize: fontSize(13),
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.2,
  },
  emptyBox: { alignItems: "center", paddingVertical: verticalScale(36), paddingHorizontal: scale(24) },
  emptyIcon: {
    width: scale(64),
    height: scale(64),
    borderRadius: moderateScale(32),
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(14),
  },
  emptyTitle: { fontSize: fontSize(16), fontWeight: "800", color: "#0A0A0A", marginBottom: verticalScale(6) },
  empty: {
    textAlign: "center",
    fontSize: fontSize(13),
    color: "#9CA3AF",
    lineHeight: fontSize(19),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
    backgroundColor: "#FFF",
    borderRadius: moderateScale(16),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(14),
    marginBottom: verticalScale(8),
    shadowColor: "#111111",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  avatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(22),
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: fontSize(14), fontWeight: "800", color: "#FFF" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: moderateScale(8) },
  name: { flexShrink: 1, fontSize: fontSize(15), fontWeight: "700", color: "#0A0A0A" },
  badge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: 999,
    backgroundColor: "#F0F0F0",
  },
  badgeText: { fontSize: fontSize(10), fontWeight: "700", color: PURPLE },
  meta: { marginTop: verticalScale(2), fontSize: fontSize(12), color: "#9CA3AF", letterSpacing: 0.6 },
  sendPill: {
    width: scale(32),
    height: scale(32),
    borderRadius: moderateScale(16),
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
});
