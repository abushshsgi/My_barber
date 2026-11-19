import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useIsFocused } from "@react-navigation/native";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchCareAccess } from "../../api/ai";
import { MorphPaywallView } from "../../components/morph/MorphPaywallView";
import {
  addHairRoutineProduct,
  compareHairProducts,
  confirmHairScanIngredients,
  createHairScan,
  createProductSubmission,
  fetchHairScanHistory,
  fetchProductSubmissions,
  submitHairFeedback,
  type HairAnalysis,
  type HairScan,
} from "../../api/hair-advisor";
import {
  fetchHairCareProfile,
  updateHairCareProfile,
  type HairColorStatus,
  type HairCondition,
  type HairTexture,
} from "../../api/care";
import { useMorphAppearance } from "../../lib/MorphAppearanceContext";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { NativeBackButton } from "../../components/ui/NativeBackButton";
import {
  defaultQuiz,
  loadCareQuiz,
  saveCareQuiz,
  type CareQuizAnswers,
} from "../../lib/morf-ai-care";
import { pickProductLabelFromCamera, pickProductLabelFromGallery } from "../../lib/product-label";
import { playBarcodeBeep, primeBarcodeBeep } from "../../lib/barcode-beep";
import { toDataUrl } from "../../lib/selfie";
import type { MorphIngredientStackParamList } from "../../navigation/MorphIngredientStack";
import { morphFont } from "../../theme/morph-font";
import { fontSize, moderateScale, scale, verticalScale } from "../../utils/responsive";
import { safeBottom, safeTop } from "../../lib/safe-area";

type Props = NativeStackScreenProps<MorphIngredientStackParamList, "IngredientScan">;

type WorkflowStep = 1 | 2 | 3 | 4;

const BARCODE_TYPES = ["ean13", "ean8", "upc_a", "upc_e"] as const;
const STAGES_UZ: Record<string, string> = {
  scanning: "Mahsulot aniqlanmoqda",
  processing_ocr: "Tarkib tekshirilmoqda",
  analyzing: "Ingredientlar tahlil qilinmoqda",
  completed: "Natija tayyor",
  failed: "Xatolik",
};

function stepFromScan(scan: HairScan | null, analysis: HairAnalysis | null): WorkflowStep {
  if (analysis || scan?.status === "completed") return 4;
  if (scan?.status === "analyzing") return 3;
  if (scan && ["needs_confirmation", "ingredients_required"].includes(scan.status)) return 2;
  return 1;
}

export function HairAdvisorScannerScreen({ navigation }: Props) {
  useHideTabBar();
  const { t } = useTranslation();
  const { colors: pal } = useMorphAppearance();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const cameraRef = useRef<CameraView>(null);
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const barcodeLock = useRef(false);
  const scanLine = useRef(new Animated.Value(0)).current;

  const [booting, setBooting] = useState(true);
  const [access, setAccess] = useState<{ allowed: boolean; detail?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [scan, setScan] = useState<HairScan | null>(null);
  const [analysis, setAnalysis] = useState<HairAnalysis | null>(null);
  const [ingredientsEdit, setIngredientsEdit] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [history, setHistory] = useState<HairScan[]>([]);
  const [submissions, setSubmissions] = useState<Array<{ id: string; status: string; barcode?: string }>>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareId, setCompareId] = useState("");
  const [detailIng, setDetailIng] = useState<Record<string, unknown> | null>(null);
  const [statusLabel, setStatusLabel] = useState("");
  const [submitNote, setSubmitNote] = useState<string | null>(null);

  const step = useMemo(() => stepFromScan(scan, analysis), [scan, analysis]);

  const bootstrap = useCallback(async () => {
    setBooting(true);
    try {
      const accessRes = await fetchCareAccess().catch(() => ({ allowed: false }));
      setAccess(accessRes);
      if (!accessRes.allowed) return;
      const saved = await loadCareQuiz().catch(() => null);
      const profile = await fetchHairCareProfile().catch(() => null);
      const answers: CareQuizAnswers = profile?.condition
        ? {
            condition: profile.condition as HairCondition,
            texture: profile.texture as HairTexture,
            colorStatus: profile.color_status as HairColorStatus,
          }
        : saved ?? defaultQuiz();
      if (answers.condition && answers.texture && answers.colorStatus) {
        await saveCareQuiz(answers);
        await updateHairCareProfile({
          condition: answers.condition as HairCondition,
          texture: answers.texture as HairTexture,
          color_status: answers.colorStatus as HairColorStatus,
        }).catch(() => undefined);
      }
      const [hist, subs] = await Promise.all([
        fetchHairScanHistory().catch(() => []),
        fetchProductSubmissions().catch(() => []),
      ]);
      setHistory(hist);
      setSubmissions(subs);
      void primeBarcodeBeep();
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!focused || !camPerm?.granted) return;
    if (camPerm.canAskAgain) void requestCamPerm();
  }, [focused, camPerm, requestCamPerm]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scanLine, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scanLine]);

  const resetFlow = () => {
    setScan(null);
    setAnalysis(null);
    setIngredientsEdit([]);
    setError(null);
    setStatusLabel("");
    setSubmitNote(null);
    barcodeLock.current = false;
  };

  const applyScan = (s: HairScan) => {
    setScan(s);
    setStatusLabel(STAGES_UZ[s.status] ?? s.status);
    if (s.ingredients_draft?.length) setIngredientsEdit([...s.ingredients_draft]);
    if (s.status === "failed" && s.error_message) setError(s.error_message);
  };

  const onBarcode = async ({ data }: { data: string }) => {
    const code = data.replace(/\D/g, "");
    if (code.length < 8 || barcodeLock.current || busy) return;
    barcodeLock.current = true;
    playBarcodeBeep();
    setBusy(true);
    setError(null);
    try {
      const created = await createHairScan({ input_method: "barcode", barcode: code, idempotency_key: `bc-${code}` });
      applyScan(created);
      if (created.status === "product_not_found") {
        setError(created.message_uz ?? t("ingredient.barcodeNotFound"));
      }
      if (created.catalog_tier === "verified" && created.message_uz) {
        setSubmitNote(created.message_uz);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("ingredient.scanFailed");
      setError(msg);
      barcodeLock.current = false;
    } finally {
      setBusy(false);
    }
  };

  const onLabelImage = async (uri: string) => {
    setBusy(true);
    setError(null);
    setStatusLabel(STAGES_UZ.processing_ocr);
    try {
      const dataUrl = uri.startsWith("data:") ? uri : await toDataUrl(uri);
      if (!dataUrl) throw new Error(t("ingredient.scanFailed"));
      const created = await createHairScan({ input_method: "gallery", image: dataUrl });
      applyScan(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ingredient.scanFailed"));
    } finally {
      setBusy(false);
    }
  };

  const runSearch = async () => {
    const q = searchQuery.trim();
    if (q.length < 2) return;
    setSearchOpen(false);
    setBusy(true);
    try {
      const created = await createHairScan({ input_method: "search", search_query: q });
      applyScan(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ingredient.scanFailed"));
    } finally {
      setBusy(false);
    }
  };

  const confirmAndAnalyze = async () => {
    if (!scan || ingredientsEdit.length < 1) {
      Alert.alert(t("ingredient.badge"), "Kamida bitta ingredient kiriting.");
      return;
    }
    setBusy(true);
    setStatusLabel(STAGES_UZ.analyzing);
    try {
      const out = await confirmHairScanIngredients(scan.id, ingredientsEdit);
      setScan(out.scan);
      setAnalysis(out.analysis);
      setStatusLabel(STAGES_UZ.completed);
      void fetchHairScanHistory().then(setHistory);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ingredient.scanFailed"));
    } finally {
      setBusy(false);
    }
  };

  const product = scan?.care_product;
  const productName = String(product?.name ?? scan?.search_query ?? t("ingredient.unknownProduct"));
  const productBrand = String(product?.brand ?? "");

  if (booting) {
    return (
      <View style={[styles.boot, { backgroundColor: pal.bg }]}>
        <ActivityIndicator color={pal.fg} />
      </View>
    );
  }

  if (access && !access.allowed) {
    return (
      <MorphPaywallView
        reason="subscription"
        onClose={() => navigation.goBack()}
        onSuccess={() => void bootstrap()}
        onNeedLogin={() => navigation.getParent()?.navigate("Profile" as never)}
      />
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: "#0a0a0a" }]}>
      <View style={[styles.hero, { paddingTop: safeTop(insets.top, 12) }]}>
        <NativeBackButton
          onPress={() => navigation.goBack()}
          color="#fff"
          backgroundColor="rgba(0,0,0,0.35)"
        />
        <Text style={styles.heroTitle}>{t("ingredient.title")}</Text>
        <Text style={styles.heroSub}>{t("ingredient.subtitle")}</Text>
      </View>

      {step <= 2 && camPerm?.granted ? (
        <View style={styles.cameraWrap}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
            onBarcodeScanned={step === 1 && !busy ? onBarcode : undefined}
          />
          <View style={styles.scanFrame}>
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [
                    {
                      translateY: scanLine.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, verticalScale(160)],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        </View>
      ) : (
        <Image
          source={product?.image_url ? { uri: product.image_url } : require("../../../assets/icon.png")}
          style={styles.heroImage}
          contentFit="cover"
        />
      )}

      <View style={[styles.sheet, { paddingBottom: safeBottom(insets.bottom, 16) }]}>
        <View style={styles.stepper}>
          {[
            { n: 1, label: "Mahsulot" },
            { n: 2, label: "Tarkib" },
            { n: 3, label: "Tahlil" },
            { n: 4, label: "Natija" },
          ].map((s) => (
            <View key={s.n} style={styles.stepItem}>
              <View style={[styles.stepDot, step >= s.n && styles.stepDotOn]}>
                <Text style={[styles.stepNum, step >= s.n && styles.stepNumOn]}>{s.n}</Text>
              </View>
              <Text style={[styles.stepLabel, step === s.n && styles.stepLabelOn]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {busy && statusLabel ? (
          <View style={styles.progressRow}>
            <ActivityIndicator size="small" color="#111" />
            <Text style={styles.progressText}>{statusLabel}</Text>
          </View>
        ) : null}

        {step === 1 && (
          <View style={styles.actionsRow}>
            <Pressable
              style={styles.primaryBtn}
              disabled={busy}
              onPress={async () => {
                const uri = await pickProductLabelFromCamera();
                if (uri) void onLabelImage(uri);
              }}
            >
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Kamera</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryBtn}
              disabled={busy}
              onPress={async () => {
                const uri = await pickProductLabelFromGallery();
                if (uri) void onLabelImage(uri);
              }}
            >
              <Ionicons name="images-outline" size={20} color="#111" />
              <Text style={styles.secondaryBtnText}>Galereya</Text>
            </Pressable>
          </View>
        )}

        {step === 1 && (
          <Pressable style={styles.linkBtn} onPress={() => setSearchOpen(true)}>
            <Text style={styles.linkBtnText}>Mahsulot nomi bo'yicha qidirish</Text>
          </Pressable>
        )}

        {step === 1 && scan?.status === "product_not_found" && (
          <View style={styles.confirmBlock}>
            <Text style={styles.sectionTitle}>
              Mahsulot bazamizda topilmadi. Uni birgalikda aniqlaymiz.
            </Text>
            <Pressable
              style={styles.primaryBtn}
              disabled={busy}
              onPress={async () => {
                setBusy(true);
                setError(null);
                try {
                  const labelUri = await pickProductLabelFromCamera();
                  if (!labelUri) return;
                  const labelData = labelUri.startsWith("data:")
                    ? labelUri
                    : await toDataUrl(labelUri);
                  if (!labelData) throw new Error(t("ingredient.scanFailed"));
                  const frontUri = await pickProductLabelFromGallery().catch(() => null);
                  const frontData =
                    frontUri && !frontUri.startsWith("data:")
                      ? await toDataUrl(frontUri)
                      : frontUri ?? undefined;
                  const out = await createProductSubmission({
                    hair_scan_id: scan.id,
                    barcode: scan.barcode,
                    ingredient_label_image: labelData,
                    front_image: frontData,
                    finalize: false,
                  });
                  const ingredients = out.normalized_ingredients ?? [];
                  if (ingredients.length) {
                    setIngredientsEdit(ingredients);
                    setScan({ ...scan, status: "needs_confirmation", ingredients_draft: ingredients });
                  }
                  setSubmitNote(out.message_uz ?? "Mahsulot ma'lumotlari tekshiruvga yuborildi.");
                } catch (e) {
                  setError(e instanceof Error ? e.message : t("ingredient.scanFailed"));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Text style={styles.primaryBtnText}>Mahsulotni yuborish</Text>
            </Pressable>
          </View>
        )}

        {submitNote ? <Text style={styles.hintText}>{submitNote}</Text> : null}

        {step === 2 && (
          <View style={styles.confirmBlock}>
            <Text style={styles.productName}>
              {productBrand} {productName}
            </Text>
            <Text style={styles.sectionTitle}>Tarkibni tasdiqlang</Text>
            <ScrollView style={styles.ingScroll} nestedScrollEnabled>
              {ingredientsEdit.map((ing, idx) => (
                <View key={`${ing}-${idx}`} style={styles.ingEditRow}>
                  <TextInput
                    style={styles.ingInput}
                    value={ing}
                    onChangeText={(text) => {
                      const next = [...ingredientsEdit];
                      next[idx] = text;
                      setIngredientsEdit(next);
                    }}
                  />
                  <Pressable
                    onPress={() => setIngredientsEdit(ingredientsEdit.filter((_, i) => i !== idx))}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={20} color="#c62828" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
            <Pressable
              style={styles.linkBtn}
              onPress={() => setIngredientsEdit([...ingredientsEdit, ""])}
            >
              <Text style={styles.linkBtnText}>+ Ingredient qo'shish</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} disabled={busy} onPress={() => void confirmAndAnalyze()}>
              <Text style={styles.primaryBtnText}>Tahlil qilish</Text>
            </Pressable>
          </View>
        )}

        {step === 3 && (
          <View style={styles.centerBlock}>
            <ActivityIndicator color="#111" size="large" />
            <Text style={styles.progressText}>{statusLabel || STAGES_UZ.analyzing}</Text>
          </View>
        )}

        {step === 4 && analysis && (
          <ScrollView style={styles.resultScroll} nestedScrollEnabled>
            <Text style={styles.productName}>
              {productBrand} {productName}
            </Text>
            {analysis.result?.disclaimer_uz || analysis.result?.catalog_tier ? (
              <Text style={styles.hintText}>
                {String(
                  analysis.result.disclaimer_uz ??
                    (analysis.result.catalog_tier === "verified"
                      ? "Mahsulot ma'lumotlari MySaloon tomonidan tekshirilgan."
                      : "Bu dastlabki tahlil. Mahsulot tarkibi hali tasdiqlanmagan."),
                )}
              </Text>
            ) : null}
            <View style={[styles.recoPill, recommendationStyle(analysis.recommendation)]}>
              <Text style={styles.recoText}>{recommendationLabel(analysis.recommendation)}</Text>
            </View>
            <Text style={styles.dataConf}>
              {analysis.data_confidence === "high" ? "Yuqori ma'lumot ishonchi" : "Cheklangan ma'lumot"}
            </Text>
            <Text style={styles.explanation}>{analysis.explanation_uz}</Text>
            {(analysis.result.explanation?.summary_bullets_uz ?? []).map((b, i) => (
              <Text key={i} style={styles.bullet}>
                • {b}
              </Text>
            ))}
            <Text style={styles.sectionTitle}>Asosiy moddalar</Text>
            {(analysis.result.key_ingredients ?? []).slice(0, 8).map((row, i) => (
              <Pressable key={i} style={styles.ingCard} onPress={() => setDetailIng(row)}>
                <Text style={styles.ingTitle}>{String(row.inci ?? "")}</Text>
                <Text style={styles.ingNote} numberOfLines={2}>
                  {String(row.note ?? "")}
                </Text>
              </Pressable>
            ))}
            <View style={styles.actionsRow}>
              <Pressable style={styles.secondaryBtn} onPress={() => setCompareOpen(true)}>
                <Text style={styles.secondaryBtnText}>Solishtirish</Text>
              </Pressable>
              {product?.id ? (
                <Pressable
                  style={styles.primaryBtn}
                  onPress={async () => {
                    await addHairRoutineProduct({ care_product_id: product.id, slot: "shampoo" });
                    Alert.alert("Saqlandi", "Mahsulot rutinaga qo'shildi.");
                  }}
                >
                  <Text style={styles.primaryBtnText}>Rutinga qo'shish</Text>
                </Pressable>
              ) : null}
            </View>
            <Pressable
              style={styles.linkBtn}
              onPress={async () => {
                await submitHairFeedback({ analysis_id: analysis.id, helpful: true });
                Alert.alert("Rahmat", "Fikringiz qabul qilindi.");
              }}
            >
              <Text style={styles.linkBtnText}>Foydali deb belgilash</Text>
            </Pressable>
            <Pressable style={styles.linkBtn} onPress={resetFlow}>
              <Text style={styles.linkBtnText}>{t("ingredient.scanAgain")}</Text>
            </Pressable>
          </ScrollView>
        )}

        <Pressable
          style={styles.historyBtn}
          onPress={() => {
            void Promise.all([fetchHairScanHistory(), fetchProductSubmissions()])
              .then(([h, s]) => {
                setHistory(h);
                setSubmissions(s);
              })
              .catch(() => undefined);
            setHistoryOpen(true);
          }}
        >
          <Ionicons name="time-outline" size={18} color="#666" />
          <Text style={styles.historyText}>Skanlar tarixi</Text>
        </Pressable>
      </View>

      <Modal visible={searchOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Qidiruv</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Masalan: Repair shampoo"
              style={styles.input}
              autoFocus
            />
            <Pressable style={styles.primaryBtn} onPress={() => void runSearch()}>
              <Text style={styles.primaryBtnText}>Topish</Text>
            </Pressable>
            <Pressable style={styles.linkBtn} onPress={() => setSearchOpen(false)}>
              <Text style={styles.linkBtnText}>Bekor</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={historyOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: "70%" }]}>
            <Text style={styles.modalTitle}>Tarix</Text>
            {submissions.length > 0 ? (
              <>
                <Text style={styles.histMeta}>Topshiruvlar</Text>
                {submissions.slice(0, 6).map((s) => (
                  <Text key={s.id} style={styles.histMeta}>
                    {s.barcode || s.id.slice(0, 8)} — {s.status}
                  </Text>
                ))}
              </>
            ) : null}
            <ScrollView>
              {history.map((h) => (
                <Pressable key={h.id} style={styles.histRow} onPress={() => setHistoryOpen(false)}>
                  <Text style={styles.histTitle}>{h.barcode || h.search_query || h.id.slice(0, 8)}</Text>
                  <Text style={styles.histMeta}>{h.status}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.linkBtn} onPress={() => setHistoryOpen(false)}>
              <Text style={styles.linkBtnText}>Yopish</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={compareOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Boshqa mahsulot ID</Text>
            <TextInput value={compareId} onChangeText={setCompareId} keyboardType="number-pad" style={styles.input} />
            <Pressable
              style={styles.primaryBtn}
              onPress={async () => {
                const other = Number(compareId);
                const mine = product?.id;
                if (!mine || !other) return;
                const cmp = await compareHairProducts([mine, other]);
                setCompareOpen(false);
                Alert.alert("Solishtirish", String((cmp.result as { summary_uz?: string }).summary_uz ?? "Tayyor"));
              }}
            >
              <Text style={styles.primaryBtnText}>Solishtirish</Text>
            </Pressable>
            <Pressable style={styles.linkBtn} onPress={() => setCompareOpen(false)}>
              <Text style={styles.linkBtnText}>Bekor</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(detailIng)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{String(detailIng?.inci ?? "")}</Text>
            <Text style={styles.explanation}>{String(detailIng?.note ?? "")}</Text>
            {Array.isArray(detailIng?.evidence)
              ? (detailIng.evidence as Array<Record<string, string>>).map((ev, i) => (
                  <Text key={i} style={styles.bullet}>
                    {ev.claim}
                    {ev.source_title ? ` (${ev.source_title})` : ""}
                  </Text>
                ))
              : null}
            <Pressable style={styles.linkBtn} onPress={() => setDetailIng(null)}>
              <Text style={styles.linkBtnText}>Yopish</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function recommendationLabel(rec: HairAnalysis["recommendation"]): string {
  if (rec === "POTENTIAL_MATCH") return "Mos kelishi mumkin";
  if (rec === "CAUTION") return "Ehtiyot";
  return "Ma'lumot yetarli emas";
}

function recommendationStyle(rec: HairAnalysis["recommendation"]) {
  if (rec === "POTENTIAL_MATCH") return { backgroundColor: "#e8f5e9" };
  if (rec === "CAUTION") return { backgroundColor: "#fff8e1" };
  return { backgroundColor: "#f5f5f5" };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  boot: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 4, paddingHorizontal: scale(16) },
  heroTitle: { ...morphFont, color: "#fff", fontSize: fontSize(26), fontWeight: "800", marginTop: verticalScale(8) },
  heroSub: { ...morphFont, color: "rgba(255,255,255,0.85)", fontSize: fontSize(14), marginTop: verticalScale(4) },
  heroImage: { ...StyleSheet.absoluteFill, opacity: 0.35 },
  cameraWrap: { flex: 1, marginBottom: verticalScale(280) },
  scanFrame: {
    position: "absolute",
    left: "12%",
    right: "12%",
    top: "28%",
    height: verticalScale(180),
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: moderateScale(16),
    overflow: "hidden",
  },
  scanLine: { height: 2, backgroundColor: "#fff", marginHorizontal: 8 },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: verticalScale(280),
    backgroundColor: "#fff",
    borderTopLeftRadius: moderateScale(28),
    borderTopRightRadius: moderateScale(28),
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(16),
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  stepper: { flexDirection: "row", justifyContent: "space-between", marginBottom: verticalScale(12) },
  stepItem: { alignItems: "center", flex: 1 },
  stepDot: {
    width: scale(28),
    height: scale(28),
    borderRadius: 14,
    backgroundColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotOn: { backgroundColor: "#111" },
  stepNum: { ...morphFont, fontWeight: "700", color: "#666" },
  stepNumOn: { color: "#fff" },
  stepLabel: { ...morphFont, fontSize: fontSize(10), marginTop: 4, color: "#999" },
  stepLabelOn: { color: "#111", fontWeight: "700" },
  actionsRow: { flexDirection: "row", gap: scale(10), marginTop: verticalScale(8) },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#111",
    borderRadius: moderateScale(14),
    paddingVertical: verticalScale(14),
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { ...morphFont, color: "#fff", fontWeight: "700", fontSize: fontSize(15) },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    borderRadius: moderateScale(14),
    paddingVertical: verticalScale(14),
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { ...morphFont, color: "#111", fontWeight: "600" },
  linkBtn: { alignItems: "center", paddingVertical: verticalScale(10) },
  linkBtnText: { ...morphFont, color: "#444", fontWeight: "600" },
  errorText: { ...morphFont, color: "#c62828", textAlign: "center", marginBottom: 8 },
  hintText: { ...morphFont, color: "#2e7d32", textAlign: "center", marginBottom: 8, fontWeight: "600" },
  progressRow: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", marginVertical: 8 },
  progressText: { ...morphFont, color: "#333", fontWeight: "600" },
  confirmBlock: { maxHeight: verticalScale(220) },
  productName: { ...morphFont, fontSize: fontSize(18), fontWeight: "800", color: "#111" },
  sectionTitle: { ...morphFont, marginTop: 8, fontWeight: "700", color: "#333" },
  ingScroll: { maxHeight: verticalScale(120), marginVertical: 8 },
  ingRow: { ...morphFont, fontSize: fontSize(13), color: "#444", marginBottom: 4 },
  ingEditRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  ingInput: {
    ...morphFont,
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: fontSize(13),
  },
  dataConf: { ...morphFont, fontSize: fontSize(12), color: "#666", marginTop: 4 },
  centerBlock: { alignItems: "center", paddingVertical: 24, gap: 12 },
  resultScroll: { maxHeight: verticalScale(260) },
  recoPill: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginTop: 8 },
  recoText: { ...morphFont, fontWeight: "700" },
  explanation: { ...morphFont, marginTop: 8, lineHeight: fontSize(21), color: "#333" },
  bullet: { ...morphFont, color: "#444", marginTop: 4 },
  ingCard: { padding: 10, borderRadius: 12, backgroundColor: "#f7f7f7", marginTop: 8 },
  ingTitle: { ...morphFont, fontWeight: "700" },
  ingNote: { ...morphFont, color: "#666", fontSize: fontSize(12) },
  historyBtn: { flexDirection: "row", gap: 6, alignSelf: "center", marginTop: 8 },
  historyText: { ...morphFont, color: "#666" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: 32,
  },
  modalTitle: { ...morphFont, fontSize: fontSize(18), fontWeight: "800", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    ...morphFont,
  },
  histRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#eee" },
  histTitle: { ...morphFont, fontWeight: "600" },
  histMeta: { ...morphFont, color: "#999", fontSize: fontSize(12) },
});