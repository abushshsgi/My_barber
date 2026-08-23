import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
type ViewMode = "hub" | "flow";

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
  const [viewMode, setViewMode] = useState<ViewMode>("hub");
  const [hubQuery, setHubQuery] = useState("");
  const [quiz, setQuiz] = useState<CareQuizAnswers>(defaultQuiz);
  const [step, setStep] = useState<QuizStep | "plan">(0);
  const [catalog, setCatalog] = useState<CareProduct[]>([]);
  const [saving, setSaving] = useState(false);

  const plan = useMemo(() => buildCarePlan(quiz), [quiz]);

  const openCatalog = useCallback(
    (q?: string) => {
      const trimmed = (q ?? hubQuery).trim();
      navigation.navigate("CareProducts", trimmed ? { q: trimmed } : undefined);
    },
    [hubQuery, navigation],
  );

  const openTarkib = useCallback(() => {
    navigation.getParent()?.navigate("MorphIngredient" as never);
  }, [navigation]);

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
      <View style={[styles.root, styles.pad, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.muted}>{t("care.badge")}</Text>
        <View style={styles.lockWrap}>
          <Ionicons name="lock-closed" size={28} color="rgba(255,255,255,0.5)" />
          <Text style={styles.lockTitle}>{t("care.badge")}</Text>
          <Text style={styles.lockSub}>{access.detail || t("care.proOnly")}</Text>
          <Pressable
            style={[styles.primaryBtn, { marginTop: 24 }]}
            onPress={() => navigation.getParent()?.navigate("Wallet" as never)}
          >
            <Text style={styles.primaryBtnText}>{t("care.seePlans")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (viewMode === "hub") {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.hubSpacer} />
        <View
          style={[
            styles.hubSheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 72 },
          ]}
        >
          <View style={styles.hubCards}>
            <Pressable
              style={[styles.hubCard, styles.hubCardActive]}
              onPress={() => setViewMode("flow")}
            >
              <View style={styles.hubCardIcon}>
                <Ionicons name="water-outline" size={22} color="#fff" />
              </View>
              <Text style={styles.hubCardTitle}>{t("care.hubParvarish")}</Text>
              <Text style={styles.hubCardSub} numberOfLines={2}>
                {t("care.hubParvarishSub")}
              </Text>
            </Pressable>

            <Pressable style={styles.hubCard} onPress={openTarkib}>
              <View style={styles.hubCardIcon}>
                <Ionicons name="flask-outline" size={22} color="#fff" />
              </View>
              <Text style={styles.hubCardTitle}>{t("care.hubTarkib")}</Text>
              <Text style={styles.hubCardSub} numberOfLines={2}>
                {t("care.hubTarkibSub")}
              </Text>
            </Pressable>
          </View>

          <View style={styles.hubSearchRow}>
            <View style={styles.hubSearchField}>
              <Ionicons name="search" size={16} color="rgba(255,255,255,0.35)" />
              <TextInput
                value={hubQuery}
                onChangeText={setHubQuery}
                placeholder={t("care.hubSearchPlaceholder")}
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={styles.hubSearchInput}
                returnKeyType="search"
                onSubmitEditing={() => openCatalog()}
              />
            </View>
            <Pressable
              style={styles.hubSearchBtn}
              onPress={() => openCatalog()}
              accessibilityLabel={t("care.catalog.search")}
            >
              <Ionicons name="search" size={20} color="#050505" />
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (step !== "plan") {
    const quizMeta =
      step === 0
        ? {
            title: t("care.quiz.conditionQ"),
            opts: CONDITION_OPTS,
            value: quiz.condition,
            labelKey: "care.conditions",
            set: (v: HairCondition) => setQuiz((q) => ({ ...q, condition: v })),
          }
        : step === 1
          ? {
              title: t("care.quiz.textureQ"),
              opts: TEXTURE_OPTS,
              value: quiz.texture,
              labelKey: "care.textures",
              set: (v: HairTexture) => setQuiz((q) => ({ ...q, texture: v })),
            }
          : {
              title: t("care.quiz.colorQ"),
              opts: COLOR_OPTS,
              value: quiz.colorStatus,
              labelKey: "care.colors",
              set: (v: HairColorStatus) => setQuiz((q) => ({ ...q, colorStatus: v })),
            };

    return (
      <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
        <View style={styles.pad}>
          <View style={styles.rowBetween}>
            <Pressable onPress={() => setViewMode("hub")} hitSlop={12}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <Text style={styles.muted}>{t("care.badge")}</Text>
            <View style={{ width: 22 }} />
          </View>
          <Text style={styles.h1}>{quizMeta.title}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((step + 1) / 3) * 100}%` }]} />
          </View>
          <View style={styles.optGrid}>
            {quizMeta.opts.map((opt) => {
              const on = quizMeta.value === opt;
              return (
                <Pressable
                  key={opt}
                  style={[styles.optCard, on && styles.optCardOn]}
                  onPress={() => quizMeta.set(opt as never)}
                >
                  <Text style={styles.optText}>
                    {t(`${quizMeta.labelKey}.${opt}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {step > 0 ? (
            <Pressable
              style={styles.ghostBtn}
              onPress={() => setStep((s) => (s === 0 ? 0 : ((s - 1) as QuizStep)))}
            >
              <Text style={styles.ghostBtnText}>{t("common.back")}</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={[styles.primaryBtn, styles.flexGrow, saving && styles.disabled]}
            disabled={saving}
            onPress={() => {
              if (step === 2) void finishQuiz();
              else setStep((s) => (s + 1) as QuizStep);
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
        <Pressable onPress={() => setViewMode("hub")} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
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
        <Pressable onPress={() => openCatalog()}>
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
  hubSpacer: { flex: 1 },
  hubSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#141414",
    paddingHorizontal: 18,
    paddingTop: 22,
    gap: 14,
  },
  hubCards: {
    flexDirection: "row",
    gap: 12,
  },
  hubCard: {
    flex: 1,
    minHeight: 132,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 16,
    justifyContent: "flex-end",
    gap: 4,
  },
  hubCardActive: {
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  hubCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  hubCardTitle: {
    ...morphFont,
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  hubCardSub: {
    ...morphFont,
    fontSize: 11,
    lineHeight: 14,
    color: "rgba(255,255,255,0.45)",
  },
  hubSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  hubSearchField: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
  },
  hubSearchInput: {
    ...morphFont,
    flex: 1,
    fontSize: 14,
    color: "#fff",
    paddingVertical: 0,
  },
  hubSearchBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
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
