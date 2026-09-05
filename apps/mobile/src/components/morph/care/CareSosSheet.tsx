import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  generateSosFix,
  type SosFix,
  type SosIssue,
  type SosTime,
  type SosTool,
} from "../../../api/care";
import { morphFont } from "../../../theme/morph-font";
import { fontSize, moderateScale, scale, verticalScale } from "../../../utils/responsive";

type Phase = 1 | 2 | 3 | "loading" | "result";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const C = {
  fg: "#111111",
  muted: "#737373",
  soft: "#F5F5F5",
  line: "rgba(15,23,42,0.08)",
  coral: "#FF6B57",
  rose: "#E9527A",
};

const TIME_OPTS: { value: SosTime; emoji: string; key: string; fallback: string; hintKey: string; hint: string }[] = [
  { value: "2min", emoji: "⚡", key: "time2", fallback: "2 daqiqa", hintKey: "time2Hint", hint: "Atigi 2 min bor" },
  { value: "5-10min", emoji: "⏱️", key: "time5", fallback: "5-10 daqiqa", hintKey: "time5Hint", hint: "Biroz vaqt bor" },
  { value: "15min+", emoji: "⏳", key: "time15", fallback: "15+ daqiqa", hintKey: "time15Hint", hint: "Vaqt yetarli" },
];

const ISSUE_OPTS: { value: SosIssue; emoji: string; key: string; fallback: string }[] = [
  { value: "frizzy", emoji: "💨", key: "issueFrizzy", fallback: "Chirib ketgan" },
  { value: "oily", emoji: "💧", key: "issueOily", fallback: "Yog'lanib qolgan" },
  { value: "bedhead", emoji: "🌀", key: "issueBedhead", fallback: "Shaklsiz / g'ijim" },
  { value: "dry", emoji: "🌵", key: "issueDry", fallback: "Juda quruq" },
];

const TOOL_OPTS: { value: SosTool; emoji: string; key: string; fallback: string }[] = [
  { value: "dryer", emoji: "🌬️", key: "toolDryer", fallback: "Fen" },
  { value: "dry_shampoo", emoji: "🧴", key: "toolDryShampoo", fallback: "Quruq shampun" },
  { value: "water_spray", emoji: "💦", key: "toolSpray", fallback: "Suv purkagich" },
  { value: "comb", emoji: "🪮", key: "toolComb", fallback: "Taroq / braking" },
  { value: "wax_gel", emoji: "✨", key: "toolWax", fallback: "Vosk / gel / lak" },
  { value: "nothing", emoji: "🤲", key: "toolNothing", fallback: "Hech narsa yo'q" },
];

const LOADING_KEYS = ["loading1", "loading2", "loading3"] as const;
const LOADING_FALLBACKS = [
  "Morf AI tezkor yechim qidirmoqda…",
  "Vositalaringizga moslashtirilmoqda…",
  "Tezkor pricheska tanlanmoqda…",
];

/** "Bad Hair Day" SOS — 3 savol, keyin uyda bajariladigan tezkor yechim. */
export function CareSosSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [phase, setPhase] = useState<Phase>(1);
  const [time, setTime] = useState<SosTime | null>(null);
  const [issues, setIssues] = useState<SosIssue[]>([]);
  const [tools, setTools] = useState<SosTool[]>([]);
  const [fix, setFix] = useState<SosFix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [line, setLine] = useState(0);

  const backdrop = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(1)).current;
  const stepAnim = useRef(new Animated.Value(1)).current;
  const doneAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setPhase(1);
      setTime(null);
      setIssues([]);
      setTools([]);
      setFix(null);
      setError(null);
      doneAnim.setValue(0);
      sheetY.setValue(1);
      Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(sheetY, {
          toValue: 0,
          damping: 22,
          stiffness: 220,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    if (!mounted) return;
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(sheetY, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, mounted, backdrop, sheetY, doneAnim]);

  useEffect(() => {
    stepAnim.setValue(0);
    Animated.timing(stepAnim, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [phase, stepAnim]);

  useEffect(() => {
    if (phase !== "loading") return;
    setLine(0);
    const id = setInterval(() => setLine((n) => (n + 1) % LOADING_KEYS.length), 900);
    return () => clearInterval(id);
  }, [phase]);

  const toggleIssue = (v: SosIssue) =>
    setIssues((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const toggleTool = (v: SosTool) =>
    setTools((prev) => {
      if (v === "nothing") return prev.includes("nothing") ? [] : ["nothing"];
      const next = prev.filter((x) => x !== "nothing");
      return next.includes(v) ? next.filter((x) => x !== v) : [...next, v];
    });

  const run = useCallback(async () => {
    if (!time || issues.length === 0) return;
    setPhase("loading");
    setError(null);
    try {
      const res = await generateSosFix({
        time_available: time,
        hair_issue: issues,
        tools_available: tools.length ? tools : ["nothing"],
      });
      setFix(res);
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tezkor yechim topilmadi.");
      setPhase(3);
    }
  }, [time, issues, tools]);

  const finish = () => {
    Animated.sequence([
      Animated.spring(doneAnim, {
        toValue: 1,
        damping: 12,
        stiffness: 260,
        useNativeDriver: true,
      }),
      Animated.delay(320),
    ]).start(() => onClose());
  };

  if (!mounted) return null;

  const translateY = sheetY.interpolate({ inputRange: [0, 1], outputRange: [0, 620] });
  const stepStyle = {
    opacity: stepAnim,
    transform: [
      { translateX: stepAnim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
    ],
  };
  const canNext = phase === 1 ? !!time : phase === 2 ? issues.length > 0 : true;
  const progressStep = phase === "loading" ? 3 : phase === "result" ? 3 : phase;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, verticalScale(12)), transform: [{ translateY }] },
          ]}
        >
          <LinearGradient
            colors={[C.coral, "#FF8A5B", C.rose]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.head}
          >
            <View style={styles.headRow}>
              <View style={styles.headIcon}>
                <Ionicons name="flash" size={moderateScale(16)} color="#FFFFFF" />
              </View>
              <View style={styles.headText}>
                <Text style={styles.headEyebrow}>SOS</Text>
                <Text style={styles.headTitle}>
                  {t("care.sos.sheetTitle", { defaultValue: "Tezkor yechim" })}
                </Text>
              </View>
              <Pressable
                style={styles.headClose}
                onPress={onClose}
                hitSlop={8}
                accessibilityLabel={t("common.close", { defaultValue: "Yopish" })}
              >
                <Ionicons name="close" size={moderateScale(16)} color="#FFFFFF" />
              </Pressable>
            </View>

            {phase !== "result" ? (
              <View style={styles.progress}>
                {[1, 2, 3].map((n) => (
                  <View key={n} style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: n <= (progressStep as number) ? "100%" : "0%" },
                      ]}
                    />
                  </View>
                ))}
              </View>
            ) : null}
          </LinearGradient>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={stepStyle}>
              {phase === "loading" ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="small" color={C.coral} />
                  <Text style={styles.loadingText}>
                    {t(`care.sos.${LOADING_KEYS[line]}`, { defaultValue: LOADING_FALLBACKS[line] })}
                  </Text>
                </View>
              ) : phase === "result" && fix ? (
                <ResultBody fix={fix} onDone={finish} onRetry={() => setPhase(1)} />
              ) : (
                <>
                  <Text style={styles.question}>
                    {phase === 1
                      ? t("care.sos.q1", { defaultValue: "Qancha vaqtingiz bor?" })
                      : phase === 2
                        ? t("care.sos.q2", { defaultValue: "Asosiy muammo nima?" })
                        : t("care.sos.q3", { defaultValue: "Qo'l ostingizda nima bor?" })}
                  </Text>
                  {phase !== 1 ? (
                    <Text style={styles.questionHint}>
                      {t("care.sos.multiHint", {
                        defaultValue: "Bir nechtasini tanlashingiz mumkin",
                      })}
                    </Text>
                  ) : null}

                  {phase === 1 ? (
                    <View style={styles.rows}>
                      {TIME_OPTS.map((opt) => (
                        <OptionRow
                          key={opt.value}
                          emoji={opt.emoji}
                          label={t(`care.sos.${opt.key}`, { defaultValue: opt.fallback })}
                          hint={t(`care.sos.${opt.hintKey}`, { defaultValue: opt.hint })}
                          selected={time === opt.value}
                          onPress={() => {
                            setTime(opt.value);
                            setTimeout(() => setPhase(2), 140);
                          }}
                        />
                      ))}
                    </View>
                  ) : null}

                  {phase === 2 ? (
                    <View style={styles.rows}>
                      {ISSUE_OPTS.map((opt) => (
                        <OptionRow
                          key={opt.value}
                          emoji={opt.emoji}
                          label={t(`care.sos.${opt.key}`, { defaultValue: opt.fallback })}
                          selected={issues.includes(opt.value)}
                          onPress={() => toggleIssue(opt.value)}
                        />
                      ))}
                    </View>
                  ) : null}

                  {phase === 3 ? (
                    <View style={styles.chips}>
                      {TOOL_OPTS.map((opt) => {
                        const selected = tools.includes(opt.value);
                        return (
                          <Pressable
                            key={opt.value}
                            style={[styles.chip, selected && styles.chipOn]}
                            onPress={() => toggleTool(opt.value)}
                          >
                            <Text style={styles.chipEmoji}>{opt.emoji}</Text>
                            <Text style={[styles.chipText, selected && styles.chipTextOn]}>
                              {t(`care.sos.${opt.key}`, { defaultValue: opt.fallback })}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}

                  {error ? <Text style={styles.error}>{error}</Text> : null}

                  <View style={styles.actions}>
                    {typeof phase === "number" && phase > 1 ? (
                      <Pressable
                        style={styles.backBtn}
                        onPress={() => setPhase(phase === 3 ? 2 : 1)}
                      >
                        <Text style={styles.backBtnText}>{t("common.back")}</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      style={[styles.primaryBtn, !canNext && styles.primaryBtnOff]}
                      disabled={!canNext}
                      onPress={() => {
                        if (phase === 3) void run();
                        else setPhase(((phase as number) + 1) as Phase);
                      }}
                    >
                      <LinearGradient
                        colors={canNext ? [C.coral, C.rose] : ["#E5E5E5", "#E5E5E5"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.primaryFill}
                      >
                        <Text style={[styles.primaryText, !canNext && styles.primaryTextOff]}>
                          {phase === 3
                            ? t("care.sos.generate", { defaultValue: "Yechim topish" })
                            : t("common.next")}
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </>
              )}
            </Animated.View>
          </ScrollView>

          <Animated.View
            pointerEvents="none"
            style={[
              styles.doneBurst,
              {
                opacity: doneAnim,
                transform: [
                  { scale: doneAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                ],
              },
            ]}
          >
            <View style={styles.doneCircle}>
              <Ionicons name="checkmark" size={moderateScale(26)} color="#FFFFFF" />
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function OptionRow({
  emoji,
  label,
  hint,
  selected,
  onPress,
}: {
  emoji: string;
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.row, selected && styles.rowOn]} onPress={onPress}>
      <Text style={styles.rowEmoji}>{emoji}</Text>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, selected && styles.rowLabelOn]} numberOfLines={1}>
          {label}
        </Text>
        {hint ? (
          <Text style={[styles.rowHint, selected && styles.rowHintOn]} numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
      <View style={[styles.rowMark, selected && styles.rowMarkOn]}>
        {selected ? <Ionicons name="checkmark" size={moderateScale(12)} color={C.fg} /> : null}
      </View>
    </Pressable>
  );
}

function ResultBody({
  fix,
  onDone,
  onRetry,
}: {
  fix: SosFix;
  onDone: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View>
      <Text style={styles.resultTitle}>{fix.title}</Text>

      <Text style={styles.sectionLabel}>
        ⚡ {t("care.sos.quickFix", { defaultValue: "60 soniyalik yechim" })}
      </Text>
      <View style={styles.steps}>
        {fix.steps.map((step, i) => (
          <View key={`${i}-${step.slice(0, 12)}`} style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      <View style={styles.styleCard}>
        <Text style={styles.styleLabel}>
          {t("care.sos.styleTitle", { defaultValue: "Bugungi tezkor pricheska" })}
        </Text>
        <Text style={styles.styleValue}>{fix.suggested_hairstyle}</Text>
      </View>

      <View style={styles.tipCard}>
        <Text style={styles.tipLabel}>
          {t("care.sos.proTip", { defaultValue: "Pro maslahat" })}
        </Text>
        <Text style={styles.tipText}>{fix.pro_tip}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.retryBtn}
          onPress={onRetry}
          accessibilityLabel={t("care.sos.again", { defaultValue: "Qayta" })}
        >
          <Ionicons name="refresh" size={moderateScale(16)} color={C.fg} />
        </Pressable>
        <Pressable style={styles.primaryBtn} onPress={onDone}>
          <LinearGradient
            colors={[C.coral, C.rose]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryFill}
          >
            <Text style={styles.primaryText}>
              {t("care.sos.done", { defaultValue: "Bajarildi!" })}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: "rgba(8,12,20,0.45)" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: moderateScale(28),
    borderTopRightRadius: moderateScale(28),
    overflow: "hidden",
    maxHeight: "88%",
  },
  head: {
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(14),
    paddingBottom: verticalScale(14),
  },
  headRow: { flexDirection: "row", alignItems: "center", gap: moderateScale(10) },
  headIcon: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  headText: { flex: 1 },
  headEyebrow: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "700",
    letterSpacing: 0.6,
    color: "rgba(255,255,255,0.8)",
  },
  headTitle: {
    ...morphFont,
    fontSize: fontSize(15),
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headClose: {
    width: moderateScale(30),
    height: moderateScale(30),
    borderRadius: moderateScale(15),
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  progress: { flexDirection: "row", gap: moderateScale(6), marginTop: verticalScale(12) },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.28)",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2, backgroundColor: "#FFFFFF" },
  scroll: { flexGrow: 0 },
  scrollBody: {
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(8),
  },
  question: {
    ...morphFont,
    fontSize: fontSize(20),
    fontWeight: "800",
    color: C.fg,
    letterSpacing: -0.3,
    lineHeight: fontSize(25),
  },
  questionHint: {
    ...morphFont,
    fontSize: fontSize(12),
    color: C.muted,
    marginTop: verticalScale(4),
  },
  rows: { marginTop: verticalScale(14), gap: moderateScale(8) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
    backgroundColor: C.soft,
    borderRadius: moderateScale(18),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
  },
  rowOn: { backgroundColor: C.fg },
  rowEmoji: { fontSize: fontSize(18) },
  rowBody: { flex: 1 },
  rowLabel: { ...morphFont, fontSize: fontSize(14), fontWeight: "700", color: C.fg },
  rowLabelOn: { color: "#FFFFFF" },
  rowHint: { ...morphFont, fontSize: fontSize(11), color: C.muted, marginTop: 2 },
  rowHintOn: { color: "rgba(255,255,255,0.6)" },
  rowMark: {
    width: moderateScale(20),
    height: moderateScale(20),
    borderRadius: moderateScale(10),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowMarkOn: { backgroundColor: "#FFFFFF", borderColor: "#FFFFFF" },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: moderateScale(8),
    marginTop: verticalScale(16),
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(6),
    backgroundColor: "#F2F2F2",
    borderRadius: 999,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(9),
  },
  chipOn: { backgroundColor: C.fg },
  chipEmoji: { fontSize: fontSize(13) },
  chipText: { ...morphFont, fontSize: fontSize(12), fontWeight: "700", color: "rgba(17,17,17,0.7)" },
  chipTextOn: { color: "#FFFFFF" },
  error: {
    ...morphFont,
    fontSize: fontSize(12),
    color: "#C2410C",
    backgroundColor: "#FFF1EE",
    borderRadius: moderateScale(14),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    marginTop: verticalScale(14),
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    marginTop: verticalScale(20),
  },
  backBtn: {
    flex: 1,
    height: verticalScale(46),
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: { ...morphFont, fontSize: fontSize(13), fontWeight: "700", color: C.fg },
  primaryBtn: { flex: 1.7, borderRadius: 999, overflow: "hidden" },
  primaryBtnOff: { opacity: 0.9 },
  primaryFill: {
    height: verticalScale(46),
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { ...morphFont, fontSize: fontSize(13), fontWeight: "800", color: "#FFFFFF" },
  primaryTextOff: { color: "rgba(17,17,17,0.35)" },
  retryBtn: {
    width: verticalScale(46),
    height: verticalScale(46),
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingWrap: {
    minHeight: verticalScale(180),
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(14),
  },
  loadingText: {
    ...morphFont,
    fontSize: fontSize(13),
    fontWeight: "600",
    color: C.muted,
    textAlign: "center",
  },
  resultTitle: {
    ...morphFont,
    fontSize: fontSize(19),
    fontWeight: "800",
    color: C.fg,
    letterSpacing: -0.3,
    lineHeight: fontSize(24),
  },
  sectionLabel: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "rgba(17,17,17,0.4)",
    marginTop: verticalScale(18),
  },
  steps: { marginTop: verticalScale(10), gap: moderateScale(6) },
  stepRow: {
    flexDirection: "row",
    gap: moderateScale(10),
    backgroundColor: C.soft,
    borderRadius: moderateScale(18),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
  },
  stepNum: {
    width: moderateScale(20),
    height: moderateScale(20),
    borderRadius: moderateScale(10),
    backgroundColor: C.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { ...morphFont, fontSize: fontSize(10), fontWeight: "800", color: "#FFFFFF" },
  stepText: {
    ...morphFont,
    flex: 1,
    fontSize: fontSize(13),
    color: C.fg,
    lineHeight: fontSize(18),
  },
  styleCard: {
    marginTop: verticalScale(16),
    backgroundColor: "#FFF3EF",
    borderRadius: moderateScale(18),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
  },
  styleLabel: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: C.rose,
  },
  styleValue: {
    ...morphFont,
    fontSize: fontSize(15),
    fontWeight: "800",
    color: C.fg,
    marginTop: 3,
  },
  tipCard: {
    marginTop: verticalScale(8),
    backgroundColor: C.fg,
    borderRadius: moderateScale(18),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
  },
  tipLabel: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.5)",
  },
  tipText: {
    ...morphFont,
    fontSize: fontSize(13),
    color: "rgba(255,255,255,0.9)",
    lineHeight: fontSize(18),
    marginTop: 3,
  },
  doneBurst: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  doneCircle: {
    width: moderateScale(64),
    height: moderateScale(64),
    borderRadius: moderateScale(32),
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
});
