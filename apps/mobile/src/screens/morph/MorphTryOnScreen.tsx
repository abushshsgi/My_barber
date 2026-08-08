import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchHairstyles } from "../../api/hairstyles";
import { morfMark } from "../../branding/morf-logo";
import { useAuth } from "../../auth/AuthContext";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";
import { pickSelfieFromCamera, pickSelfieFromGallery } from "../../lib/selfie";
import { useMorphSession } from "../../lib/morph-session";
import type { MorphStackParamList } from "../../navigation/MorphStack";

type Props = NativeStackScreenProps<MorphStackParamList, "MorphTryOn">;

type RecCard = { id: string; title: string; image: string };

export function MorphTryOnScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const session = useMorphSession();
  const gate = useMorphLimitGate();
  const [busy, setBusy] = useState<"camera" | "gallery" | null>(null);
  const [recs, setRecs] = useState<RecCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchHairstyles("men")
      .then((rows) => {
        if (cancelled) return;
        setRecs(
          rows.slice(0, 8).map((r) => ({
            id: r.id,
            title: r.title_uz || r.title,
            image: r.image_url,
          })),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const heroImage = recs[0]?.image ?? null;

  const startWith = useCallback(
    async (source: "camera" | "gallery", preferred?: RecCard) => {
      if (!isAuthenticated) {
        navigation.getParent()?.navigate("Profile" as never);
        return;
      }
      setError(null);
      setBusy(source);
      try {
        // Avval picker — webda gate + Alert tufayli "hech narsa bo‘lmaydi" holatini oldini oladi.
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
        if (preferred) {
          session.setPreferredStyle(preferred.id, preferred.title);
        }
        navigation.replace("MorphResults");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Rasm yuklashda xato");
      } finally {
        setBusy(null);
      }
    },
    [gate, isAuthenticated, navigation, session],
  );

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) }]}>
      <View style={styles.header}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Orqaga"
        >
          <Ionicons name="chevron-back" size={16} color="#0A0A0A" />
        </Pressable>
        <Text style={styles.headerTitle}>Try-on</Text>
        <View style={styles.iconBtnGhost} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: Math.max(insets.bottom, 12) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headline}>Mukammal uslubingizni toping</Text>
        <Text style={styles.sub}>
          Selfie yuklang — AI yuz shakliga mos look yaratadi.
        </Text>

        {recs.length > 0 ? (
          <View style={styles.recs}>
            <Text style={styles.recsTitle}>Sizga tavsiya</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recsRow}
            >
              {recs.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.recCard}
                  disabled={!!busy}
                  onPress={() => void startWith("gallery", item)}
                >
                  <Image
                    source={{ uri: item.image }}
                    style={styles.recImg}
                    contentFit="cover"
                  />
                  <Text style={styles.recTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          {heroImage ? (
            <Image
              source={{ uri: heroImage }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : (
            <LinearGradient
              colors={["#1A1A1A", "#0A0A0A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.75)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Image source={morfMark} style={styles.heroMark} contentFit="contain" />
              <Text style={styles.heroBadgeText}>Morf AI skaner</Text>
            </View>
            <Text style={styles.heroTitle}>Shaxsiy lookingiz</Text>
            <Text style={styles.heroHint}>Yuz aniq · yaxshi yorug‘lik</Text>
          </View>
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
                <View style={styles.gridIconDark}>
                  <Ionicons name="camera" size={18} color="#FFF" />
                </View>
                <Text style={styles.gridTitleLight}>Kamera</Text>
                <Text style={styles.gridSubLight}>Selfie skan</Text>
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
                <View style={styles.gridIconLight}>
                  <Ionicons name="images-outline" size={18} color="#0A0A0A" />
                </View>
                <Text style={styles.gridTitleDark}>Galereya</Text>
                <Text style={styles.gridSubDark}>Rasm yuklash</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.steps}>
          {(["Selfie", "Tahlil", "Natija"] as const).map((label, i) => (
            <View key={label} style={styles.stepItem}>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0A0A0A",
    letterSpacing: -0.2,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnGhost: { width: 32, height: 32 },
  body: {
    paddingHorizontal: 14,
    gap: 10,
  },
  headline: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0A0A0A",
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  sub: {
    fontSize: 12,
    lineHeight: 16,
    color: "rgba(10,10,10,0.45)",
    maxWidth: 300,
  },
  recs: { gap: 8, marginTop: 2 },
  recsTitle: { fontSize: 12, fontWeight: "800", color: "#0A0A0A" },
  recsRow: { gap: 8, paddingRight: 4 },
  recCard: {
    width: 88,
    backgroundColor: "#FFF",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
    paddingBottom: 6,
  },
  recImg: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: "#EEE",
  },
  recTitle: {
    marginTop: 5,
    paddingHorizontal: 6,
    fontSize: 10,
    fontWeight: "700",
    color: "#0A0A0A",
  },
  heroCard: {
    borderRadius: 20,
    overflow: "hidden",
    minHeight: 160,
    justifyContent: "flex-end",
    backgroundColor: "#111",
  },
  heroContent: {
    zIndex: 1,
    gap: 4,
    padding: 14,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroMark: { width: 11, height: 13 },
  heroBadgeText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 9,
    fontWeight: "700",
  },
  heroTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  heroHint: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    fontWeight: "600",
  },
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
  actionGrid: {
    flexDirection: "row",
    gap: 8,
  },
  gridBtnDark: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0A0A0A",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    minHeight: 96,
    justifyContent: "center",
  },
  gridBtnLight: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    minHeight: 96,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderStyle: "dashed",
  },
  gridIconDark: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  gridIconLight: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  gridTitleLight: { color: "#FFF", fontWeight: "800", fontSize: 12 },
  gridSubLight: { color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: "600" },
  gridTitleDark: { color: "#0A0A0A", fontWeight: "800", fontSize: 12 },
  gridSubDark: { color: "rgba(10,10,10,0.4)", fontSize: 10, fontWeight: "600" },
  steps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
    gap: 4,
  },
  stepItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotOn: { backgroundColor: "#0A0A0A" },
  stepNum: { fontSize: 10, fontWeight: "800", color: "#8E8E93" },
  stepNumOn: { color: "#FFF" },
  stepLabel: { fontSize: 10, fontWeight: "700", color: "#8E8E93" },
  stepLabelOn: { color: "#0A0A0A" },
});
