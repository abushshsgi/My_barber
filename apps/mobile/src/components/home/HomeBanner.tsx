import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { pexelsPhotoUrl } from "../../api/media";
import { BANNER_ASPECT, H_PAD, useHomeLayout } from "../../theme/layout";
import { colors } from "../../theme/colors";
import { ResponsiveImage } from "../ResponsiveImage";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

const AUTOPLAY_MS = 4500;

const SLIDES = [
  {
    id: "today",
    photoId: 3992860,
    badge: "TEZKOR TAKLIFLAR",
    title: "Bugun bo'sh qolgan vaqtlarga 30% gacha chegirma",
    cta: "Bron qilish",
    promo: "-30%",
  },
  {
    id: "sub",
    photoId: 3993448,
    badge: "OBUNA",
    title: "Morf AI va chegirmalar — obuna bilan arzonroq",
    cta: "Obuna bo'lish",
    promo: "AI",
  },
  {
    id: "offers",
    photoId: 3288365,
    badge: "AKSIYALAR",
    title: "Salon aksiyalari va maxsus takliflar",
    cta: "Hammasi",
    promo: "-20%",
  },
  {
    id: "ai",
    photoId: 3785147,
    badge: "MORF AI",
    title: "Yangi soch uslubini AI bilan sinab ko'ring",
    cta: "Boshlash",
  },
  {
    id: "explore",
    photoId: 1319460,
    badge: "EXPLORE",
    title: "Trend uslublar va yangi salonlar",
    cta: "Ko'rish",
  },
] as const;

type Props = {
  onPressSlide?: (id: string) => void;
};

/** Promo carousel — ekran kengligiga mos banner + responsive rasm. */
export function HomeBanner({ onPressSlide }: Props) {
  const { bannerW, bannerImageW } = useHomeLayout();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const widthRef = useRef(bannerW);
  widthRef.current = bannerW;

  useEffect(() => {
    const id = setInterval(() => {
      const next = (indexRef.current + 1) % SLIDES.length;
      indexRef.current = next;
      setIndex(next);
      scrollRef.current?.scrollTo({ x: next * widthRef.current, animated: true });
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ x: indexRef.current * bannerW, animated: false });
  }, [bannerW]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const w = widthRef.current || 1;
    const next = Math.round(e.nativeEvent.contentOffset.x / w);
    indexRef.current = next;
    setIndex(next);
  };

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onMomentumScrollEnd={onScrollEnd}
        style={[styles.carousel, { width: bannerW }]}
      >
        {SLIDES.map((slide) => (
          <Pressable
            key={slide.id}
            style={[styles.slide, { width: bannerW }]}
            onPress={() => onPressSlide?.(slide.id)}
          >
            <ResponsiveImage
              uri={pexelsPhotoUrl(slide.photoId, bannerImageW)}
              style={StyleSheet.absoluteFill}
              recyclingKey={`banner-${slide.id}-${bannerImageW}`}
              transition={200}
            />
            <LinearGradient
              colors={["rgba(0,0,0,0.72)", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.12)"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.5)"]}
              style={StyleSheet.absoluteFill}
            />

            {"promo" in slide && slide.promo ? (
              <View style={styles.promoBadge}>
                <Text style={styles.promoText}>{slide.promo}</Text>
              </View>
            ) : null}

            <View style={styles.content}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{slide.badge}</Text>
              </View>
              <View>
                <Text style={styles.title}>{slide.title}</Text>
                <View style={styles.cta}>
                  <Text style={styles.ctaText}>{slide.cta}</Text>
                  <Feather name="arrow-up-right" size={14} color={colors.fg} />
                </View>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.dots} pointerEvents="box-none">
        {SLIDES.map((slide, i) => (
          <View
            key={slide.id}
            style={[styles.dot, i === index ? styles.dotActive : styles.dotIdle]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: H_PAD,
  },
  carousel: {
    borderRadius: moderateScale(20),
    overflow: "hidden",
    alignSelf: "center",
  },
  slide: {
    aspectRatio: BANNER_ASPECT,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  promoBadge: {
    position: "absolute",
    top: verticalScale(12),
    right: scale(12),
    zIndex: 2,
    backgroundColor: colors.promo,
    borderRadius: 999,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
  },
  promoText: {
    fontSize: fontSize(11),
    fontWeight: "800",
    color: colors.fg,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    padding: moderateScale(14),
    zIndex: 2,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 999,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
  },
  badgeText: {
    fontSize: fontSize(10),
    fontWeight: "800",
    letterSpacing: 1,
    color: colors.fg,
    textTransform: "uppercase",
  },
  title: {
    maxWidth: "88%",
    fontSize: fontSize(15),
    fontWeight: "800",
    lineHeight: fontSize(20),
    color: "#FFFFFF",
  },
  cta: {
    marginTop: verticalScale(8),
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(6),
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(10),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(7),
  },
  ctaText: {
    fontSize: fontSize(11),
    fontWeight: "800",
    color: colors.fg,
  },
  dots: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: verticalScale(10),
    flexDirection: "row",
    justifyContent: "center",
    gap: moderateScale(4),
  },
  dot: {
    height: verticalScale(4),
    borderRadius: 999,
  },
  dotActive: {
    width: scale(16),
    backgroundColor: "#FFFFFF",
  },
  dotIdle: {
    width: scale(4),
    backgroundColor: "rgba(255,255,255,0.45)",
  },
});
