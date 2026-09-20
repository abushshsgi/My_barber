import { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  type ImageSourcePropType,
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
import Animated, { FadeInUp } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeBottom, safeTop } from "../../lib/safe-area";
import { setFeaturesSeen } from "../../lib/guest";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = { onFinish: () => void };

type SlideKey = "tryon" | "chat" | "care";

type Slide = {
  key: SlideKey;
  title: string;
  subtitle: string;
  image: ImageSourcePropType;
};

/** Maket: Soch Generatsiyasi → Chatbot → Mahsulot skaneri */
const SLIDE_IMAGES = {
  tryon: require("../../../assets/onboarding/slide-2-tryon.png"),
  chat: require("../../../assets/onboarding/slide-1-chat.png"),
  care: require("../../../assets/onboarding/slide-3-care.png"),
} as const;

const BLUE = "#4A6CF7";

/**
 * Feature onboarding — MORF AI maket (rasm + markaziy matn + ko‘k Continue).
 */
export function FeatureOnboardingCarousel({ onFinish }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const slides: Slide[] = useMemo(
    () => [
      {
        key: "tryon",
        title: t("onboarding.featureTryonTitle"),
        subtitle: t("onboarding.featureTryonSub"),
        image: SLIDE_IMAGES.tryon,
      },
      {
        key: "chat",
        title: t("onboarding.featureChatTitle"),
        subtitle: t("onboarding.featureChatSub"),
        image: SLIDE_IMAGES.chat,
      },
      {
        key: "care",
        title: t("onboarding.featureCareTitle"),
        subtitle: t("onboarding.featureCareSub"),
        image: SLIDE_IMAGES.care,
      },
    ],
    [t],
  );

  const imageH = Math.min(Math.max(winH * 0.48, 280), 440);

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

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: safeTop(insets.top, 12),
          paddingBottom: safeBottom(insets.bottom, 20),
        },
      ]}
    >
      <StatusBar style="dark" />

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
            <View style={[styles.heroWrap, { height: imageH }]}>
              <Image
                source={item.image}
                style={styles.heroImage}
                resizeMode="contain"
                accessibilityLabel={item.title}
              />
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSub}>{item.subtitle}</Text>
          </View>
        )}
      />

      <Animated.View entering={FadeInUp.delay(80)} style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={goNext}
          accessibilityRole="button"
          accessibilityLabel={t("onboarding.continue")}
        >
          <Text style={styles.ctaText}>{t("onboarding.continue")}</Text>
        </Pressable>
        <View style={styles.dots}>
          {slides.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  page: {
    paddingHorizontal: scale(28),
    paddingTop: verticalScale(8),
    flex: 1,
    alignItems: "center",
  },
  heroWrap: {
    width: "100%",
    marginBottom: verticalScale(28),
    alignItems: "center",
    justifyContent: "center",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  cardTitle: {
    color: "#1A1A1A",
    fontSize: fontSize(26),
    fontWeight: "800",
    letterSpacing: -0.4,
    textAlign: "center",
    marginBottom: verticalScale(10),
  },
  cardSub: {
    color: "#6B7280",
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    fontWeight: "500",
    textAlign: "center",
    maxWidth: scale(320),
    paddingHorizontal: scale(8),
  },
  footer: {
    paddingHorizontal: scale(28),
    gap: verticalScale(18),
    alignItems: "center",
  },
  cta: {
    alignSelf: "stretch",
    height: verticalScale(54),
    borderRadius: moderateScale(28),
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  ctaText: {
    color: "#FFFFFF",
    fontSize: fontSize(17),
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D1D5DB",
  },
  dotOn: { backgroundColor: BLUE },
});
