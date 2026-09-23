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
import { morphFont } from "../../theme/morph-font";
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
  chat: require("../../../assets/onboarding/slide-1-chat.jpg"),
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

  const heroSize = Math.min(winW, Math.round(winH * 0.54));
  const heroTop = Math.round(winH * 0.14);
  const titleSize = fontSize(18);
  const titleH = Math.round(titleSize * 1.25);
  const subSize = fontSize(13);
  const subLine = Math.round(subSize * 1.35);
  const subH = subLine * 2;

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
          <View style={[styles.page, { width: winW, paddingTop: heroTop }]}>
            <View style={[styles.heroWrap, { width: heroSize, height: heroSize }]}>
              <Image
                source={item.image}
                style={styles.heroImage}
                resizeMode="contain"
                accessibilityLabel={item.title}
              />
            </View>
            <View style={styles.textBlock}>
              <Text
                style={[styles.cardTitle, { height: titleH, lineHeight: titleH, fontSize: titleSize }]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text
                style={[styles.cardSub, { height: subH, lineHeight: subLine, fontSize: subSize }]}
                numberOfLines={2}
              >
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
    paddingHorizontal: scale(8),
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  heroWrap: {
    marginBottom: verticalScale(14),
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
    maxWidth: scale(320),
    alignItems: "center",
    justifyContent: "flex-start",
  },
  cardTitle: {
    ...morphFont,
    width: "100%",
    color: "#111111",
    fontSize: fontSize(18),
    fontWeight: "700",
    letterSpacing: -0.3,
    textAlign: "center",
    marginBottom: verticalScale(6),
    includeFontPadding: false,
  },
  cardSub: {
    ...morphFont,
    width: "100%",
    color: "#5C6370",
    fontSize: fontSize(13),
    fontWeight: "500",
    textAlign: "center",
    includeFontPadding: false,
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
    ...morphFont,
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
