import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import type { WalletStackParamList } from "../../navigation/WalletStack";

type RouteName = "WalletLimits" | "WalletAlerts";
type Props = NativeStackScreenProps<WalletStackParamList, RouteName>;

const INK = "#1A1A1A";
const MUTED = "#9CA3AF";
const SOFT_BG = "#F7F5F2";

const COPY: Record<
  RouteName,
  { title: string; icon: keyof typeof Ionicons.glyphMap; body: string; tone: string }
> = {
  WalletLimits: {
    title: "Limitlar",
    icon: "speedometer-outline",
    body: "Kunlik o'tkazma va to'ldirish cheklovlarini tez orada shu yerda sozlay olasiz.",
    tone: "#E9D5FF",
  },
  WalletAlerts: {
    title: "Bildirishnomalar",
    icon: "notifications-outline",
    body: "Kirim, chiqim va sovg'a haqidagi hamyon signalarini tez orada boshqarasiz.",
    tone: "#FED7AA",
  },
};

/** Yangi wallet funksiyalar uchun joy — home bilan bir xil soft UI. */
export function WalletSoonScreen({ navigation, route }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const meta = COPY[route.name];

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={INK} />
        </Pressable>
        <Text style={styles.headerTitle}>{meta.title}</Text>
        <View style={styles.back} />
      </View>

      <LinearGradient
        colors={["#F8E8DC", "#F3E4F0", "#E8EEF8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={[styles.iconWrap, { backgroundColor: meta.tone }]}>
          <Ionicons name={meta.icon} size={28} color={INK} />
        </View>
        <Text style={styles.title}>{meta.title}</Text>
        <Text style={styles.body}>{meta.body}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Tez orada</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SOFT_BG, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.7)",
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
  card: {
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  title: { fontSize: 22, fontWeight: "800", color: INK, letterSpacing: -0.4 },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: MUTED,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  badge: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.75)",
  },
  badgeText: { fontSize: 12, fontWeight: "700", color: INK },
});
