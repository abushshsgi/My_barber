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

const STEPS = [
  { n: 1, label: "Selfie" },
  { n: 2, label: "Tahlil" },
  { n: 3, label: "Natija" },
] as const;

export function MorphTryOnScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const session = useMorphSession();
  const gate = useMorphLimitGate();
  const [busy, setBusy] = useState<"camera" | "gallery" | null>(null);
  const [recs, setRecs] = useState<RecCard[]>([]);

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

  const startWith = useCallback(
    async (source: "camera" | "gallery", preferred?: RecCard) => {
      if (!isAuthenticated) {
        navigation.getParent()?.navigate("Profile" as never);
        return;
      }
      const ok = await gate.ensureAccess();
      if (!ok) {
        // ensureAccess allaqachon alert ko‘rsatadi — to‘g‘ridan-to‘g‘ri paywall ochilmaydi.
        return;
      }
      setBusy(source);
      try {
        const dataUrl =
          source === "camera"
            ? await pickSelfieFromCamera()
            : await pickSelfieFromGallery();
        if (!dataUrl) return;
        session.clear();
        session.setSelfie(dataUrl);
        if (preferred) {
          session.setPreferredStyle(preferred.id, preferred.title);
        }
        navigation.replace("MorphResults");
      } finally {
        setBusy(null);
      }
    },
    [gate, isAuthenticated, navigation, session],
  );

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 10) }]}>
      <View style={styles.header}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Orqaga"
        >
          <Ionicons name="chevron-back" size={20} color="#0A0A0A" />
        </Pressable>
        <Text style={styles.headerTitle}>Try-on</Text>
        <View style={styles.iconBtnGhost} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headline}>Mukammal{"\n"}uslubingizni toping</Text>
        <Text style={styles.sub}>
          Selfie yuklang — AI yuz shakliga mos lookni bir zumda yaratadi.
        </Text>

        <View style={styles.heroCard}>
          <LinearGradient
            colors={["#1A1A1A", "#0A0A0A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Image source={morfMark} style={styles.heroMark} contentFit="contain" />
              <Text style={styles.heroBadgeText}>Morf AI skaner</Text>
            </View>
            <Text style={styles.heroTitle}>Shaxsiy lookingizni oling</Text>
            <Text style={styles.heroHint}>Yuz aniq · yaxshi yorug'lik</Text>
            <Pressable
              style={styles.heroCta}
              disabled={!!busy}
              onPress={() => void startWith("camera")}
            >
              {busy === "camera" ? (
                <ActivityIndicator color="#0A0A0A" />
              ) : (
                <>
                  <Ionicons name="scan-outline" size={18} color="#0A0A0A" />
                  <Text style={styles.heroCtaText}>Skanerni boshlash</Text>
                </>
              )}
            </Pressable>
          </View>
          <View style={styles.heroOrb} />
        </View>

        <View style={styles.steps}>
          {STEPS.map((s, i) => (
            <View key={s.n} style={styles.stepItem}>
              <View style={[styles.stepDot, i === 0 && styles.stepDotOn]}>
                <Text style={[styles.stepNum, i === 0 && styles.stepNumOn]}>
                  {s.n}
                </Text>
              </View>
              <Text style={[styles.stepLabel, i === 0 && styles.stepLabelOn]}>
                {s.label}
              </Text>
              {i < STEPS.length - 1 ? <View style={styles.stepLine} /> : null}
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={styles.actionPrimary}
            disabled={!!busy}
            onPress={() => void startWith("camera")}
          >
            {busy === "camera" ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <View style={styles.actionIconDark}>
                  <Ionicons name="camera" size={20} color="#FFF" />
                </View>
                <View style={styles.actionCopy}>
                  <Text style={styles.actionTitleLight}>Kameradan olish</Text>
                  <Text style={styles.actionSubLight}>Tezkor selfie skan</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </>
            )}
          </Pressable>

          <Pressable
            style={styles.actionSecondary}
            disabled={!!busy}
            onPress={() => void startWith("gallery")}
          >
            {busy === "gallery" ? (
              <ActivityIndicator color="#0A0A0A" />
            ) : (
              <>
                <View style={styles.actionIconLight}>
                  <Ionicons name="images-outline" size={20} color="#0A0A0A" />
                </View>
                <View style={styles.actionCopy}>
                  <Text style={styles.actionTitleDark}>Galereyadan tanlash</Text>
                  <Text style={styles.actionSubDark}>Mavjud rasmni yuklang</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color="#0A0A0A" />
              </>
            )}
          </Pressable>
        </View>

        {recs.length > 0 ? (
          <View style={styles.recs}>
            <View style={styles.recsHead}>
              <Text style={styles.recsTitle}>Sizga tavsiya</Text>
              <Text style={styles.recsHint}>Selfie dan keyin sinab ko'ring</Text>
            </View>
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
                  <Text style={styles.recTag}>Try this look</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
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
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0A0A0A",
    letterSpacing: -0.3,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnGhost: { width: 40, height: 40 },
  body: {
    paddingHorizontal: 20,
    gap: 14,
  },
  headline: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0A0A0A",
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  sub: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(10,10,10,0.5)",
    maxWidth: 320,
    marginBottom: 4,
  },
  heroCard: {
    borderRadius: 28,
    overflow: "hidden",
    minHeight: 200,
    padding: 20,
    justifyContent: "flex-end",
  },
  heroContent: {
    zIndex: 1,
    gap: 8,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 4,
  },
  heroMark: { width: 14, height: 16 },
  heroBadgeText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "700",
  },
  heroTitle: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  heroHint: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  heroCta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  heroCtaText: {
    color: "#0A0A0A",
    fontWeight: "800",
    fontSize: 13,
  },
  heroOrb: {
    position: "absolute",
    right: -30,
    top: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  steps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
  },
  stepItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotOn: { backgroundColor: "#0A0A0A" },
  stepNum: { fontSize: 12, fontWeight: "800", color: "#8E8E93" },
  stepNumOn: { color: "#FFF" },
  stepLabel: { fontSize: 12, fontWeight: "700", color: "#8E8E93" },
  stepLabelOn: { color: "#0A0A0A" },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#ECECEC",
    marginHorizontal: 4,
  },
  actions: { gap: 10, marginTop: 4 },
  actionPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0A0A0A",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 76,
  },
  actionSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 76,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.08)",
    borderStyle: "dashed",
  },
  actionIconDark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconLight: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  actionCopy: { flex: 1, gap: 2 },
  actionTitleLight: { color: "#FFF", fontWeight: "800", fontSize: 15 },
  actionSubLight: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: "600" },
  actionTitleDark: { color: "#0A0A0A", fontWeight: "800", fontSize: 15 },
  actionSubDark: { color: "rgba(10,10,10,0.45)", fontSize: 12, fontWeight: "600" },
  recs: { marginTop: 18, gap: 12 },
  recsHead: { gap: 2 },
  recsTitle: { fontSize: 16, fontWeight: "800", color: "#0A0A0A" },
  recsHint: { fontSize: 12, color: "rgba(10,10,10,0.4)", fontWeight: "600" },
  recsRow: { gap: 12, paddingRight: 8 },
  recCard: {
    width: 132,
    backgroundColor: "#FFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
    paddingBottom: 10,
  },
  recImg: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: "#EEE",
  },
  recTitle: {
    marginTop: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: "800",
    color: "#0A0A0A",
  },
  recTag: {
    marginTop: 2,
    paddingHorizontal: 10,
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(10,10,10,0.4)",
  },
});
