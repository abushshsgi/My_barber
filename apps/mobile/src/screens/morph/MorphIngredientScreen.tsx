import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Easing,
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
  barcodeLookupToIngredientScan,
  fetchCareProductByBarcode,
  fetchHairCareProfile,
  scanIngredient,
  updateHairCareProfile,
  type HairColorStatus,
  type HairCondition,
  type HairFit,
  type HairFitIngredient,
  type HairTexture,
  type IngredientScanResponse,
} from "../../api/care";
import { useMorphAppearance } from "../../lib/MorphAppearanceContext";
import type { MorphPalette } from "../../theme/morph-appearance";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { NativeBackButton } from "../../components/ui/NativeBackButton";
import {
  defaultQuiz,
  loadCareQuiz,
  saveCareQuiz,
  type CareQuizAnswers,
} from "../../lib/morf-ai-care";
import { addMyProduct, isMyProduct } from "../../lib/morph-my-products";
import {
  pickProductLabelFromCamera,
  pickProductLabelFromGallery,
} from "../../lib/product-label";
import { playBarcodeBeep, primeBarcodeBeep } from "../../lib/barcode-beep";
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
type ScanMode = "product" | "barcode";

const BARCODE_TYPES = ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39"] as const;

type ScanRect = { x: number; y: number; width: number; height: number };

type BarcodeHit = {
  bounds?: { origin?: { x?: number; y?: number }; size?: { width?: number; height?: number } };
  cornerPoints?: { x?: number; y?: number }[];
};

/** Kod markazi ramka ichida bo‘lsa qabul. Koordinata ishonchsiz bo‘lsa skan to‘xtamaydi. */
function barcodeInFrame(event: BarcodeHit, frame: ScanRect, viewW: number, viewH: number) {
  if (frame.width < 8 || frame.height < 8 || viewW < 8 || viewH < 8) return false;
  const raw: { x: number; y: number }[] = [];
  for (const point of event.cornerPoints ?? []) {
    if (typeof point.x === "number" && typeof point.y === "number") raw.push({ x: point.x, y: point.y });
  }
  const origin = event.bounds?.origin;
  const size = event.bounds?.size;
  if (
    !raw.length &&
    typeof origin?.x === "number" &&
    typeof origin?.y === "number" &&
    typeof size?.width === "number" &&
    typeof size?.height === "number"
  ) {
    raw.push(
      { x: origin.x, y: origin.y },
      { x: origin.x + size.width, y: origin.y },
      { x: origin.x, y: origin.y + size.height },
      { x: origin.x + size.width, y: origin.y + size.height },
    );
  }
  if (!raw.length) return true;
  const normalized = raw.every((p) => p.x >= 0 && p.y >= 0 && p.x <= 1.05 && p.y <= 1.05);
  const pts = normalized ? raw.map((p) => ({ x: p.x * viewW, y: p.y * viewH })) : raw;
  const cx = pts.reduce((sum, p) => sum + p.x, 0) / pts.length;
  const cy = pts.reduce((sum, p) => sum + p.y, 0) / pts.length;
  const pad = 16;
  const inside =
    cx >= frame.x - pad &&
    cx <= frame.x + frame.width + pad &&
    cy >= frame.y - pad &&
    cy <= frame.y + frame.height + pad;
  if (inside) return true;
  const unusable = pts.every(
    (p) => p.x < -40 || p.y < -40 || p.x > viewW + 80 || p.y > viewH + 80,
  );
  return unusable;
}

/** Care bilan bir xil — production oldidan false qiling. */
const CARE_ACCESS_DEBUG = true;

function hasQuizFields(q: CareQuizAnswers | null | undefined): boolean {
  return Boolean(q?.condition && q?.texture && q?.colorStatus);
}

function catalogFitKey(score: number): "excellent" | "good" | "ok" | "poor" {
  if (score >= 85) return "excellent";
  if (score >= 72) return "good";
  if (score >= 58) return "ok";
  return "poor";
}

function bandColor(percent: number, pal: MorphPalette): string {
  if (percent >= 78) return pal.fg;
  if (percent >= 55) return pal.warn;
  return pal.destructive;
}

export function MorphIngredientScreen({ navigation }: Props) {
  useHideTabBar();
  const { t } = useTranslation();
  const { colors: pal } = useMorphAppearance();
  const insets = useSafeAreaInsets();
  const { goMorph } = useShellNavigation();
  const cameraRef = useRef<CameraView>(null);
  const barcodeLock = useRef(false);
  const frameBox = useRef<ScanRect>({ x: 0, y: 0, width: 0, height: 0 });
  const rootBox = useRef({ width: 0, height: 0 });
  const scanLine = useRef(new Animated.Value(0)).current;
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [scanMode, setScanMode] = useState<ScanMode>("product");

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
  const [openIng, setOpenIng] = useState<HairFitIngredient | null>(null);
  const pageX = useRef(new Animated.Value(1)).current;

  const openIngredient = (row: HairFitIngredient) => {
    setOpenIng(row);
    pageX.setValue(1);
    Animated.timing(pageX, {
      toValue: 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeIngredient = () => {
    Animated.timing(pageX, {
      toValue: 1,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setOpenIng(null);
    });
  };

  useEffect(() => {
    if (!openIng) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      closeIngredient();
      return true;
    });
    return () => sub.remove();
  }, [openIng]);

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

  useEffect(() => {
    if (scanMode !== "barcode") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanLine, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scanLine, scanMode]);

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
      if (cameraRef.current && camPerm?.granted) {
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

  const runBarcode = async (raw: string) => {
    const code = raw.replace(/\D/g, "");
    if (code.length < 8 || barcodeLock.current || busy) return;
    barcodeLock.current = true;
    playBarcodeBeep();
    setBusy(true);
    setError(null);
    setResult(null);
    setInMyProducts(false);
    setPreview(null);
    try {
      await ensureHairProfile();
      const lookup = await fetchCareProductByBarcode(code, {
        condition: quiz.condition,
        texture: quiz.texture,
        color_status: quiz.colorStatus,
      });
      const analysis = barcodeLookupToIngredientScan(lookup);
      if (!lookup.found) {
        analysis.readable = false;
        analysis.verdict = "unread";
        analysis.verdict_key = "unread";
        analysis.critical_alerts = [
          {
            type: "not_found",
            ingredient: "",
            severity: "medium",
            message_uz: t("ingredient.barcodeNotFound"),
          },
        ];
      }
      const image = lookup.product?.image_url || null;
      if (image) setPreview(image);
      setResult(analysis);
      const pid = analysis.matched_product?.id ?? analysis.matched_product_id;
      if (pid) setInMyProducts(await isMyProduct(pid));
    } catch (e) {
      barcodeLock.current = false;
      const msg = e instanceof Error ? e.message : t("ingredient.scanFailed");
      setError(msg);
      Alert.alert(t("ingredient.badge"), msg);
    } finally {
      setBusy(false);
    }
  };

  const resetScan = () => {
    barcodeLock.current = false;
    setResult(null);
    setPreview(null);
    setError(null);
    setInMyProducts(false);
    setOpenIng(null);
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

  const axisLabel = (kind: string, tag: string) => {
    if (!tag) return "";
    if (kind === "texture") return t(`care.textures.${tag}`, { defaultValue: tag });
    if (kind === "color") return t(`care.colors.${tag}`, { defaultValue: tag });
    if (tag === "sensitive") return t("ingredient.sensitive");
    return t(`care.conditions.${tag}`, { defaultValue: tag });
  };

  const dimTitle = (key: string) => {
    if (key === "texture") return t("ingredient.dimTexture");
    if (key === "color") return t("ingredient.dimColor");
    if (key === "scalp") return t("ingredient.dimScalp");
    return t("ingredient.dimCondition");
  };

  if (booting) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top, backgroundColor: pal.bg }]}>
        <ActivityIndicator color={pal.muted} />
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
      <View style={[styles.root, styles.center, { paddingTop: insets.top, backgroundColor: pal.bg }]}>
        <View style={styles.analyzingCard}>
          {preview ? (
            <Image source={{ uri: preview }} style={[styles.analyzingImg, { backgroundColor: pal.cardStrong }]} contentFit="cover" />
          ) : null}
          <ActivityIndicator color={pal.fg} style={{ marginTop: 18 }} />
          <Text style={[styles.analyzingTitle, { color: pal.fg }]}>
            {scanMode === "barcode" ? t("ingredient.barcodeAnalyzing") : t("ingredient.analyzing")}
          </Text>
          <Text style={[styles.analyzingSub, { color: pal.muted }]}>{t("ingredient.analyzingSub")}</Text>
        </View>
      </View>
    );
  }

  if (phase === "result" && result) {
    const fit: HairFit | undefined = result.hair_fit;
    const ingredientCount =
      result.ingredients?.length || result.product_analysis.total_ingredients_count || 0;
    const readable =
      result.readable === false || result.verdict === "unread" || result.verdict_key === "unread"
        ? false
        : result.readable === true
          ? true
          : ingredientCount > 0;
    const catalogFit = result.catalog_fit;
    const overall = readable
      ? (catalogFit?.match_percent ?? fit?.overall ?? result.product_analysis.safety_score)
      : null;
    const catalogLabel =
      catalogFit && typeof catalogFit.match_percent === "number"
        ? t(`ingredient.catalogFit.${catalogFitKey(catalogFit.match_percent)}`)
        : "";
    const verdict = readable ? String(result.verdict || result.verdict_key || "") : "unread";
    const matched = result.matched_product;
    const productName =
      result.product_analysis.product_name || matched?.name || t("ingredient.unknownProduct");
    const brand = result.product_analysis.brand || matched?.brand || "";
    const rows =
      fit?.ingredients && fit.ingredients.length > 0
        ? fit.ingredients
            : (result.ingredients || []).map((name) => ({
            name,
            percent: null as number | null,
            tone: "neutral",
            role_uz: undefined as string | undefined,
          }));
    const profileBits = [
      { kind: "condition", tag: fit?.profile?.condition || quiz.condition },
      { kind: "texture", tag: fit?.profile?.texture || quiz.texture },
      { kind: "color", tag: fit?.profile?.color || quiz.colorStatus },
      { kind: "scalp", tag: fit?.profile?.scalp || "" },
    ].filter((item) => item.tag);
    const unreadMessage = result.critical_alerts?.[0]?.message_uz || t("ingredient.unreadBody");
    const countryName = (
      result.country?.country_name ||
      result.matched_product?.country_of_origin ||
      ""
    ).trim();
    const countryLine = `${t("ingredient.country")}: ${countryName || t("ingredient.countryUnknown")}`;
    const fitLine = [result.fit_uz, result.product_analysis.verdict]
      .map((line) => (line || "").trim())
      .find((line) => line && !/o['‘’]qilmadi/i.test(line));
    const cardStyle = {
      backgroundColor: pal.card,
      borderColor: pal.line,
      borderWidth: 1,
      borderRadius: 24,
    } as const;

    return (
      <View style={[styles.root, { backgroundColor: pal.bg }]}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: safeTop(insets.top, 8),
            paddingBottom: safeBottom(insets.bottom, 108),
            paddingHorizontal: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.rowBetween}>
            <NativeBackButton
              onPress={resetScan}
              color={pal.fg}
              backgroundColor={pal.card}
            />
            <Text style={[styles.badge, { color: pal.muted }]}>{t("ingredient.badge")}</Text>
            <View style={{ width: 40 }} />
          </View>

          {!readable ? (
            <View style={[cardStyle, { marginTop: 18, padding: 18 }]}>
              {preview ? (
                <Image source={{ uri: preview }} style={styles.resultPreview} contentFit="cover" />
              ) : (
                <View style={[styles.unreadIcon, { backgroundColor: pal.cardStrong }]}>
                  <Ionicons name="scan-outline" size={22} color={pal.fg} />
                </View>
              )}
              <Text style={[styles.productName, { color: pal.fg, marginTop: 14 }]}>
                {t("ingredient.unreadTitle")}
              </Text>
              <Text style={[styles.heroMeta, { color: pal.muted }]}>{countryLine}</Text>
              <Text style={[styles.fit, { color: pal.muted }]}>{unreadMessage}</Text>
              <View style={{ marginTop: 16, gap: 8 }}>
                {[t("ingredient.unreadTip1"), t("ingredient.unreadTip2"), t("ingredient.unreadTip3")].map(
                  (tip) => (
                    <View key={tip} style={styles.tipRow}>
                      <Ionicons name="checkmark-circle" size={16} color={pal.fg} />
                      <Text style={[styles.tipText, { color: pal.fg }]}>{tip}</Text>
                    </View>
                  ),
                )}
              </View>
            </View>
          ) : (
            <>
              <View style={styles.heroBlock}>
                {preview ? (
                  <Image source={{ uri: preview }} style={styles.heroThumb} contentFit="cover" />
                ) : null}
                <View style={{ flex: 1, minWidth: 0 }}>
                  {brand ? <Text style={[styles.heroBrand, { color: pal.muted }]}>{brand}</Text> : null}
                  <Text style={[styles.heroName, { color: pal.fg }]}>{productName}</Text>
                  <Text style={[styles.heroMeta, { color: pal.muted }]}>
                    {t("ingredient.ingredientsCount", { count: ingredientCount })}
                    {result.ingredients_source === "catalog" ? ` · ${t("ingredient.catalogFormula")}` : ""}
                  </Text>
                  <Text style={[styles.heroMeta, { color: pal.fg }]}>{countryLine}</Text>
                </View>
              </View>

              <View style={{ marginTop: 20 }}>
                <Text style={[styles.badge, { color: pal.muted }]}>{t("ingredient.hairFitTitle")}</Text>
                <View style={styles.scoreLine}>
                  <Text style={[styles.scoreLineNum, { color: pal.fg }]}>{overall}</Text>
                  <Text style={[styles.scoreLinePct, { color: pal.muted }]}>%</Text>
                  {(catalogLabel || verdict) ? (
                    <View style={[styles.verdictPill, { backgroundColor: pal.cardStrong, marginLeft: 8 }]}>
                      <Text style={[styles.verdictLabel, { color: bandColor(overall ?? 0, pal), marginTop: 0 }]}>
                        {catalogLabel || t(`ingredient.verdicts.${verdict}`, { defaultValue: verdict })}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={[styles.track, { backgroundColor: pal.track, marginTop: 10, height: 6 }]}>
                  <View
                    style={[
                      styles.fill,
                      {
                        height: 6,
                        width: `${overall ?? 0}%` as `${number}%`,
                        backgroundColor: bandColor(overall ?? 0, pal),
                      },
                    ]}
                  />
                </View>
                {profileBits.length > 0 ? (
                  <Text style={[styles.heroMeta, { color: pal.muted }]}>
                    {profileBits
                      .map((item) =>
                        item.kind === "scalp"
                          ? `${dimTitle("scalp")} ${axisLabel(item.kind, item.tag).toLowerCase()}`
                          : axisLabel(item.kind, item.tag),
                      )
                      .join(" · ")}
                  </Text>
                ) : null}
              </View>

              {catalogFit?.fit_reasons && catalogFit.fit_reasons.length > 0 ? (
                <View style={{ marginTop: 14, gap: 8 }}>
                  {catalogFit.fit_reasons.map((reason) => (
                    <Text key={reason} style={[styles.fit, { color: pal.fg, marginTop: 0 }]}>
                      {reason}
                    </Text>
                  ))}
                </View>
              ) : (fit?.dimensions || []).length > 0 ? (
                <View style={[cardStyle, { marginTop: 16, paddingVertical: 6 }]}>
                  {[...fit!.dimensions]
                    .sort((a, b) => a.percent - b.percent)
                    .map((dim, i) => (
                      <View
                        key={dim.key}
                        style={[styles.fitRow, i > 0 && { borderTopWidth: 1, borderTopColor: pal.line }]}
                      >
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.dimLabel, { color: pal.muted }]}>{dimTitle(dim.key)}</Text>
                          <Text style={[styles.fitRowValue, { color: pal.fg }]} numberOfLines={1}>
                            {axisLabel(dim.key, dim.tag)}
                          </Text>
                        </View>
                        <Text style={[styles.dimCellPct, { color: bandColor(dim.percent, pal) }]}>{dim.percent}%</Text>
                      </View>
                    ))}
                </View>
              ) : null}

              {!catalogFit && fitLine ? <Text style={[styles.fit, { color: pal.fg }]}>{fitLine}</Text> : null}
              {result.catalog_notes_uz && !/o['‘’]qilmadi|topilmadi/i.test(result.catalog_notes_uz) ? (
                <Text style={[styles.notes, { color: pal.muted }]}>{result.catalog_notes_uz}</Text>
              ) : null}
            </>
          )}

          {matched ? (
            <Pressable
              style={[styles.matchCard, cardStyle, { backgroundColor: pal.card, borderColor: pal.line }]}
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
                  <View style={[styles.matchImg, styles.matchImgPh, { backgroundColor: pal.cardStrong }]}>
                    <Ionicons name="flask-outline" size={20} color={pal.muted} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.matchBadge, { color: pal.muted }]}>{t("ingredient.catalogMatch")}</Text>
                  <Text style={[styles.matchName, { color: pal.fg }]}>{matched.name}</Text>
                  {matched.brand ? <Text style={[styles.brand, { color: pal.muted }]}>{matched.brand}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={pal.muted} />
              </View>
              {matched.warnings_uz ? (
                <Text style={[styles.warningInline, { color: pal.warn }]}>{matched.warnings_uz}</Text>
              ) : null}
            </Pressable>
          ) : null}

          {readable && rows.length > 0 ? (
            <View style={{ marginTop: 22 }}>
              <Text style={[styles.section, { color: pal.muted }]}>{t("ingredient.ingredientFit")}</Text>
              <View style={styles.ingGrid}>
                {[...rows]
                  .sort((a, b) => (a.percent ?? 101) - (b.percent ?? 101))
                  .map((row, i) => {
                  const tone = row.percent == null ? pal.muted : bandColor(row.percent, pal);
                  return (
                    <Pressable
                      key={`${row.name}-${i}`}
                      onPress={() => openIngredient(row)}
                      accessibilityLabel={t("ingredient.tapHint")}
                      style={[styles.ingCell, { backgroundColor: pal.card, borderColor: pal.line }]}
                    >
                      <View style={[styles.ingInfo, { backgroundColor: pal.cardStrong, borderColor: pal.line }]}>
                        <Text style={[styles.ingInfoMark, { color: pal.fg }]}>i</Text>
                      </View>
                      <Text style={[styles.ingName, { color: pal.fg }]} numberOfLines={2}>
                        {row.name}
                      </Text>
                      <Text style={[styles.ingRole, { color: tone }]} numberOfLines={1}>
                        {row.role_uz || t("ingredient.neutral")}
                        {row.percent != null ? ` · ${row.percent}%` : ""}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

        </ScrollView>
        <View
          style={[
            styles.resultActions,
            {
              paddingBottom: safeBottom(insets.bottom, 10),
              backgroundColor: pal.bg,
              borderTopColor: pal.line,
            },
          ]}
        >
          <Pressable
            style={[styles.resultAction, { backgroundColor: pal.fg }]}
            onPress={resetScan}
          >
            <Ionicons name="scan-outline" size={18} color={pal.bg} />
            <Text style={[styles.resultActionLabel, { color: pal.bg }]} numberOfLines={2}>
              {t("ingredient.scanAgain")}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.resultAction,
              { backgroundColor: pal.card, borderWidth: 1, borderColor: pal.line },
              inMyProducts && styles.secondaryBtnDisabled,
            ]}
            disabled={inMyProducts || addingProduct}
            onPress={() => void handleAddToMyProducts()}
          >
            <Ionicons name={inMyProducts ? "checkmark-circle" : "add-circle-outline"} size={18} color={pal.fg} />
            <Text style={[styles.resultActionLabel, { color: pal.fg }]} numberOfLines={2}>
              {inMyProducts ? t("care.myProducts.alreadyAdded") : t("care.myProducts.addShort")}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.resultAction, { backgroundColor: pal.card, borderWidth: 1, borderColor: pal.line }]}
            onPress={() =>
              goMorph(navigation, "MorphCare", {
                screen: "CareHome",
                params: { openSearch: true },
              })
            }
          >
            <Ionicons name="grid-outline" size={18} color={pal.fg} />
            <Text style={[styles.resultActionLabel, { color: pal.fg }]} numberOfLines={2}>
              {t("ingredient.openCatalog")}
            </Text>
          </Pressable>
        </View>
        {openIng ? (
          <Animated.View
            style={[
              styles.ingPage,
              {
                backgroundColor: pal.bg,
                paddingTop: safeTop(insets.top, 8),
                transform: [
                  {
                    translateX: pageX.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 520],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={[styles.rowBetween, { paddingHorizontal: 20 }]}>
              <NativeBackButton onPress={closeIngredient} color={pal.fg} backgroundColor={pal.card} />
              <Text style={[styles.badge, { color: pal.muted }]} numberOfLines={1}>
                {openIng.role_uz || t("ingredient.ingredientFit")}
              </Text>
              <View style={{ width: 40 }} />
            </View>
            <ScrollView
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 22,
                paddingBottom: safeBottom(insets.bottom, 28),
              }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.detailName, { color: pal.fg }]}>{openIng.name}</Text>
              <Text style={[styles.dimPct, { color: openIng.percent == null ? pal.muted : bandColor(openIng.percent, pal), marginTop: 8 }]}>
                {openIng.percent == null ? t("ingredient.neutral") : `${openIng.percent}%`}
              </Text>
              {[
                [t("ingredient.whatTitle"), openIng.about_uz],
                [t("ingredient.formulaTitle"), openIng.formula_uz],
                [t("ingredient.hairTitle"), openIng.hair_uz],
              ].map(([title, body]) =>
                body ? (
                  <View key={title} style={{ marginTop: 22 }}>
                    <Text style={[styles.section, { color: pal.muted }]}>{title}</Text>
                    <Text style={[styles.detailBody, { color: pal.fg }]}>{body}</Text>
                  </View>
                ) : null,
              )}
            </ScrollView>
          </Animated.View>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={styles.scanRoot}
      onLayout={(e) => {
        rootBox.current = {
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        };
      }}
    >
      {camPerm?.granted ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode="picture"
          barcodeScannerSettings={
            scanMode === "barcode" ? { barcodeTypes: [...BARCODE_TYPES] } : undefined
          }
          onBarcodeScanned={
            scanMode === "barcode" && !busy
              ? (event) => {
                  if (!barcodeInFrame(event, frameBox.current, rootBox.current.width, rootBox.current.height)) {
                    return;
                  }
                  void runBarcode(String(event?.data || ""));
                }
              : undefined
          }
        />
      ) : preview ? (
        <Image source={{ uri: preview }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.scanCamBg]} />
      )}
      <View
        style={[styles.scanViewfinder, scanMode === "barcode" && styles.scanViewfinderBarcode]}
        pointerEvents="none"
        onLayout={(e) => {
          frameBox.current = e.nativeEvent.layout;
        }}
      >
        <View style={[styles.corner, styles.tl, busy && scanMode === "barcode" && styles.cornerHot]} />
        <View style={[styles.corner, styles.tr, busy && scanMode === "barcode" && styles.cornerHot]} />
        <View style={[styles.corner, styles.bl, busy && scanMode === "barcode" && styles.cornerHot]} />
        <View style={[styles.corner, styles.br, busy && scanMode === "barcode" && styles.cornerHot]} />
        {scanMode === "barcode" ? (
          <Animated.View
            style={[
              styles.barcodeLine,
              {
                transform: [
                  {
                    translateY: scanLine.interpolate({
                      inputRange: [0, 1],
                      outputRange: [6, Math.max(20, verticalScale(78) - 14)],
                    }),
                  },
                ],
              },
            ]}
          />
        ) : null}
      </View>
      <NativeBackButton
        onPress={leaveIngredient}
        accessibilityLabel={t("common.back")}
        color="#fff"
        backgroundColor="rgba(0,0,0,0.35)"
        style={[styles.closeX, { top: insets.top + 8 }]}
      />
      <View style={[styles.modeRail, { top: insets.top + 64 }]}>
        {(["product", "barcode"] as const).map((mode) => {
          const on = scanMode === mode;
          return (
            <Pressable
              key={mode}
              style={[styles.modeTile, on && styles.modeTileOn]}
              onPress={() => {
                barcodeLock.current = false;
                setError(null);
                if (mode === "barcode") primeBarcodeBeep();
                setScanMode(mode);
              }}
            >
              <Ionicons
                name={mode === "barcode" ? "barcode-outline" : "cube-outline"}
                size={18}
                color={on ? "#111" : "#fff"}
              />
              <Text style={[styles.modeTileText, on && styles.modeTileTextOn]}>
                {mode === "barcode" ? t("ingredient.modeBarcode") : t("ingredient.modeProduct")}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={[styles.scanError, { top: insets.top + 56 }]}>{error}</Text> : null}
      <View style={[styles.scanDock, { paddingBottom: safeBottom(insets.bottom, 16) }]}>
        {scanMode === "product" ? (
          <View style={styles.shutterRow}>
            <View style={styles.shutterSide} />
            <Pressable
              style={[styles.shutter, (capturing || busy) && styles.disabled]}
              disabled={capturing || busy}
              onPress={() => void captureFromCamera()}
              accessibilityLabel={t("ingredient.capture", { defaultValue: "Rasmga olish" })}
            >
              {capturing ? <ActivityIndicator color="#111" /> : <View style={styles.shutterCore} />}
            </Pressable>
            <Pressable
              style={styles.shutterSide}
              onPress={() =>
                void pickProductLabelFromGallery().then((uri) => {
                  if (uri) void runScan(uri);
                })
              }
              accessibilityLabel={t("ingredient.gallery")}
            >
              <Ionicons name="images-outline" size={20} color="#fff" />
            </Pressable>
          </View>
        ) : busy ? (
          <View style={styles.barcodeStatus}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.barcodeLiveText}>{t("ingredient.barcodeAnalyzing")}</Text>
          </View>
        ) : (
          <View style={styles.barcodeIdle} />
        )}
        {!camPerm?.granted ? (
          <Pressable style={styles.galleryBtn} onPress={() => void requestCamPerm()}>
            <Ionicons name="camera-outline" size={18} color="#FFF" />
            <Text style={styles.galleryBtnText}>{t("ingredient.camera")}</Text>
          </Pressable>
        ) : null}
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
  heroBlock: {
    marginTop: verticalScale(22),
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(14),
  },
  heroThumb: {
    width: scale(64),
    height: scale(64),
    borderRadius: moderateScale(18),
  },
  heroBrand: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  heroName: {
    ...morphFont,
    marginTop: 2,
    fontSize: fontSize(22),
    fontWeight: "700",
    letterSpacing: -0.4,
    lineHeight: fontSize(26),
  },
  heroMeta: { ...morphFont, marginTop: 4, fontSize: fontSize(12) },
  scoreBand: {
    marginTop: verticalScale(18),
    borderRadius: moderateScale(22),
    paddingHorizontal: moderateScale(18),
    paddingVertical: verticalScale(16),
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(16),
  },
  scoreBandNum: { ...morphFont, fontSize: fontSize(44), fontWeight: "700", letterSpacing: -1.5 },
  scoreBandDenom: { ...morphFont, marginTop: -2, fontSize: fontSize(12), opacity: 0.7 },
  scoreBandLabel: { ...morphFont, fontSize: fontSize(12), opacity: 0.75 },
  scoreBandVerdict: { ...morphFont, marginTop: 2, fontSize: fontSize(18), fontWeight: "700" },
  scoreLine: { flexDirection: "row", alignItems: "flex-end", marginTop: verticalScale(4) },
  scoreLineNum: {
    ...morphFont,
    fontSize: fontSize(40),
    fontWeight: "700",
    letterSpacing: -1.2,
    lineHeight: fontSize(44),
  },
  scoreLinePct: { ...morphFont, marginBottom: verticalScale(6), marginLeft: 2, fontSize: fontSize(16) },
  fitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
    paddingHorizontal: moderateScale(14),
    paddingVertical: verticalScale(12),
  },
  fitRowValue: { ...morphFont, marginTop: 2, fontSize: fontSize(16), fontWeight: "700" },
  dimGrid: {
    marginTop: verticalScale(12),
    flexDirection: "row",
    flexWrap: "wrap",
    gap: moderateScale(8),
  },
  dimCell: {
    flexBasis: "47%",
    flexGrow: 1,
    borderRadius: moderateScale(18),
    borderWidth: 1,
    padding: moderateScale(12),
    gap: 2,
  },
  dimCellValue: { ...morphFont, fontSize: fontSize(15), fontWeight: "700" },
  dimCellPct: { ...morphFont, fontSize: fontSize(13), fontWeight: "700" },
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
    top: "22%",
    left: "30%",
    right: "30%",
    height: verticalScale(132),
  },
  scanViewfinderBarcode: {
    top: "34%",
    left: "16%",
    right: "16%",
    height: verticalScale(78),
  },
  barcodeLine: {
    position: "absolute",
    left: scale(10),
    right: scale(10),
    top: 0,
    height: 2,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  modeRail: {
    position: "absolute",
    right: scale(12),
    zIndex: 4,
    gap: 8,
  },
  modeTile: {
    width: 62,
    minHeight: 58,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  modeTileOn: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  modeTileText: {
    ...morphFont,
    fontSize: fontSize(9),
    fontWeight: "700",
    color: "#fff",
  },
  modeTileTextOn: { color: "#111" },
  barcodeStatus: {
    height: 36,
    borderRadius: 999,
    paddingHorizontal: 14,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    alignSelf: "center",
    gap: 8,
  },
  barcodeIdle: {
    height: 36,
  },
  barcodeLiveText: {
    ...morphFont,
    fontSize: fontSize(14),
    fontWeight: "600",
    color: "#fff",
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
  scanDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: scale(24),
    backgroundColor: "transparent",
  },
  shutterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  shutterCore: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#fff",
  },
  shutterSide: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
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
    width: scale(18),
    height: scale(18),
    borderColor: "#fff",
  },
  cornerHot: { borderColor: "#F5F5F5" },
  tl: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: moderateScale(5) },
  tr: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: moderateScale(5) },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: moderateScale(5),
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: moderateScale(5),
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
  resultPreview: {
    width: "100%",
    height: verticalScale(140),
    borderRadius: moderateScale(16),
  },
  unreadIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(14),
    alignItems: "center",
    justifyContent: "center",
  },
  tipRow: { flexDirection: "row", alignItems: "center", gap: moderateScale(8) },
  tipText: { ...morphFont, flex: 1, fontSize: fontSize(14), lineHeight: fontSize(20) },
  verdictPill: {
    alignSelf: "flex-start",
    marginTop: verticalScale(8),
    paddingHorizontal: moderateScale(10),
    paddingVertical: verticalScale(4),
    borderRadius: 999,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: moderateScale(8), marginTop: verticalScale(8) },
  chip: { borderRadius: 999, paddingHorizontal: moderateScale(10), paddingVertical: verticalScale(5) },
  chipText: { ...morphFont, fontSize: fontSize(12), fontWeight: "600" },
  dimHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: moderateScale(10) },
  dimLabel: { ...morphFont, fontSize: fontSize(13), fontWeight: "600" },
  dimPct: { ...morphFont, fontSize: fontSize(12), fontWeight: "600" },
  track: { height: 5, borderRadius: 99, marginTop: verticalScale(6), overflow: "hidden" },
  fill: { height: 5, borderRadius: 99 },
  productCard: {
    marginTop: verticalScale(12),
    padding: moderateScale(14),
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
  },
  resultThumb: { width: scale(52), height: scale(52), borderRadius: moderateScale(14) },
  ingInfo: {
    position: "absolute",
    top: moderateScale(8),
    right: moderateScale(8),
    width: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ingInfoMark: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "700",
    lineHeight: fontSize(13),
  },
  ingName: { ...morphFont, fontSize: fontSize(14), fontWeight: "600", paddingRight: scale(20) },
  resultActions: {
    flexDirection: "row",
    gap: moderateScale(8),
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(10),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  resultAction: {
    flex: 1,
    minHeight: verticalScale(58),
    borderRadius: moderateScale(16),
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(8),
  },
  resultActionLabel: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "700",
    textAlign: "center",
    lineHeight: fontSize(14),
  },
  ingRole: { ...morphFont, marginTop: 2, fontSize: fontSize(12) },
  ingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: moderateScale(8),
  },
  ingCell: {
    flexGrow: 1,
    flexBasis: "47%",
    maxWidth: "48%",
    borderWidth: 1,
    borderRadius: moderateScale(16),
    padding: moderateScale(12),
    minHeight: verticalScale(78),
    justifyContent: "space-between",
  },
  ingPage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
  },
  ingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    paddingHorizontal: moderateScale(14),
    paddingVertical: verticalScale(12),
  },
  tapHint: { ...morphFont, marginBottom: verticalScale(8), fontSize: fontSize(12) },
  detailBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  detailSheet: {
    maxHeight: "78%",
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    paddingHorizontal: moderateScale(20),
    paddingTop: verticalScale(10),
  },
  detailHandle: {
    alignSelf: "center",
    width: scale(36),
    height: 4,
    borderRadius: 99,
    marginBottom: verticalScale(14),
  },
  detailName: { ...morphFont, flex: 1, fontSize: fontSize(20), fontWeight: "700" },
  detailBody: { ...morphFont, fontSize: fontSize(15), lineHeight: fontSize(22) },
});
