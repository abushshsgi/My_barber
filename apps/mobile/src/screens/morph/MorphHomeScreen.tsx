import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchMorphAiGenerations,
  type MorphAiGeneration,
} from "../../api/ai";
import { fetchHairstyles } from "../../api/hairstyles";
import {
  MorphSampleMarquee,
  type MorphSampleCard,
} from "../../components/morph/MorphSampleMarquee";
import { useAuth } from "../../auth/AuthContext";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";
import { pickSelfieFromCamera, pickSelfieFromGallery } from "../../lib/selfie";
import { useMorphSession } from "../../lib/morph-session";
import type { MorphStackParamList } from "../../navigation/MorphStack";
import { scaleFont } from "../../theme/layout";

type Props = NativeStackScreenProps<MorphStackParamList, "MorphHome">;

type ToolKey = "camera" | "gallery" | "studio";

const TOOLS: {
  key: ToolKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "camera", label: "Kameradan olish", icon: "camera-outline" },
  { key: "gallery", label: "Galereyadan tanlash", icon: "images-outline" },
  { key: "studio", label: "AI Studio", icon: "sparkles-outline" },
];

function prettyLookTitle(title: string) {
  const raw = title.trim();
  if (!raw) return "Try-on";
  if (!/[-_]/.test(raw) && !/^(men|women)\b/i.test(raw)) return raw;
  return raw
    .replace(/^(men|women)[-_]/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function MorphHomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const fs = (n: number) => scaleFont(n, width);
  const { isAuthenticated } = useAuth();
  const session = useMorphSession();
  const gate = useMorphLimitGate();
  const [busy, setBusy] = useState(false);
  const [samplesLoading, setSamplesLoading] = useState(true);
  const [samples, setSamples] = useState<MorphSampleCard[]>([]);
  const [generations, setGenerations] = useState<MorphAiGeneration[]>([]);

  const loadSamples = useCallback(async () => {
    setSamplesLoading(true);
    try {
      const rows = await fetchHairstyles("men");
      setSamples(
        rows.slice(0, 12).map((entry) => ({
          id: entry.id,
          title: entry.title_uz || entry.title,
          image: entry.image_url,
        })),
      );
    } catch {
      setSamples([]);
    } finally {
      setSamplesLoading(false);
    }
  }, []);

  const loadGenerations = useCallback(async () => {
    if (!isAuthenticated) {
      setGenerations([]);
      return;
    }
    try {
      const rows = await fetchMorphAiGenerations();
      setGenerations(rows);
    } catch {
      setGenerations([]);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadSamples();
  }, [loadSamples]);

  useEffect(() => {
    void loadGenerations();
    const unsub = navigation.addListener("focus", () => {
      void loadGenerations();
    });
    return unsub;
  }, [loadGenerations, navigation]);

  const rowA = useMemo(
    () => samples.filter((_, i) => i % 2 === 0),
    [samples],
  );
  const rowB = useMemo(
    () => samples.filter((_, i) => i % 2 === 1),
    [samples],
  );

  const myLooks = useMemo(() => {
    const seen = new Set<string>();
    const out: { id: string; title: string; image: string; styleId: string }[] =
      [];
    for (const g of generations) {
      const image = g.after_url || g.before_url;
      if (!image) continue;
      const fingerprint = `${g.style_id}::${image.slice(0, 96)}`;
      if (seen.has(fingerprint) || seen.has(String(g.id))) continue;
      seen.add(fingerprint);
      seen.add(String(g.id));
      out.push({
        id: String(g.id),
        title: prettyLookTitle(g.title),
        image,
        styleId: g.style_id,
      });
      if (out.length >= 8) break;
    }
    return out;
  }, [generations]);

  const startWithImage = useCallback(
    async (
      source: "camera" | "gallery",
      preferred?: { styleId: string; title?: string },
    ) => {
      if (!isAuthenticated) {
        navigation.getParent()?.navigate("Profile" as never);
        return;
      }
      const ok = await gate.ensureAccess();
      if (!ok) {
        navigation.navigate("MorphPaywall");
        return;
      }
      setBusy(true);
      try {
        const dataUrl =
          source === "camera"
            ? await pickSelfieFromCamera()
            : await pickSelfieFromGallery();
        if (!dataUrl) return;
        session.clear();
        session.setSelfie(dataUrl);
        if (preferred?.styleId) {
          session.setPreferredStyle(preferred.styleId, preferred.title ?? null);
        }
        navigation.navigate("MorphResults");
      } finally {
        setBusy(false);
      }
    },
    [gate, isAuthenticated, navigation, session],
  );

  const onNewTryOn = useCallback(() => {
    Alert.alert("Yangi try-on", "Selfie qayerdan olamiz?", [
      {
        text: "Kamera",
        onPress: () => void startWithImage("camera"),
      },
      {
        text: "Galereya",
        onPress: () => void startWithImage("gallery"),
      },
      { text: "Bekor", style: "cancel" },
    ]);
  }, [startWithImage]);

  const openCareOrIngredient = useCallback(
    async (kind: "care" | "ingredient") => {
      if (!isAuthenticated) {
        navigation.getParent()?.navigate("Profile" as never);
        return;
      }
      const ok = await gate.ensureAccess();
      if (!ok) {
        navigation.navigate("MorphPaywall");
        return;
      }
      Alert.alert(
        kind === "care" ? "Parvarish" : "Tarkib",
        "Bu bo'lim tez orada mobil ilovada ochiladi. Hozir web versiyadan foydalanishingiz mumkin.",
      );
    },
    [gate, isAuthenticated, navigation],
  );

  const onTool = useCallback(
    async (key: ToolKey) => {
      if (key === "camera") {
        void startWithImage("camera");
        return;
      }
      if (key === "gallery") {
        void startWithImage("gallery");
        return;
      }
      if (!isAuthenticated) {
        navigation.getParent()?.navigate("Profile" as never);
        return;
      }
      const ok = await gate.ensureStudio();
      if (!ok) {
        navigation.navigate("MorphPaywall");
        return;
      }
      navigation.navigate("MorphStudio");
    },
    [gate, isAuthenticated, navigation, startWithImage],
  );

  const onSamplePress = useCallback(
    (item: MorphSampleCard) => {
      Alert.alert(item.title, "Bu uslubni o'zingizda sinab ko'rasizmi?", [
        {
          text: "Kamera",
          onPress: () =>
            void startWithImage("camera", {
              styleId: item.id,
              title: item.title,
            }),
        },
        {
          text: "Galereya",
          onPress: () =>
            void startWithImage("gallery", {
              styleId: item.id,
              title: item.title,
            }),
        },
        { text: "Bekor", style: "cancel" },
      ]);
    },
    [startWithImage],
  );

  const onLookPress = useCallback(
    (look: { styleId: string; title: string; image: string }) => {
      if (look.styleId) {
        Alert.alert(look.title, "Yana sinab ko'rasizmi?", [
          {
            text: "Kamera",
            onPress: () =>
              void startWithImage("camera", {
                styleId: look.styleId,
                title: look.title,
              }),
          },
          {
            text: "Galereya",
            onPress: () =>
              void startWithImage("gallery", {
                styleId: look.styleId,
                title: look.title,
              }),
          },
          {
            text: "Studio",
            onPress: () => {
              session.setTryOn(look.image, look.styleId, look.title);
              void (async () => {
                const ok = await gate.ensureStudio();
                if (!ok) {
                  navigation.navigate("MorphPaywall");
                  return;
                }
                navigation.navigate("MorphStudio");
              })();
            },
          },
          { text: "Bekor", style: "cancel" },
        ]);
      }
    },
    [gate, navigation, session, startWithImage],
  );

  const showLimit =
    gate.allowed && gate.limit > 0 ? gate.remaining : null;

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 10) }]}>
      <View pointerEvents="none" style={styles.glow} />

      <View style={styles.header}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.getParent()?.navigate("Home" as never)}
          accessibilityLabel="Orqaga"
        >
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </Pressable>
        <View style={{ flex: 1 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.sparkWrap}>
            <View style={styles.sparkIcon}>
              <Ionicons name="sparkles" size={26} color="#050505" />
            </View>
            {showLimit != null ? (
              <Pressable
                style={[
                  styles.limitBadge,
                  gate.remaining <= Math.max(1, Math.floor(gate.limit * 0.2)) &&
                    styles.limitLow,
                ]}
                onPress={() => navigation.navigate("MorphPaywall")}
              >
                <Text style={styles.limitText}>{showLimit}</Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={[styles.subtitle, { fontSize: fs(15) }]}>
            Selfie yuklang — yuzingizga mos uslubni bir zumda ko'ring, saqlang va
            bron qiling.
          </Text>

          <Pressable
            style={styles.cta}
            disabled={busy}
            onPress={onNewTryOn}
          >
            {busy ? (
              <ActivityIndicator color="#050505" />
            ) : (
              <>
                <Text style={styles.ctaText}>Yangi try-on</Text>
                <View style={styles.ctaArrow}>
                  <Ionicons
                    name="arrow-up"
                    size={16}
                    color="#FFF"
                    style={styles.arrowRot}
                  />
                </View>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.tools}>
          {TOOLS.map((tool) => (
            <Pressable
              key={tool.key}
              style={styles.tool}
              onPress={() => void onTool(tool.key)}
            >
              <View style={styles.toolIcon}>
                <Ionicons name={tool.icon} size={20} color="#FFF" />
              </View>
              <Text style={styles.toolLabel} numberOfLines={2}>
                {tool.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Saqlangan va yaratilgan</Text>
            {myLooks.length > 0 ? (
              <Pressable onPress={() => navigation.navigate("MorphHistory")}>
                <Text style={styles.sectionLink}>Hammasi</Text>
              </Pressable>
            ) : null}
          </View>

          {myLooks.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.looksRow}
            >
              {myLooks.map((look) => (
                <Pressable
                  key={look.id}
                  style={styles.look}
                  onPress={() => onLookPress(look)}
                >
                  <Image source={{ uri: look.image }} style={styles.lookImg} />
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyHistory}>
              <View style={styles.emptyIcon}>
                <Ionicons name="time-outline" size={22} color="rgba(255,255,255,0.55)" />
              </View>
              <Text style={styles.emptyTitle}>Hali saqlangan look yo'q</Text>
              <Text style={styles.emptySub}>
                Birinchi try-on qiling — natijalar shu yerda paydo bo'ladi.
              </Text>
              <Pressable style={styles.emptyCta} onPress={onNewTryOn} disabled={busy}>
                <Text style={styles.emptyCtaText}>Yangi try-on</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.careRow}>
          <Pressable
            style={styles.careCard}
            onPress={() => void openCareOrIngredient("care")}
          >
            <View style={styles.careIcon}>
              <Ionicons name="water-outline" size={18} color="#FFF" />
            </View>
            <View style={styles.careCopy}>
              <Text style={styles.careTitle}>Parvarish</Text>
              <Text style={styles.careSub} numberOfLines={2}>
                Sochingiz uchun shaxsiy tavsiyalar
              </Text>
            </View>
            <Ionicons
              name="arrow-up"
              size={14}
              color="rgba(255,255,255,0.35)"
              style={styles.arrowRot}
            />
          </Pressable>

          <Pressable
            style={styles.careCard}
            onPress={() => void openCareOrIngredient("ingredient")}
          >
            <View style={styles.careIcon}>
              <Ionicons name="flask-outline" size={18} color="#FFF" />
            </View>
            <View style={styles.careCopy}>
              <Text style={styles.careTitle}>Tarkib</Text>
              <Text style={styles.careSub} numberOfLines={2}>
                Mahsulot tarkibini skan qiling
              </Text>
            </View>
            <Ionicons
              name="arrow-up"
              size={14}
              color="rgba(255,255,255,0.35)"
              style={styles.arrowRot}
            />
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Namuna uslublar</Text>
            <Pressable
              style={styles.exploreLink}
              onPress={() => navigation.getParent()?.navigate("Explore" as never)}
            >
              <Text style={styles.sectionLink}>Explore</Text>
              <Ionicons
                name="arrow-up"
                size={12}
                color="rgba(255,255,255,0.4)"
                style={styles.arrowRot}
              />
            </Pressable>
          </View>
          <MorphSampleMarquee
            rowA={rowA}
            rowB={rowB}
            loading={samplesLoading}
            onPressStyle={onSamplePress}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050505" },
  glow: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingHorizontal: 20, gap: 8 },
  hero: { alignItems: "center", paddingTop: 18, gap: 16 },
  sparkWrap: { position: "relative", marginBottom: 4 },
  sparkIcon: {
    width: 56,
    height: 56,
    borderRadius: 22,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  limitBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 28,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
  },
  limitLow: { backgroundColor: "#CA8A04" },
  limitText: { fontSize: 10, fontWeight: "800", color: "#050505" },
  subtitle: {
    maxWidth: 288,
    textAlign: "center",
    color: "rgba(255,255,255,0.55)",
    lineHeight: 22,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: "#FFF",
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 8,
    gap: 12,
  },
  ctaText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#050505",
  },
  ctaArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowRot: { transform: [{ rotate: "45deg" }] },
  tools: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  tool: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  toolIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  toolLabel: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
    lineHeight: 14,
  },
  section: { marginTop: 28 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.4)",
  },
  exploreLink: { flexDirection: "row", alignItems: "center", gap: 2 },
  looksRow: { gap: 10, paddingRight: 8 },
  look: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
  },
  lookImg: { width: "100%", height: "100%" },
  emptyHistory: {
    alignItems: "center",
    paddingVertical: 22,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 8,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },
  emptySub: {
    textAlign: "center",
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    lineHeight: 17,
    maxWidth: 260,
  },
  emptyCta: {
    marginTop: 8,
    backgroundColor: "#FFF",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyCtaText: {
    color: "#050505",
    fontWeight: "800",
    fontSize: 12,
  },
  careRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
  },
  careCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
  },
  careIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  careCopy: { flex: 1, gap: 2 },
  careTitle: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 13,
  },
  careSub: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    lineHeight: 13,
  },
});
