import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
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
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletHome">;

const INK = "#111111";
const MUTED = "#737373";
const SOFT_BG = "#FFFFFF";
const AVATAR_TONES = ["#111111", "#737373", "#A3A3A3", "#D4D4D4", "#525252", "#E5E5E5"];

const QUICK_META: {
  key: "WalletGift" | "WalletTopUp" | "WalletQrPay" | "WalletMore";
  labelKey: "walletPages.transfer" | "walletPages.payment" | "walletPages.topUp" | "walletPages.moreTitle";
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "WalletGift", labelKey: "walletPages.transfer", icon: "arrow-up-outline" },
  { key: "WalletQrPay", labelKey: "walletPages.payment", icon: "arrow-down-outline" },
  { key: "WalletTopUp", labelKey: "walletPages.topUp", icon: "add" },
  { key: "WalletMore", labelKey: "walletPages.moreTitle", icon: "grid-outline" },
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

function txStatusLabel(item: WalletTx, label: (key: string) => string): string {
  if (item.kind === "in") return label("walletPages.received");
  if (item.entryType === "topup") return label("walletPages.topUp");
  if (item.entryType.startsWith("gift")) return label("walletPages.sent");
  return label("walletPages.payment");
}

function firstName(full: string | null | undefined, fallback: string): string {
  const clean = (full || "").trim();
  if (!clean) return fallback;
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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const me = useWalletMe();
  const tx = useWalletTransactions("all");
  const [refreshing, setRefreshing] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [selectedTx, setSelectedTx] = useState<WalletTx | null>(null);
  const [history, setHistory] = useState<RecipientHistoryItem[]>([]);

  const { width: windowWidth } = useWindowDimensions();
  const dockPad = TAB_DOCK_CLEARANCE + Math.max(insets.bottom, 8);
  const promoWidth = Math.round(
    Math.min(scale(248), Math.max(scale(188), windowWidth - scale(88))),
  );

  const recent = tx.items.slice(0, 8);
  const greetName = firstName(user?.first_name || user?.full_name, t("walletPages.friend"));
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

      <View
        style={[
          styles.heroCard,
          { paddingTop: Math.max(insets.top, verticalScale(12)) + spacing.xs },
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
            <View style={styles.helloCol}>
              <Text style={styles.hello} numberOfLines={1}>{t("walletPages.hello")}, {greetName}</Text>
              <Text style={styles.welcome} numberOfLines={1}>{t("walletPages.welcome")}</Text>
            </View>
          </Pressable>
          <Pressable
            style={styles.bellBtn}
            onPress={() => navigation.navigate("WalletMore")}
            accessibilityLabel={t("walletPages.moreTitle")}
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
          <Text style={styles.balanceLabel}>{t("walletPages.balanceLabel")}</Text>
        </View>

        <View style={styles.quickRow}>
          {QUICK_META.map((item) => (
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
              <Text style={styles.quickLabel} numberOfLines={2}>
                {t(item.labelKey)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t("walletPages.quickSend")}</Text>
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
            <Text style={styles.contactName}>{t("walletPages.newContact")}</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Sovg'a va karta kartochkalari — bo'sh tasma qolmasin. */}
      <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.promoScroll}
          contentContainerStyle={styles.promoRow}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("WalletGifts")}
            style={({ pressed }) => [
              styles.promoCard,
              { width: promoWidth },
              pressed && styles.promoPressed,
            ]}
          >
            <View style={styles.promoIcon}>
              <Ionicons name="gift-outline" size={ICON.md} color={INK} />
            </View>
            <View style={styles.promoTextCol}>
              <Text style={styles.promoTitle} numberOfLines={1}>
                {t("walletPages.giftBonus")}
              </Text>
              <Text style={styles.promoDesc} numberOfLines={2}>
                {t("walletPages.giftPromoBody")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={ICON.sm} color="#A3A3A3" />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("WalletRequisites")}
            style={({ pressed }) => [
              styles.promoCard,
              { width: promoWidth },
              pressed && styles.promoPressed,
            ]}
          >
            <View style={styles.promoIcon}>
              <Ionicons name="card-outline" size={ICON.md} color={INK} />
            </View>
            <View style={styles.promoTextCol}>
              <Text style={styles.promoTitle} numberOfLines={1}>
                {t("walletPages.requisites")}
              </Text>
              <Text style={styles.promoDesc} numberOfLines={2}>
                {t("walletPages.cardPromoBody")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={ICON.sm} color="#A3A3A3" />
          </Pressable>
      </ScrollView>

      {/* Yagona scroll zonasi — sahifaning o'zi hech qachon scroll qilmaydi. */}
      <View style={styles.txSection}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t("walletPages.transactions")}</Text>
          <Pressable onPress={() => navigation.navigate("WalletTransactions")}>
            <Text style={styles.seeAll}>{t("common.viewAll")}</Text>
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
          {tx.loading && recent.length === 0 ? (
            <ActivityIndicator style={styles.txLoader} color={INK} />
          ) : recent.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.empty}>{t("walletPages.noTx")}</Text>
              <Pressable style={styles.emptyCta} onPress={() => navigation.navigate("WalletTopUp")}>
                <Text style={styles.emptyCtaText}>{t("wallet.topUp")}</Text>
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
  const { t } = useTranslation();
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
        <Text style={styles.txKind}>{txStatusLabel(item, t)}</Text>
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
    marginBottom: spacing.xs,
    paddingHorizontal: scale(20),
    paddingBottom: spacing.lg,
    backgroundColor: SOFT_BG,
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
    backgroundColor: SOFT_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E7E7E7",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileImg: { width: AVATAR, height: AVATAR },
  profileInitials: { fontSize: fontSize(15), fontWeight: "700", color: INK },
  helloCol: { flex: 1, minWidth: 0 },
  hello: { fontSize: fontSize(16), fontWeight: "700", color: INK },
  welcome: { marginTop: verticalScale(2), fontSize: fontSize(13), color: MUTED, fontWeight: "400" },
  bellBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(44) / 2,
    backgroundColor: SOFT_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E7E7E7",
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
    alignItems: "flex-start",
    width: "100%",
    gap: scale(6),
  },
  quickItem: { flex: 1, minWidth: 0, alignItems: "center", gap: spacing.xs },
  quickBtn: {
    width: "100%",
    maxWidth: QUICK_TILE,
    aspectRatio: 1,
    borderRadius: radius.lg,
    backgroundColor: SOFT_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E7E7E7",
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    width: "100%",
    fontSize: fontSize(11),
    lineHeight: fontSize(14),
    fontWeight: "600",
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
    borderColor: SOFT_BG,
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
    backgroundColor: SOFT_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E7E7E7",
    alignItems: "center",
    justifyContent: "center",
  },
  promoScroll: {
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: "stretch",
  },
  promoRow: {
    paddingHorizontal: scale(16),
    gap: moderateScale(10),
    marginTop: spacing.sm,
    paddingBottom: verticalScale(2),
    alignItems: "flex-start",
  },
  promoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    height: scale(72),
    maxWidth: scale(248),
    paddingHorizontal: moderateScale(12),
    borderRadius: radius.lg,
    backgroundColor: SOFT_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E7E7E7",
    shadowColor: "#111111",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  promoPressed: { opacity: 0.86 },
  promoIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: radius.sm,
    backgroundColor: SOFT_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  promoTextCol: { flex: 1, minWidth: 0 },
  promoTitle: {
    fontSize: fontSize(14),
    fontWeight: "700",
    color: INK,
    letterSpacing: -0.2,
  },
  promoDesc: {
    marginTop: verticalScale(2),
    fontSize: fontSize(12),
    lineHeight: fontSize(16),
    color: "#6B7280",
    fontWeight: "400",
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
