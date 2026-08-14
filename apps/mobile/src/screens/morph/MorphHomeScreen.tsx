import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchHairstyles } from "../../api/hairstyles";
import { morfWordmarkWhite } from "../../branding/morf-logo";
import {
  MorphSampleMarquee,
  type MorphSampleCard,
} from "../../components/morph/MorphSampleMarquee";
import { useAuth } from "../../auth/AuthContext";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";
import { presentMorphPaywall } from "../../lib/morph-return";
import { useMorphSession } from "../../lib/morph-session";
import type { MorphStackParamList } from "../../navigation/MorphStack";

type Props = NativeStackScreenProps<MorphStackParamList, "MorphHome">;

type ToolKey = "studio";

const TOOLS: {
  key: ToolKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "studio", label: "AI Studio", icon: "sparkles-outline" },
];

export function MorphHomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const session = useMorphSession();
  const gate = useMorphLimitGate();
  const [samplesLoading, setSamplesLoading] = useState(true);
  const [samples, setSamples] = useState<MorphSampleCard[]>([]);

  const loadSamples = useCallback(async () => {
    setSamplesLoading(true);
    try {
      const rows = await fetchHairstyles("men");
      setSamples(
        rows.map((entry) => ({
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

  useEffect(() => {
    void loadSamples();
  }, [loadSamples]);

  const rowA = useMemo(
    () => samples.filter((_, i) => i % 2 === 0),
    [samples],
  );
  const rowB = useMemo(
    () => samples.filter((_, i) => i % 2 === 1),
    [samples],
  );

  /** Try-on sahifasiga kirish — obuna gate yo‘q (limit kamera/generatsiyada). */
  const onNewTryOn = useCallback(() => {
    if (!isAuthenticated) {
      navigation.getParent()?.navigate("Profile" as never);
      return;
    }
    navigation.navigate("MorphCapture");
  }, [isAuthenticated, navigation]);

  const onTool = useCallback(async () => {
    if (!isAuthenticated) {
      navigation.getParent()?.navigate("Profile" as never);
      return;
    }
    const result = await gate.ensureStudioDetailed();
    if (!result.ok) {
      presentMorphPaywall(
        navigation,
        result.reason === "limit" ? "limit" : "studio",
        "MorphHome",
      );
      return;
    }
    navigation.navigate("MorphStudio");
  }, [gate, isAuthenticated, navigation]);

  const openCareOrIngredient = useCallback(
    (kind: "care" | "ingredient") => {
      navigation.getParent()?.navigate(
        (kind === "care" ? "MorphCare" : "MorphIngredient") as never,
      );
    },
    [navigation],
  );

  const onSamplePress = useCallback(
    (item: MorphSampleCard) => {
      if (!isAuthenticated) {
        navigation.getParent()?.navigate("Profile" as never);
        return;
      }
      session.setPreferredStyle(item.id, item.title);
      navigation.navigate("MorphCapture");
    },
    [isAuthenticated, navigation, session],
  );

  const showLimit =
    gate.allowed && gate.limit > 0 ? gate.remaining : null;

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) }]}>
      <View pointerEvents="none" style={styles.glow} />

      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <Image
            source={morfWordmarkWhite}
            style={styles.wordmarkLogo}
            resizeMode="contain"
          />
          {showLimit != null ? (
            <Pressable
              style={[
                styles.limitBadge,
                gate.remaining <= Math.max(1, Math.floor(gate.limit * 0.2)) &&
                  styles.limitLow,
              ]}
              onPress={() => presentMorphPaywall(navigation, "subscription", "MorphHome")}
            >
              <Text style={styles.limitText}>{showLimit}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Pressable style={styles.cta} onPress={onNewTryOn}>
            <Text style={styles.ctaText}>Yangi try-on</Text>
            <View style={styles.ctaArrow}>
              <Ionicons
                name="arrow-up"
                size={16}
                color="#FFF"
                style={styles.arrowRot}
              />
            </View>
          </Pressable>
        </View>

        <View style={styles.tools}>
          {TOOLS.map((tool) => (
            <Pressable
              key={tool.key}
              style={styles.tool}
              onPress={() => void onTool()}
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

        <View style={styles.careRow}>
          <Pressable
            style={styles.careCard}
            onPress={() => openCareOrIngredient("care")}
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
            onPress={() => openCareOrIngredient("ingredient")}
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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingBottom: 4,
    minHeight: 44,
  },
  headerBrand: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  wordmarkLogo: {
    width: 168,
    height: 34,
  },
  limitBadge: {
    position: "absolute",
    top: -2,
    right: -8,
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
  body: { paddingHorizontal: 20, gap: 8 },
  hero: {
    alignItems: "center",
    paddingTop: 18,
  },
  cta: {
    marginTop: 0,
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
    justifyContent: "center",
    gap: 8,
  },
  tool: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 96,
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
  careRow: {
    marginTop: 20,
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
