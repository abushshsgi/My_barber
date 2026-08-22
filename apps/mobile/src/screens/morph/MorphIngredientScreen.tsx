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
import {
  pickProductLabelFromCamera,
  pickProductLabelFromGallery,
} from "../../lib/product-label";
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

  const phase: Phase = useMemo(() => {
    if (result) return "result";
    if (busy) return "analyzing";
    if (forceQuiz || (!profileOk && !booting)) return "quiz";
    return "capture";
  }, [result, busy, forceQuiz, profileOk, booting]);

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
    setPreview(dataUrl);
    try {
      const analysis = await scanIngredient(dataUrl);
      setResult(analysis);
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
  };

  if (booting) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color="rgba(255,255,255,0.45)" />
      </View>
    );
  }

  if (access && !access.allowed) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 24, paddingHorizontal: 20 }]}>
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
        <Text style={styles.badge}>{t("ingredient.badge")}</Text>
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
          <Pressable
            style={[styles.secondaryBtnFull, { marginTop: 10 }]}
            onPress={() => navigation.navigate("CareProducts")}
          >
            <Text style={styles.secondaryBtnText}>{t("ingredient.openCatalog")}</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["rgba(255,255,255,0.07)", "transparent"]}
        style={styles.topGlow}
        pointerEvents="none"
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 20,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.rowBetween}>
          <Text style={styles.badge}>{t("ingredient.badge")}</Text>
          <Pressable onPress={() => navigation.navigate("CareProducts")}>
            <Text style={styles.link}>{t("ingredient.openCatalog")}</Text>
          </Pressable>
        </View>

        <Text style={styles.heroTitle}>{t("ingredient.title")}</Text>
        <Text style={styles.heroSub}>{t("ingredient.subtitle")}</Text>

        <View style={styles.scanStage}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            <Ionicons name="scan-outline" size={40} color="rgba(255,255,255,0.35)" />
            <Text style={styles.scanHint}>{t("ingredient.frameHint")}</Text>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.ctaCol}>
          <Pressable
            style={styles.primaryBtn}
            onPress={() =>
              void pickProductLabelFromCamera().then((uri) => {
                if (uri) void runScan(uri);
              })
            }
          >
            <Ionicons name="camera" size={18} color="#000" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText}>{t("ingredient.camera")}</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtnFull}
            onPress={() =>
              void pickProductLabelFromGallery().then((uri) => {
                if (uri) void runScan(uri);
              })
            }
          >
            <Ionicons name="images-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.secondaryBtnText}>{t("ingredient.gallery")}</Text>
          </Pressable>
          <Pressable style={styles.textLinkCenter} onPress={() => setForceQuiz(true)}>
            <Text style={styles.link}>{t("ingredient.editProfile")}</Text>
          </Pressable>
        </View>
      </ScrollView>
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
  scanStage: { marginTop: 36, alignItems: "center" },
  scanFrame: {
    width: "100%",
    maxWidth: 320,
    aspectRatio: 3 / 4,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "rgba(255,255,255,0.55)",
  },
  tl: { top: 18, left: 18, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 8 },
  tr: { top: 18, right: 18, borderTopWidth: 2.5, borderRightWidth: 2.5, borderTopRightRadius: 8 },
  bl: {
    bottom: 18,
    left: 18,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
    borderBottomLeftRadius: 8,
  },
  br: {
    bottom: 18,
    right: 18,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
    borderBottomRightRadius: 8,
  },
  scanHint: {
    ...morphFont,
    marginTop: 14,
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  ctaCol: { marginTop: 28, gap: 10 },
  textLinkCenter: { alignItems: "center", paddingVertical: 12 },
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
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 14,
  },
  matchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  matchImg: { width: 52, height: 52, borderRadius: 12 },
  matchImgPh: {
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  matchBadge: {
    ...morphFont,
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
  },
  matchName: {
    ...morphFont,
    marginTop: 2,
    fontSize: 15,
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
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(244,63,94,0.1)",
    borderWidth: 1,
    borderColor: "rgba(251,113,133,0.2)",
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
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(16,185,129,0.1)",
    borderWidth: 1,
    borderColor: "rgba(110,231,183,0.15)",
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
