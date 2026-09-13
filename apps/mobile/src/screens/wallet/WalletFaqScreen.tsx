import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeBottom, safeTop } from "../../lib/safe-area";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletFaq">;

const INK = "#1A1A1A";
const MUTED = "#8A8A8E";
const SOFT_BG = "#FAFAFA";

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
    <View style={[styles.root, { paddingTop: safeTop(insets.top, 8), paddingBottom: safeBottom(insets.bottom, 16) }]}>
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
  root: { flex: 1, backgroundColor: SOFT_BG, paddingHorizontal: scale(16) },
  header: { flexDirection: "row", alignItems: "center", marginBottom: verticalScale(16) },
  back: {
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
  lead: { fontSize: fontSize(13), color: MUTED, marginBottom: verticalScale(6) },
  row: {
    backgroundColor: "#FFF",
    borderRadius: moderateScale(18),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
  },
  rowHead: { flexDirection: "row", alignItems: "center", gap: moderateScale(10) },
  q: { flex: 1, fontSize: fontSize(14), fontWeight: "700", color: INK },
  a: { marginTop: verticalScale(10), fontSize: fontSize(13), lineHeight: fontSize(19), color: MUTED },
});
