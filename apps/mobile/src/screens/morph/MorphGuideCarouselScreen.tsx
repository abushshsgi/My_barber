import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pexelsPhotoUrl } from "../../api/media";
import { useAuth } from "../../auth/AuthContext";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";
import { writeAppShell, writeLastShellTab } from "../../lib/app-shell";
import {
  markMorphTryOnIntroDone,
  writeMorphIntroStep,
} from "../../lib/morph-onboarding";
import { useMorphSession } from "../../lib/morph-session";
import { pickSelfieFromCamera, pickSelfieFromGallery } from "../../lib/selfie";
import type { MorphStackParamList } from "../../navigation/MorphStack";

type Props = NativeStackScreenProps<MorphStackParamList, "MorphGuide">;

type Slide = {
  key: string;
  title: string;
  subtitle: string;
  visual: "look" | "angle" | "upload";
  isLast?: boolean;
};

const SLIDES: Slide[] = [
  {
    key: "look",
    title: "Look yaratish\nAI bilan",
    subtitle:
      "Selfie yuklang — Morf AI yuz shaklingizga mos soch uslublarini bir necha soniyada yaratadi.",
    visual: "look",
  },
  {
    key: "angle",
    title: "Yaxshi selfie\nqanday olinadi",
    subtitle:
      "Kamerani ko‘z balandligida tuting. Yuz to‘g‘ri qarasin, yorug‘lik yuzingizga tushsin.",
    visual: "angle",
  },
  {
    key: "upload",
    title: "Rasmni tanlang",
    subtitle:
      "Kameradan oling yoki galereyadan yuklang. Yuz aniq ko‘rinsin — keyin look yaratiladi.",
    visual: "upload",
    isLast: true,
  },
];

const H_PAD = 24;
const LOOK_URI = pexelsPhotoUrl(3998445, 1400);
const ANGLE_URI = pexelsPhotoUrl(3998429, 1200);

async function rememberMorphTryOnTab() {
  await writeAppShell("morph");
  await writeLastShellTab("morph", "MorphTryOn");
}

export function MorphGuideCarouselScreen({ navigation, route }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const { height: winH, width: winW } = useWindowDimensions();
  const { isAuthenticated } = useAuth();
  const session = useMorphSession();
  const gate = useMorphLimitGate();
  const listRef = useRef<FlatList<Slide>>(null);

  const initial = Math.min(
    Math.max(route.params?.startIndex ?? 0, 0),
    SLIDES.length - 1,
  );
  const [index, setIndex] = useState(initial);
  const [busy, setBusy] = useState<"camera" | "gallery" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const galleryW = Math.max(280, winW - H_PAD * 2);
  const galleryH = Math.min(Math.max(winH * 0.34, 240), 320);
  const pageTopPad = Math.max(winH * 0.08, 48);

  useEffect(() => {
    if (initial <= 0) return;
    const id = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: initial, animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [initial]);

  useEffect(() => {
    void writeMorphIntroStep(index);
  }, [index]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const i = viewableItems[0]?.index;
      if (typeof i === "number") setIndex(i);
    },
  ).current;
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  const goLogin = useCallback(async () => {
    await writeMorphIntroStep(SLIDES.length - 1);
    await rememberMorphTryOnTab();
    navigation.getParent()?.navigate("Profile" as never);
  }, [navigation]);

  const goNext = useCallback(() => {
    if (index < SLIDES.length - 1) {
      const next = index + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
      void writeMorphIntroStep(next);
    }
  }, [index]);

  const pickSelfie = useCallback(
    async (source: "camera" | "gallery") => {
      if (!isAuthenticated) {
        await goLogin();
        return;
      }
      setError(null);
      setBusy(source);
      try {
        const dataUrl =
          source === "camera"
            ? await pickSelfieFromCamera()
            : await pickSelfieFromGallery();
        if (!dataUrl) {
          setError(
            source === "camera"
              ? "Selfie olinmadi. Ruxsat bering yoki galereyadan tanlang."
              : "Rasm tanlanmadi. Galereyadan boshqa fayl tanlang.",
          );
          return;
        }
        await markMorphTryOnIntroDone();
        const ok = await gate.ensureAccess();
        if (!ok) {
          navigation.replace("MorphCapture");
          return;
        }
        session.clear();
        session.setSelfie(dataUrl);
        navigation.replace("MorphResults");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Rasm yuklashda xato");
      } finally {
        setBusy(null);
      }
    },
    [gate, goLogin, isAuthenticated, navigation, session],
  );

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / winW);
    if (next !== index) setIndex(next);
  };

  const onBack = () => {
    if (index > 0) {
      const prev = index - 1;
      listRef.current?.scrollToIndex({ index: prev, animated: true });
      setIndex(prev);
      return;
    }
    const parent = navigation.getParent();
    if (parent?.canGoBack()) {
      parent.goBack();
      return;
    }
    parent?.navigate("Home" as never);
  };

  const slide = SLIDES[index] ?? SLIDES[0];
  const isLast = Boolean(slide.isLast);

  const renderItem = ({ item }: { item: Slide }) => (
    <View style={[styles.page, { width: winW, paddingTop: pageTopPad }]}>
      <View style={[styles.visual, { height: galleryH, width: galleryW }]}>
        {item.visual === "look" || item.visual === "angle" ? (
          <Image
            source={{ uri: item.visual === "look" ? LOOK_URI : ANGLE_URI }}
            style={styles.visualPhoto}
            contentFit="cover"
          />
        ) : null}
        {item.visual === "upload" ? <UploadVisual /> : null}
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
      <View style={styles.topBar}>
        <Pressable
          style={styles.backBtn}
          onPress={onBack}
          accessibilityLabel="Orqaga"
        >
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </Pressable>
        <Text style={styles.topTitle}>Morf AI</Text>
        <View style={styles.backBtnGhost} />
      </View>

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
        onScrollToIndexFailed={({ index: failed }) => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index: failed, animated: false });
          }, 80);
        }}
        style={styles.list}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {isLast ? (
          <View style={styles.lastActions}>
            <Pressable
              style={({ pressed }) => [
                styles.cta,
                busy && styles.ctaBusy,
                pressed && !busy && styles.ctaPressed,
              ]}
              disabled={!!busy}
              onPress={() => void pickSelfie("camera")}
              accessibilityRole="button"
              accessibilityLabel="Kameradan olish"
            >
              {busy === "camera" ? (
                <ActivityIndicator color="#0A0A0A" />
              ) : (
                <>
                  <Ionicons name="camera" size={18} color="#0A0A0A" />
                  <Text style={styles.ctaText}>Kameradan olish</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.ctaGhost,
                busy && styles.ctaBusy,
                pressed && !busy && styles.ctaPressed,
              ]}
              disabled={!!busy}
              onPress={() => void pickSelfie("gallery")}
              accessibilityRole="button"
              accessibilityLabel="Galereyadan yuklash"
            >
              {busy === "gallery" ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="images-outline" size={18} color="#FFF" />
                  <Text style={styles.ctaGhostText}>Galereyadan yuklash</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            onPress={goNext}
            accessibilityRole="button"
            accessibilityLabel="Davom etish"
          >
            <Text style={styles.ctaText}>Davom etish</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function UploadVisual() {
  return (
    <View style={styles.uploadVisual}>
      <View style={styles.uploadTile}>
        <Ionicons name="camera" size={28} color="#0A0A0A" />
        <Text style={styles.uploadTileText}>Kamera</Text>
      </View>
      <View style={[styles.uploadTile, styles.uploadTileGhost]}>
        <Ionicons name="images-outline" size={28} color="#FFF" />
        <Text style={styles.uploadTileGhostText}>Galereya</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0B0B0C",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    minHeight: 44,
  },
  topTitle: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnGhost: { width: 40, height: 40 },
  list: { flex: 1 },
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
    borderRadius: 28,
    backgroundColor: "#161618",
    marginBottom: 8,
  },
  visualPhoto: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    color: "rgba(255,255,255,0.58)",
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
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  dotOn: {
    backgroundColor: "#FFFFFF",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  lastActions: { gap: 10 },
  cta: {
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  ctaGhost: {
    minHeight: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.85)",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  ctaBusy: { opacity: 0.7 },
  ctaPressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  ctaText: {
    color: "#0A0A0A",
    fontSize: 16,
    fontWeight: "800",
  },
  ctaGhostText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  errorText: {
    textAlign: "center",
    color: "#FECACA",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  uploadVisual: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTile: {
    width: 118,
    height: 132,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  uploadTileGhost: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
  },
  uploadTileText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0A0A0A",
  },
  uploadTileGhostText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
