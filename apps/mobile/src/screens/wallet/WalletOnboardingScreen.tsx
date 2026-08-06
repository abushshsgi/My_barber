import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";

const { width: SCREEN_W } = Dimensions.get("window");

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
    secondary: "#A78BFA",
  },
  {
    id: "2",
    title: "Xavfsiz balans",
    body: "Har bir harakat ledgerda saqlanadi. Idempotent to'lovlar firibgarlikni oldini oladi.",
    icon: "shield-checkmark",
    accent: "#0A0A0A",
    secondary: "#64748B",
  },
  {
    id: "3",
    title: "Sovg'a va QR",
    body: "Do'stingizga sovg'a yuboring yoki sartarosh QR kodini skanerlab to'lang.",
    icon: "gift",
    accent: "#EC4899",
    secondary: "#F59E0B",
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
        <Ionicons name={slide.icon} size={48} color="#FFF" />
      </View>
      <View style={styles.glassCard}>
        <View style={styles.glassDot} />
      </View>
    </View>
  );
}

export function WalletOnboardingScreen({ onOpen, opening, onSkip }: Props) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);
  const isLast = index === SLIDES.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (i !== index && i >= 0 && i < SLIDES.length) setIndex(i);
  };

  const next = () => {
    if (isLast) {
      onOpen();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  return (
    <LinearGradient colors={["#E0F2FE", "#F3E8FF"]} style={styles.root}>
      <View style={{ paddingTop: Math.max(insets.top, 12), flex: 1 }}>
        <View style={styles.topBar}>
          <View style={{ width: 56 }} />
          <Pressable onPress={onSkip ?? onOpen} hitSlop={12}>
            <Text style={styles.skip}>O'tkazib yuborish</Text>
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(s) => s.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <View style={[styles.page, { width: SCREEN_W }]}>
              <SlideArt slide={item} />
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          )}
        />

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.dots}>
            {SLIDES.map((s, i) => (
              <View
                key={s.id}
                style={[styles.dot, i === index ? styles.dotActive : styles.dotIdle]}
              />
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
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  skip: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2563EB",
  },
  page: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  artWrap: {
    height: 220,
    width: 220,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  orbBack: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    top: 28,
    right: 18,
    opacity: 0.85,
  },
  orbMain: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  glassCard: {
    position: "absolute",
    bottom: 36,
    width: 150,
    height: 72,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  glassDot: {
    alignSelf: "flex-end",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.fg,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  body: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: colors.fg,
    textAlign: "center",
    opacity: 0.75,
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: 24,
    gap: 18,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 28,
    backgroundColor: "#3F3F46",
  },
  dotIdle: {
    width: 8,
    backgroundColor: "#D4D4D8",
  },
  cta: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "700",
  },
});
