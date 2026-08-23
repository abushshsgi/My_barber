import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../auth/AuthContext";
import { WalletPlasticCard } from "../../components/wallet/WalletPlasticCard";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useWalletMe } from "../../hooks/useWallet";
import { formatSomLabel } from "../../lib/wallet-format";
import type { WalletStackParamList } from "../../navigation/WalletStack";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletMore">;

type Link = {
  key: keyof WalletStackParamList;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const PRIMARY: Link[] = [
  {
    key: "WalletGifts",
    title: "Olingan sovg'alar",
    subtitle: "Sizga kelgan sovg'alar",
    icon: "gift-outline",
  },
  {
    key: "WalletRequisites",
    title: "Mening kartam",
    subtitle: "Rekvizit va nusxa olish",
    icon: "card-outline",
  },
  {
    key: "WalletTransactions",
    title: "Tarix",
    subtitle: "Kirim va chiqimlar",
    icon: "receipt-outline",
  },
];

const SECONDARY: Link[] = [
  {
    key: "WalletTopUp",
    title: "To'ldirish",
    subtitle: "Balansni oshirish",
    icon: "add-circle-outline",
  },
  {
    key: "WalletGift",
    title: "O'tkazma",
    subtitle: "Do'stga yuborish",
    icon: "paper-plane-outline",
  },
  {
    key: "WalletQrPay",
    title: "QR to'lov",
    subtitle: "Skaner orqali to'lash",
    icon: "qr-code-outline",
  },
];

/** Ko'proq — vertikal hub (karta + bo'limlar). */
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <LinearGradient
          colors={["#0F172A", "#1E293B"]}
          style={[styles.hero, { paddingTop: insets.top + 6 }]}
        >
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <Text style={styles.headerTitle}>Hamyon</Text>
            <View style={styles.backBtn} />
          </View>

          <Text style={styles.balHint}>Joriy balans</Text>
          <Text style={styles.bal}>{formatSomLabel(me.balance)}</Text>

          <View style={styles.cardWrap}>
            <WalletPlasticCard
              balance={me.balance}
              cardholderName={holder}
              walletNumber={me.walletNumber}
            />
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <Text style={styles.section}>Asosiy</Text>
          <View style={styles.list}>
            {PRIMARY.map((item, i) => (
              <Pressable
                key={item.key}
                style={[styles.row, i < PRIMARY.length - 1 && styles.rowBorder]}
                onPress={() => navigation.navigate(item.key as never)}
              >
                <View style={styles.iconBox}>
                  <Ionicons name={item.icon} size={20} color="#111" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowSub}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
              </Pressable>
            ))}
          </View>

          <Text style={[styles.section, { marginTop: 20 }]}>Amallar</Text>
          <View style={styles.list}>
            {SECONDARY.map((item, i) => (
              <Pressable
                key={item.key}
                style={[styles.row, i < SECONDARY.length - 1 && styles.rowBorder]}
                onPress={() => navigation.navigate(item.key as never)}
              >
                <View style={styles.iconBox}>
                  <Ionicons name={item.icon} size={20} color="#111" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowSub}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
              </Pressable>
            ))}
          </View>

          <Text style={styles.tip}>
            Keyinroq qo‘shish mumkin: limmitlar, bildirishnomalar, oilaviy hamyon, cheklar PDF.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F4F6" },
  scroll: { paddingBottom: 28 },
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
    color: "#FFF",
  },
  balHint: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "600" },
  bal: {
    marginTop: 4,
    marginBottom: 18,
    color: "#FFF",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  cardWrap: {
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  content: { paddingHorizontal: 16, marginTop: -8, paddingTop: 20 },
  section: {
    marginBottom: 10,
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  list: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 15, fontWeight: "700", color: "#111" },
  rowSub: { marginTop: 2, fontSize: 12, color: "#9CA3AF" },
  tip: {
    marginTop: 18,
    fontSize: 12,
    lineHeight: 18,
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 12,
  },
});
