import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
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
  FadeInRight,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeBottom, safeTop } from "../../lib/safe-area";
import { setFeaturesSeen } from "../../lib/guest";
import { colors } from "../../theme/colors";
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

const TRYON_HERO = require("../../../assets/onboarding/try-on-onboarding-hero.png");

function TypingDot({ delayMs }: { delayMs: number }) {
  const bounce = useSharedValue(0);
  useEffect(() => {
    bounce.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 320, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [bounce, delayMs]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(bounce.value, [0, 1], [0.35, 1]),
    transform: [{ translateY: interpolate(bounce.value, [0, 1], [0, -5]) }],
  }));
  return <Animated.View style={[demo.typingDot, style]} />;
}

function ChatDemo({
  welcome,
  userSample,
  aiSample,
}: {
  welcome: string;
  userSample: string;
  aiSample: string;
}) {
  type Phase = "welcome" | "user" | "typing" | "ai" | "done";
  const [phase, setPhase] = useState<Phase>("welcome");
  const [welcomeText, setWelcomeText] = useState("");
  const [aiText, setAiText] = useState("");
  const [showUser, setShowUser] = useState(false);
  const [loop, setLoop] = useState(0);

  const onlinePulse = useSharedValue(0);
  const sendPulse = useSharedValue(1);

  useEffect(() => {
    onlinePulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      false,
    );
    sendPulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [onlinePulse, sendPulse]);

  // Reset + type welcome
  useEffect(() => {
    setPhase("welcome");
    setWelcomeText("");
    setAiText("");
    setShowUser(false);
  }, [loop, welcome, userSample, aiSample]);

  useEffect(() => {
    if (phase !== "welcome") return;
    let i = 0;
    let nextTimer: ReturnType<typeof setTimeout> | undefined;
    const id = setInterval(() => {
      i += 1;
      setWelcomeText(welcome.slice(0, i));
      if (i >= welcome.length) {
        clearInterval(id);
        nextTimer = setTimeout(() => setPhase("user"), 380);
      }
    }, 16);
    return () => {
      clearInterval(id);
      if (nextTimer) clearTimeout(nextTimer);
    };
  }, [phase, welcome, loop]);

  useEffect(() => {
    if (phase !== "user") return;
    setShowUser(true);
    const t = setTimeout(() => setPhase("typing"), 520);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "typing") return;
    const t = setTimeout(() => setPhase("ai"), 1200);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "ai") return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setAiText(aiSample.slice(0, i));
      if (i >= aiSample.length) {
        clearInterval(id);
        setPhase("done");
      }
    }, 20);
    return () => clearInterval(id);
  }, [phase, aiSample]);

  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(() => setLoop((n) => n + 1), 2600);
    return () => clearTimeout(t);
  }, [phase]);

  const onlineDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(onlinePulse.value, [0, 1], [1, 1.4]) }],
    opacity: interpolate(onlinePulse.value, [0, 1], [1, 0.35]),
  }));
  const sendBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendPulse.value }],
  }));

  const showTyping = phase === "typing";
  const showAiReply = phase === "ai" || phase === "done";
  const typingWelcome = phase === "welcome" && welcomeText.length < welcome.length;
  const typingAi = phase === "ai" && aiText.length < aiSample.length;

  return (
    <View style={demo.chatRoot}>
      <View style={demo.chatHeader}>
        <View style={demo.aiAvatarWrap}>
          <View style={demo.aiAvatar}>
            <Ionicons name="sparkles" size={18} color={colors.fg} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <View style={demo.chatNameRow}>
            <Text style={demo.chatName}>Morph AI</Text>
            <View style={demo.aiBadge}>
              <Text style={demo.aiBadgeText}>AI</Text>
            </View>
          </View>
          <View style={demo.onlineRow}>
            <View style={demo.onlineDotWrap}>
              <Animated.View style={[demo.onlinePulse, onlineDotStyle]} />
              <View style={demo.onlineDot} />
            </View>
            <Text style={demo.chatOnline}>online</Text>
          </View>
        </View>
      </View>

      <View style={demo.chatBody}>
        {welcomeText.length > 0 ? (
          <Animated.View
            entering={FadeInUp.duration(320).springify().damping(16)}
            style={demo.bubbleAi}
          >
            <Text style={demo.bubbleAiText}>
              {welcomeText}
              {typingWelcome ? "|" : ""}
            </Text>
          </Animated.View>
        ) : null}

        {showUser ? (
          <Animated.View
            entering={FadeInRight.duration(380).springify().damping(15)}
            style={demo.bubbleUser}
          >
            <Text style={demo.bubbleUserText}>{userSample}</Text>
          </Animated.View>
        ) : null}

        {showTyping ? (
          <Animated.View entering={FadeInUp.duration(280)} style={demo.typingBubble}>
            <TypingDot delayMs={0} />
            <TypingDot delayMs={140} />
            <TypingDot delayMs={280} />
          </Animated.View>
        ) : null}

        {showAiReply ? (
          <Animated.View
            entering={FadeInUp.duration(320).springify().damping(16)}
            style={demo.bubbleAi}
          >
            <Text style={demo.bubbleAiText}>
              {aiText}
              {typingAi ? "|" : ""}
            </Text>
          </Animated.View>
        ) : null}
      </View>

      <View style={demo.composer}>
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.muted} />
        <Text style={demo.composerHint} numberOfLines={1}>
          Ask Morph AI…
        </Text>
        <Animated.View style={sendBtnStyle}>
          <View style={demo.sendBtn}>
            <Ionicons name="arrow-up" size={16} color="#FFF" />
          </View>
        </Animated.View>
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
  const reveal = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const badge = useSharedValue(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 700),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2400),
    ];
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => timers.forEach(clearTimeout);
  }, [shimmer]);

  useEffect(() => {
    if (phase >= 1) {
      reveal.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
    }
    if (phase >= 3) {
      badge.value = withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) });
    }
  }, [phase, reveal, badge]);

  const photoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(reveal.value, [0, 1], [0.35, 1]),
    transform: [{ scale: interpolate(reveal.value, [0, 1], [1.06, 1]) }],
  }));
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.12, 0.4]),
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-80, 140]) }],
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badge.value,
    transform: [{ translateY: interpolate(badge.value, [0, 1], [12, 0]) }],
  }));

  return (
    <View style={demo.tryRoot}>
      <View style={demo.tryStage}>
        {phase === 0 ? (
          <Animated.View entering={FadeIn.duration(320)} style={demo.tryIdle}>
            <View style={demo.tryIdleRing}>
              <Ionicons name="camera-outline" size={28} color={colors.fg} />
            </View>
            <Text style={demo.tryIdleHint}>{shoot}</Text>
          </Animated.View>
        ) : (
          <>
            <Animated.View style={[StyleSheet.absoluteFill, photoStyle]}>
              <Image source={TRYON_HERO} style={demo.tryHeroImg} resizeMode="cover" />
            </Animated.View>
            <LinearGradient
              colors={["rgba(250,250,250,0.5)", "transparent", "rgba(17,17,17,0.5)"]}
              locations={[0, 0.38, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            {phase < 3 ? (
              <Animated.View style={[demo.tryShimmer, shimmerStyle]} pointerEvents="none" />
            ) : null}
            <View style={demo.tryTopRow}>
              <View style={demo.trySoftPill}>
                <Ionicons name="scan-outline" size={12} color={colors.fg} />
                <Text style={demo.trySoftPillText}>Try-on</Text>
              </View>
              <Text style={demo.trySoftTitle} numberOfLines={1}>
                {title}
              </Text>
            </View>
            {phase >= 3 ? (
              <Animated.View style={[demo.tryResultBadge, badgeStyle]}>
                <Ionicons name="checkmark-circle" size={14} color="#fff" />
                <Text style={demo.tryResultBadgeText}>Curtain bangs</Text>
              </Animated.View>
            ) : phase === 2 ? (
              <View style={demo.tryApplying}>
                <Text style={demo.tryApplyingText}>Applying style…</Text>
              </View>
            ) : null}
          </>
        )}
      </View>

      <View style={demo.tryDock}>
        <Text style={demo.tryDockLabel}>{pick}</Text>
        <View style={demo.tryPillRow}>
          {TRYON_STYLES.map((s, i) => {
            const on = phase >= 2 && s.active;
            return (
              <Animated.View
                key={s.id}
                entering={FadeInUp.delay(120 + i * 60).springify().damping(16)}
                style={[demo.tryPill, on && demo.tryPillOn]}
              >
                <Text style={[demo.tryPillText, on && demo.tryPillTextOn]}>{s.label}</Text>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const CARE_PRODUCT = require("../../../assets/onboarding/care-serum-product.png");

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
  const pulse = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((v) => (v + 1) % 3);
    }, 1600);
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    return () => clearInterval(id);
  }, [pulse]);

  useEffect(() => {
    progress.value = withTiming((active + 1) / 3, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [active, progress]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.25, 0.7]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.06]) }],
  }));
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as unknown as number,
  }));

  const steps = [step1, step2, step3];

  return (
    <View style={demo.careRoot}>
      <View style={demo.careHeader}>
        <View style={demo.careLivePill}>
          <View style={demo.careLiveDot} />
          <Text style={demo.careLiveText}>LIVE</Text>
        </View>
        <Text style={demo.careTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View style={demo.careVisual}>
        <Animated.View style={[demo.careGlow, glowStyle]} />
        <Image source={CARE_PRODUCT} style={demo.careProductImg} resizeMode="cover" />
        <View style={demo.careProgressWrap}>
          <Text style={demo.careProgressLabel}>
            {Math.round(((active + 1) / 3) * 100)}%
          </Text>
          <View style={demo.careProgressTrack}>
            <Animated.View style={[demo.careProgressFill, progressStyle]} />
          </View>
        </View>
      </View>

      <View style={demo.careSteps}>
        {steps.map((label, i) => {
          const done = i < active;
          const on = i === active;
          return (
            <Animated.View
              key={label}
              entering={FadeInUp.delay(120 + i * 90).springify().damping(16)}
              style={[demo.careStep, on && demo.careStepOn, done && demo.careStepDone]}
            >
              <View
                style={[
                  demo.careBullet,
                  on && demo.careBulletOn,
                  done && demo.careBulletDone,
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                ) : (
                  <Text style={[demo.careNum, on && demo.careNumOn]}>{i + 1}</Text>
                )}
              </View>
              <Text
                style={[
                  demo.careStepText,
                  on && demo.careStepTextOn,
                  done && demo.careStepTextDone,
                ]}
              >
                {label}
              </Text>
              {on ? (
                <Ionicons name="sync" size={16} color={colors.fg} />
              ) : done ? (
                <Ionicons name="checkmark-circle" size={18} color={colors.fg} />
              ) : null}
            </Animated.View>
          );
        })}
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
        { paddingTop: safeTop(insets.top, 4), paddingBottom: safeBottom(insets.bottom, 16) },
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
            <View
              style={[
                styles.demoCard,
                item.key === "chat" && styles.demoCardMorph,
                item.key === "tryon" && styles.demoCardTryOn,
              ]}
            >
              {item.key === "chat" ? (
                <ChatDemo
                  welcome={t("onboarding.chatWelcome")}
                  userSample={t("onboarding.chatUserSample")}
                  aiSample={t("onboarding.chatAiSample")}
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
  demoCardMorph: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#111",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  demoCardTryOn: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#111",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
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
  chatRoot: {
    flex: 1,
    padding: scale(16),
    overflow: "hidden",
    backgroundColor: colors.bg,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
    marginBottom: verticalScale(14),
  },
  aiAvatarWrap: {
    width: scale(40),
    height: scale(40),
    alignItems: "center",
    justifyContent: "center",
  },
  aiAvatar: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chatNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  chatName: {
    fontSize: fontSize(16),
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.3,
  },
  aiBadge: {
    paddingHorizontal: scale(7),
    paddingVertical: verticalScale(2),
    borderRadius: moderateScale(8),
    backgroundColor: colors.promo,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  aiBadgeText: {
    fontSize: fontSize(10),
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: 0.4,
  },
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  onlineDotWrap: {
    width: 10,
    height: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  onlinePulse: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  chatOnline: {
    fontSize: fontSize(12),
    color: "#16A34A",
    fontWeight: "600",
  },
  chatBody: { flex: 1, gap: verticalScale(10) },
  bubbleAi: {
    alignSelf: "flex-start",
    maxWidth: "90%",
    borderRadius: moderateScale(18),
    borderBottomLeftRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(11),
  },
  bubbleAiText: {
    fontSize: fontSize(14),
    lineHeight: fontSize(21),
    color: colors.fg,
    fontWeight: "500",
  },
  bubbleUser: {
    alignSelf: "flex-end",
    maxWidth: "82%",
    borderRadius: moderateScale(18),
    borderBottomRightRadius: 6,
    backgroundColor: colors.fg,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(11),
  },
  bubbleUserText: {
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    color: "#FFF",
    fontWeight: "600",
  },
  typingBubble: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(16),
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#A1A1AA",
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: moderateScale(24),
    paddingLeft: scale(14),
    paddingRight: scale(6),
    minHeight: verticalScale(48),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: scale(8),
  },
  composerHint: {
    flex: 1,
    color: colors.muted,
    fontSize: fontSize(14),
    fontWeight: "500",
  },
  sendBtn: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.fg,
  },

  tryRoot: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  tryStage: {
    flex: 1,
    minHeight: verticalScale(220),
    overflow: "hidden",
    backgroundColor: colors.promo,
    position: "relative",
  },
  tryHeroImg: {
    width: "100%",
    height: "100%",
  },
  tryIdle: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(12),
    paddingHorizontal: scale(20),
  },
  tryIdleRing: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tryIdleHint: {
    color: colors.muted,
    fontWeight: "600",
    fontSize: fontSize(13),
    textAlign: "center",
  },
  tryShimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: scale(56),
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  tryTopRow: {
    position: "absolute",
    top: verticalScale(14),
    left: scale(14),
    right: scale(14),
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  trySoftPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  trySoftPillText: {
    fontSize: fontSize(10),
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: 0.2,
  },
  trySoftTitle: {
    flex: 1,
    fontSize: fontSize(12),
    fontWeight: "700",
    color: colors.fg,
  },
  tryResultBadge: {
    position: "absolute",
    left: scale(14),
    bottom: verticalScale(16),
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.fg,
  },
  tryResultBadgeText: {
    color: "#fff",
    fontSize: fontSize(12),
    fontWeight: "800",
  },
  tryApplying: {
    position: "absolute",
    left: scale(14),
    right: scale(14),
    bottom: verticalScale(16),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(12),
    borderRadius: moderateScale(12),
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  tryApplyingText: {
    color: colors.fg,
    fontSize: fontSize(12),
    fontWeight: "700",
    textAlign: "center",
  },
  tryDock: {
    paddingHorizontal: scale(14),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(14),
    gap: moderateScale(8),
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tryDockLabel: {
    fontSize: fontSize(12),
    fontWeight: "600",
    color: colors.muted,
  },
  tryPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
  },
  tryPill: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: 999,
    backgroundColor: colors.promo,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tryPillOn: {
    backgroundColor: colors.fg,
    borderColor: colors.fg,
  },
  tryPillText: {
    fontSize: fontSize(12),
    fontWeight: "700",
    color: colors.muted,
  },
  tryPillTextOn: {
    color: "#fff",
  },

  careRoot: {
    flex: 1,
    padding: scale(16),
    backgroundColor: colors.bg,
  },
  careHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
    marginBottom: verticalScale(12),
  },
  careLivePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(10),
    backgroundColor: colors.promo,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  careLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.fg,
  },
  careLiveText: {
    fontSize: fontSize(10),
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: 0.6,
  },
  careTitle: {
    flex: 1,
    fontSize: fontSize(15),
    fontWeight: "700",
    color: colors.fg,
    letterSpacing: -0.2,
  },
  careVisual: {
    height: verticalScale(168),
    borderRadius: moderateScale(22),
    backgroundColor: colors.surface,
    marginBottom: verticalScale(14),
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  careGlow: {
    position: "absolute",
    width: scale(160),
    height: scale(160),
    borderRadius: scale(80),
    backgroundColor: "rgba(17,17,17,0.06)",
  },
  careProductImg: {
    width: "72%",
    height: "78%",
    borderRadius: moderateScale(12),
  },
  careProgressWrap: {
    position: "absolute",
    left: scale(14),
    right: scale(14),
    bottom: verticalScale(12),
    gap: 6,
  },
  careProgressLabel: {
    fontSize: fontSize(11),
    fontWeight: "800",
    color: colors.fg,
  },
  careProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.promo,
    overflow: "hidden",
  },
  careProgressFill: {
    height: "100%",
    backgroundColor: colors.fg,
    borderRadius: 2,
  },
  careSteps: { gap: verticalScale(8) },
  careStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
    backgroundColor: colors.surface,
    borderRadius: moderateScale(16),
    paddingVertical: verticalScale(11),
    paddingHorizontal: scale(12),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  careStepOn: {
    borderColor: colors.fg,
    backgroundColor: colors.promo,
  },
  careStepDone: {
    borderColor: colors.border,
    opacity: 0.85,
  },
  careBullet: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    backgroundColor: colors.promo,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  careNum: { color: colors.muted, fontWeight: "800", fontSize: 11 },
  careBulletOn: { backgroundColor: colors.fg, borderColor: colors.fg },
  careBulletDone: { backgroundColor: colors.fg, borderColor: colors.fg },
  careNumOn: { color: "#FFF" },
  careStepText: {
    flex: 1,
    fontSize: fontSize(13),
    fontWeight: "600",
    color: colors.muted,
  },
  careStepTextOn: { color: colors.fg, fontWeight: "700" },
  careStepTextDone: { color: colors.fg },
});
