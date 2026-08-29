import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { parseWalletBalance, type ApiReceivedGift } from "../../api/wallet";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useAuth } from "../../auth/AuthContext";
import { useReceivedGifts, useWalletMe } from "../../hooks/useWallet";
import { designColorsById, formatSomLabel, formatTxDate } from "../../lib/wallet-format";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import { colors } from "../../theme/colors";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletGifts">;

function favKey(userId: number) {
  return `mysaloon.gift-favorites.${userId}`;
}

export function WalletGiftsScreen({ navigation }: Props) {
  useHideTabBar();
  const { user } = useAuth();
  const me = useWalletMe();
  const { gifts, loading, refresh } = useReceivedGifts();
  const [filter, setFilter] = useState<"all" | "starred">("all");
  const [stars, setStars] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    AsyncStorage.getItem(favKey(user.id)).then((raw) => {
      try {
        const arr = raw ? (JSON.parse(raw) as string[]) : [];
        setStars(new Set(arr));
      } catch {
        setStars(new Set());
      }
    });
  }, [user?.id]);

  const toggleStar = async (id: string) => {
    if (!user?.id) return;
    const next = new Set(stars);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setStars(next);
    await AsyncStorage.setItem(favKey(user.id), JSON.stringify([...next]));
  };

  const collection = gifts.reduce((s, g) => s + parseWalletBalance(g.gift_amount ?? g.amount), 0);
  const visible = filter === "starred" ? gifts.filter((g) => stars.has(g.id)) : gifts;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    me.refresh();
    setTimeout(() => setRefreshing(false), 500);
  }, [refresh, me]);

  return (
    <View style={styles.root}>
      <NativeHeader title="Hamyon" onBack={() => navigation.goBack()} />
      <Text style={styles.sub}>Mening sovg'alarim</Text>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={["#1A1A1A", "#0A0A0A"]} style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>KOLLEKSIYA</Text>
            <View style={styles.heroIcon}>
              <Ionicons name="gift-outline" size={16} color="#FFF" />
            </View>
          </View>
          <Text style={styles.heroAmt}>{formatSomLabel(collection)}</Text>
          <Text style={styles.heroSub}>
            {gifts.length} ta sovg'a · balans {formatSomLabel(me.balance)}
          </Text>
        </LinearGradient>

        <Text style={styles.h2}>Sovg'ani ishlatish</Text>
        <Text style={styles.hint}>
          Pul hamyonga tushgan — bron, obuna yoki AI uchun sarflang.
        </Text>
        <View style={styles.useRow}>
          {[
            { icon: "calendar-outline" as const, title: "Bron", hint: "Xarita · hamyon" },
            { icon: "diamond-outline" as const, title: "Obuna", hint: "Pro · AI" },
            { icon: "sparkles-outline" as const, title: "AI stil", hint: "Explore" },
          ].map((u) => (
            <View key={u.title} style={styles.useCard}>
              <Ionicons name={u.icon} size={18} color={colors.fg} />
              <Text style={styles.useTitle}>{u.title}</Text>
              <Text style={styles.useHint}>{u.hint}</Text>
            </View>
          ))}
        </View>

        <View style={styles.filters}>
          <Pressable
            style={[styles.filter, filter === "all" && styles.filterActive]}
            onPress={() => setFilter("all")}
          >
            <Text style={[styles.filterText, filter === "all" && styles.filterTextActive]}>
              Barchasi
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filter, filter === "starred" && styles.filterActive]}
            onPress={() => setFilter("starred")}
          >
            <Text style={[styles.filterText, filter === "starred" && styles.filterTextActive]}>
              Kolleksiya · {stars.size}
            </Text>
          </Pressable>
        </View>

        <Pressable style={styles.sendBtn} onPress={() => navigation.navigate("WalletGift")}>
          <View style={styles.plus}>
            <Ionicons name="add" size={18} color="#FFF" />
          </View>
          <Text style={styles.sendText}>Sovg'a yuborish</Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={colors.fg} />
        ) : visible.length === 0 ? (
          <Text style={styles.empty}>Sovg'alar yo'q</Text>
        ) : (
          visible.map((g) => (
            <GiftCard
              key={g.id}
              gift={g}
              starred={stars.has(g.id)}
              onToggleStar={() => void toggleStar(g.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function GiftCard({
  gift,
  starred,
  onToggleStar,
}: {
  gift: ApiReceivedGift;
  starred: boolean;
  onToggleStar: () => void;
}) {
  const amount = parseWalletBalance(gift.gift_amount ?? gift.amount);
  const palette = designColorsById(gift.design_id || "classic");
  const label = gift.design?.name_uz || gift.design?.name || gift.design_id;

  return (
    <View style={styles.giftCard}>
      <LinearGradient colors={[palette.from, palette.to]} style={styles.giftInner}>
        <View style={styles.giftTop}>
          <View style={styles.giftIcon}>
            <Ionicons name="gift" size={16} color={palette.accent} />
          </View>
          <Text style={[styles.giftBrand, { color: palette.accent }]}>Mysaloon.</Text>
        </View>
        <Text style={[styles.giftDesign, { color: palette.accent }]}>
          {(label || "").toUpperCase()}
        </Text>
        <Text style={[styles.giftAmt, { color: palette.accent }]}>{formatSomLabel(amount)}</Text>
        <View style={styles.giftMeta}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.metaLabel, { color: palette.accent }]}>YUBORUVCHI</Text>
            <Text style={[styles.metaVal, { color: palette.accent }]} numberOfLines={1}>
              {gift.sender_name || "—"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.metaLabel, { color: palette.accent }]}>OLUVCHI</Text>
            <Text style={[styles.metaVal, { color: palette.accent }]} numberOfLines={1}>
              {gift.recipient_name || "—"}
            </Text>
          </View>
        </View>
        <Text style={[styles.giftMsg, { color: palette.accent }]}>
          {gift.message?.trim() || "Xabarsiz sovg'a"}
        </Text>
        <View style={styles.giftFooter}>
          <Text style={[styles.giftDate, { color: palette.accent }]}>
            {formatTxDate(gift.created_at)}
          </Text>
          <Pressable onPress={onToggleStar} style={styles.starBtn}>
            <Ionicons
              name={starred ? "star" : "star-outline"}
              size={14}
              color={palette.accent}
            />
            <Text style={[styles.starText, { color: palette.accent }]}>Saqlash</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  sub: {
    paddingHorizontal: scale(16),
    marginTop: -verticalScale(6),
    marginBottom: verticalScale(8),
    fontSize: fontSize(13),
    color: colors.muted,
  },
  content: { padding: moderateScale(16), paddingBottom: verticalScale(40) },
  hero: { borderRadius: moderateScale(24), padding: moderateScale(20) },
  heroTop: { flexDirection: "row", justifyContent: "space-between" },
  heroLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: fontSize(10),
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  heroIcon: {
    width: scale(32),
    height: scale(32),
    borderRadius: moderateScale(16),
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroAmt: { marginTop: verticalScale(12), color: "#FFF", fontSize: fontSize(28), fontWeight: "800" },
  heroSub: { marginTop: verticalScale(6), color: "rgba(255,255,255,0.55)", fontSize: fontSize(12) },
  h2: { marginTop: verticalScale(22), fontSize: fontSize(16), fontWeight: "800", color: colors.fg },
  hint: { marginTop: verticalScale(4), fontSize: fontSize(13), color: colors.muted, lineHeight: fontSize(18) },
  useRow: { flexDirection: "row", gap: moderateScale(8), marginTop: verticalScale(12) },
  useCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: moderateScale(16),
    padding: moderateScale(12),
    gap: moderateScale(6),
  },
  useTitle: { fontSize: fontSize(13), fontWeight: "800", color: colors.fg },
  useHint: { fontSize: fontSize(10), color: colors.muted },
  filters: { flexDirection: "row", gap: moderateScale(8), marginTop: verticalScale(18) },
  filter: {
    flex: 1,
    alignItems: "center",
    paddingVertical: verticalScale(12),
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  filterActive: { backgroundColor: colors.fg },
  filterText: { fontSize: fontSize(13), fontWeight: "700", color: colors.fg },
  filterTextActive: { color: "#FFF" },
  sendBtn: {
    marginTop: verticalScale(12),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(10),
    borderWidth: 1,
    borderColor: colors.fg,
    borderRadius: moderateScale(16),
    paddingVertical: verticalScale(14),
  },
  plus: {
    width: scale(28),
    height: scale(28),
    borderRadius: moderateScale(14),
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: { fontSize: fontSize(15), fontWeight: "800", color: colors.fg },
  empty: { textAlign: "center", marginTop: verticalScale(28), color: colors.muted },
  giftCard: { marginTop: verticalScale(14), borderRadius: moderateScale(28), overflow: "hidden" },
  giftInner: { padding: moderateScale(20) },
  giftTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  giftIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(16),
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  giftBrand: { fontSize: fontSize(14), fontWeight: "700", opacity: 0.85 },
  giftDesign: {
    marginTop: verticalScale(24),
    fontSize: fontSize(11),
    fontWeight: "700",
    letterSpacing: 1.3,
    opacity: 0.6,
  },
  giftAmt: { marginTop: verticalScale(6), fontSize: fontSize(30), fontWeight: "800" },
  giftMeta: { flexDirection: "row", gap: moderateScale(12), marginTop: verticalScale(18) },
  metaLabel: { fontSize: fontSize(9), fontWeight: "700", letterSpacing: 1, opacity: 0.55 },
  metaVal: { marginTop: verticalScale(2), fontSize: fontSize(12), fontWeight: "600" },
  giftMsg: { marginTop: verticalScale(12), fontSize: fontSize(12), opacity: 0.7 },
  giftFooter: {
    marginTop: verticalScale(14),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  giftDate: { fontSize: fontSize(12), opacity: 0.65 },
  starBtn: { flexDirection: "row", alignItems: "center", gap: moderateScale(4) },
  starText: { fontSize: fontSize(12), fontWeight: "700" },
});
