import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  confirmHairScanProduct,
  fetchHairScan,
  type HairScanDetail,
} from "../../../api/hair-advisor";
import { resolveScanToAnalysis } from "../../../lib/hair-advisor-2/scan-flow";
import type { MorphIngredientStackParamList } from "../../../navigation/MorphIngredientStack";
import { morphFont } from "../../../theme/morph-font";
import { fontSize, scale, verticalScale } from "../../../utils/responsive";
import { safeBottom, safeTop } from "../../../lib/safe-area";

type Props = NativeStackScreenProps<MorphIngredientStackParamList, "HairAdvisorProductPick">;

export function HairAdvisor2ProductPickScreen({ navigation, route }: Props) {
  const { scanId } = route.params;
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [scan, setScan] = useState<HairScanDetail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setScan(await fetchHairScan(scanId));
    } catch (e) {
      Alert.alert("Xato", e instanceof Error ? e.message : "Yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [scanId]);

  useEffect(() => {
    void load();
  }, [load]);

  const candidates = scan?.product_candidates ?? [];
  const ocrBrand = scan?.recognition_meta?.ocr_brand;
  const ocrName = scan?.recognition_meta?.ocr_product_name;

  const onPick = async (careProductId: number) => {
    setBusyId(careProductId);
    try {
      const updated = await confirmHairScanProduct(scanId, careProductId);
      const resolved = await resolveScanToAnalysis(updated);
      if ("needIngredients" in resolved) {
        navigation.replace("HairAdvisorRecover", { scanId });
        return;
      }
      navigation.replace("HairAdvisorResult", { scanId: resolved.scan.id });
    } catch (e) {
      Alert.alert("Xato", e instanceof Error ? e.message : "Saqlanmadi");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color="#111" />
      </View>
    );
  }

  if (!candidates.length) {
    return (
      <View style={[styles.root, { paddingTop: safeTop(insets.top, 24) }]}>
        <Text style={styles.emptyTitle}>Mahsulot topilmadi</Text>
        <Text style={styles.emptyBody}>Ishonchli nomzod yo‘q. Qayta skanerlang.</Text>
        <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate("IngredientScan")}>
          <Text style={styles.primaryBtnText}>Qayta skanerlash</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: safeTop(insets.top, 8) }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Mahsulotni tasdiqlang</Text>
          {ocrBrand || ocrName ? (
            <Text style={styles.sub}>AI: {[ocrBrand, ocrName].filter(Boolean).join(" · ")}</Text>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: safeBottom(insets.bottom, 40), paddingHorizontal: scale(16) }}>
        <Text style={styles.lead}>
          Bir nechta mos keluvchi mahsulot topildi. To‘g‘risini tanlang — faqat katalogdagi yozuvlar ko‘rsatiladi.
        </Text>
        {candidates.map((p) => (
          <Pressable
            key={p.id}
            disabled={busyId !== null}
            onPress={() => void onPick(p.id)}
            style={[styles.card, busyId === p.id && styles.cardActive]}
          >
            {p.image_url ? (
              <Image source={{ uri: p.image_url }} style={styles.thumb} contentFit="contain" />
            ) : (
              <View style={[styles.thumb, styles.thumbEmpty]} />
            )}
            <View style={styles.cardBody}>
              {p.brand ? <Text style={styles.brand}>{p.brand}</Text> : null}
              <Text style={styles.name}>{p.name}</Text>
              {typeof p.volume_ml === "number" && p.volume_ml > 0 ? (
                <Text style={styles.meta}>{p.volume_ml} ml</Text>
              ) : null}
              {p.is_verified ? <Text style={styles.verified}>Tasdiqlangan</Text> : null}
            </View>
            {busyId === p.id ? <ActivityIndicator color="#111" /> : null}
          </Pressable>
        ))}
        <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("IngredientScan")}>
          <Text style={styles.secondaryBtnText}>Qayta skanerlash</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFA" },
  boot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: scale(16),
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ECECEC",
  },
  headerText: { flex: 1 },
  title: { fontFamily: morphFont.semiBold, fontSize: fontSize(17), color: "#111" },
  sub: { marginTop: 2, fontSize: fontSize(12), color: "#71717A" },
  lead: {
    marginTop: verticalScale(16),
    marginBottom: verticalScale(12),
    fontSize: fontSize(15),
    lineHeight: 22,
    color: "#52525B",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E8E8EB",
  },
  cardActive: { borderColor: "#111", borderWidth: 2 },
  thumb: { width: 72, height: 72, borderRadius: 12, backgroundColor: "#F4F4F5" },
  thumbEmpty: {},
  cardBody: { flex: 1 },
  brand: { fontSize: fontSize(11), fontFamily: morphFont.semiBold, color: "#71717A", textTransform: "uppercase" },
  name: { marginTop: 2, fontSize: fontSize(16), fontFamily: morphFont.semiBold, color: "#111" },
  meta: { marginTop: 4, fontSize: fontSize(13), color: "#71717A" },
  verified: {
    marginTop: 6,
    alignSelf: "flex-start",
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#EAF7ED",
    color: "#16803C",
    fontSize: fontSize(11),
    fontFamily: morphFont.semiBold,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  primaryBtn: {
    marginTop: 24,
    alignSelf: "center",
    backgroundColor: "#111",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  primaryBtnText: { color: "#fff", fontFamily: morphFont.semiBold, fontSize: fontSize(14) },
  secondaryBtn: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    backgroundColor: "#fff",
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: { fontFamily: morphFont.semiBold, fontSize: fontSize(14), color: "#111" },
  emptyTitle: { textAlign: "center", fontFamily: morphFont.semiBold, fontSize: fontSize(18), color: "#111" },
  emptyBody: { marginTop: 8, textAlign: "center", fontSize: fontSize(14), color: "#71717A", paddingHorizontal: 24 },
});
