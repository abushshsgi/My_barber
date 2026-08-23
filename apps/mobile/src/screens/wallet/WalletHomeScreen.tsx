import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { morfMarkWhite } from "../../branding/morf-logo";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useWalletMe, useWalletTransactions } from "../../hooks/useWallet";
import { useAppShell } from "../../lib/AppShellContext";
import {
  navigateRootTab,
  useShellNavigation,
} from "../../lib/shell-nav";
import type { WalletTx } from "../../lib/wallet-format";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import { useAuth } from "../../auth/AuthContext";

const mysaloonIcon = require("../../../assets/icon.png");

type Props = NativeStackScreenProps<WalletStackParamList, "WalletHome">;

const PURPLE = ["#5B4ED6", "#6E5EF0", "#8574FF"] as const;
const FAB_BLUE = "#4C63F2";
const PROMO_NAVY = "#241E6B";
const MUTED = "#9CA3AF";
const INK = "#111827";
const AVATAR_TONES = ["#C4B5FD", "#FDBA74", "#6EE7B7", "#F9A8D4", "#93C5FD"];

const QUICK: {
  key: "WalletGift" | "WalletTopUp" | "WalletQrPay" | "WalletRequisites";
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: [string, string];
}[] = [
  { key: "WalletGift", label: "O'tkazma", icon: "swap-horizontal", colors: ["#EDE9FE", "#DDD6FE"] },
  { key: "WalletTopUp", label: "To'ldirish", icon: "card-outline", colors: ["#FFEDD5", "#FED7AA"] },
  { key: "WalletQrPay", label: "To'lov", icon: "arrow-up", colors: ["#D1FAE5", "#A7F3D0"] },
  {
    key: "WalletRequisites",
    label: "Rekvizit",
    icon: "document-text-outline",
    colors: ["#DBEAFE", "#BFDBFE"],
  },
];

function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("en-US");
}

function formatTxDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function txKindLabel(entryType: string): string {
  if (entryType === "topup") return "To'ldirish";
  if (entryType.startsWith("gift")) return "O'tkazma";
  return "To'lov";
}

function initials(title: string): string {
  const clean = title.replace(/^Sovg'a · /, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
  }
  return (clean.charAt(0) || "?").toUpperCase();
}

function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h + id.charCodeAt(i) * (i + 1)) % AVATAR_TONES.length;
  return AVATAR_TONES[h]!;
}

export function WalletHomeScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const me = useWalletMe();
  const tx = useWalletTransactions("all");
  const { shell, beginSwitch, endSwitch, switchToMorphTarget, switchToMysaloonTarget, rememberTab } =
    useAppShell();
  const { goMorph, goMysaloon } = useShellNavigation();
  const isMorph = shell === "morph";
  const [refreshing, setRefreshing] = useState(false);
  const [hidden, setHidden] = useState(false);
  const switching = useRef(false);

  const recent = tx.items.slice(0, 8);
  const tabH = 64 + Math.max(insets.bottom, 10);
  const sheetMin = Math.max(420, Dimensions.get("window").height * 0.52);

  const balanceText = useMemo(() => (hidden ? "••••••" : formatMoney(me.balance)), [hidden, me.balance]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    me.refresh();
    tx.refresh();
    setTimeout(() => setRefreshing(false), 700);
  }, [me, tx]);

  const onRequest = useCallback(async () => {
    const number = me.walletNumber.replace(/(.{4})/g, "$1 ").trim();
    if (!number) return;
    try {
      await Share.share({
        message: `Mening Mysaloon hamyon raqamim: ${number}`,
        title: "Hamyon raqami",
      });
    } catch {
      /* ignore */
    }
  }, [me.walletNumber]);

  const requireAuth = useCallback(() => {
    if (isAuthenticated) return true;
    navigateRootTab(navigation, "Profile");
    return false;
  }, [isAuthenticated, navigation]);

  const goMysaloonTab = useCallback(
    (tab: string) => {
      if (!requireAuth() && tab !== "Profile") return;
      goMysaloon(navigation, tab);
    },
    [navigation, requireAuth, goMysaloon],
  );

  const goMorphTab = useCallback(
    (tab: string) => {
      if (!requireAuth() && tab !== "Profile") return;
      goMorph(navigation, tab);
    },
    [navigation, requireAuth, goMorph],
  );

  /** MySaloon → Morf: faqat ongli switch (xavfsiz). */
  const switchToMorph = useCallback(() => {
    if (switching.current) return;
    if (!requireAuth()) return;
    switching.current = true;
    beginSwitch("morph");
    void (async () => {
      try {
        const target = await switchToMorphTarget();
        navigateRootTab(navigation, target);
        rememberTab("morph", target);
      } finally {
        setTimeout(() => {
          endSwitch();
          switching.current = false;
        }, 700);
      }
    })();
  }, [
    beginSwitch,
    endSwitch,
    switchToMorphTarget,
    navigation,
    rememberTab,
    requireAuth,
  ]);

  /** Morf → MySaloon: faqat ongli switch. */
  const switchToMysaloon = useCallback(() => {
    if (switching.current) return;
    switching.current = true;
    beginSwitch("mysaloon");
    void (async () => {
      try {
        const target = await switchToMysaloonTarget();
        navigateRootTab(navigation, target);
        rememberTab("mysaloon", target);
      } finally {
        setTimeout(() => {
          endSwitch();
          switching.current = false;
        }, 700);
      }
    })();
  }, [beginSwitch, endSwitch, switchToMysaloonTarget, navigation, rememberTab]);

  const goBackSafe = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    if (isMorph) goMorph(navigation, "Profile");
    else goMysaloon(navigation, "Profile");
  }, [navigation, isMorph, goMorph, goMysaloon]);

  const quickItems = useMemo(() => {
    if (isMorph) {
      return QUICK.filter((q) => q.key !== "WalletQrPay");
    }
    return QUICK;
  }, [isMorph]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient colors={[...PURPLE]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.root}>
        <View style={[styles.orb, styles.orbA]} />
        <View style={[styles.orb, styles.orbB]} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" colors={["#FFF"]} />
          }
        >
          <View style={[styles.hero, { paddingTop: Math.max(insets.top, 12) }]}>
            <View style={styles.header}>
              <Pressable
                onPress={goBackSafe}
                hitSlop={10}
                style={styles.backBtn}
                accessibilityRole="button"
                accessibilityLabel="Orqaga"
              >
                <Ionicons name="chevron-back" size={22} color="#FFF" />
              </Pressable>
              <View style={styles.brand}>
                <View style={styles.brandMark}>
                  <Text style={styles.brandDollar}>{isMorph ? "M" : "$"}</Text>
                </View>
                <Text style={styles.brandName}>{isMorph ? "Morf AI" : "Mysaloon"}</Text>
              </View>
              <Pressable
                onPress={() => navigation.navigate("WalletRequisites")}
                hitSlop={10}
                style={styles.backBtn}
                accessibilityLabel="Rekvizitlar"
              >
                <Ionicons name="card-outline" size={20} color="#FFF" />
              </Pressable>
            </View>

            <Text style={styles.balanceLabel}>Hamyon balansi</Text>
            <View style={styles.balanceRow}>
              {me.loading && !me.wallet ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.balance}>{balanceText}</Text>
              )}
              <Pressable onPress={() => setHidden((v) => !v)} hitSlop={8} style={styles.eyeBtn}>
                <Ionicons name={hidden ? "eye-off-outline" : "eye-outline"} size={18} color="rgba(255,255,255,0.85)" />
              </Pressable>
            </View>

            {me.walletNumber ? (
              <Pressable style={styles.walletChip} onPress={() => navigation.navigate("WalletRequisites")}>
                <Text style={styles.walletChipText}>
                  {me.walletNumber.replace(/(.{4})/g, "$1 ").trim()}
                </Text>
                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.75)" />
              </Pressable>
            ) : null}

            <View style={styles.ctaRow}>
              <Pressable style={styles.cta} onPress={() => navigation.navigate("WalletGift")}>
                <Text style={styles.ctaText}>Yuborish</Text>
              </Pressable>
              <Pressable style={styles.cta} onPress={onRequest}>
                <Text style={styles.ctaText}>So'rash</Text>
              </Pressable>
            </View>

            {isMorph ? (
              <View style={styles.promo}>
                <View style={styles.promoLeft}>
                  <View style={styles.promoIcon}>
                    <Ionicons name="sparkles" size={14} color="#FFF" />
                  </View>
                  <Text style={styles.promoText}>Morph AI aksiya</Text>
                </View>
                <Pressable style={styles.promoBtn} onPress={() => navigation.navigate("WalletGifts")}>
                  <Text style={styles.promoBtnText}>Olish</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.promo}>
                <View style={styles.promoLeft}>
                  <View style={styles.promoIcon}>
                    <Ionicons name="shield-checkmark" size={14} color="#FFF" />
                  </View>
                  <Text style={styles.promoText}>Hamyon himoyalangan</Text>
                </View>
                <Pressable style={styles.promoBtn} onPress={() => navigation.navigate("WalletRequisites")}>
                  <Text style={styles.promoBtnText}>Rekvizit</Text>
                </Pressable>
              </View>
            )}
          </View>

          <View style={[styles.sheet, { minHeight: sheetMin, paddingBottom: tabH + 16 }]}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Tezkor amallar</Text>
              <Pressable onPress={() => navigation.navigate("WalletRequisites")}>
                <Text style={styles.seeMore}>Rekvizitlar</Text>
              </Pressable>
            </View>

            <View style={styles.quickRow}>
              {quickItems.map((item) => (
                <Pressable
                  key={item.key}
                  style={styles.quickItem}
                  onPress={() => {
                    if (!requireAuth()) return;
                    navigation.navigate(item.key);
                  }}
                >
                  <LinearGradient colors={item.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quickCard}>
                    <View style={styles.quickIcon}>
                      <Ionicons name={item.icon} size={20} color={INK} />
                    </View>
                  </LinearGradient>
                  <Text style={styles.quickLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={[styles.sectionHead, { marginTop: 22 }]}>
              <Text style={styles.sectionTitle}>Tranzaksiyalar</Text>
              <Pressable onPress={() => navigation.navigate("WalletTransactions")}>
                <Text style={styles.seeMore}>Barchasi</Text>
              </Pressable>
            </View>

            {tx.loading ? (
              <ActivityIndicator style={{ marginTop: 28 }} color={FAB_BLUE} />
            ) : recent.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.empty}>Hali tranzaksiya yo'q</Text>
                <Pressable style={styles.emptyCta} onPress={() => navigation.navigate("WalletTopUp")}>
                  <Text style={styles.emptyCtaText}>To'ldirish</Text>
                </Pressable>
              </View>
            ) : (
              recent.map((item) => <TxRow key={item.id} item={item} />)
            )}

            {me.error ? <Text style={styles.err}>{me.error}</Text> : null}
          </View>
        </ScrollView>

        <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {isMorph ? (
            <>
              <TabItem
                icon="chatbubble-ellipses-outline"
                label="Chat"
                active={false}
                onPress={() => goMorphTab("MorphChat")}
              />
              <TabItem
                icon="water-outline"
                label="Parvarish"
                active={false}
                onPress={() => goMorphTab("MorphCare")}
              />
              <View style={styles.fabSlot}>
                <Pressable
                  style={styles.fab}
                  onPress={switchToMysaloon}
                  accessibilityRole="button"
                  accessibilityLabel="MySaloon"
                >
                  <Image source={mysaloonIcon} style={styles.fabAppIcon} contentFit="cover" />
                </Pressable>
                <Text style={styles.fabLabel}>MySaloon</Text>
              </View>
              <TabItem
                icon="sparkles-outline"
                label="Try-on"
                active={false}
                onPress={() => goMorphTab("MorphTryOn")}
              />
              <TabItem icon="person" label="Profil" active onPress={goBackSafe} />
            </>
          ) : (
            <>
              <TabItem
                icon="home-outline"
                label="Asosiy"
                active={false}
                onPress={() => goMysaloonTab("Home")}
              />
              <TabItem
                icon="map-outline"
                label="Xarita"
                active={false}
                onPress={() => goMysaloonTab("Map")}
              />
              <View style={styles.fabSlot}>
                <Pressable
                  style={styles.fab}
                  onPress={switchToMorph}
                  accessibilityRole="button"
                  accessibilityLabel="Morf AI"
                >
                  <Image source={morfMarkWhite} style={styles.fabLogo} contentFit="contain" />
                </Pressable>
                <Text style={styles.fabLabel}>Morf AI</Text>
              </View>
              <TabItem
                icon="compass-outline"
                label="Explore"
                active={false}
                onPress={() => goMysaloonTab("Explore")}
              />
              <TabItem icon="person-outline" label="Profil" active onPress={goBackSafe} />
            </>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

function TabItem({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.tabItem} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={22} color={active ? INK : MUTED} />
      <Text style={[styles.tabLabel, active && styles.tabLabelOn]}>{label}</Text>
    </Pressable>
  );
}

function TxRow({ item }: { item: WalletTx }) {
  return (
    <View style={styles.txRow}>
      <View style={[styles.avatar, { backgroundColor: avatarColor(item.id) }]}>
        <Text style={styles.avatarText}>{initials(item.title)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.txTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.txDate}>{formatTxDay(item.createdAt)}</Text>
      </View>
      <View style={styles.txRight}>
        <Text style={styles.txAmt}>
          {item.kind === "in" ? "+" : "−"}
          {formatMoney(Math.abs(item.amount))}
        </Text>
        <Text style={styles.txKind}>{txKindLabel(item.entryType)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#5B4ED6" },
  orb: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  orbA: { top: -70, right: -80 },
  orbB: { top: 160, left: -110, width: 260, height: 260, borderRadius: 130 },
  scrollContent: { flexGrow: 1 },
  hero: { paddingHorizontal: 20, paddingBottom: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandDollar: { color: "#FFF", fontWeight: "800", fontSize: 14 },
  brandName: { color: "#FFF", fontWeight: "700", fontSize: 17, letterSpacing: -0.2 },
  balanceLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
  },
  balanceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  balance: {
    color: "#FFF",
    fontSize: 42,
    fontWeight: "700",
    letterSpacing: -1.2,
  },
  eyeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  walletChip: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  walletChipText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
  },
  ctaRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  cta: {
    flex: 1,
    height: 46,
    borderRadius: 999,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: INK, fontWeight: "700", fontSize: 14 },
  promo: {
    marginTop: 14,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: PROMO_NAVY,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  promoLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  promoIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  promoText: { color: "#FFF", fontWeight: "600", fontSize: 13 },
  promoBtn: {
    backgroundColor: "#FFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  promoBtnText: { color: PROMO_NAVY, fontWeight: "700", fontSize: 12 },
  sheet: {
    marginTop: 10,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: INK },
  seeMore: { fontSize: 13, fontWeight: "600", color: FAB_BLUE },
  quickRow: { flexDirection: "row", gap: 10 },
  quickItem: { flex: 1, alignItems: "center", gap: 8 },
  quickCard: {
    width: "100%",
    aspectRatio: 1,
    maxHeight: 72,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { fontSize: 11, fontWeight: "600", color: "#4B5563", textAlign: "center" },
  emptyBox: { alignItems: "center", paddingVertical: 28, gap: 12 },
  empty: { color: MUTED, fontSize: 14 },
  emptyCta: {
    backgroundColor: FAB_BLUE,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  emptyCtaText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  err: { marginTop: 12, color: "#DC2626", fontSize: 13, textAlign: "center" },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(15,23,42,0.06)",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "700", fontSize: 13, color: INK },
  txTitle: { fontSize: 14, fontWeight: "600", color: INK },
  txDate: { marginTop: 2, fontSize: 11, color: MUTED },
  txRight: { alignItems: "flex-end" },
  txAmt: { fontSize: 14, fontWeight: "700", color: INK },
  txKind: { marginTop: 2, fontSize: 11, color: MUTED },
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(15,23,42,0.08)",
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tabItem: { flex: 1, alignItems: "center", gap: 2, paddingBottom: 2 },
  tabLabel: { fontSize: 10, fontWeight: "500", color: MUTED },
  tabLabelOn: { color: INK, fontWeight: "700" },
  fabSlot: { width: 72, alignItems: "center", marginTop: -22 },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  fabLogo: { width: 28, height: 28 },
  fabAppIcon: { width: 28, height: 28, borderRadius: 8 },
  fabLabel: { marginTop: 4, fontSize: 10, fontWeight: "600", color: INK },
});
