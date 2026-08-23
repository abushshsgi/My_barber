import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import type { WalletStackParamList } from "../../navigation/WalletStack";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletFaq">;

const INK = "#1A1A1A";
const MUTED = "#8A8A8E";
const SOFT_BG = "#F7F5F2";

const FAQ: { q: string; a: string }[] = [
  {
    q: "Hamyonni qanday to'ldiraman?",
    a: "Ko'proq → To'ldirish orqali karta rekvizitiga o'tkazma qiling va chekni yuboring. Admin tasdiqlagach balans yangilanadi.",
  },
  {
    q: "O'tkazma va sovg'a farqi nima?",
    a: "O'tkazma — do'stingizga summa yuborish. Sovg'a dizayni bo'lsa, dizayn uchun alohida to'lov qo'shilishi mumkin.",
  },
  {
    q: "Kartani muzlatish nima qiladi?",
    a: "Chiqimlar (o'tkazma, QR) vaqtincha bloklanadi. Siz yoki admin istalgan paytda ochishi mumkin.",
  },
  {
    q: "Hamyon raqamimni qayerdan ko'raman?",
    a: "Mening kartam sahifasida to'liq rekvizit va nusxa olish mavjud.",
  },
  {
    q: "Bonuslar qachon?",
    a: "Bonuslar bo'limi tez orada ochiladi — hozircha faqat ko'rsatilgan banner.",
  },
];

/** Savol-javob (vopros i otvet). */
export function WalletFaqScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={INK} />
        </Pressable>
        <Text style={styles.headerTitle}>Savol-javob</Text>
        <View style={styles.back} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        <Text style={styles.lead}>Vopros i otvet — eng ko'p so'raladigan savollar</Text>
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <Pressable
              key={item.q}
              style={styles.row}
              onPress={() => setOpen(isOpen ? null : i)}
            >
              <View style={styles.rowHead}>
                <Text style={styles.q}>{item.q}</Text>
                <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={MUTED} />
              </View>
              {isOpen ? <Text style={styles.a}>{item.a}</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SOFT_BG, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  back: {
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
  lead: { fontSize: 13, color: MUTED, marginBottom: 6 },
  row: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  q: { flex: 1, fontSize: 14, fontWeight: "700", color: INK },
  a: { marginTop: 10, fontSize: 13, lineHeight: 19, color: MUTED },
});
