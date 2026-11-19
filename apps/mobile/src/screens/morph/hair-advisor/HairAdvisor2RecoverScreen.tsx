import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  confirmHairScanIngredients,
  createProductSubmission,
  fetchHairScan,
  type HairScanDetail,
} from "../../../api/hair-advisor";
import { fetchHairCareProfile, updateHairCareProfile } from "../../../api/care";
import { pickProductLabelFromGallery } from "../../../lib/product-label";
import { toDataUrl } from "../../../lib/selfie";
import type { MorphIngredientStackParamList } from "../../../navigation/MorphIngredientStack";
import { morphFont } from "../../../theme/morph-font";
import { fontSize, moderateScale, scale, verticalScale } from "../../../utils/responsive";
import { safeTop } from "../../../lib/safe-area";

type Props = NativeStackScreenProps<MorphIngredientStackParamList, "HairAdvisorRecover">;

export function HairAdvisor2RecoverScreen({ navigation, route }: Props) {
  const { scanId } = route.params;
  const insets = useSafeAreaInsets();
  const [scan, setScan] = useState<HairScanDetail | null>(null);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [profileGate, setProfileGate] = useState(false);

  useEffect(() => {
    void fetchHairScan(scanId)
      .then((s) => {
        setScan(s);
        if (s.ingredients_draft?.length) setIngredients([...s.ingredients_draft]);
      })
      .catch(() => undefined);
    void fetchHairCareProfile().then((p) => {
      if (!p.complete) setProfileGate(true);
    });
  }, [scanId]);

  const notFound = scan?.status === "product_not_found";

  const onLabel = async () => {
    if (!scan) return;
    const uri = await pickProductLabelFromGallery();
    if (!uri) return;
    setBusy(true);
    try {
      const dataUrl = uri.startsWith("data:") ? uri : await toDataUrl(uri);
      if (!dataUrl) return;
      const out = await createProductSubmission({
        hair_scan_id: scan.id,
        barcode: scan.barcode,
        ingredient_label_image: dataUrl,
        finalize: false,
      });
      if (out.normalized_ingredients?.length) setIngredients([...out.normalized_ingredients]);
    } finally {
      setBusy(false);
    }
  };

  const analyze = async () => {
    if (!scan) return;
    const list = ingredients.map((i) => i.trim()).filter(Boolean);
    if (!list.length) return;
    setBusy(true);
    try {
      const profile = await fetchHairCareProfile();
      if (!profile.complete) {
        setProfileGate(true);
        return;
      }
      const out = await confirmHairScanIngredients(scan.id, list);
      navigation.replace("HairAdvisorResult", { scanId: out.scan.id });
    } finally {
      setBusy(false);
    }
  };

  if (profileGate) {
    return (
      <View style={[styles.root, { paddingTop: safeTop(insets.top, 12), paddingHorizontal: scale(20) }]}>
        <Text style={styles.h1}>Soch profilingiz</Text>
        <Text style={styles.sub}>Aniq tavsiya uchun holatingizni tanlang</Text>
        <Pressable
          style={styles.cta}
          onPress={async () => {
            await updateHairCareProfile({
              condition: "normal",
              texture: "straight",
              color_status: "natural",
            });
            setProfileGate(false);
          }}
        >
          <Text style={styles.ctaText}>Standart profil (tez)</Text>
        </Pressable>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Orqaga</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: scale(20), paddingTop: safeTop(insets.top, 12) }}>
      <Pressable onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={24} color="#111" />
      </Pressable>
      <Text style={styles.h1}>{notFound ? "Mahsulot topilmadi" : "Tarkib kerak"}</Text>
      <Text style={styles.sub}>
        {notFound
          ? "Tarkib yorlig'i fotosini yuboring. Admin tekshiradi."
          : "Yorliq rasmini yuklang yoki ingredientlarni tasdiqlang."}
      </Text>
      <Pressable style={styles.upload} onPress={() => void onLabel()} disabled={busy}>
        <Text style={styles.uploadText}>Tarkib yorlig'i rasmi</Text>
      </Pressable>
      {ingredients.map((ing, idx) => (
        <TextInput
          key={`${ing}-${idx}`}
          value={ing}
          onChangeText={(text) => {
            const next = [...ingredients];
            next[idx] = text;
            setIngredients(next);
          }}
          style={styles.input}
        />
      ))}
      <Pressable style={styles.cta} onPress={() => void analyze()} disabled={busy || !ingredients.length}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Tahlil qilish</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  h1: { ...morphFont, fontSize: fontSize(24), fontWeight: "700", marginTop: verticalScale(12) },
  sub: { ...morphFont, color: "#71717A", marginTop: 8, marginBottom: 16 },
  upload: {
    borderRadius: moderateScale(20),
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#E8E8EB",
    backgroundColor: "#F7F7F8",
    paddingVertical: verticalScale(28),
    alignItems: "center",
    marginBottom: 16,
  },
  uploadText: { ...morphFont, fontWeight: "600" },
  input: {
    ...morphFont,
    borderWidth: 1,
    borderColor: "#E8E8EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  cta: {
    height: verticalScale(56),
    borderRadius: moderateScale(18),
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  ctaText: { ...morphFont, color: "#fff", fontWeight: "700" },
  link: { ...morphFont, marginTop: 16, textAlign: "center", color: "#71717A" },
});