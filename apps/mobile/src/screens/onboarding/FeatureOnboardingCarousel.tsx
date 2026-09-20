import { Ionicons } from "@expo/vector-icons";
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
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
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

type SlideKey = "chat" | "tryon" | "care";

type Slide = {
  key: SlideKey;
  title: string;
  subtitle: string;
  image: ImageSourcePropType;
};

const SLIDE_IMAGES = {
  chat: require("../../../assets/onboarding/slide-1-chat.png"),
  tryon: require("../../../assets/onboarding/slide-2-tryon.png"),
  care: require("../../../assets/onboarding/slide-3-care.png"),
} as const;

/**
 * Chat → Try-on → Care. Rasm + pastdagi matn.
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
        key: "chat",
        title: t("onboarding.featureChatTitle"),
        subtitle: t("onboarding.featureChatSub"),
        image: SLIDE_IMAGES.chat,
      },
      {
        key: "tryon",
        title: t("onboarding.featureTryonTitle"),
        subtitle: t("onboarding.featureTryonSub"),
        image: SLIDE_IMAGES.tryon,
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

  const imageH = Math.min(Math.max(winH * 0.42, 260), 420);

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
        {
          paddingTop: safeTop(insets.top, 4),
          paddingBottom: safeBottom(insets.bottom, 16),
        },
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
          Morf AI
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
        renderItem={({ item }) => {
          // Chat rasmida matn yuqorida — kesib, faqat illustratsiya ko‘rsatiladi.
          const clipChat = item.key === "chat";
          return (
            <View style={[styles.page, { width: winW }]}>
              <View style={[styles.heroWrap, { height: imageH }]}>
                <Image
                  source={item.image}
                  style={
                    clipChat
                      ? [styles.heroImageChat, { height: imageH * 1.55, marginTop: -(imageH * 0.42) }]
                      : styles.heroImage
                  }
                  resizeMode={clipChat ? "cover" : "contain"}
                  accessibilityLabel={item.title}
                />
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSub}>{item.subtitle}</Text>
            </View>
          );
        }}
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
  root: { flex: 1, backgroundColor: "#FAFAFA" },
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
    flex: 1,
  },
  heroWrap: {
    width: "100%",
    borderRadius: moderateScale(24),
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    marginBottom: verticalScale(20),
    alignItems: "center",
    justifyContent: "center",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroImageChat: {
    width: "100%",
  },
  cardTitle: {
    color: "#111",
    fontSize: fontSize(24),
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: verticalScale(8),
  },
  cardSub: {
    color: "#525252",
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    fontWeight: "500",
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
    height: verticalScale(54),
    borderRadius: moderateScale(16),
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: "#FFF",
    fontSize: fontSize(16),
    fontWeight: "700",
    letterSpacing: -0.2,
  },
});
