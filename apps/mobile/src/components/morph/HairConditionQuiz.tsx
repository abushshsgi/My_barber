import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { HairColorStatus, HairCondition, HairTexture } from "../../api/care";
import { useMorphAppearance } from "../../lib/MorphAppearanceContext";
import { morphFont } from "../../theme/morph-font";
import { fontSize, moderateScale, scale, verticalScale } from "../../utils/responsive";

export type HairQuizAnswers = {
  condition: HairCondition;
  texture: HairTexture;
  colorStatus: HairColorStatus;
};

type Props = {
  lead: string;
  onDone: (answers: HairQuizAnswers) => void | Promise<void>;
};

const CONDITIONS: HairCondition[] = ["oily", "dry", "normal", "damaged"];
const TEXTURES: HairTexture[] = ["straight", "wavy", "curly"];
const COLORS: HairColorStatus[] = ["natural", "colored", "bleached"];

/** Chat va parvarish bir xil soch holati: avval matn yoziladi, keyin katta tugmalar. */
export function HairConditionQuiz({ lead, onDone }: Props) {
  const { t } = useTranslation();
  const { colors: pal } = useMorphAppearance();
  const [typed, setTyped] = useState("");
  const [showQuiz, setShowQuiz] = useState(false);
  const [step, setStep] = useState(0);
  const [condition, setCondition] = useState<HairCondition | "">("");
  const [texture, setTexture] = useState<HairTexture | "">("");
  const [colorStatus, setColorStatus] = useState<HairColorStatus | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let index = 0;
    let wait: ReturnType<typeof setTimeout> | null = null;
    const tick = setInterval(() => {
      index += 1;
      setTyped(lead.slice(0, index));
      if (index >= lead.length) {
        clearInterval(tick);
        wait = setTimeout(() => setShowQuiz(true), 1200);
      }
    }, 28);
    return () => {
      clearInterval(tick);
      if (wait) clearTimeout(wait);
    };
  }, [lead]);

  const steps = [
    {
      title: t("care.onboarding.step1Title"),
      sub: t("care.onboarding.step1Sub"),
      options: CONDITIONS,
      value: condition,
      label: (id: string) => t(`care.conditions.${id}`),
      pick: (id: string) => setCondition(id as HairCondition),
    },
    {
      title: t("care.onboarding.step2Title"),
      sub: t("care.onboarding.step2Sub"),
      options: TEXTURES,
      value: texture,
      label: (id: string) => t(`care.textures.${id}`),
      pick: (id: string) => setTexture(id as HairTexture),
    },
    {
      title: t("care.onboarding.step3Title"),
      sub: t("care.onboarding.step3Sub"),
      options: COLORS,
      value: colorStatus,
      label: (id: string) => t(`care.colors.${id}`),
      pick: (id: string) => setColorStatus(id as HairColorStatus),
    },
  ] as const;
  const current = steps[step];
  const last = step === steps.length - 1;

  const next = async () => {
    if (!current.value || busy) return;
    if (!last) {
      setStep((n) => n + 1);
      return;
    }
    if (!condition || !texture || !colorStatus) return;
    setBusy(true);
    setError(null);
    try {
      await onDone({ condition, texture, colorStatus });
    } catch (err) {
      setError(err instanceof Error && err.message.trim() ? err.message : t("common.retry"));
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.lead, { color: pal.fg }]}>
        {typed}
        {!showQuiz ? <Text style={{ color: pal.muted }}>|</Text> : null}
      </Text>

      {showQuiz ? (
        <View style={styles.quiz}>
          <Text style={[styles.progress, { color: pal.muted }]}>
            {step + 1} / {steps.length}
          </Text>
          <Text style={[styles.title, { color: pal.fg }]}>{current.title}</Text>
          <Text style={[styles.sub, { color: pal.muted }]}>{current.sub}</Text>
          <View style={styles.options}>
            {current.options.map((id) => {
              const on = current.value === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => current.pick(id)}
                  style={[
                    styles.option,
                    { backgroundColor: pal.card, borderColor: on ? pal.fg : pal.line },
                    on && styles.optionOn,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.optionText, { color: pal.fg }]}>{current.label(id)}</Text>
                  {on ? <Ionicons name="checkmark" size={18} color={pal.fg} /> : null}
                </Pressable>
              );
            })}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            onPress={() => void next()}
            disabled={!current.value || busy}
            style={[styles.cta, { backgroundColor: pal.fg }, (!current.value || busy) && styles.ctaOff]}
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator color={pal.bg} />
            ) : (
              <Text style={[styles.ctaText, { color: pal.bg }]}>
                {last ? t("chat.hairAsk.continue") : t("common.next")}
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: verticalScale(12) },
  lead: {
    ...morphFont,
    paddingHorizontal: scale(18),
    marginBottom: verticalScale(18),
    fontSize: fontSize(20),
    lineHeight: fontSize(28),
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  quiz: { paddingHorizontal: scale(16), gap: moderateScale(10) },
  progress: { ...morphFont, fontSize: fontSize(12), fontWeight: "700" },
  title: { ...morphFont, fontSize: fontSize(26), lineHeight: fontSize(32), fontWeight: "700", letterSpacing: -0.4 },
  sub: { ...morphFont, fontSize: fontSize(14), lineHeight: fontSize(20), marginBottom: verticalScale(6) },
  options: { gap: moderateScale(10) },
  option: {
    minHeight: verticalScale(64),
    borderRadius: moderateScale(18),
    borderWidth: 1,
    paddingHorizontal: scale(18),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionOn: { borderWidth: 2 },
  optionText: { ...morphFont, fontSize: fontSize(17), fontWeight: "700" },
  error: { color: "#B42318", fontSize: fontSize(12) },
  cta: {
    marginTop: verticalScale(14),
    minHeight: verticalScale(52),
    borderRadius: moderateScale(16),
    alignItems: "center",
    justifyContent: "center",
  },
  ctaOff: { opacity: 0.35 },
  ctaText: { ...morphFont, fontSize: fontSize(16), fontWeight: "800" },
});
