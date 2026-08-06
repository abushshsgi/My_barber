import { useCallback, useRef, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedImageColumns } from "../components/welcome/AnimatedImageColumns";
import {
  LocationIllustration,
  MorphAiIllustration,
} from "../components/welcome/OnboardingIllustrations";
import { setWelcomeSeen } from "../lib/guest";
import { colors } from "../theme/colors";

export type LocationEntryMode = "map" | "search";

type Props = {
  onFinish: (mode: LocationEntryMode) => void;
};

type Slide = {
  key: string;
  title: string;
  subtitle: string;
  isLocation?: boolean;
};

const SLIDES: Slide[] = [
  {
    key: "gallery",
    title: "Sartaroshxonani\noson bron qiling",
    subtitle: "Yaqin salonlar, usta va vaqt — bir necha bosishda.",
  },
  {
    key: "morph",
    title: "Morf AI bilan\nuslubni sinab ko'ring",
    subtitle:
      "O'z selfiingizda yangi soch turmaklarini ko'ring — saloniga borishdan oldin.",
  },
  {
    key: "location",
    title: "Qayerdasiz?",
    subtitle:
      "Yaqin atrofdagi eng yaxshi sartaroshxonalarni ko'rsatishimiz uchun joylashuvingizdan foydalanamiz.",
    isLocation: true,
  },
];

const H_PAD = 24;

/**
 * Til → 3 ta karusel → LocationPicker (map yoki qo'lda qidiruv).
 */
export function GetStartedScreen({ onFinish }: Props) {
  const insets = useSafeAreaInsets();
  const { height: winH, width: winW } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const galleryW = Math.max(280, winW - H_PAD * 2);
  const galleryH = Math.min(Math.max(winH * 0.34, 240), 320);
  const illustSize = Math.min(galleryW * 0.62, 220);
  /** Kontent biroz pastroq — tepada bo'sh joy. */
  const pageTopPad = Math.max(winH * 0.1, 56);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const i = viewableItems[0]?.index;
      if (typeof i === "number") setIndex(i);
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  const finish = useCallback(
    async (mode: LocationEntryMode) => {
      await setWelcomeSeen();
      onFinish(mode);
    },
    [onFinish],
  );

  const goNext = useCallback(async () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
      setIndex(index + 1);
      return;
    }
    await finish("map");
  }, [index, finish]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / winW);
    if (next !== index) setIndex(next);
  };

  const slide = SLIDES[index] ?? SLIDES[0];
  const isLast = Boolean(slide.isLocation);

  const renderItem = ({ item }: { item: Slide }) => (
    <View style={[styles.page, { width: winW, paddingTop: pageTopPad }]}>
      <View style={[styles.visual, { height: galleryH, width: galleryW }]}>
        {item.key === "gallery" ? (
          <AnimatedImageColumns height={galleryH} width={galleryW} />
        ) : null}
        {item.key === "morph" ? <MorphAiIllustration size={illustSize} /> : null}
        {item.key === "location" ? <LocationIllustration size={illustSize} /> : null}
      </View>

      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </View>
  );

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + 4,
          paddingBottom: Math.max(insets.bottom, 12) + 16,
        },
      ]}
    >
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={onMomentumEnd}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, i) => ({
          length: winW,
          offset: winW * i,
          index: i,
        })}
        style={styles.list}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={() => void goNext()}
          accessibilityRole="button"
          accessibilityLabel={isLast ? "Joylashuvni aniqlash" : "Davom etish"}
        >
          <Text style={styles.ctaText}>
            {isLast ? "Joylashuvni aniqlash" : "Davom etish"}
          </Text>
        </Pressable>

        {isLast ? (
          <Pressable onPress={() => void finish("search")} hitSlop={8}>
            <Text style={styles.secondary}>Manzilni qo'lda ko'rsatish</Text>
          </Pressable>
        ) : (
          <View style={styles.secondarySpacer} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  list: {
    flex: 1,
  },
  page: {
    flexGrow: 1,
    paddingHorizontal: H_PAD,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 12,
  },
  visual: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
    color: colors.fg,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    color: colors.muted,
    textAlign: "center",
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: H_PAD,
    gap: 12,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E5E5EA",
  },
  dotActive: {
    backgroundColor: colors.fg,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cta: {
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  secondary: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: colors.fg,
    paddingVertical: 8,
  },
  secondarySpacer: {
    height: 36,
  },
});
