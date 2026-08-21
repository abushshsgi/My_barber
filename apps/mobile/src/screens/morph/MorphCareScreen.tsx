import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
  fetchCareProducts,
  fetchHairCareProfile,
  updateHairCareProfile,
  type CareProduct,
  type HairColorStatus,
  type HairCondition,
  type HairTexture,
} from "../../api/care";
import {
  buildCarePlan,
  defaultQuiz,
  loadCareQuiz,
  saveCareQuiz,
  type CareQuizAnswers,
} from "../../lib/morph-ai-care";
import type { MorphCareStackParamList } from "../../navigation/MorphCareStack";
import { morphFont } from "../../theme/morph-font";

type Props = NativeStackScreenProps<MorphCareStackParamList, "CareHome">;
type QuizStep = 0 | 1 | 2;

/** Vaqtinchalik: Pro obunasiz Care ochiq. Production oldidan false qiling. */
const CARE_ACCESS_DEBUG = true;

const CONDITION_OPTS: HairCondition[] = ["oily", "dry", "normal", "damaged"];
const TEXTURE_OPTS: HairTexture[] = ["straight", "wavy", "curly"];
const COLOR_OPTS: HairColorStatus[] = ["natural", "colored", "bleached"];

export function MorphCareScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<{ allowed: boolean; detail?: string } | null>(null);
  const [quiz, setQuiz] = useState<CareQuizAnswers>(defaultQuiz);
  const [step, setStep] = useState<QuizStep | "plan">(0);
  const [catalog, setCatalog] = useState<CareProduct[]>([]);
  const [saving, setSaving] = useState(false);

  const plan = useMemo(() => buildCarePlan(quiz), [quiz]);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const accessRes = CARE_ACCESS_DEBUG
        ? { allowed: true as const, detail: undefined }
        : await fetchCareAccess().catch(() => ({
            allowed: false,
            detail: undefined,
          }));
      setAccess(accessRes);
      if (!accessRes.allowed) return;

      const [saved, profile] = await Promise.all([
        loadCareQuiz(),
        fetchHairCareProfile().catch(() => null),
      ]);

      if (profile?.complete && profile.condition && profile.texture && profile.color_status) {
        const next: CareQuizAnswers = {
          condition: profile.condition as HairCondition,
          texture: profile.texture as HairTexture,
          colorStatus: profile.color_status as HairColorStatus,
        };
        setQuiz(next);
        await saveCareQuiz(next);
        setStep("plan");
      } else if (saved) {
        setQuiz(saved);
        setStep("plan");
      } else {
        setStep(0);
      }

      const products = await fetchCareProducts({ recommended: true }).catch(() => []);
      setCatalog(products);
    } finally {
      setLoading(false);
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
      }).catch(() => undefined);
      const products = await fetchCareProducts({ recommended: true }).catch(() => []);
      setCatalog(products);
      setStep("plan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color="rgba(255,255,255,0.5)" />
      </View>
    );
  }

  if (access && !access.allowed) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 24, paddingHorizontal: 20 }]}>
        <View style={styles.lockWrap}>
          <Ionicons name="lock-closed-outline" size={24} color="rgba(255,255,255,0.5)" />
          <Text style={styles.lockTitle}>{t("care.badge")}</Text>
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

  if (step !== "plan") {
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
    const current = questions[step];
    const progress = ((step + 1) / questions.length) * 100;

    return (
      <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
        <View style={styles.pad}>
          <View style={styles.rowBetween}>
            <Text style={styles.muted}>{t("care.badge")}</Text>
            <Text style={styles.muted}>
              {step + 1}/3
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.h1}>{current.title}</Text>
          <View style={styles.optGrid}>
            {current.options.map((opt) => {
              const selected = current.value === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => current.onPick(opt)}
                  style={[styles.optCard, selected && styles.optCardOn]}
                >
                  <Text style={styles.optText}>{t(`${current.labelKey}.${opt}`)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {step > 0 ? (
            <Pressable
              style={styles.ghostBtn}
              onPress={() => setStep((step - 1) as QuizStep)}
            >
              <Text style={styles.ghostBtnText}>{t("common.back")}</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={[styles.primaryBtn, styles.flexGrow, saving && styles.disabled]}
            disabled={saving}
            onPress={() => {
              if (step === 2) void finishQuiz();
              else setStep((step + 1) as QuizStep);
            }}
          >
            <Text style={styles.primaryBtnText}>
              {step === 2 ? t("care.quiz.seePlan") : t("common.next")}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const productRows =
    catalog.length > 0
      ? catalog.slice(0, 4).map((p) => ({
          id: String(p.id),
          name: p.name,
          role: p.brand || p.category,
          tip: p.purpose_uz || p.usage_uz,
          remote: true as const,
        }))
      : plan.products.map((p) => ({
          id: p.name,
          name: p.name,
          role: p.role,
          tip: p.tip,
          remote: false as const,
        }));

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: Math.max(insets.bottom, 28) + 72,
        paddingHorizontal: 20,
      }}
    >
      <View style={styles.rowBetween}>
        <Text style={styles.muted}>{t("care.badge")}</Text>
        <Pressable onPress={() => setStep(0)}>
          <Text style={styles.link}>{t("care.quiz.retake")}</Text>
        </Pressable>
      </View>
      <Text style={styles.h1}>{t("care.title")}</Text>
      <Text style={styles.body}>{plan.summary}</Text>

      <View style={styles.traits}>
        {[
          { label: t("care.condition"), value: t(`care.conditions.${plan.condition}`) },
          { label: t("care.texture"), value: t(`care.textures.${plan.texture}`) },
          { label: t("care.colorStatus"), value: t(`care.colors.${plan.colorStatus}`) },
        ].map((item) => (
          <View key={item.label} style={styles.traitCard}>
            <Text style={styles.traitLabel}>{item.label}</Text>
            <Text style={styles.traitValue} numberOfLines={1}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.section}>{t("care.weeklyTitle")}</Text>
      {plan.weekly.map((row) => (
        <View key={row.day} style={styles.listRow}>
          <Text style={styles.day}>{row.day}</Text>
          <Text style={styles.listText}>{row.task}</Text>
        </View>
      ))}

      <View style={[styles.rowBetween, { marginTop: 28 }]}>
        <Text style={styles.sectionTight}>{t("care.productsTitle")}</Text>
        <Pressable onPress={() => navigation.navigate("CareProducts")}>
          <Text style={styles.link}>{t("common.viewAll")}</Text>
        </Pressable>
      </View>
      {productRows.map((p) => (
        <Pressable
          key={p.id}
          style={styles.listRowCol}
          onPress={() => {
            if (p.remote) navigation.navigate("CareProductDetail", { productId: Number(p.id) });
          }}
        >
          <View style={styles.rowBetween}>
            <Text style={styles.listTitle}>{p.name}</Text>
            <Text style={styles.mutedSmall}>{p.role}</Text>
          </View>
          {p.tip ? <Text style={styles.listHint}>{p.tip}</Text> : null}
        </Pressable>
      ))}

      <Text style={styles.section}>{t("care.tipsTitle")}</Text>
      {plan.stylingTips.map((tip) => (
        <Text key={tip} style={styles.bullet}>
          • {tip}
        </Text>
      ))}

      <Text style={styles.section}>{t("care.avoidTitle")}</Text>
      {plan.avoid.map((tip) => (
        <Text key={tip} style={styles.bullet}>
          • {tip}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050505" },
  center: { alignItems: "center", justifyContent: "center" },
  pad: { flex: 1, paddingHorizontal: 20 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  muted: { ...morphFont, fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: "500" },
  mutedSmall: { ...morphFont, fontSize: 11, color: "rgba(255,255,255,0.35)" },
  link: { ...morphFont, fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: "500" },
  h1: {
    marginTop: 16,
    maxWidth: 280,
    ...morphFont,
    fontSize: 28,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  body: {
    marginTop: 12,
    ...morphFont,
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.7)",
  },
  progressTrack: {
    marginTop: 16,
    height: 2,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#fff", borderRadius: 99 },
  optGrid: { marginTop: 24, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  optCard: {
    width: "47%",
    minHeight: 72,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 14,
    justifyContent: "flex-end",
  },
  optCardOn: { borderColor: "#fff" },
  optText: { ...morphFont, fontSize: 14, fontWeight: "600", color: "#fff" },
  footer: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  primaryBtn: {
    height: 48,
    borderRadius: 999,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  primaryBtnText: { ...morphFont, fontSize: 14, fontWeight: "600", color: "#000" },
  ghostBtn: {
    height: 48,
    flex: 1,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  ghostBtnText: { ...morphFont, fontSize: 14, fontWeight: "600", color: "#fff" },
  flexGrow: { flex: 1.6 },
  disabled: { opacity: 0.5 },
  lockWrap: { marginTop: 80, alignItems: "center", paddingHorizontal: 24 },
  lockTitle: {
    marginTop: 16,
    ...morphFont,
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  lockSub: {
    marginTop: 8,
    ...morphFont,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },
  traits: { marginTop: 20, flexDirection: "row", gap: 8 },
  traitCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  traitLabel: { ...morphFont, fontSize: 10, color: "rgba(255,255,255,0.35)" },
  traitValue: {
    marginTop: 4,
    ...morphFont,
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  section: {
    marginTop: 28,
    marginBottom: 10,
    ...morphFont,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.4,
    color: "rgba(255,255,255,0.35)",
  },
  sectionTight: {
    ...morphFont,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.4,
    color: "rgba(255,255,255,0.35)",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  listRowCol: {
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 6,
  },
  day: {
    width: 32,
    ...morphFont,
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.4)",
  },
  listText: { ...morphFont, fontSize: 14, fontWeight: "500", color: "#fff", flex: 1 },
  listTitle: { ...morphFont, fontSize: 14, fontWeight: "600", color: "#fff", flex: 1 },
  listHint: {
    marginTop: 4,
    ...morphFont,
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
  },
  bullet: {
    marginBottom: 6,
    ...morphFont,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.7)",
  },
});
