import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchHairIngredientDetail, fetchHairScan, type HairIngredientDetail } from "../../../api/hair-advisor";
import type { MorphIngredientStackParamList } from "../../../navigation/MorphIngredientStack";
import { morphFont } from "../../../theme/morph-font";
import { fontSize, scale, verticalScale } from "../../../utils/responsive";
import { safeTop } from "../../../lib/safe-area";

type Props = NativeStackScreenProps<MorphIngredientStackParamList, "HairAdvisorIngredientDetail">;

export function HairAdvisor2IngredientDetailScreen({ navigation, route }: Props) {
  const { scanId, inci } = route.params;
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = useState<HairIngredientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const scan = await fetchHairScan(scanId);
        const data = await fetchHairIngredientDetail(inci, scan.care_product?.name ?? "");
        setDetail(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [inci, scanId]);

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color="#111" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: scale(20) }}>
      <Pressable style={{ paddingTop: safeTop(insets.top, 8) }} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={24} color="#111" />
      </Pressable>
      <Text style={styles.h1}>{detail?.inci_name ?? inci}</Text>
      <Block title="Bu nima?">{detail?.what_uz}</Block>
      <Block title="Foydalari">{detail?.benefits_uz}</Block>
      {detail?.cautions_uz?.length ? <Block title="Ehtimoliy nojo'ya ta'sirlari">{detail.cautions_uz.join(" ")}</Block> : null}
      <Block title="Qaysi sochlarga mos?">{detail?.hair_uz}</Block>
      <Block title="Ushbu mahsulotdagi vazifasi">{detail?.product_context_uz}</Block>
    </ScrollView>
  );
}

function Block({ title, children }: { title: string; children?: string }) {
  return (
    <View style={styles.block}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{children?.trim() || "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  boot: { flex: 1, alignItems: "center", justifyContent: "center" },
  h1: { ...morphFont, fontSize: fontSize(26), fontWeight: "700", marginTop: verticalScale(8), marginBottom: verticalScale(8) },
  block: { marginTop: verticalScale(16) },
  title: { ...morphFont, fontSize: fontSize(16), fontWeight: "700" },
  body: { ...morphFont, marginTop: 6, fontSize: fontSize(15), lineHeight: fontSize(22), color: "#111111D9" },
});