import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeBottom, safeTop } from "../../lib/safe-area";
import { fetchCareAccess } from "../../api/ai";
import {
  fetchHairCareProfile,
  scanIngredient,
  updateHairCareProfile,
  type HairColorStatus,
  type HairCondition,
  type HairTexture,
  type IngredientScanResponse,
} from "../../api/care";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { NativeBackButton } from "../../components/ui/NativeBackButton";
import {
  defaultQuiz,
  loadCareQuiz,
  saveCareQuiz,
  type CareQuizAnswers,
} from "../../lib/morph-ai-care";
import { addMyProduct, isMyProduct } from "../../lib/morph-my-products";
import {
  pickProductLabelFromCamera,
  pickProductLabelFromGallery,
} from "../../lib/product-label";
import { toDataUrl } from "../../lib/selfie";
import { writeAppShell, writeLastShellTab } from "../../lib/app-shell";
import { useShellNavigation } from "../../lib/shell-nav";
import type { MorphIngredientStackParamList } from "../../navigation/MorphIngredientStack";
import { morphFont } from "../../theme/morph-font";
import {
  ASPECT,
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<MorphIngredientStackParamList, "IngredientScan">;
type Phase = "capture" | "analyzing" | "result";

/** Care bilan bir xil — production oldidan false qiling. */
const CARE_ACCESS_DEBUG = true;

function hasQuizFields(q: CareQuizAnswers | null | undefined): boolean {
  return Boolean(q?.condition && q?.texture && q?.colorStatus);
}

function scoreTone(verdict: string, score: number): string {
  const VERDICT_COLOR: Record<string, string> = {
    good: "#6EE7B7",
    caution: "#FCD34D",
    bad: "#FB923C",
    dangerous: "#F87171",
  };
  if (VERDICT_COLOR[verdict]) return VERDICT_COLOR[verdict];
  if (score >= 70) return VERDICT_COLOR.good;
  if (score >= 45) return VERDICT_COLOR.caution;
  return VERDICT_COLOR.dangerous;
}

export function MorphIngredientScreen({ navigation }: Props) {
  useHideTabBar();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { goMorph } = useShellNavigation();
  const cameraRef = useRef<CameraView>(null);
  const [camPerm, requestCamPerm] = useCameraPermissions();

  const [booting, setBooting] = useState(true);
  const [access, setAccess] = useState<{ allowed: boolean; detail?: string } | null>(null);
  const [quiz, setQuiz] = useState<CareQuizAnswers>(defaultQuiz());
  const [profileOk, setProfileOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<IngredientScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inMyProducts, setInMyProducts] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);

  const phase: Phase = useMemo(() => {
    if (result) return "result";
    if (busy) return "analyzing";
    return "capture";
  }, [result, busy]);

  useEffect(() => {
    void writeAppShell("morph");
    void writeLastShellTab("morph", "MorphCare");
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!camPerm?.granted) void requestCamPerm();
  }, [camPerm?.granted, requestCamPerm]);

  const syncProfile = useCallback(async (answers: CareQuizAnswers) => {
    if (!hasQuizFields(answers)) return;
    await saveCareQuiz(answers);
    await updateHairCareProfile({
      condition: answers.condition,
      texture: answers.texture,
      color_status: answers.colorStatus,
      scalp:
        answers.condition === "oily"
          ? "oily"
          : answers.condition === "dry" || answers.condition === "damaged"
            ? "dry"
            : "normal",
    });
    setQuiz(answers);
    setProfileOk(true);
  }, []);

  const ensureHairProfile = useCallback(async () => {
    if (profileOk && hasQuizFields(quiz)) return true;
    const [saved, profile] = await Promise.all([
      loadCareQuiz().catch(() => null),
      fetchHairCareProfile().catch(() => null),
    ]);
    if (profile?.condition && profile?.texture && profile?.color_status) {
      const next: CareQuizAnswers = {
        condition: profile.condition as HairCondition,
        texture: profile.texture as HairTexture,
        colorStatus: profile.color_status as HairColorStatus,
      };
      await saveCareQuiz(next);
      setQuiz(next);
      setProfileOk(true);
      if (!profile.complete) {
        await updateHairCareProfile({
          condition: next.condition,
          texture: next.texture,
          color_status: next.colorStatus,
        }).catch(() => undefined);
      }
      return true;
    }
    if (hasQuizFields(saved)) {
      await syncProfile(saved!);
      return true;
    }
    // Parvarish onboardingdan o‘tmagan — default + backend sync (scan quiz so‘ralmaydi).
    await syncProfile(defaultQuiz());
    return true;
  }, [profileOk, quiz, syncProfile]);

  const bootstrap = useCallback(async () => {
    setBooting(true);
    try {
      const accessRes = CARE_ACCESS_DEBUG
        ? { allowed: true as const, detail: undefined }
        : await fetchCareAccess().catch(() => ({ allowed: false, detail: undefined }));
      setAccess(accessRes);
      if (!accessRes.allowed) return;
      await ensureHairProfile();
    } finally {
      setBooting(false);
    }
  }, [ensureHairProfile]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const runScan = async (dataUrl: string) => {
    setBusy(true);
    setError(null);
    setResult(null);
    setInMyProducts(false);
    setPreview(dataUrl);
    try {
      await ensureHairProfile();
      const analysis = await scanIngredient(dataUrl);
      setResult(analysis);
      const pid = analysis.matched_product?.id ?? analysis.matched_product_id;
      if (pid) setInMyProducts(await isMyProduct(pid));
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("ingredient.scanFailed");
      setError(msg);
      Alert.alert(t("ingredient.badge"), msg);
    } finally {
      setBusy(false);
    }
  };

  const captureFromCamera = async () => {
    if (capturing || busy) return;
    setCapturing(true);
    setError(null);
    try {
      if (Platform.OS !== "web" && cameraRef.current && camPerm?.granted) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          base64: true,
          skipProcessing: false,
        });
        if (photo?.base64) {
          const dataUrl = toDataUrl(photo.base64, "image/jpeg");
          await runScan(dataUrl);
          return;
        }
        if (photo?.uri) {
          const res = await fetch(photo.uri);
          const blob = await res.blob();
          const dataUrl = await new Promise<string | null>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () =>
              resolve(typeof reader.result === "string" ? reader.result : null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
          if (dataUrl) {
            await runScan(dataUrl);
            return;
          }
        }
      }
      const uri = await pickProductLabelFromCamera();
      if (uri) await runScan(uri);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("ingredient.scanFailed");
      setError(msg);
    } finally {
      setCapturing(false);
    }
  };

  const resetScan = () => {
    setResult(null);
    setPreview(null);
    setError(null);
    setInMyProducts(false);
  };

  const handleAddToMyProducts = async () => {
    if (!result) return;
    const matched = result.matched_product;
    const prodName =
      matched?.name ||
      result.product_analysis?.product_name ||
      t("ingredient.unknownProduct");
    const prodId =
      matched?.id ??
      (result.matched_product_id ? Number(result.matched_product_id) : 900000 + Math.floor(Math.random() * 90000));

    setAddingProduct(true);
    try {
      await addMyProduct({
        id: prodId,
        name: prodName,
        brand: matched?.brand || result.product_analysis?.brand || "Skan mahsulot",
        category: matched?.category || "other",
        image_url: matched?.image_url || null,
        source: "scan",
      });
      setInMyProducts(true);
      Alert.alert(t("care.myProducts.addedTitle"), t("care.myProducts.addedSub"));
    } finally {
      setAddingProduct(false);
    }
  };

  /** Tab ildizi — MySaloon’ga otib ketmasin; Parvarish (Morph) hubiga qaytamiz. */
  const leaveIngredient = useCallback(() => {
    goMorph(navigation, "MorphCare");
  }, [navigation, goMorph]);

  if (booting) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color="rgba(255,255,255,0.45)" />
      </View>
    );
  }

  if (access && !access.allowed) {
    return (
      <View style={[styles.root, { paddingTop: safeTop(insets.top, 12), paddingHorizontal: 20 }]}>
        <NativeBackButton
          onPress={leaveIngredient}
          accessibilityLabel={t("common.back")}
          color="#fff"
          backgroundColor="rgba(0,0,0,0.35)"
        />
        <View style={styles.lockWrap}>
          <Ionicons name="lock-closed-outline" size={24} color="rgba(255,255,255,0.5)" />
          <Text style={styles.lockTitle}>{t("ingredient.badge")}</Text>
          <Text style={styles.lockSub}>{access.detail || t("care.proOnly")}</Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() =>
              navigation.getParent()?.navigate("MorphTryOn", {
                screen: "MorphPaywall",
                params: { reason: "subscription", returnTo: "MorphCapture" },
              } as never)
            }
          >
            <Text style={styles.primaryBtnText}>{t("care.seePlans")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (phase === "analyzing") {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <View style={styles.analyzingCard}>
          {preview ? (
            <Image source={{ uri: preview }} style={styles.analyzingImg} contentFit="cover" />
          ) : null}
          <ActivityIndicator color="#fff" style={{ marginTop: 18 }} />
          <Text style={styles.analyzingTitle}>{t("ingredient.analyzing")}</Text>
          <Text style={styles.analyzingSub}>{t("ingredient.analyzingSub")}</Text>
        </View>
      </View>
    );
  }

  if (phase === "result" && result) {
    const score = result.product_analysis.safety_score;
    const verdict = String(result.verdict || result.verdict_key || "");
    const color = scoreTone(verdict, score);
    const matched = result.matched_product;
    const productName =
      result.product_analysis.product_name || matched?.name || t("ingredient.unknownProduct");
    const brand = result.product_analysis.brand || matched?.brand || "";
    const alerts = result.critical_alerts || [];
    const goods = result.beneficial_ingredients || [];

    return (
      <View style={styles.root}>
        <LinearGradient
          colors={["rgba(255,255,255,0.08)", "transparent"]}
          style={styles.topGlow}
          pointerEvents="none"
        />
        <ScrollView
          contentContainerStyle={{
            paddingTop: safeTop(insets.top, 8),
            paddingBottom: safeBottom(insets.bottom, 28),
            paddingHorizontal: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.rowBetween}>
            <NativeBackButton
              onPress={resetScan}
              color="#fff"
              backgroundColor="rgba(0,0,0,0.35)"
            />
            <Text style={styles.badge}>{t("ingredient.badge")}</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.scoreBlock}>
            <Text style={styles.badge}>{t("ingredient.badge")}</Text>
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreNum, { color }]}>{score}</Text>
              <Text style={styles.scoreDenom}>/ 100</Text>
            </View>
            {verdict ? (
              <Text style={[styles.verdictLabel, { color }]}>
                {t(`ingredient.verdicts.${verdict}`, { defaultValue: verdict })}
              </Text>
            ) : null}
            <Text style={styles.productName}>{productName}</Text>
            {brand ? <Text style={styles.brand}>{brand}</Text> : null}
            <Text style={styles.fit}>{result.fit_uz || result.product_analysis.verdict}</Text>
            {result.catalog_notes_uz ? (
              <Text style={styles.notes}>{result.catalog_notes_uz}</Text>
            ) : null}
            <Text style={styles.count}>
              {t("ingredient.ingredientsCount", {
                count: result.product_analysis.total_ingredients_count,
              })}
            </Text>
          </View>

          {matched ? (
            <Pressable
              style={styles.matchCard}
              onPress={() =>
                navigation.navigate("CareProductDetail", { productId: matched.id })
              }
            >
              <View style={styles.matchRow}>
                {matched.image_url ? (
                  <Image
                    source={{ uri: matched.image_url }}
                    style={styles.matchImg}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.matchImg, styles.matchImgPh]}>
                    <Ionicons name="flask-outline" size={20} color="rgba(255,255,255,0.4)" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.matchBadge}>{t("ingredient.catalogMatch")}</Text>
                  <Text style={styles.matchName}>{matched.name}</Text>
                  {matched.brand ? <Text style={styles.brand}>{matched.brand}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.35)" />
              </View>
              {matched.warnings_uz ? (
                <Text style={styles.warningInline}>{matched.warnings_uz}</Text>
              ) : null}
            </Pressable>
          ) : null}

          {alerts.length > 0 ? (
            <View style={{ marginTop: 28 }}>
              <Text style={styles.section}>{t("ingredient.alertsTitle")}</Text>
              <View style={{ gap: 8 }}>
                {alerts.map((alert, i) => (
                  <View key={`${alert.ingredient}-${i}`} style={styles.alertCard}>
                    <Ionicons name="warning-outline" size={16} color="#FDA4AF" />
                    <View style={{ flex: 1 }}>
                      {alert.ingredient ? (
                        <Text style={styles.alertIng}>{alert.ingredient}</Text>
                      ) : null}
                      <Text style={styles.alertMsg}>{alert.message_uz}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {goods.length > 0 ? (
            <View style={{ marginTop: 28 }}>
              <Text style={styles.section}>{t("ingredient.beneficialTitle")}</Text>
              <View style={{ gap: 8 }}>
                {goods.map((item, i) => (
                  <View key={`${item.ingredient}-${i}`} style={styles.goodCard}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#6EE7B7" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.goodIng}>{item.ingredient}</Text>
                      <Text style={styles.goodMsg}>{item.reason_uz}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {(result.ingredients || []).length > 0 ? (
            <View style={{ marginTop: 28 }}>
              <Text style={styles.section}>{t("ingredient.listTitle")}</Text>
              <Text style={styles.ingList}>{result.ingredients.join(" · ")}</Text>
            </View>
          ) : null}

          <Pressable style={[styles.primaryBtn, { marginTop: 28 }]} onPress={resetScan}>
            <Text style={styles.primaryBtnText}>{t("ingredient.scanAgain")}</Text>
          </Pressable>
          {result ? (
            <Pressable
              style={[
                styles.secondaryBtnFull,
                { marginTop: 10 },
                inMyProducts && styles.secondaryBtnDisabled,
              ]}
              disabled={inMyProducts || addingProduct}
              onPress={() => void handleAddToMyProducts()}
            >
              <Text style={styles.secondaryBtnText}>
                {inMyProducts ? t("care.myProducts.alreadyAdded") : t("care.myProducts.addFromScan")}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            style={[styles.secondaryBtnFull, { marginTop: matched ? 10 : 10 }]}
            onPress={() =>
              goMorph(navigation, "MorphCare", {
                screen: "CareHome",
                params: { openSearch: true },
              })
            }
          >
            <Text style={styles.secondaryBtnText}>{t("ingredient.openCatalog")}</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.scanRoot}>
      {Platform.OS !== "web" && camPerm?.granted ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode="picture"
        />
      ) : preview ? (
        <Image source={{ uri: preview }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.scanCamBg]} />
      )}
      <View style={styles.scanViewfinder} pointerEvents="none">
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />
      </View>
      <NativeBackButton
        onPress={leaveIngredient}
        accessibilityLabel={t("common.back")}
        color="#fff"
        backgroundColor="rgba(0,0,0,0.35)"
        style={[styles.closeX, { top: insets.top + 8 }]}
      />
      {error ? <Text style={[styles.scanError, { top: insets.top + 56 }]}>{error}</Text> : null}
      <View style={[styles.scanSheet, { paddingBottom: safeBottom(insets.bottom, 12) }]}>
        <Text style={styles.sheetTitle}>{t("ingredient.title")}</Text>
        <Text style={styles.sheetSub}>{t("ingredient.subtitle")}</Text>
        <Pressable
          style={[styles.captureBtn, (capturing || busy) && styles.disabled]}
          disabled={capturing || busy}
          onPress={() => void captureFromCamera()}
          accessibilityLabel={t("ingredient.capture", { defaultValue: "Rasmga olish" })}
        >
          {capturing ? (
            <ActivityIndicator color="#111" />
          ) : (
            <>
              <Ionicons name="camera" size={22} color="#111" />
              <Text style={styles.captureBtnText}>
                {t("ingredient.capture", { defaultValue: "Rasmga olish" })}
              </Text>
            </>
          )}
        </Pressable>
        <Pressable
          style={styles.galleryBtn}
          onPress={() =>
            void pickProductLabelFromGallery().then((uri) => {
              if (uri) void runScan(uri);
            })
          }
        >
          <Ionicons name="images-outline" size={18} color="#FFF" />
          <Text style={styles.galleryBtnText}>{t("ingredient.gallery")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#111111" },
  center: { alignItems: "center", justifyContent: "center" },
  topGlow: { position: "absolute", left: 0, right: 0, top: 0, height: verticalScale(220) },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    ...morphFont,
    fontSize: fontSize(12),
    color: "rgba(255,255,255,0.35)",
    fontWeight: "500",
    letterSpacing: 0.4,
  },
  link: { ...morphFont, fontSize: fontSize(13), color: "rgba(255,255,255,0.45)", fontWeight: "500" },
  h1: {
    ...morphFont,
    marginTop: verticalScale(10),
    fontSize: fontSize(26),
    fontWeight: "600",
    color: "#fff",
    letterSpacing: -0.4,
  },
  heroTitle: {
    ...morphFont,
    marginTop: verticalScale(18),
    fontSize: fontSize(28),
    fontWeight: "600",
    color: "#fff",
    letterSpacing: -0.5,
    lineHeight: fontSize(34),
  },
  heroSub: {
    ...morphFont,
    marginTop: verticalScale(10),
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    color: "rgba(255,255,255,0.5)",
    maxWidth: scale(320),
  },
  quizHint: {
    ...morphFont,
    marginTop: verticalScale(8),
    fontSize: fontSize(13),
    color: "rgba(255,255,255,0.4)",
  },
  progressTrack: {
    marginTop: verticalScale(16),
    height: verticalScale(3),
    borderRadius: moderateScale(99),
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#fff", borderRadius: moderateScale(99) },
  quizOpts: { marginTop: verticalScale(28), gap: moderateScale(8), flex: 1 },
  opt: {
    height: verticalScale(56),
    borderRadius: moderateScale(16),
    paddingHorizontal: scale(16),
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  optOn: { backgroundColor: "#fff" },
  optText: { ...morphFont, fontSize: fontSize(15), fontWeight: "500", color: "#fff" },
  optTextOn: { color: "#000" },
  quizActions: { flexDirection: "row", gap: moderateScale(8), marginTop: verticalScale(16) },
  primaryBtn: {
    height: verticalScale(52),
    borderRadius: 999,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: scale(20),
  },
  primaryBtnFlex: {
    height: verticalScale(52),
    flex: 1.6,
    borderRadius: 999,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { ...morphFont, fontSize: fontSize(15), fontWeight: "600", color: "#000" },
  secondaryBtn: {
    height: verticalScale(52),
    flex: 1,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnFull: {
    height: verticalScale(52),
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: scale(16),
  },
  secondaryBtnText: { ...morphFont, fontSize: fontSize(14), fontWeight: "600", color: "#fff" },
  secondaryBtnDisabled: { opacity: 0.45 },
  disabled: { opacity: 0.4 },
  lockWrap: { marginTop: verticalScale(80), alignItems: "center", paddingHorizontal: scale(12) },
  lockTitle: {
    ...morphFont,
    marginTop: verticalScale(14),
    fontSize: fontSize(18),
    fontWeight: "600",
    color: "#fff",
  },
  lockSub: {
    ...morphFont,
    marginTop: verticalScale(8),
    fontSize: fontSize(14),
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
  },
  scanRoot: { flex: 1, backgroundColor: "#111" },
  scanCamBg: { backgroundColor: "#1a1a1a" },
  scanViewfinder: {
    position: "absolute",
    top: "18%",
    left: "12%",
    right: "12%",
    bottom: "42%",
  },
  closeX: {
    position: "absolute",
    left: scale(16),
    zIndex: 4,
  },
  scanError: {
    ...morphFont,
    position: "absolute",
    left: scale(24),
    right: scale(24),
    zIndex: 4,
    textAlign: "center",
    color: "#FDA4AF",
    fontSize: fontSize(13),
  },
  scanSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#171717",
    borderTopLeftRadius: moderateScale(28),
    borderTopRightRadius: moderateScale(28),
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(22),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
  },
  sheetTitle: {
    ...morphFont,
    fontSize: fontSize(22),
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: -0.4,
    lineHeight: fontSize(28),
  },
  sheetSub: {
    ...morphFont,
    marginTop: verticalScale(8),
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    color: "rgba(255,255,255,0.55)",
  },
  captureBtn: {
    marginTop: verticalScale(18),
    height: verticalScale(54),
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: moderateScale(10),
  },
  captureBtnText: {
    ...morphFont,
    fontSize: fontSize(16),
    fontWeight: "700",
    color: "#111111",
  },
  galleryBtn: {
    marginTop: verticalScale(12),
    height: verticalScale(46),
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: moderateScale(8),
  },
  galleryBtnText: {
    ...morphFont,
    fontSize: fontSize(14),
    fontWeight: "600",
    color: "#FFF",
  },
  sheetNext: {
    marginTop: verticalScale(28),
    height: verticalScale(56),
    borderRadius: 999,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetNextText: { ...morphFont, fontSize: fontSize(16), fontWeight: "600", color: "#111" },
  sheetRow: {
    marginTop: verticalScale(12),
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: scale(4),
  },
  sheetLink: { ...morphFont, fontSize: fontSize(13), fontWeight: "500", color: "rgba(255,255,255,0.55)", paddingVertical: verticalScale(8) },
  corner: {
    position: "absolute",
    width: scale(28),
    height: scale(28),
    borderColor: "#fff",
  },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: moderateScale(10) },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: moderateScale(10) },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: moderateScale(10),
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: moderateScale(10),
  },
  iconBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(20),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  analyzingCard: { alignItems: "center", paddingHorizontal: scale(28) },
  analyzingImg: {
    width: scale(120),
    aspectRatio: ASPECT.portrait,
    borderRadius: moderateScale(16),
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  analyzingTitle: {
    ...morphFont,
    marginTop: verticalScale(16),
    fontSize: fontSize(17),
    fontWeight: "600",
    color: "#fff",
  },
  analyzingSub: {
    ...morphFont,
    marginTop: verticalScale(8),
    fontSize: fontSize(13),
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
  },
  scoreBlock: { marginTop: verticalScale(12) },
  scoreRow: { flexDirection: "row", alignItems: "flex-end", marginTop: verticalScale(10), gap: moderateScale(6) },
  scoreNum: { ...morphFont, fontSize: fontSize(56), fontWeight: "600", letterSpacing: -1.5 },
  scoreDenom: {
    ...morphFont,
    marginBottom: verticalScale(10),
    fontSize: fontSize(14),
    color: "rgba(255,255,255,0.4)",
  },
  verdictLabel: {
    ...morphFont,
    marginTop: verticalScale(4),
    fontSize: fontSize(12),
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  productName: {
    ...morphFont,
    marginTop: verticalScale(14),
    fontSize: fontSize(20),
    fontWeight: "600",
    color: "#fff",
  },
  brand: { ...morphFont, marginTop: verticalScale(2), fontSize: fontSize(13), color: "rgba(255,255,255,0.4)" },
  fit: {
    ...morphFont,
    marginTop: verticalScale(12),
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    color: "rgba(255,255,255,0.75)",
  },
  notes: {
    ...morphFont,
    marginTop: verticalScale(8),
    fontSize: fontSize(12),
    lineHeight: fontSize(18),
    color: "rgba(255,255,255,0.38)",
  },
  count: {
    ...morphFont,
    marginTop: verticalScale(10),
    fontSize: fontSize(12),
    color: "rgba(255,255,255,0.35)",
  },
  matchCard: {
    marginTop: verticalScale(24),
    borderRadius: moderateScale(24),
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(17, 17, 17, 0.12)",
    padding: moderateScale(16),
    shadowColor: "#111111",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  matchRow: { flexDirection: "row", alignItems: "center", gap: moderateScale(14) },
  matchImg: { width: scale(56), height: scale(56), borderRadius: moderateScale(16) },
  matchImgPh: {
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  matchBadge: {
    ...morphFont,
    fontSize: fontSize(11.5),
    color: "#737373",
    fontWeight: "500",
  },
  matchName: {
    ...morphFont,
    marginTop: verticalScale(2),
    fontSize: fontSize(15.5),
    fontWeight: "600",
    color: "#fff",
  },
  warningInline: {
    ...morphFont,
    marginTop: verticalScale(10),
    fontSize: fontSize(12),
    lineHeight: fontSize(17),
    color: "rgba(252,211,77,0.75)",
  },
  section: {
    ...morphFont,
    marginBottom: verticalScale(10),
    fontSize: fontSize(12),
    fontWeight: "500",
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 0.3,
  },
  alertCard: {
    flexDirection: "row",
    gap: moderateScale(12),
    borderRadius: moderateScale(20),
    padding: moderateScale(16),
    backgroundColor: "rgba(244,63,94,0.12)",
    borderWidth: 1,
    borderColor: "rgba(251,113,133,0.3)",
  },
  alertIng: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "600",
    color: "rgba(254,205,211,0.95)",
  },
  alertMsg: {
    ...morphFont,
    marginTop: verticalScale(2),
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    color: "rgba(255,255,255,0.8)",
  },
  goodCard: {
    flexDirection: "row",
    gap: moderateScale(12),
    borderRadius: moderateScale(20),
    padding: moderateScale(16),
    backgroundColor: "rgba(16,185,129,0.12)",
    borderWidth: 1,
    borderColor: "rgba(110,231,183,0.3)",
  },
  goodIng: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "600",
    color: "rgba(167,243,208,0.95)",
  },
  goodMsg: {
    ...morphFont,
    marginTop: verticalScale(2),
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    color: "rgba(255,255,255,0.8)",
  },
  ingList: {
    ...morphFont,
    fontSize: fontSize(13),
    lineHeight: fontSize(20),
    color: "rgba(255,255,255,0.55)",
  },
  errorText: {
    ...morphFont,
    marginTop: verticalScale(16),
    fontSize: fontSize(13),
    color: "#737373",
    textAlign: "center",
  },
});
