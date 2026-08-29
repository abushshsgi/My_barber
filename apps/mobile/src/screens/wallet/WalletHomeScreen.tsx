import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
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
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../auth/AuthContext";
import { WalletTransactionReceiptSheet } from "../../components/wallet/WalletTransactionReceiptSheet";
import { TAB_DOCK_CLEARANCE } from "../../hooks/useHideTabBar";
import { useWalletMe, useWalletTransactions } from "../../hooks/useWallet";
import {
  loadRecipientHistory,
  type RecipientHistoryItem,
} from "../../lib/recipient-history";
import type { WalletTx } from "../../lib/wallet-format";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import {
  IS_SMALL_DEVICE,
  fontSize,
  moderateScale,
  radius,
  scale,
  spacing,
  useResponsive,
  verticalScale,
  widthPercent,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletHome">;

const INK = "#111111";
const MUTED = "#737373";
const SOFT_BG = "#FAFAFA";
const CARD_SHADOW = {
  shadowColor: "#111111",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 20,
  elevation: 4,
};
const AVATAR_TONES = ["#111111", "#737373", "#A3A3A3", "#D4D4D4", "#525252", "#E5E5E5"];

const QUICK: {
  key: "WalletGift" | "WalletTopUp" | "WalletQrPay" | "WalletMore";
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "WalletGift", label: "O'tkazma", icon: "arrow-up-outline" },
  { key: "WalletQrPay", label: "To'lov", icon: "arrow-down-outline" },
  { key: "WalletTopUp", label: "To'ldirish", icon: "add" },
  { key: "WalletMore", label: "Ko'proq", icon: "grid-outline" },
];

function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return "0.00";
  return Math.round(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTxTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function txStatusLabel(item: WalletTx): string {
  if (item.kind === "in") return "Qabul";
  if (item.entryType === "topup") return "To'ldirish";
  if (item.entryType.startsWith("gift")) return "Yuborildi";
  return "To'lov";
}

function firstName(full?: string | null): string {
  const clean = (full || "").trim();
  if (!clean) return "do'st";
  return clean.split(/\s+/)[0]!;
}

function initials(title: string): string {
  const clean = title.replace(/^Sovg'a · /, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
  }
  return (clean.charAt(0) || "?").toUpperCase();
}

function avatarColor(id: string | number): string {
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h + s.charCodeAt(i) * (i + 1)) % AVATAR_TONES.length;
  return AVATAR_TONES[h]!;
}

export function WalletHomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isSmall } = useResponsive();
  const { user, isAuthenticated } = useAuth();
  const me = useWalletMe();
  const tx = useWalletTransactions("all");
  const [refreshing, setRefreshing] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [selectedTx, setSelectedTx] = useState<WalletTx | null>(null);
  const [history, setHistory] = useState<RecipientHistoryItem[]>([]);

  const dockPad = TAB_DOCK_CLEARANCE + Math.max(insets.bottom, 8);

  /** Promo karuseli tranzaksiyalar ro'yxatini siqib qo'ymasligi kerak. */
  const showPromo = !isSmall;

  const recent = tx.items.slice(0, 8);
  const greetName = firstName(user?.first_name || user?.full_name);
  const balanceText = useMemo(
    () => (hidden ? "••••••" : formatMoney(me.balance)),
    [hidden, me.balance],
  );

  const quickContacts = useMemo(() => history.slice(0, 8), [history]);

  const reloadHistory = useCallback(() => {
    if (!user?.id) {
      setHistory([]);
      return;
    }
    void loadRecipientHistory(user.id).then(setHistory);
  }, [user?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    me.refresh();
    tx.refresh();
    reloadHistory();
    setTimeout(() => setRefreshing(false), 700);
  }, [me, tx, reloadHistory]);

  useFocusEffect(
    useCallback(() => {
      me.refresh();
      tx.refresh();
      reloadHistory();
    }, [me.refresh, tx.refresh, reloadHistory]),
  );

  const requireAuth = useCallback(() => {
    if (isAuthenticated) return true;
    navigation.getParent()?.navigate("Profile" as never);
    return false;
  }, [isAuthenticated, navigation]);

  const goBackSafe = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  const openRecipient = useCallback(
    (h: RecipientHistoryItem) => {
      if (!requireAuth()) return;
      navigation.navigate("WalletGiftAmount", {
        recipientUserId: h.userId,
        recipientName: h.fullName,
        recipientPhone: null,
        recipientWallet: h.walletMasked,
      });
    },
    [navigation, requireAuth],
  );

  return (
    <View style={[styles.root, { paddingBottom: dockPad }]}>
      <StatusBar style="dark" />

      <LinearGradient
        colors={["#F0F0F0", "#F0F0F0", "#F0F0F0", "#FAFAFA"]}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[
          styles.heroCard,
          { paddingTop: Math.max(insets.top, verticalScale(12)) + spacing.xs },
          CARD_SHADOW,
        ]}
      >
        <View style={styles.header}>
          <Pressable style={styles.profileRow} onPress={goBackSafe} hitSlop={8}>
            <View style={styles.profileAvatar}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.profileImg} contentFit="cover" />
              ) : (
                <Text style={styles.profileInitials}>{initials(greetName)}</Text>
              )}
            </View>
            <View>
              <Text style={styles.hello}>Salom, {greetName}</Text>
              <Text style={styles.welcome}>Xush kelibsiz</Text>
            </View>
          </Pressable>
          <Pressable
            style={styles.bellBtn}
            onPress={() => navigation.navigate("WalletMore")}
            accessibilityLabel="Ko'proq"
          >
            <Ionicons name="notifications-outline" size={ICON.md} color={INK} />
          </Pressable>
        </View>

        <View style={styles.balanceBlock}>
          {me.loading && !me.wallet ? (
            <ActivityIndicator color={INK} />
          ) : (
            <Pressable onPress={() => setHidden((v) => !v)} style={styles.balancePress}>
              <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit>
                {balanceText}
              </Text>
              <Ionicons
                name={hidden ? "eye-off-outline" : "eye-outline"}
                size={ICON.sm}
                color={MUTED}
                style={styles.balanceEye}
              />
            </Pressable>
          )}
          <Text style={styles.balanceLabel}>Hamyon balansi</Text>
        </View>

        <View style={styles.quickRow}>
          {QUICK.map((item) => (
            <Pressable
              key={item.key}
              style={styles.quickItem}
              onPress={() => {
                if (!requireAuth()) return;
                navigation.navigate(item.key);
              }}
            >
              <View style={styles.quickBtn}>
                <Ionicons name={item.icon} size={ICON.lg} color={INK} />
              </View>
              <Text style={styles.quickLabel} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Tezkor yuborish</Text>
          <Pressable onPress={() => navigation.navigate("WalletGift")}>
            <Text style={styles.seeAll}>Hammasi</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.contactsRow}
        >
          {quickContacts.map((h) => (
            <Pressable
              key={h.userId}
              style={styles.contactItem}
              onPress={() => openRecipient(h)}
            >
              <View style={[styles.contactAvatar, { backgroundColor: avatarColor(h.userId) }]}>
                <Text style={styles.contactInitials}>{initials(h.fullName)}</Text>
                {h.lastSentAt ? (
                  <View style={styles.sentDot}>
                    <Ionicons name="checkmark" size={8} color="#FFF" />
                  </View>
                ) : null}
              </View>
              <Text style={styles.contactName} numberOfLines={1}>
                {h.fullName.split(/\s+/)[0]}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={styles.contactItem}
            onPress={() => {
              if (!requireAuth()) return;
              navigation.navigate("WalletGift");
            }}
          >
            <View style={styles.addContact}>
              <Ionicons name="add" size={ICON.lg} color="#6B7280" />
            </View>
            <Text style={styles.contactName}>Yangi</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Promo — faqat balandligi yetadigan ekranlarda; SE da tranzaksiyalarga joy qoladi. */}
      {showPromo ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promoRow}
        >
          <LinearGradient
            colors={["#F0F0F0", "#E5E5E5", "#F0F0F0"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.promoCard}
          >
            <View style={styles.promoTextCol}>
              <Text style={styles.promoTitle}>Sovg'a bonusi</Text>
              <Text style={styles.promoDesc} numberOfLines={3}>
                Do'stlarga sovg'a yuboring — har bir yuborish bilan bonus o'sadi!
              </Text>
            </View>
            <Pressable style={styles.promoGift} onPress={() => navigation.navigate("WalletGifts")}>
              <Ionicons name="gift" size={ICON.xl} color="#111111" />
            </Pressable>
          </LinearGradient>

          <LinearGradient
            colors={["#F0F0F0", "#F0F0F0", "#F0F0F0"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.promoCard}
          >
            <View style={styles.promoTextCol}>
              <Text style={styles.promoTitle}>Rekvizitlar</Text>
              <Text style={styles.promoDesc} numberOfLines={3}>
                Hamyon raqami va karta ma'lumotlarini bir joydan ko'ring.
              </Text>
            </View>
            <Pressable
              style={styles.promoGift}
              onPress={() => navigation.navigate("WalletRequisites")}
            >
              <Ionicons name="card-outline" size={ICON.lg} color="#111111" />
            </Pressable>
          </LinearGradient>
        </ScrollView>
      ) : null}

      {/* Yagona scroll zonasi — sahifaning o'zi hech qachon scroll qilmaydi. */}
      <View style={styles.txSection}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Tranzaksiyalar</Text>
          <Pressable onPress={() => navigation.navigate("WalletTransactions")}>
            <Text style={styles.seeAll}>Hammasi</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.txScroll}
          contentContainerStyle={styles.txScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={INK} />
          }
        >
          {tx.loading ? (
            <ActivityIndicator style={styles.txLoader} color={INK} />
          ) : recent.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.empty}>Hali tranzaksiya yo'q</Text>
              <Pressable style={styles.emptyCta} onPress={() => navigation.navigate("WalletTopUp")}>
                <Text style={styles.emptyCtaText}>To'ldirish</Text>
              </Pressable>
            </View>
          ) : (
            recent.map((item) => (
              <TxRow key={item.id} item={item} onPress={() => setSelectedTx(item)} />
            ))
          )}

          {me.error ? <Text style={styles.err}>{me.error}</Text> : null}
        </ScrollView>
      </View>

      <WalletTransactionReceiptSheet
        tx={selectedTx}
        visible={!!selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </View>
  );
}

function TxRow({ item, onPress }: { item: WalletTx; onPress: () => void }) {
  const out = item.kind === "out";
  return (
    <Pressable style={styles.txRow} onPress={onPress}>
      <View style={[styles.avatar, { backgroundColor: avatarColor(item.id) }]}>
        <Text style={styles.avatarText}>{initials(item.title)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.txTitle} numberOfLines={1}>
          {item.title.replace(/^Sovg'a · /, "")}
        </Text>
        <Text style={styles.txDate}>{formatTxTime(item.createdAt)}</Text>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmt, out ? styles.txOut : styles.txIn]}>
          {out ? "-" : "+"}
          {formatMoney(Math.abs(item.amount))}
        </Text>
        <Text style={styles.txKind}>{txStatusLabel(item)}</Text>
      </View>
    </Pressable>
  );
}

const ICON = {
  sm: scale(16),
  md: scale(20),
  lg: scale(22),
  xl: scale(28),
} as const;

const AVATAR = scale(IS_SMALL_DEVICE ? 40 : 46);
const QUICK_TILE = scale(IS_SMALL_DEVICE ? 48 : 58);
const CONTACT_TILE = scale(IS_SMALL_DEVICE ? 48 : 58);
const TX_AVATAR = scale(IS_SMALL_DEVICE ? 40 : 48);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SOFT_BG },
  heroCard: {
    marginHorizontal: scale(16),
    marginBottom: spacing.xs,
    borderRadius: moderateScale(32),
    paddingHorizontal: scale(20),
    paddingBottom: spacing.lg,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
    flex: 1,
  },
  profileAvatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileImg: { width: AVATAR, height: AVATAR },
  profileInitials: { fontSize: fontSize(15), fontWeight: "700", color: INK },
  hello: { fontSize: fontSize(16), fontWeight: "700", color: INK },
  welcome: { marginTop: verticalScale(2), fontSize: fontSize(13), color: MUTED, fontWeight: "400" },
  bellBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(44) / 2,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  balanceBlock: { alignItems: "center", marginBottom: spacing.xl },
  balancePress: { flexDirection: "row", alignItems: "flex-end", maxWidth: "100%" },
  balanceEye: { marginLeft: scale(8), marginBottom: verticalScale(4) },
  balance: {
    fontSize: fontSize(IS_SMALL_DEVICE ? 30 : 36),
    fontWeight: "700",
    color: INK,
    letterSpacing: -0.8,
  },
  balanceLabel: {
    marginTop: spacing.xs,
    fontSize: fontSize(13),
    color: MUTED,
    fontWeight: "500",
  },
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: scale(4),
  },
  quickItem: { alignItems: "center", gap: spacing.xs, width: scale(68) },
  quickBtn: {
    width: QUICK_TILE,
    height: QUICK_TILE,
    borderRadius: radius.lg,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#111111",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 3,
  },
  quickLabel: {
    fontSize: fontSize(12),
    fontWeight: "500",
    color: "#4B5563",
    textAlign: "center",
  },
  section: { paddingHorizontal: scale(20), marginTop: spacing.md },
  txSection: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: scale(20),
    marginTop: spacing.md,
  },
  txScroll: { flex: 1 },
  txScrollContent: { paddingBottom: spacing.sm },
  txLoader: { marginTop: spacing.lg },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: fontSize(17), fontWeight: "700", color: INK },
  seeAll: { fontSize: fontSize(13), fontWeight: "500", color: MUTED },
  contactsRow: { gap: scale(16), paddingRight: scale(8) },
  contactItem: { alignItems: "center", width: scale(64), gap: spacing.xs },
  contactAvatar: {
    width: CONTACT_TILE,
    height: CONTACT_TILE,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  sentDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: scale(16),
    height: scale(16),
    borderRadius: scale(16) / 2,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FAFAFA",
  },
  contactInitials: { fontSize: fontSize(15), fontWeight: "700", color: INK },
  contactName: {
    fontSize: fontSize(12),
    fontWeight: "500",
    color: "#4B5563",
    textAlign: "center",
  },
  addContact: {
    width: CONTACT_TILE,
    height: CONTACT_TILE,
    borderRadius: radius.lg,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  promoRow: {
    paddingHorizontal: scale(20),
    gap: moderateScale(12),
    marginTop: spacing.md,
    paddingBottom: verticalScale(4),
  },
  promoCard: {
    width: widthPercent(72),
    maxWidth: scale(300),
    minHeight: verticalScale(IS_SMALL_DEVICE ? 88 : 110),
    borderRadius: radius.xl,
    padding: moderateScale(IS_SMALL_DEVICE ? 14 : 18),
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
  },
  promoTextCol: { flex: 1 },
  promoTitle: {
    fontSize: fontSize(16),
    fontWeight: "700",
    color: INK,
    marginBottom: spacing.xs,
  },
  promoDesc: {
    fontSize: fontSize(12),
    lineHeight: fontSize(17),
    color: "#6B7280",
    fontWeight: "400",
  },
  promoGift: {
    width: scale(52),
    height: scale(52),
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: { alignItems: "center", paddingVertical: spacing.xl, gap: spacing.sm },
  empty: { color: MUTED, fontSize: fontSize(14) },
  emptyCta: {
    backgroundColor: INK,
    borderRadius: radius.pill,
    paddingHorizontal: scale(18),
    paddingVertical: spacing.sm,
  },
  emptyCtaText: { color: "#FFF", fontWeight: "700", fontSize: fontSize(13) },
  err: {
    marginTop: spacing.sm,
    color: "#DC2626",
    fontSize: fontSize(13),
    textAlign: "center",
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: TX_AVATAR,
    height: TX_AVATAR,
    borderRadius: TX_AVATAR / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "700", fontSize: fontSize(14), color: INK },
  txTitle: { fontSize: fontSize(15), fontWeight: "600", color: INK },
  txDate: { marginTop: verticalScale(3), fontSize: fontSize(12), color: MUTED },
  txRight: { alignItems: "flex-end" },
  txAmt: { fontSize: fontSize(15), fontWeight: "700" },
  txOut: { color: "#EF4444" },
  txIn: { color: "#16A34A" },
  txKind: { marginTop: verticalScale(3), fontSize: fontSize(12), color: MUTED },
});
