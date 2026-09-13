import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeBottom, safeTop } from "../../lib/safe-area";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useWalletMe } from "../../hooks/useWallet";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletMore">;

const INK = "#111111";
const MUTED = "#737373";
const SOFT_BG = "#FAFAFA";
const ICON_BG = "#F0F0F0";

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
    <View style={[styles.root, { paddingTop: safeTop(insets.top, 8), paddingBottom: safeBottom(insets.bottom, 0) }]}>
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
  root: { flex: 1, backgroundColor: SOFT_BG, paddingHorizontal: scale(16) },
  header: { flexDirection: "row", alignItems: "center", marginBottom: verticalScale(14) },
  iconBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(20),
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: fontSize(17),
    fontWeight: "800",
    color: INK,
  },
  scroll: { paddingBottom: verticalScale(28) },
  bonusWrap: {
    position: "relative",
    marginBottom: verticalScale(16),
    borderRadius: moderateScale(22),
    overflow: "hidden",
  },
  bonusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
    backgroundColor: "#FFF",
    borderRadius: moderateScale(22),
    padding: moderateScale(16),
  },
  bonusIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(14),
    backgroundColor: ICON_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  bonusTitle: { fontSize: fontSize(16), fontWeight: "800", color: INK },
  bonusSub: { marginTop: verticalScale(2), fontSize: fontSize(12), color: MUTED },
  soonPill: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: 999,
    backgroundColor: ICON_BG,
  },
  soonText: { fontSize: fontSize(11), fontWeight: "700", color: MUTED },
  bonusBlur: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(250,250,250,0.55)",
  },
  frozenBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    backgroundColor: "#F0F0F0",
    borderRadius: moderateScale(16),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    marginBottom: verticalScale(16),
  },
  frozenText: { flex: 1, fontSize: fontSize(13), fontWeight: "700", color: INK },
  section: {
    marginBottom: verticalScale(12),
    fontSize: fontSize(12),
    fontWeight: "700",
    color: MUTED,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: moderateScale(12) },
  tile: {
    width: "47.5%",
    flexGrow: 1,
    minWidth: "45%",
    backgroundColor: "#FFF",
    borderRadius: moderateScale(20),
    padding: moderateScale(14),
    gap: moderateScale(4),
  },
  tileIcon: {
    width: scale(42),
    height: scale(42),
    borderRadius: moderateScale(13),
    backgroundColor: ICON_BG,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(6),
  },
  tileTitle: { fontSize: fontSize(14), fontWeight: "800", color: INK, letterSpacing: -0.2 },
  tileSub: { fontSize: fontSize(11), color: MUTED, fontWeight: "500" },
});
