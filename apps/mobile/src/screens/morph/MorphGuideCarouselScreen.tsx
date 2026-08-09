import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pexelsPhotoUrl } from "../../api/media";
import { useAuth } from "../../auth/AuthContext";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";
import { markMorphTryOnIntroDone } from "../../lib/morph-onboarding";
import { pickSelfieFromCamera } from "../../lib/selfie";
import { useMorphSession } from "../../lib/morph-session";
import type { MorphStackParamList } from "../../navigation/MorphStack";

type Props = NativeStackScreenProps<MorphStackParamList, "MorphGuide">;

type Slide = {
  key: string;
  badge: string;
  title: string;
  body: string;
  tips: string[];
  image: string;
  isLast?: boolean;
};

const SLIDES: Slide[] = [
  {
    key: "angle",
    badge: "1 / 3",
    title: "Qaysi tarafdan rasmga oling",
    body: "Kamerani ko‘z balandligida tuting. Yuz to‘g‘ridan-to‘g‘ri qarasin — chap yoki o‘ngga burilmang.",
    tips: [
      "Old tomondan, to‘liq yuz kadrda",
      "Telefon vertikal (portrait)",
      "Ko‘zlar, qosh va soch chizig‘i ko‘rinsin",
    ],
    image: pexelsPhotoUrl(3998429, 1200),
  },
  {
    key: "morph",
    badge: "2 / 3",
    title: "Morf AI nima?",
    body: "Morf AI selfiingizni tahlil qilib, yuz shakliga mos soch uslublarini yaratadi — saloniga borishdan oldin lookni ko‘rasiz.",
    tips: [
      "Yuz shakli va soch tipini aniqlaydi",
      "Bir necha uslubni bir zumda sinab ko‘rasiz",
      "Natija tarixingizda saqlanadi",
    ],
    image: pexelsPhotoUrl(1813272, 1200),
  },
  {
    key: "photo",
    badge: "3 / 3",
    title: "Yaxshi selfie qanday olinadi",
    body: "Yorug‘lik yuzingizga tushsin, orqa fon oddiy bo‘lsin. Keyin “Take a photo” — kamera ochiladi.",
    tips: [
      "Yaxshi yorug‘lik · tabiiy yoki old chiroq",
      "Ko‘zoynak / maska bo‘lmasin (imkon bo‘lsa)",
      "Selfie aniq va yaqin bo‘lsin",
    ],
    image: pexelsPhotoUrl(1570807, 1200),
    isLast: true,
  },
];

export function MorphGuideCarouselScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const { isAuthenticated } = useAuth();
  const session = useMorphSession();
  const gate = useMorphLimitGate();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const btnScale = useSharedValue(1);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const i = viewableItems[0]?.index;
      if (typeof i === "number") setIndex(i);
    },
  ).current;
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 55 }).current;

  const btnAnim = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const goNext = useCallback(() => {
    btnScale.value = withSequence(
      withSpring(0.94, { damping: 14 }),
      withSpring(1, { damping: 12 }),
    );
    if (index < SLIDES.length - 1) {
      const next = index + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
    }
  }, [btnScale, index]);

  const takePhoto = useCallback(async () => {
    if (!isAuthenticated) {
      navigation.getParent()?.navigate("Profile" as never);
      return;
    }
    // Intro tugadi — keyingi Try-on kirishlarda Welcome/Guide chiqmaydi.
    await markMorphTryOnIntroDone();
    setError(null);
    setBusy(true);
    btnScale.value = withSequence(
      withSpring(0.92, { damping: 14 }),
      withSpring(1.04, { damping: 10 }),
      withSpring(1, { damping: 12 }),
    );
    try {
      const dataUrl = await pickSelfieFromCamera();
      if (!dataUrl) {
        // Intro allaqachon yozilgan — keyingi marta Capture UI.
        navigation.replace("MorphCapture");
        return;
      }
      const ok = await gate.ensureAccess();
      if (!ok) {
        navigation.replace("MorphCapture");
        return;
      }
      session.clear();
      session.setSelfie(dataUrl);
      navigation.replace("MorphResults");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kamerani ochib bo‘lmadi");
    } finally {
      setBusy(false);
    }
  }, [btnScale, gate, isAuthenticated, navigation, session]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / winW);
    if (next !== index) setIndex(next);
  };

  const slide = SLIDES[index] ?? SLIDES[0];
  const isLast = Boolean(slide.isLast);

  const renderItem = ({ item }: { item: Slide }) => (
    <View style={[styles.page, { width: winW }]}>
      <View style={styles.heroWrap}>
        <Image
          source={{ uri: item.image }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        <LinearGradient
          colors={["transparent", "rgba(10,10,10,0.55)", "#0A0A0A"]}
          locations={[0.2, 0.65, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={[styles.copy, { paddingBottom: insets.bottom + 130 }]}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
        <View style={styles.tips}>
          {item.tips.map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 10) }]}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.replace("MorphCapture");
          }}
          accessibilityLabel="Orqaga"
        >
          <Ionicons name="chevron-back" size={18} color="#FFF" />
        </Pressable>
        <Text style={styles.topTitle}>Morf AI Try-on</Text>
        <View style={styles.iconBtnGhost} />
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={renderItem}
        getItemLayout={(_, i) => ({ length: winW, offset: winW * i, index: i })}
      />

      <Animated.View
        entering={FadeInDown.duration(400)}
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 16) + 12 },
        ]}
      >
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            {error.includes("obuna") ? (
              <Pressable onPress={() => navigation.navigate("MorphPaywall")}>
                <Text style={styles.errorLink}>Tariflar</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Animated.View style={btnAnim}>
          <Pressable
            style={[styles.primaryBtn, busy && styles.primaryBtnBusy]}
            disabled={busy}
            onPress={() => {
              if (isLast) void takePhoto();
              else goNext();
            }}
          >
            {busy ? (
              <ActivityIndicator color="#0A0A0A" />
            ) : (
              <>
                <Text style={styles.primaryText}>
                  {isLast ? "Take a photo" : "Davom etish"}
                </Text>
                <Ionicons
                  name={isLast ? "camera" : "arrow-forward"}
                  size={18}
                  color="#0A0A0A"
                />
              </>
            )}
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  topTitle: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnGhost: { width: 36, height: 36 },
  page: { flex: 1 },
  heroWrap: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#111",
  },
  copy: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 22,
    gap: 10,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "700" },
  title: {
    color: "#FFF",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  body: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  tips: { gap: 8, marginTop: 4 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFF",
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 8,
    paddingHorizontal: 18,
    gap: 12,
    backgroundColor: "transparent",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  dotOn: { width: 20, backgroundColor: "#FFF" },
  primaryBtn: {
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 22,
  },
  primaryBtnBusy: { opacity: 0.85 },
  primaryText: { color: "#0A0A0A", fontSize: 16, fontWeight: "800" },
  errorBox: {
    backgroundColor: "rgba(185,28,28,0.2)",
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  errorText: { color: "#FECACA", fontSize: 12, fontWeight: "600" },
  errorLink: { color: "#FFF", fontSize: 12, fontWeight: "800" },
});
