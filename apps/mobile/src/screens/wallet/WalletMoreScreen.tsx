import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useWalletMe } from "../../hooks/useWallet";
import type { WalletStackParamList } from "../../navigation/WalletStack";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletMore">;

const INK = "#1A1A1A";
const MUTED = "#8A8A8E";
const SOFT_BG = "#FAFAFA";
const ICON_BG = "#F0EEEA";

type GridItem = {
  key: keyof WalletStackParamList;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const GRID: GridItem[] = [
  {
    key: "WalletTopUp",
    title: "To'ldirish",
    subtitle: "Balansni oshirish",
    icon: "add-outline",
  },
  {
    key: "WalletGift",
    title: "O'tkazma",
    subtitle: "Do'stga yuborish",
    icon: "send-outline",
  },
  {
    key: "WalletGifts",
    title: "Olingan sovg'alar",
    subtitle: "Kelgan sovg'alar",
    icon: "gift-outline",
  },
  {
    key: "WalletTransactions",
    title: "Tarix",
    subtitle: "Kirim va chiqim",
    icon: "time-outline",
  },
  {
    key: "WalletRequisites",
    title: "Mening kartam",
    subtitle: "Rekvizitlar",
    icon: "card-outline",
  },
  {
    key: "WalletFreeze",
    title: "Kartani muzlatish",
    subtitle: "Xavfsizlik",
    icon: "snow-outline",
  },
  {
    key: "WalletFaq",
    title: "Savol-javob",
    subtitle: "Vopros i otvet",
    icon: "help-circle-outline",
  },
  {
    key: "WalletQrPay",
    title: "QR to'lov",
    subtitle: "Skaner orqali",
    icon: "qr-code-outline",
  },
];

/** Ko'proq — bonus banner (tez orada) + monoxrom grid. */
export function WalletMoreScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const me = useWalletMe();

  useFocusEffect(
    useCallback(() => {
      me.refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [me.refresh]),
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={INK} />
        </Pressable>
        <Text style={styles.headerTitle}>Ko'proq</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.bonusWrap} pointerEvents="none">
          <View style={styles.bonusCard}>
            <View style={styles.bonusIcon}>
              <Ionicons name="sparkles-outline" size={22} color={INK} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bonusTitle}>Bonuslar</Text>
              <Text style={styles.bonusSub}>Cashback va aksiyalar tez orada</Text>
            </View>
            <View style={styles.soonPill}>
              <Text style={styles.soonText}>Tez orada</Text>
            </View>
          </View>
          <View style={styles.bonusBlur} />
        </View>

        {me.isFrozen ? (
          <Pressable
            style={styles.frozenBanner}
            onPress={() => navigation.navigate("WalletFreeze", { isFrozen: true })}
          >
            <Ionicons name="snow-outline" size={18} color={INK} />
            <Text style={styles.frozenText}>Karta muzlatilgan — boshqarish</Text>
            <Ionicons name="chevron-forward" size={16} color={MUTED} />
          </Pressable>
        ) : null}

        <Text style={styles.section}>Amallar</Text>
        <View style={styles.grid}>
          {GRID.map((item) => {
            const isFreeze = item.key === "WalletFreeze";
            const title = isFreeze
              ? me.isFrozen
                ? "Kartani ochish"
                : "Kartani muzlatish"
              : item.title;
            const subtitle = isFreeze
              ? me.isFrozen
                ? "Hamyonni yana faollashtirish"
                : item.subtitle
              : item.subtitle;
            return (
              <Pressable
                key={item.key}
                style={styles.tile}
                onPress={() => {
                  if (isFreeze) {
                    navigation.navigate("WalletFreeze", { isFrozen: me.isFrozen });
                    return;
                  }
                  navigation.navigate(item.key as never);
                }}
              >
                <View style={styles.tileIcon}>
                  <Ionicons name={item.icon} size={22} color={INK} />
                </View>
                <Text style={styles.tileTitle} numberOfLines={2}>
                  {title}
                </Text>
                <Text style={styles.tileSub} numberOfLines={1}>
                  {subtitle}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SOFT_BG, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
    color: INK,
  },
  scroll: { paddingBottom: 28 },
  bonusWrap: {
    position: "relative",
    marginBottom: 16,
    borderRadius: 22,
    overflow: "hidden",
  },
  bonusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: 22,
    padding: 16,
  },
  bonusIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: ICON_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  bonusTitle: { fontSize: 16, fontWeight: "800", color: INK },
  bonusSub: { marginTop: 2, fontSize: 12, color: MUTED },
  soonPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: ICON_BG,
  },
  soonText: { fontSize: 11, fontWeight: "700", color: MUTED },
  bonusBlur: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(247,245,242,0.45)",
  },
  frozenBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EEEAE4",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  frozenText: { flex: 1, fontSize: 13, fontWeight: "700", color: INK },
  section: {
    marginBottom: 12,
    fontSize: 12,
    fontWeight: "700",
    color: MUTED,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: {
    width: "47.5%",
    flexGrow: 1,
    minWidth: "45%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 14,
    gap: 4,
  },
  tileIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: ICON_BG,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  tileTitle: { fontSize: 14, fontWeight: "800", color: INK, letterSpacing: -0.2 },
  tileSub: { fontSize: 11, color: MUTED, fontWeight: "500" },
});
