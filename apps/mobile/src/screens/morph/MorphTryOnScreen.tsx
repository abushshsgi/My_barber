import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchHairstyles } from "../../api/hairstyles";
import { pexelsPhotoUrl } from "../../api/media";
import { useAuth } from "../../auth/AuthContext";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";
import { hasCompletedMorphTryOnIntro } from "../../lib/morph-onboarding";
import { pickSelfieFromCamera, pickSelfieFromGallery } from "../../lib/selfie";
import { useMorphSession } from "../../lib/morph-session";
import type { MorphStackParamList } from "../../navigation/MorphStack";

type Props = NativeStackScreenProps<MorphStackParamList, "MorphTryOn">;

const FALLBACK_HERO = pexelsPhotoUrl(3998429, 1400);

/**
 * Try-on (qayta kirish) — selfie kamera / galereya + tarix swipe.
 * Birinchi marta: MorphWelcome ga yo‘naltiradi.
 */
export function MorphTryOnScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const session = useMorphSession();
  const gate = useMorphLimitGate();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<"camera" | "gallery" | null>(null);
  const [heroUri, setHeroUri] = useState(FALLBACK_HERO);
  const [error, setError] = useState<string | null>(null);
  const hintY = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    void hasCompletedMorphTryOnIntro().then((done) => {
      if (cancelled) return;
      if (!done) {
        navigation.replace("MorphWelcome");
        return;
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  useEffect(() => {
    let cancelled = false;
    void fetchHairstyles("men")
      .then((rows) => {
        if (cancelled) return;
        const uri = rows[0]?.image_url?.trim();
        if (uri) setHeroUri(uri);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    hintY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 700 }),
        withTiming(0, { duration: 700 }),
      ),
      -1,
      false,
    );
  }, [hintY]);

  const hintAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: hintY.value }],
  }));

  const openHistory = useCallback(() => {
    navigation.navigate("MorphHistory");
  }, [navigation]);

  const panRef = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        g.dy < -18 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dy < -60 || g.vy < -0.6) openHistory();
      },
    }),
  ).current;

  const startWith = useCallback(
    async (source: "camera" | "gallery") => {
      if (!isAuthenticated) {
        navigation.getParent()?.navigate("Profile" as never);
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
              : "Rasm tanlanmadi.",
          );
          return;
        }

        const ok = await gate.ensureAccess();
        if (!ok) {
          setError("Morph AI uchun obuna kerak — tarifni tanlang.");
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
    [gate, isAuthenticated, navigation, session],
  );

  if (!ready) {
    return <View style={styles.root} />;
  }

  return (
    <View style={styles.root} {...panRef.panHandlers}>
      <Image
        source={{ uri: heroUri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={300}
      />
      <LinearGradient
        colors={["rgba(10,10,10,0.15)", "rgba(10,10,10,0.55)", "#1A1A1A"]}
        locations={[0, 0.42, 0.72]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        entering={FadeIn.duration(400)}
        style={[styles.centerCopy, { paddingTop: insets.top + 48 }]}
      >
        <Text style={styles.headline}>Selfie yuklang</Text>
        <Text style={styles.sub}>Yuz aniq ko‘rinsin · yaxshi yorug‘lik</Text>
      </Animated.View>

      <Pressable
        style={[styles.historyHint, { bottom: 250 + Math.max(insets.bottom, 8) }]}
        onPress={openHistory}
        accessibilityLabel="Tarix"
      >
        <Animated.View style={[styles.historyInner, hintAnim]}>
          <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.75)" />
          <Ionicons
            name="chevron-up"
            size={16}
            color="rgba(255,255,255,0.45)"
            style={{ marginTop: -10 }}
          />
          <View style={styles.historyLine} />
          <Text style={styles.historyText}>Tarix uchun yuqoriga siljiting</Text>
        </Animated.View>
      </Pressable>

      <View
        style={[
          styles.sheet,
          { paddingBottom: Math.max(insets.bottom, 12) + 10 },
        ]}
      >
        <View style={styles.steps}>
          {(["Selfie", "Tahlil", "Natija"] as const).map((label, i) => (
            <View key={label} style={styles.stepCol}>
              {i > 0 ? <View style={styles.stepLine} /> : null}
              <View style={[styles.stepDot, i === 0 && styles.stepDotOn]}>
                <Text style={[styles.stepNum, i === 0 && styles.stepNumOn]}>
                  {i + 1}
                </Text>
              </View>
              <Text style={[styles.stepLabel, i === 0 && styles.stepLabelOn]}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            {error.includes("obuna") ? (
              <Pressable
                style={styles.errorCta}
                onPress={() => navigation.navigate("MorphPaywall")}
              >
                <Text style={styles.errorCtaText}>Tariflar</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={styles.actionGrid}>
          <Pressable
            style={styles.gridBtnDark}
            disabled={!!busy}
            onPress={() => void startWith("camera")}
          >
            {busy === "camera" ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="scan-outline" size={26} color="#FFF" />
                <Text style={styles.gridTitleLight}>Kameradan olish</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={styles.gridBtnLight}
            disabled={!!busy}
            onPress={() => void startWith("gallery")}
          >
            {busy === "gallery" ? (
              <ActivityIndicator color="#0A0A0A" />
            ) : (
              <>
                <Ionicons name="images-outline" size={26} color="#6B6B6B" />
                <Text style={styles.gridTitleDark}>Galereyadan tanlash</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#1A1A1A" },
  centerCopy: {
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  headline: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  sub: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  historyHint: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  historyInner: { alignItems: "center", gap: 2 },
  historyLine: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.35)",
    marginTop: 2,
    marginBottom: 6,
  },
  historyText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "600",
  },
  sheet: {
    marginTop: "auto",
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 22,
    gap: 16,
  },
  steps: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  stepCol: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  stepLine: {
    position: "absolute",
    left: -50,
    right: "50%",
    top: 15,
    height: 2,
    backgroundColor: "#E8E8E8",
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  stepDotOn: { backgroundColor: "#0A0A0A" },
  stepNum: { fontSize: 13, fontWeight: "800", color: "#9A9A9A" },
  stepNumOn: { color: "#FFF" },
  stepLabel: { fontSize: 12, fontWeight: "600", color: "#A0A0A0" },
  stepLabelOn: { color: "#0A0A0A", fontWeight: "800" },
  errorBox: {
    backgroundColor: "rgba(185,28,28,0.08)",
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  errorText: { color: "#B91C1C", fontSize: 11, fontWeight: "600", lineHeight: 15 },
  errorCta: {
    alignSelf: "flex-start",
    backgroundColor: "#0A0A0A",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  errorCtaText: { color: "#FFF", fontSize: 11, fontWeight: "800" },
  actionGrid: { flexDirection: "row", gap: 12 },
  gridBtnDark: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#0A0A0A",
    borderRadius: 18,
    minHeight: 112,
    paddingHorizontal: 10,
    paddingVertical: 16,
  },
  gridBtnLight: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFF",
    borderRadius: 18,
    minHeight: 112,
    paddingHorizontal: 10,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: "#D4D4D4",
    borderStyle: "dashed",
  },
  gridTitleLight: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 13,
    textAlign: "center",
  },
  gridTitleDark: {
    color: "#0A0A0A",
    fontWeight: "700",
    fontSize: 13,
    textAlign: "center",
  },
});
