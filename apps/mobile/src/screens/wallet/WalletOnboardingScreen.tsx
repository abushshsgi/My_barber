import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";

type Slide = {
  id: string;
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  secondary: string;
};

const SLIDES: Slide[] = [
  {
    id: "1",
    title: "Bir nechta to'lov",
    body: "Hamyon ochgach, bron, obuna va sovg'alarni bitta balansdan boshqarasiz.",
    icon: "wallet",
    accent: "#3B82F6",
    secondary: "#C4B5FD",
  },
  {
    id: "2",
    title: "Xavfsiz balans",
    body: "Har bir harakat ledgerda saqlanadi. Idempotent to'lovlar firibgarlikni oldini oladi.",
    icon: "shield-checkmark",
    accent: "#0A0A0A",
    secondary: "#94A3B8",
  },
  {
    id: "3",
    title: "Sovg'a va QR",
    body: "Do'stingizga sovg'a yuboring yoki sartarosh QR kodini skanerlab to'lang.",
    icon: "gift",
    accent: "#EC4899",
    secondary: "#FBBF24",
  },
];

type Props = {
  onOpen: () => void;
  opening?: boolean;
  onSkip?: () => void;
};

function SlideArt({ slide }: { slide: Slide }) {
  return (
    <View style={styles.artWrap}>
      <View style={[styles.orbBack, { backgroundColor: slide.secondary }]} />
      <View style={[styles.orbMain, { backgroundColor: slide.accent }]}>
        <Ionicons name={slide.icon} size={64} color="#FFF" />
      </View>
      <View style={styles.glassCard}>
        <Ionicons name={slide.icon} size={22} color="rgba(255,255,255,0.95)" />
        <View style={styles.glassDot} />
      </View>
    </View>
  );
}

export function WalletOnboardingScreen({ onOpen, opening, onSkip }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const indexRef = useRef(0);
  const isLast = index === SLIDES.length - 1;

  const goTo = useCallback(
    (nextIndex: number) => {
      const clamped = Math.max(0, Math.min(SLIDES.length - 1, nextIndex));
      indexRef.current = clamped;
      setIndex(clamped);
      scrollRef.current?.scrollTo({ x: clamped * width, animated: true });
    },
    [width],
  );

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1));
    if (i >= 0 && i < SLIDES.length) {
      indexRef.current = i;
      setIndex(i);
    }
  };

  const next = () => {
    if (indexRef.current >= SLIDES.length - 1) {
      onOpen();
      return;
    }
    goTo(indexRef.current + 1);
  };

  return (
    <LinearGradient colors={["#DBEAFE", "#EDE9FE", "#FCE7F3"]} style={styles.root}>
      <View style={[styles.inner, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.topBar}>
          <Text style={styles.brand}>
            Mysaloon<Text style={styles.brandDot}>.</Text>
          </Text>
          <Pressable onPress={onSkip ?? onOpen} hitSlop={14} style={styles.skipBtn}>
            <Text style={styles.skip}>O'tkazib yuborish</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          scrollEventThrottle={16}
          decelerationRate="fast"
          bounces={false}
          style={styles.pager}
          contentContainerStyle={{ alignItems: "stretch" }}
        >
          {SLIDES.map((item) => (
            <View key={item.id} style={[styles.page, { width }]}>
              <SlideArt slide={item} />
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={styles.dots}>
            {SLIDES.map((s, i) => (
              <Pressable key={s.id} onPress={() => goTo(i)} hitSlop={8}>
                <View style={[styles.dot, i === index ? styles.dotActive : styles.dotIdle]} />
              </Pressable>
            ))}
          </View>
          <Pressable
            style={[styles.cta, opening && styles.ctaDisabled]}
            onPress={next}
            disabled={opening}
          >
            {opening ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.ctaText}>{isLast ? "Hamyonni ochish" : "Keyingi"}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingBottom: 4,
  },
  brand: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.4,
  },
  brandDot: { color: colors.brandDot },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skip: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2563EB",
  },
  pager: { flex: 1 },
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 12,
  },
  artWrap: {
    height: 280,
    width: 280,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
  },
  orbBack: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    top: 24,
    right: 8,
    opacity: 0.9,
  },
  orbMain: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  glassCard: {
    position: "absolute",
    bottom: 28,
    width: 190,
    height: 88,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.52)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.85)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
  },
  glassDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.98)",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.fg,
    textAlign: "center",
    letterSpacing: -0.8,
  },
  body: {
    marginTop: 14,
    fontSize: 17,
    lineHeight: 26,
    color: colors.fg,
    textAlign: "center",
    opacity: 0.72,
    maxWidth: 340,
  },
  footer: {
    paddingHorizontal: 24,
    gap: 20,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    height: 9,
    borderRadius: 5,
  },
  dotActive: {
    width: 32,
    backgroundColor: "#27272A",
  },
  dotIdle: {
    width: 9,
    backgroundColor: "#D4D4D8",
  },
  cta: {
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
