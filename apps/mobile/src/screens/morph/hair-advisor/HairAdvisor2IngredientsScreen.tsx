import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchHairScan, type HairScanDetail } from "../../../api/hair-advisor";
import type { MorphIngredientStackParamList } from "../../../navigation/MorphIngredientStack";
import { morphFont } from "../../../theme/morph-font";
import { fontSize, scale, verticalScale } from "../../../utils/responsive";
import { safeTop } from "../../../lib/safe-area";

type Props = NativeStackScreenProps<MorphIngredientStackParamList, "HairAdvisorIngredients">;

export function HairAdvisor2IngredientsScreen({ navigation, route }: Props) {
  const { scanId } = route.params;
  const insets = useSafeAreaInsets();
  const [payload, setPayload] = useState<HairScanDetail | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    void fetchHairScan(scanId).then(setPayload);
  }, [scanId]);

  const list = useMemo(() => {
    const raw =
      payload?.analysis?.result?.ingredients ??
      payload?.ingredients_confirmed ??
      payload?.ingredients_draft ??
      payload?.care_product?.ingredients ??
      [];
    const needle = q.trim().toLowerCase();
    if (!needle) return raw;
    return raw.filter((i) => i.toLowerCase().includes(needle));
  }, [payload, q]);

  return (
    <View style={styles.root}>
      <View style={[styles.head, { paddingTop: safeTop(insets.top, 8) }]}>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </Pressable>
        <Text style={styles.h1}>Mahsulot tarkibi</Text>
        <Text style={styles.sub}>Barcha ingredientlar va ularning vazifalari</Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Ingredient qidirish"
          style={styles.search}
        />
      </View>
      <FlatList
        data={list}
        keyExtractor={(item, idx) => `${item}-${idx}`}
        contentContainerStyle={{ paddingHorizontal: scale(20), paddingBottom: 32 }}
        ListEmptyComponent={<Text style={styles.empty}>Mahsulotning to'liq tarkibi hali tasdiqlanmagan.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate("HairAdvisorIngredientDetail", { scanId, inci: item })}
          >
            <View>
              <Text style={styles.inci}>{item}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#71717A" />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  head: { paddingHorizontal: scale(20), marginBottom: verticalScale(8) },
  h1: { ...morphFont, fontSize: fontSize(26), fontWeight: "700", marginTop: 8 },
  sub: { ...morphFont, color: "#71717A", marginTop: 4, marginBottom: 12 },
  search: {
    ...morphFont,
    backgroundColor: "#F7F7F8",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8E8EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8E8EB",
    paddingVertical: 14,
  },
  inci: { ...morphFont, fontSize: fontSize(15), fontWeight: "600" },
  empty: { ...morphFont, color: "#71717A", textAlign: "center", marginTop: 32 },
});