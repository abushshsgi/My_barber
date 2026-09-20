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

/**
 * Feature onboarding — oq fon, bir xil qatorli hero, qora-oq Continue.
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

  /** Barcha slaydlarda bir xil hero balandligi — past-baland sakrash yo‘q */
  const imageH = Math.min(Math.max(winH * 0.42, 260), 360);
  const textBlockH = verticalScale(108);

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
            <View style={[styles.textBlock, { height: textBlockH }]}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.cardSub} numberOfLines={3}>
                {item.subtitle}
              </Text>
            </View>
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
    paddingTop: verticalScale(4),
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  heroWrap: {
    width: "100%",
    marginBottom: verticalScale(16),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  textBlock: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: scale(4),
  },
  cardTitle: {
    color: "#111111",
    fontSize: fontSize(22),
    fontWeight: "700",
    letterSpacing: -0.35,
    textAlign: "center",
    marginBottom: verticalScale(6),
  },
  cardSub: {
    color: "#6B7280",
    fontSize: fontSize(13),
    lineHeight: fontSize(19),
    fontWeight: "500",
    textAlign: "center",
    maxWidth: scale(300),
  },
  footer: {
    paddingHorizontal: scale(28),
    gap: verticalScale(16),
    alignItems: "center",
  },
  cta: {
    alignSelf: "stretch",
    height: verticalScale(52),
    borderRadius: moderateScale(26),
    backgroundColor: "#111111",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  ctaText: {
    color: "#FFFFFF",
    fontSize: fontSize(16),
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#E5E7EB",
  },
  dotOn: { backgroundColor: "#111111" },
});
