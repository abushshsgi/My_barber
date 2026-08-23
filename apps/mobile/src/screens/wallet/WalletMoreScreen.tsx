import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../auth/AuthContext";
import { WalletPlasticCard } from "../../components/wallet/WalletPlasticCard";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useWalletMe } from "../../hooks/useWallet";
import type { WalletStackParamList } from "../../navigation/WalletStack";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletMore">;

const INK = "#1A1A1A";
const MUTED = "#6B7280";

type MenuItem = {
  key: keyof WalletStackParamList;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: [string, string];
};

const MENU: MenuItem[] = [
  {
    key: "WalletGifts",
    title: "Olingan sovg'alar",
    subtitle: "Sizga yuborilgan sovg'alar",
    icon: "gift-outline",
    colors: ["#FCE7F3", "#FBCFE8"],
  },
  {
    key: "WalletRequisites",
    title: "Rekvizitlar",
    subtitle: "Hamyon va karta ma'lumotlari",
    icon: "card-outline",
    colors: ["#FFEDD5", "#FED7AA"],
  },
  {
    key: "WalletTransactions",
    title: "Tranzaksiyalar",
    subtitle: "To'liq tarix",
    icon: "time-outline",
    colors: ["#E0E7FF", "#C7D2FE"],
  },
  {
    key: "WalletTopUp",
    title: "To'ldirish",
    subtitle: "Hamyonni to'ldirish",
    icon: "add-circle-outline",
    colors: ["#D1FAE5", "#A7F3D0"],
  },
  {
    key: "WalletGift",
    title: "O'tkazma",
    subtitle: "Do'stga pul yuborish",
    icon: "paper-plane-outline",
    colors: ["#EDE9FE", "#DDD6FE"],
  },
  {
    key: "WalletQrPay",
    title: "QR to'lov",
    subtitle: "Sartaroshga QR orqali",
    icon: "qr-code-outline",
    colors: ["#CFFAFE", "#A5F3FC"],
  },
];

/** Ko'proq — karta + wallet menyu. */
export function WalletMoreScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const me = useWalletMe();
  const holder =
    me.card?.cardholder_name ||
    user?.full_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    "Foydalanuvchi";

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <LinearGradient
        colors={["#EDE7FF", "#F7F5F2", "#F7F5F2"]}
        locations={[0, 0.28, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={INK} />
        </Pressable>
        <Text style={styles.headerTitle}>Ko'proq</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.cardWrap}>
          <WalletPlasticCard
            balance={me.balance}
            cardholderName={holder}
            walletNumber={me.walletNumber}
          />
        </View>

        <Text style={styles.section}>Hamyon bo‘limlari</Text>

        <View style={styles.grid}>
          {MENU.map((item) => (
            <Pressable
              key={item.key}
              style={styles.menuCard}
              onPress={() => navigation.navigate(item.key as never)}
            >
              <LinearGradient
                colors={item.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.menuIcon}
              >
                <Ionicons name={item.icon} size={22} color={INK} />
              </LinearGradient>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSub} numberOfLines={2}>
                {item.subtitle}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={styles.listRow}
          onPress={() => navigation.navigate("WalletRequisites")}
        >
          <View style={styles.listIcon}>
            <Ionicons name="shield-checkmark-outline" size={20} color={INK} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.listTitle}>Xavfsizlik</Text>
            <Text style={styles.listSub}>Hamyon himoyalangan · Luhn raqam</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7F5F2" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: INK,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 28 },
  cardWrap: {
    marginBottom: 22,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  section: {
    marginBottom: 12,
    fontSize: 13,
    fontWeight: "700",
    color: MUTED,
    letterSpacing: 0.3,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  menuCard: {
    width: "47.5%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 14,
    minHeight: 120,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  menuTitle: { fontSize: 14, fontWeight: "800", color: INK, marginBottom: 4 },
  menuSub: { fontSize: 11, lineHeight: 15, color: MUTED },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  listTitle: { fontSize: 14, fontWeight: "700", color: INK },
  listSub: { marginTop: 2, fontSize: 12, color: MUTED },
});
