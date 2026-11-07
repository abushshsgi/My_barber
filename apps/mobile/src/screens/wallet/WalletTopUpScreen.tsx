import { Text, View, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import { colors } from "../../theme/colors";
import { fontSize, scale, verticalScale } from "../../utils/responsive";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletTopUp">;

export function WalletTopUpScreen({ navigation }: Props) {
  useHideTabBar();
  return (
    <View style={styles.root}>
      <NativeHeader title="To'ldirish" onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <Text style={styles.title}>Karta va chek o'chirilgan</Text>
        <Text style={styles.copy}>
          Kompaniya kartasiga o'tkazma va chek yuklash yo'q. AI Premium obuna Payme Subscribe orqali
          webda to'lanadi. Google Play qoidasi uchun Android ichida tashqi obuna to'lovi ochilmagan.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: scale(20), paddingTop: verticalScale(16) },
  title: { fontSize: fontSize(18), fontWeight: "800", color: colors.fg },
  copy: {
    marginTop: verticalScale(10),
    fontSize: fontSize(14),
    lineHeight: fontSize(21),
    color: colors.muted,
    fontWeight: "600",
  },
});
