import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { writeAppShell, writeLastShellTab } from "../../lib/app-shell";
import { useShellNavigation } from "../../lib/shell-nav";
import type { MorphIngredientStackParamList } from "../../navigation/MorphIngredientStack";
import { morphFont } from "../../theme/morph-font";

type Props = NativeStackScreenProps<MorphIngredientStackParamList, "IngredientScan">;
type QuizStep = 0 | 1 | 2;
type Phase = "quiz" | "capture" | "analyzing" | "result";

/** Care bilan bir xil — production oldidan false qiling. */
const CARE_ACCESS_DEBUG = true;

const CONDITION_OPTS: HairCondition[] = ["oily", "dry", "normal", "damaged"];
const TEXTURE_OPTS: HairTexture[] = ["straight", "wavy", "curly"];
const COLOR_OPTS: HairColorStatus[] = ["natural", "colored", "bleached"];

const VERDICT_COLOR: Record<string, string> = {
  good: "#6EE7B7",
  caution: "#FCD34D",
  bad: "#FB923C",
  dangerous: "#FB7185",
};

function scoreTone(verdict: string, score: number): string {
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

  const [booting, setBooting] = useState(true);
  const [access, setAccess] = useState<{ allowed: boolean; detail?: string } | null>(null);
  const [quiz, setQuiz] = useState<CareQuizAnswers>(defaultQuiz());
  const [quizStep, setQuizStep] = useState<QuizStep>(0);
  const [forceQuiz, setForceQuiz] = useState(false);
  const [profileOk, setProfileOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<IngredientScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inMyProducts, setInMyProducts] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);

  const phase: Phase = useMemo(() => {
    if (result) return "result";
    if (busy) return "analyzing";
    if (forceQuiz || (!profileOk && !booting)) return "quiz";
    return "capture";
  }, [result, busy, forceQuiz, profileOk, booting]);

  useEffect(() => {
    // Tarkib faqat Morph shellda — MySaloon dock aralashib ketmasin.
    void writeAppShell("morph");
    void writeLastShellTab("morph", "MorphCare");
  }, []);

  const bootstrap = useCallback(async () => {
    setBooting(true);
    try {
      const accessRes = CARE_ACCESS_DEBUG
        ? { allowed: true as const, detail: undefined }
        : await fetchCareAccess().catch(() => ({ allowed: false, detail: undefined }));
      setAccess(accessRes);
      if (!accessRes.allowed) return;

      const [saved, profile] = await Promise.all([
        loadCareQuiz(),
        fetchHairCareProfile().catch(() => null),
      ]);

      if (profile?.complete && profile.condition && profile.texture && profile.color_status) {
        setQuiz({
          condition: profile.condition as HairCondition,
          texture: profile.texture as HairTexture,
          colorStatus: profile.color_status as HairColorStatus,
        });
        setProfileOk(true);
      } else if (saved) {
        setQuiz(saved);
        setProfileOk(true);
      } else {
        setProfileOk(false);
        setQuizStep(0);
      }
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const finishQuiz = async () => {
    setSaving(true);
    try {
      await saveCareQuiz(quiz);
      await updateHairCareProfile({
        condition: quiz.condition,
        texture: quiz.texture,
        color_status: quiz.colorStatus,
      });
      setProfileOk(true);
      setForceQuiz(false);
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("common.retry"));
    } finally {
      setSaving(false);
    }
  };

  const runScan = async (dataUrl: string) => {
    setBusy(true);
    setError(null);
    setResult(null);
    setInMyProducts(false);
    setPreview(dataUrl);
    try {
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
    if (forceQuiz) {
      setForceQuiz(false);
      return;
    }
    goMorph(navigation, "MorphCare");
  }, [forceQuiz, navigation, goMorph]);

  if (booting) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color="rgba(255,255,255,0.45)" />
      </View>
    );
  }

  if (access && !access.allowed) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 12, paddingHorizontal: 20 }]}>
        <Pressable
          style={styles.iconBtn}
          onPress={leaveIngredient}
          accessibilityLabel={t("common.back")}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
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

  if (phase === "quiz") {
    const questions = [
      {
        title: t("care.quiz.conditionQ"),
        options: CONDITION_OPTS,
        value: quiz.condition,
        onPick: (v: string) => setQuiz((q) => ({ ...q, condition: v as HairCondition })),
        labelKey: "care.conditions",
      },
      {
        title: t("care.quiz.textureQ"),
        options: TEXTURE_OPTS,
        value: quiz.texture,
        onPick: (v: string) => setQuiz((q) => ({ ...q, texture: v as HairTexture })),
        labelKey: "care.textures",
      },
      {
        title: t("care.quiz.colorQ"),
        options: COLOR_OPTS,
        value: quiz.colorStatus,
        onPick: (v: string) => setQuiz((q) => ({ ...q, colorStatus: v as HairColorStatus })),
        labelKey: "care.colors",
      },
    ] as const;
    const current = questions[quizStep];
    const canNext = Boolean(current.value);
    const progress = ((quizStep + 1) / 3) * 100;

    return (
      <View
        style={[
          styles.root,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 16,
            paddingHorizontal: 20,
          },
        ]}
      >
        <View style={styles.rowBetween}>
          <Pressable
            style={styles.iconBtn}
            onPress={leaveIngredient}
            accessibilityLabel={t("common.back")}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.badge}>{t("ingredient.badge")}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.quizHint}>{t("ingredient.quizHint")}</Text>
          <Text style={styles.h1}>{current.title}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.quizOpts}>
            {current.options.map((value) => {
              const on = current.value === value;
              return (
                <Pressable
                  key={value}
                  style={[styles.opt, on && styles.optOn]}
                  onPress={() => current.onPick(value)}
                >
                  <Text style={[styles.optText, on && styles.optTextOn]}>
                    {t(`${current.labelKey}.${value}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        <View style={styles.quizActions}>
          {quizStep > 0 ? (
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => setQuizStep((s) => (s - 1) as QuizStep)}
            >
              <Text style={styles.secondaryBtnText}>{t("common.back")}</Text>
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <Pressable
            style={[styles.primaryBtnFlex, (!canNext || saving) && styles.disabled]}
            disabled={!canNext || saving}
            onPress={() => {
              if (quizStep === 2) void finishQuiz();
              else setQuizStep((s) => (s + 1) as QuizStep);
            }}
          >
            {saving ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {quizStep === 2 ? t("common.save") : t("common.next")}
              </Text>
            )}
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
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 28,
            paddingHorizontal: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.rowBetween}>
            <Pressable style={styles.iconBtn} onPress={resetScan}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <Pressable onPress={() => setForceQuiz(true)}>
              <Text style={styles.link}>{t("care.quiz.retake")}</Text>
            </Pressable>
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
      {preview ? (
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
      <Pressable
        style={[styles.closeX, { top: insets.top + 8 }]}
        onPress={leaveIngredient}
        accessibilityLabel={t("common.back")}
      >
        <Ionicons name="close" size={22} color="#fff" />
      </Pressable>
      {error ? <Text style={[styles.scanError, { top: insets.top + 56 }]}>{error}</Text> : null}
      <View style={[styles.scanSheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Text style={styles.sheetTitle}>{t("ingredient.title")}</Text>
        <Text style={styles.sheetSub}>{t("ingredient.subtitle")}</Text>
        <Pressable
          style={styles.sheetNext}
          onPress={() =>
            void pickProductLabelFromCamera().then((uri) => {
              if (uri) void runScan(uri);
            })
          }
        >
          <Text style={styles.sheetNextText}>{t("common.next")}</Text>
        </Pressable>
        <View style={styles.sheetRow}>
          <Pressable
            onPress={() =>
              void pickProductLabelFromGallery().then((uri) => {
                if (uri) void runScan(uri);
              })
            }
          >
            <Text style={styles.sheetLink}>{t("ingredient.gallery")}</Text>
          </Pressable>
          <Pressable onPress={() => setForceQuiz(true)}>
            <Text style={styles.sheetLink}>{t("ingredient.editProfile")}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050505" },
  center: { alignItems: "center", justifyContent: "center" },
  topGlow: { position: "absolute", left: 0, right: 0, top: 0, height: 220 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    ...morphFont,
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    fontWeight: "500",
    letterSpacing: 0.4,
  },
  link: { ...morphFont, fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: "500" },
  h1: {
    ...morphFont,
    marginTop: 10,
    fontSize: 26,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: -0.4,
  },
  heroTitle: {
    ...morphFont,
    marginTop: 18,
    fontSize: 28,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  heroSub: {
    ...morphFont,
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.5)",
    maxWidth: 320,
  },
  quizHint: {
    ...morphFont,
    marginTop: 8,
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
  },
  progressTrack: {
    marginTop: 16,
    height: 3,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#fff", borderRadius: 99 },
  quizOpts: { marginTop: 28, gap: 8, flex: 1 },
  opt: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  optOn: { backgroundColor: "#fff" },
  optText: { ...morphFont, fontSize: 15, fontWeight: "500", color: "#fff" },
  optTextOn: { color: "#000" },
  quizActions: { flexDirection: "row", gap: 8, marginTop: 16 },
  primaryBtn: {
    height: 52,
    borderRadius: 999,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 20,
  },
  primaryBtnFlex: {
    height: 52,
    flex: 1.6,
    borderRadius: 999,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { ...morphFont, fontSize: 15, fontWeight: "600", color: "#000" },
  secondaryBtn: {
    height: 52,
    flex: 1,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnFull: {
    height: 52,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  secondaryBtnText: { ...morphFont, fontSize: 14, fontWeight: "600", color: "#fff" },
  secondaryBtnDisabled: { opacity: 0.45 },
  disabled: { opacity: 0.4 },
  lockWrap: { marginTop: 80, alignItems: "center", paddingHorizontal: 12 },
  lockTitle: {
    ...morphFont,
    marginTop: 14,
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  lockSub: {
    ...morphFont,
    marginTop: 8,
    fontSize: 14,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
  },
  scanRoot: { flex: 1, backgroundColor: "#111" },
  scanCamBg: { backgroundColor: "#1a1a1a" },
  scanViewfinder: {
    position: "absolute",
    top: "12%",
    left: "12%",
    right: "12%",
    bottom: "42%",
  },
  closeX: {
    position: "absolute",
    right: 16,
    zIndex: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanError: {
    ...morphFont,
    position: "absolute",
    left: 24,
    right: 24,
    zIndex: 4,
    textAlign: "center",
    color: "#FDA4AF",
    fontSize: 13,
  },
  scanSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  sheetTitle: {
    ...morphFont,
    fontSize: 23,
    fontWeight: "700",
    color: "#111",
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  sheetSub: {
    ...morphFont,
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: "#757575",
  },
  sheetNext: {
    marginTop: 28,
    height: 56,
    borderRadius: 999,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetNextText: { ...morphFont, fontSize: 16, fontWeight: "600", color: "#111" },
  sheetRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  sheetLink: { ...morphFont, fontSize: 13, fontWeight: "500", color: "#757575", paddingVertical: 8 },
  corner: {
    position: "absolute",
    width: 36,
    height: 36,
    borderColor: "#fff",
  },
  tl: { top: 0, left: 0, borderTopWidth: 3.5, borderLeftWidth: 3.5, borderTopLeftRadius: 12 },
  tr: { top: 0, right: 0, borderTopWidth: 3.5, borderRightWidth: 3.5, borderTopRightRadius: 12 },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 12,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  analyzingCard: { alignItems: "center", paddingHorizontal: 28 },
  analyzingImg: {
    width: 120,
    height: 160,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  analyzingTitle: {
    ...morphFont,
    marginTop: 16,
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
  },
  analyzingSub: {
    ...morphFont,
    marginTop: 8,
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
  },
  scoreBlock: { marginTop: 12 },
  scoreRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 10, gap: 6 },
  scoreNum: { ...morphFont, fontSize: 56, fontWeight: "600", letterSpacing: -1.5 },
  scoreDenom: {
    ...morphFont,
    marginBottom: 10,
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
  },
  verdictLabel: {
    ...morphFont,
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  productName: {
    ...morphFont,
    marginTop: 14,
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
  },
  brand: { ...morphFont, marginTop: 2, fontSize: 13, color: "rgba(255,255,255,0.4)" },
  fit: {
    ...morphFont,
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.75)",
  },
  notes: {
    ...morphFont,
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: "rgba(255,255,255,0.38)",
  },
  count: {
    ...morphFont,
    marginTop: 10,
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
  },
  matchCard: {
    marginTop: 24,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.25)",
    padding: 16,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  matchRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  matchImg: { width: 56, height: 56, borderRadius: 16 },
  matchImgPh: {
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  matchBadge: {
    ...morphFont,
    fontSize: 11.5,
    color: "#DDD6FE",
    fontWeight: "500",
  },
  matchName: {
    ...morphFont,
    marginTop: 2,
    fontSize: 15.5,
    fontWeight: "600",
    color: "#fff",
  },
  warningInline: {
    ...morphFont,
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(252,211,77,0.75)",
  },
  section: {
    ...morphFont,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 0.3,
  },
  alertCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 20,
    padding: 16,
    backgroundColor: "rgba(244,63,94,0.12)",
    borderWidth: 1,
    borderColor: "rgba(251,113,133,0.3)",
  },
  alertIng: {
    ...morphFont,
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(254,205,211,0.95)",
  },
  alertMsg: {
    ...morphFont,
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.8)",
  },
  goodCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 20,
    padding: 16,
    backgroundColor: "rgba(16,185,129,0.12)",
    borderWidth: 1,
    borderColor: "rgba(110,231,183,0.3)",
  },
  goodIng: {
    ...morphFont,
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(167,243,208,0.95)",
  },
  goodMsg: {
    ...morphFont,
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.8)",
  },
  ingList: {
    ...morphFont,
    fontSize: 13,
    lineHeight: 20,
    color: "rgba(255,255,255,0.55)",
  },
  errorText: {
    ...morphFont,
    marginTop: 16,
    fontSize: 13,
    color: "#FB7185",
    textAlign: "center",
  },
});
