import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addHairRoutineProduct, compareHairProducts, fetchHairScan, type HairAnalysis, type HairScanDetail } from "../../../api/hair-advisor";
import { addMyCareProductApi, fetchMyCareProducts } from "../../../api/care";
import { compatibilityLabel, compatibilityState } from "../../../lib/hair-advisor-2/scan-flow";
import type { MorphIngredientStackParamList } from "../../../navigation/MorphIngredientStack";
import { morphFont } from "../../../theme/morph-font";
import { fontSize, moderateScale, scale, verticalScale } from "../../../utils/responsive";
import { safeBottom, safeTop } from "../../../lib/safe-area";

type Props = NativeStackScreenProps<MorphIngredientStackParamList, "HairAdvisorResult">;

export function HairAdvisor2ResultScreen({ navigation, route }: Props) {
  const { scanId } = route.params;
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<HairScanDetail | null>(null);
  const [analysis, setAnalysis] = useState<HairAnalysis | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareId, setCompareId] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void fetchHairScan(scanId)
      .then((d) => {
        setDetail(d);
        setAnalysis(d.analysis ?? null);
        const pid = d.care_product?.id;
        if (pid) {
          void fetchMyCareProducts()
            .then((rows) => setSaved(rows.some((r) => r.id === pid)))
            .catch(() => undefined);
        }
      })
      .finally(() => setLoading(false));
  }, [scanId]);

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color="#111" />
      </View>
    );
  }

  const product = detail?.care_product;
  const ingredients =
    analysis?.result?.ingredients ??
    detail?.ingredients_confirmed ??
    detail?.ingredients_draft ??
    product?.ingredients ??
    [];
  const bullets = analysis?.result?.explanation?.summary_bullets_uz ?? [];
  const cautions = analysis?.result?.explanation?.cautions_uz ?? [];
  const benefits = bullets.slice(0, 2);
  const concerns = (cautions.length ? cautions : bullets).slice(0, 2);
  const keyIng = (analysis?.result?.key_ingredients ?? []).slice(0, 3);
  const fit = compatibilityLabel(analysis?.recommendation);
  const fitState = compatibilityState(analysis?.recommendation);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: safeBottom(insets.bottom, 100) }}>
        <View style={[styles.header, { paddingTop: safeTop(insets.top, 8) }]}>
          <Pressable onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#111" />
          </Pressable>
          <Pressable
            disabled={!product?.id}
            onPress={async () => {
              if (!product?.id) return;
              await addMyCareProductApi({ product_id: product.id, source: "scan" });
              await addHairRoutineProduct({ care_product_id: product.id, slot: "shampoo" }).catch(() => undefined);
              setSaved(true);
              Alert.alert("Saqlandi", "Mahsulot jadvalingizga qo'shildi.");
            }}
          >
            <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={22} color="#71717A" />
          </Pressable>
        </View>

        <View style={styles.headerRow}>
          <View style={styles.imageWrap}>
            {product?.image_url ? (
              <Image source={{ uri: product.image_url }} style={styles.image} contentFit="contain" />
            ) : (
              <Text style={styles.placeholder}>—</Text>
            )}
          </View>
          <View style={styles.meta}>
            {product?.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}
            <Text style={styles.name}>{product?.name ?? detail?.search_query ?? "Mahsulot"}</Text>
            <Text style={styles.badge}>{product?.is_verified ? "Tasdiqlangan mahsulot" : "Tasdiqlanmagan"}</Text>
            <Text style={styles.metaLine}>
              Mamlakat: {String(product?.country_of_origin ?? "").trim() || "Noma'lum"}
            </Text>
            {typeof product?.volume_ml === "number" && product.volume_ml > 0 ? (
              <Text style={styles.metaLine}>Hajm: {product.volume_ml} ml</Text>
            ) : null}
            <Text style={styles.metaLine}>Shtrix-kod: {detail?.barcode || "—"}</Text>
          </View>
        </View>

        <Card title="Sochingizga mosligi">
          <Text style={styles.fit}>{fit}</Text>
        </Card>
        <View style={styles.row}>
          <Card title="Asosiy foydasi" flex>
            {benefits.map((b) => (
              <Text key={b} style={styles.body}>{b}</Text>
            ))}
          </Card>
          <Card title="E'tibor bering" flex>
            {concerns.map((b) => (
              <Text key={b} style={styles.body}>{b}</Text>
            ))}
          </Card>
        </View>

        <Pressable
          style={styles.inciBtn}
          onPress={() => navigation.navigate("HairAdvisorIngredients", { scanId })}
        >
          <Text style={styles.inciTitle}>Tarkibi (INCI)</Text>
          <Text style={styles.metaLine}>{ingredients.length} ta ingredient</Text>
          <View style={styles.chips}>
            {(keyIng.length ? keyIng.map((k) => String(k.inci ?? "")) : ingredients.slice(0, 3)).map((c) => (
              <Text key={c} style={styles.chip}>{c}</Text>
            ))}
          </View>
        </Pressable>

        <Card title="MySaloon tavsiyasi">
          <Text style={styles.body}>{analysis?.explanation_uz ?? "—"}</Text>
        </Card>

        {fitState === "insufficient_information" || !ingredients.length ? (
          <Card title="Yetishmayotgan ma’lumot">
            {!ingredients.length ? <Text style={styles.body}>INCI / ingredient ro‘yxati yo‘q</Text> : null}
            {!analysis ? <Text style={styles.body}>Advisor tahlili hali mavjud emas</Text> : null}
            {fitState === "insufficient_information" && analysis ? (
              <Text style={styles.body}>Moslikni aniq baholash uchun ma’lumot yetarli emas</Text>
            ) : null}
          </Card>
        ) : null}

        <Card title="Manbalar">
          <Text style={styles.body}>
            Katalog:{" "}
            {product?.is_verified || detail?.catalog_tier === "verified"
              ? "Tasdiqlangan MySaloon katalogi"
              : detail?.catalog_tier
                ? String(detail.catalog_tier)
                : "Noma’lum / tasdiqlanmagan"}
          </Text>
          <Text style={styles.body}>Tahlil: Hair Advisor (scanner → analyze)</Text>
          <Text style={styles.metaLine}>Foizli match ballari ko‘rsatilmaydi.</Text>
        </Card>
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: safeBottom(insets.bottom, 12) }]}>
        <Pressable style={styles.compareBtn} onPress={() => setCompareOpen(true)}>
          <Text style={styles.compareText}>Taqqoslash</Text>
        </Pressable>
      </View>

      <Modal visible={compareOpen} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <TextInput
              value={compareId}
              onChangeText={setCompareId}
              keyboardType="number-pad"
              placeholder="Boshqa mahsulot ID"
              style={styles.input}
            />
            <Pressable
              style={styles.compareBtn}
              onPress={async () => {
                const mine = product?.id;
                const other = Number(compareId);
                if (!mine || !other) return;
                const out = await compareHairProducts([mine, other]);
                setCompareOpen(false);
                Alert.alert("Solishtirish", String((out.result as { summary_uz?: string }).summary_uz ?? "Tayyor"));
              }}
            >
              <Text style={styles.compareText}>Solishtirish</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Card({ title, children, flex }: { title: string; children: ReactNode; flex?: boolean }) {
  return (
    <View style={[styles.card, flex && { flex: 1 }]}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  boot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  header: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: scale(20), marginBottom: 8 },
  headerRow: { flexDirection: "row", gap: scale(12), paddingHorizontal: scale(20), marginBottom: verticalScale(12) },
  imageWrap: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: moderateScale(20),
    backgroundColor: "#F7F7F8",
    borderWidth: 1,
    borderColor: "#E8E8EB",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  image: { width: "100%", height: "100%" },
  placeholder: { ...morphFont, color: "#C4C4C8", fontSize: 24 },
  meta: { flex: 1.1, justifyContent: "center", gap: 4 },
  brand: { ...morphFont, fontSize: fontSize(24), fontWeight: "700", color: "#111" },
  name: { ...morphFont, fontSize: fontSize(17), color: "#111" },
  badge: { ...morphFont, fontSize: fontSize(12), color: "#16803C", fontWeight: "600", marginTop: 4 },
  metaLine: { ...morphFont, fontSize: fontSize(13), color: "#71717A" },
  card: {
    marginHorizontal: scale(20),
    marginBottom: verticalScale(12),
    borderRadius: moderateScale(20),
    backgroundColor: "#F7F7F8",
    borderWidth: 1,
    borderColor: "#E8E8EB",
    padding: scale(14),
  },
  row: { flexDirection: "row", gap: scale(10), paddingHorizontal: scale(20), marginBottom: verticalScale(12) },
  cardTitle: { ...morphFont, fontSize: fontSize(16), fontWeight: "700", color: "#111", marginBottom: 6 },
  fit: { ...morphFont, fontWeight: "700", color: "#16803C" },
  body: { ...morphFont, fontSize: fontSize(14), color: "#111111D9", marginBottom: 4 },
  inciBtn: {
    marginHorizontal: scale(20),
    marginBottom: verticalScale(12),
    borderRadius: moderateScale(20),
    backgroundColor: "#F7F7F8",
    borderWidth: 1,
    borderColor: "#E8E8EB",
    padding: scale(14),
  },
  inciTitle: { ...morphFont, fontSize: fontSize(16), fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: {
    ...morphFont,
    fontSize: fontSize(12),
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E8EB",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cta: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: "#E8E8EB",
    backgroundColor: "#fff",
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(12),
  },
  compareBtn: { height: verticalScale(56), borderRadius: moderateScale(18), backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  compareText: { ...morphFont, color: "#fff", fontWeight: "700", fontSize: fontSize(16) },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#fff", padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 8 },
  input: { ...morphFont, borderWidth: 1, borderColor: "#E8E8EB", borderRadius: 12, padding: 12 },
});