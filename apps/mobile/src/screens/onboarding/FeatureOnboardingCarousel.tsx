import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setFeaturesSeen } from "../../lib/guest";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = { onFinish: () => void };

type SlideKey = "chat" | "tryon" | "care";

type Slide = {
  key: SlideKey;
  title: string;
  subtitle: string;
};

const TRYON_STYLES = [
  { id: "1", label: "Fade", active: false },
  { id: "2", label: "Curtain", active: true },
  { id: "3", label: "Wolf", active: false },
  { id: "4", label: "Quiff", active: false },
];

function ChatDemo({ welcome, reply }: { welcome: string; reply: string }) {
  const cursor = useSharedValue(1);
  useEffect(() => {
    cursor.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 480 }),
        withTiming(1, { duration: 480 }),
      ),
      -1,
      false,
    );
  }, [cursor]);
  const cursorStyle = useAnimatedStyle(() => ({ opacity: cursor.value }));

  return (
    <View style={demo.chatRoot}>
      <View style={demo.chatHeader}>
        <View style={demo.aiAvatar}>
          <Ionicons name="sparkles" size={18} color="#111" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={demo.chatName}>Morph AI</Text>
          <Text style={demo.chatOnline}>online</Text>
        </View>
      </View>

      <View style={demo.chatBody}>
        <Animated.View entering={FadeInDown.delay(200)} style={demo.bubbleAi}>
          <Text style={demo.bubbleAiText}>{welcome}</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(700)} style={demo.bubbleUser}>
          <Text style={demo.bubbleUserText}>{reply}</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(1100)} style={demo.typingRow}>
          <View style={demo.typingDot} />
          <View style={[demo.typingDot, { opacity: 0.55 }]} />
          <View style={[demo.typingDot, { opacity: 0.3 }]} />
          <Animated.View style={[demo.cursor, cursorStyle]} />
        </Animated.View>
      </View>

      <View style={demo.composer}>
        <Text style={demo.composerHint} numberOfLines={1}>
          Ask Morph AI…
        </Text>
        <View style={demo.sendBtn}>
          <Ionicons name="arrow-up" size={16} color="#FFF" />
        </View>
      </View>
    </View>
  );
}

function TryOnDemo({
  title,
  shoot,
  pick,
}: {
  title: string;
  shoot: string;
  pick: string;
}) {
  const [phase, setPhase] = useState(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 900),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 2800),
    ];
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 700 }),
        withTiming(1, { duration: 700 }),
      ),
      -1,
      false,
    );
    return () => timers.forEach(clearTimeout);
  }, [pulse]);

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View style={demo.tryRoot}>
      <Text style={demo.tryTitle}>{title}</Text>
      <Animated.View style={[demo.cameraFrame, faceStyle]}>
        {phase === 0 ? (
          <View style={demo.cameraEmpty}>
            <Ionicons name="camera" size={40} color="rgba(255,255,255,0.85)" />
            <Text style={demo.cameraHint}>{shoot}</Text>
          </View>
        ) : (
          <View style={demo.faceMock}>
            <View style={demo.faceOval} />
            <View style={demo.hairCap} />
            {phase >= 2 ? (
              <Animated.View entering={FadeIn} style={demo.styleOverlay}>
                <Text style={demo.styleBadge}>Curtain bangs</Text>
              </Animated.View>
            ) : null}
          </View>
        )}
        {phase === 1 ? (
          <View style={demo.shutterFlash} />
        ) : null}
      </Animated.View>

      <Text style={demo.pickLabel}>{pick}</Text>
      <View style={demo.styleRow}>
        {TRYON_STYLES.map((s) => (
          <View
            key={s.id}
            style={[demo.styleChip, (phase >= 2 ? s.active : false) && demo.styleChipOn]}
          >
            <View style={demo.styleThumb} />
            <Text
              style={[
                demo.styleChipText,
                (phase >= 2 ? s.active : false) && demo.styleChipTextOn,
              ]}
            >
              {s.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CareDemo({
  title,
  step1,
  step2,
  step3,
}: {
  title: string;
  step1: string;
  step2: string;
  step3: string;
}) {
  const [active, setActive] = useState(0);
  const drop = useSharedValue(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((v) => (v + 1) % 3);
    }, 1400);
    drop.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withDelay(200, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
    );
    return () => clearInterval(id);
  }, [drop]);

  const dropStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drop.value * 28 }],
    opacity: 1 - drop.value * 0.85,
  }));

  const steps = [step1, step2, step3];

  return (
    <View style={demo.careRoot}>
      <Text style={demo.careTitle}>{title}</Text>
      <View style={demo.careVisual}>
        <View style={demo.bottle}>
          <View style={demo.bottleCap} />
          <View style={demo.bottleBody}>
            <Text style={demo.bottleLabel}>CARE</Text>
          </View>
        </View>
        <Animated.View style={[demo.drop, dropStyle]} />
        <View style={demo.hairStrand} />
      </View>
      <View style={demo.careSteps}>
        {steps.map((label, i) => (
          <View key={label} style={[demo.careStep, i === active && demo.careStepOn]}>
            <View style={[demo.careBullet, i === active && demo.careBulletOn]}>
              <Text style={[demo.careNum, i === active && demo.careNumOn]}>{i + 1}</Text>
            </View>
            <Text style={[demo.careStepText, i === active && demo.careStepTextOn]}>
              {label}
            </Text>
            {i === active ? (
              <Ionicons name="checkmark-circle" size={18} color="#0F766E" />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Chat → Try-on → Care. Real interfeys demo + back tugmasi.
 */
export function FeatureOnboardingCarousel({ onFinish }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const slides: Slide[] = useMemo(
    () => [
      {
        key: "chat",
        title: t("onboarding.slide3Title"),
        subtitle: t("onboarding.chatWelcome"),
      },
      {
        key: "tryon",
        title: t("onboarding.slide2Title"),
        subtitle: t("onboarding.slide2Sub"),
      },
      {
        key: "care",
        title: t("onboarding.slide1Title"),
        subtitle: t("onboarding.slide1Sub"),
      },
    ],
    [t],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const i = viewableItems[0]?.index;
      if (typeof i === "number") setIndex(i);
    },
  ).current;

  const finish = useCallback(async () => {
    await setFeaturesSeen();
    onFinish();
  }, [onFinish]);

  const goNext = useCallback(() => {
    if (index < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
      return;
    }
    void finish();
  }, [finish, index, slides.length]);

  const goBack = useCallback(() => {
    if (index <= 0) return;
    listRef.current?.scrollToIndex({ index: index - 1, animated: true });
  }, [index]);

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + 4, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        {index > 0 ? (
          <Pressable
            onPress={goBack}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={t("common.back", { defaultValue: "Back" })}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color="#111" />
          </Pressable>
        ) : (
          <View style={styles.backBtnSpacer} />
        )}
        <Animated.Text entering={FadeInDown.duration(360)} style={styles.brand}>
          Mysaloon
        </Animated.Text>
        <View style={styles.backBtnSpacer} />
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 55 }}
        onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / winW);
          if (i !== index) setIndex(i);
        }}
        getItemLayout={(_, i) => ({ length: winW, offset: winW * i, index: i })}
        renderItem={({ item }) => (
          <View style={[styles.page, { width: winW }]}>
            <View style={styles.demoCard}>
              {item.key === "chat" ? (
                <ChatDemo
                  welcome={t("onboarding.chatWelcome")}
                  reply={t("onboarding.chatUserSample")}
                />
              ) : null}
              {item.key === "tryon" ? (
                <TryOnDemo
                  title={t("onboarding.tryonDemoTitle")}
                  shoot={t("onboarding.tryonShoot")}
                  pick={t("onboarding.tryonPick")}
                />
              ) : null}
              {item.key === "care" ? (
                <CareDemo
                  title={t("onboarding.careDemoTitle")}
                  step1={t("onboarding.careStep1")}
                  step2={t("onboarding.careStep2")}
                  step3={t("onboarding.careStep3")}
                />
              ) : null}
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSub}>{item.subtitle}</Text>
          </View>
        )}
      />

      <Animated.View entering={FadeInUp.delay(80)} style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>
        <Pressable style={styles.cta} onPress={goNext}>
          <Text style={styles.ctaText}>
            {index === slides.length - 1
              ? t("onboarding.continue")
              : t("common.next", { defaultValue: "Next" })}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(4),
  },
  backBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(14),
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnSpacer: { width: scale(40) },
  brand: {
    flex: 1,
    textAlign: "center",
    fontSize: fontSize(20),
    fontWeight: "900",
    letterSpacing: -0.6,
    color: "#111",
  },
  page: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(8),
  },
  demoCard: {
    flex: 1,
    backgroundColor: "#F7F7F8",
    borderRadius: moderateScale(28),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
    marginBottom: verticalScale(16),
    minHeight: verticalScale(360),
  },
  cardTitle: {
    color: "#111",
    fontSize: fontSize(24),
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: verticalScale(6),
  },
  cardSub: {
    color: "#737373",
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    fontWeight: "500",
    marginBottom: verticalScale(8),
  },
  footer: { paddingHorizontal: scale(24), gap: verticalScale(14) },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  dotOn: { width: 22, backgroundColor: "#111" },
  cta: {
    backgroundColor: "#111",
    borderRadius: moderateScale(28),
    minHeight: verticalScale(54),
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: "#FFF", fontSize: fontSize(16), fontWeight: "700" },
});

const demo = StyleSheet.create({
  chatRoot: { flex: 1, padding: scale(16) },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
    marginBottom: verticalScale(14),
  },
  aiAvatar: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.1)",
  },
  chatName: { fontSize: fontSize(15), fontWeight: "800", color: "#111" },
  chatOnline: { fontSize: fontSize(12), color: "#16A34A", fontWeight: "600" },
  chatBody: { flex: 1, gap: verticalScale(10) },
  bubbleAi: {
    alignSelf: "flex-start",
    maxWidth: "88%",
    backgroundColor: "#FFF",
    borderRadius: moderateScale(18),
    borderBottomLeftRadius: 6,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
  },
  bubbleAiText: {
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    color: "#18181B",
    fontWeight: "500",
  },
  bubbleUser: {
    alignSelf: "flex-end",
    maxWidth: "80%",
    backgroundColor: "#111",
    borderRadius: moderateScale(18),
    borderBottomRightRadius: 6,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
  },
  bubbleUserText: {
    fontSize: fontSize(14),
    color: "#FFF",
    fontWeight: "600",
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingLeft: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#A1A1AA",
  },
  cursor: {
    width: 2,
    height: 14,
    backgroundColor: "#111",
    marginLeft: 4,
    borderRadius: 1,
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: moderateScale(22),
    paddingLeft: scale(14),
    paddingRight: scale(6),
    minHeight: verticalScale(44),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.1)",
    gap: scale(8),
  },
  composerHint: { flex: 1, color: "#A1A1AA", fontSize: fontSize(14) },
  sendBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },

  tryRoot: { flex: 1, padding: scale(16) },
  tryTitle: {
    fontSize: fontSize(15),
    fontWeight: "700",
    color: "#111",
    marginBottom: verticalScale(12),
  },
  cameraFrame: {
    flex: 1,
    borderRadius: moderateScale(22),
    backgroundColor: "#18181B",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    minHeight: verticalScale(200),
  },
  cameraEmpty: { alignItems: "center", gap: 10 },
  cameraHint: { color: "rgba(255,255,255,0.75)", fontWeight: "600", fontSize: fontSize(13) },
  faceMock: {
    width: "70%",
    aspectRatio: 0.78,
    alignItems: "center",
    justifyContent: "center",
  },
  faceOval: {
    width: "72%",
    height: "58%",
    borderRadius: 999,
    backgroundColor: "#E8C4A8",
  },
  hairCap: {
    position: "absolute",
    top: "8%",
    width: "78%",
    height: "28%",
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    backgroundColor: "#2C1810",
  },
  styleOverlay: {
    position: "absolute",
    bottom: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  styleBadge: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  shutterFlash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  pickLabel: {
    marginTop: verticalScale(12),
    marginBottom: verticalScale(8),
    fontSize: fontSize(13),
    fontWeight: "600",
    color: "#737373",
  },
  styleRow: { flexDirection: "row", gap: scale(8) },
  styleChip: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: moderateScale(14),
    backgroundColor: "#FFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
  },
  styleChipOn: { borderColor: "#111", borderWidth: 1.5 },
  styleThumb: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: "#D4D4D8",
  },
  styleChipText: { fontSize: fontSize(11), fontWeight: "600", color: "#71717A" },
  styleChipTextOn: { color: "#111" },

  careRoot: { flex: 1, padding: scale(16) },
  careTitle: {
    fontSize: fontSize(15),
    fontWeight: "700",
    color: "#111",
    marginBottom: verticalScale(12),
  },
  careVisual: {
    height: verticalScale(140),
    borderRadius: moderateScale(20),
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(14),
    overflow: "hidden",
  },
  bottle: { alignItems: "center", zIndex: 2 },
  bottleCap: {
    width: scale(22),
    height: scale(10),
    borderRadius: 4,
    backgroundColor: "#0F766E",
  },
  bottleBody: {
    width: scale(44),
    height: scale(64),
    borderRadius: 10,
    backgroundColor: "#14B8A6",
    alignItems: "center",
    justifyContent: "center",
  },
  bottleLabel: { color: "#FFF", fontWeight: "900", fontSize: 10, letterSpacing: 1 },
  drop: {
    position: "absolute",
    top: "42%",
    width: 10,
    height: 14,
    borderRadius: 8,
    backgroundColor: "#5EEAD4",
  },
  hairStrand: {
    position: "absolute",
    bottom: 18,
    width: "55%",
    height: 8,
    borderRadius: 4,
    backgroundColor: "#78716C",
  },
  careSteps: { gap: verticalScale(8) },
  careStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
    backgroundColor: "#FFF",
    borderRadius: moderateScale(14),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(12),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
  },
  careStepOn: { borderColor: "#0F766E", backgroundColor: "#F0FDFA" },
  careBullet: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: "#E4E4E7",
    alignItems: "center",
    justifyContent: "center",
  },
  careNum: { color: "#18181B", fontWeight: "800", fontSize: 11 },
  careBulletOn: { backgroundColor: "#0F766E" },
  careNumOn: { color: "#FFF" },
  careStepText: { flex: 1, fontSize: fontSize(13), fontWeight: "600", color: "#71717A" },
  careStepTextOn: { color: "#134E4A" },
});
