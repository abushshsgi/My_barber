import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useRef, useState } from "react";
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
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
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

type Slide = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: [string, string];
};

/**
 * Bitta katta karusel: Parvarish · Try-on · Chatbot.
 * Eski GetStarted / MorphGuide intro o‘rniga.
 */
export function FeatureOnboardingCarousel({ onFinish }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const pulse = useSharedValue(1);

  const slides: Slide[] = useMemo(
    () => [
      {
        key: "care",
        title: t("onboarding.slide1Title"),
        subtitle: t("onboarding.slide1Sub"),
        icon: "water",
        colors: ["#0F766E", "#134E4A"],
      },
      {
        key: "tryon",
        title: t("onboarding.slide2Title"),
        subtitle: t("onboarding.slide2Sub"),
        icon: "sparkles",
        colors: ["#6D28D9", "#4C1D95"],
      },
      {
        key: "chat",
        title: t("onboarding.slide3Title"),
        subtitle: t("onboarding.slide3Sub"),
        icon: "chatbubble-ellipses",
        colors: ["#111111", "#2A2A2A"],
      },
    ],
    [t],
  );

  const cardH = Math.min(Math.max(winH * 0.62, 420), 580);
  const cardW = winW - scale(24);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const i = viewableItems[0]?.index;
      if (typeof i === "number") {
        setIndex(i);
        pulse.value = withSpring(1.04, { damping: 12 });
        pulse.value = withSpring(1, { damping: 14 });
      }
    },
  ).current;

  const iconAnim = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

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

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <Animated.Text entering={FadeInDown.duration(420)} style={styles.brand}>
        Mysaloon
      </Animated.Text>

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
            <Animated.View style={[styles.cardWrap, iconAnim]}>
              <LinearGradient
                colors={item.colors}
                style={[styles.card, { width: cardW, height: cardH }]}
              >
                <View style={styles.iconRing}>
                  <Ionicons name={item.icon} size={64} color="#FFF" />
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSub}>{item.subtitle}</Text>
              </LinearGradient>
            </Animated.View>
          </View>
        )}
      />

      <Animated.View entering={FadeInUp.delay(120)} style={styles.footer}>
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
  root: { flex: 1, backgroundColor: "#FAFAFA" },
  brand: {
    textAlign: "center",
    fontSize: fontSize(22),
    fontWeight: "900",
    letterSpacing: -0.6,
    color: "#111",
    marginBottom: verticalScale(8),
  },
  page: { alignItems: "center", justifyContent: "center", paddingHorizontal: scale(20) },
  cardWrap: { alignItems: "center" },
  card: {
    borderRadius: moderateScale(32),
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(36),
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  iconRing: {
    width: scale(104),
    height: scale(104),
    borderRadius: scale(52),
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(32),
    alignSelf: "flex-start",
  },
  cardTitle: {
    color: "#FFF",
    fontSize: fontSize(34),
    fontWeight: "800",
    letterSpacing: -0.8,
    marginBottom: verticalScale(12),
  },
  cardSub: {
    color: "rgba(255,255,255,0.82)",
    fontSize: fontSize(17),
    lineHeight: fontSize(24),
    fontWeight: "500",
  },
  footer: { paddingHorizontal: scale(24), gap: verticalScale(16) },
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
