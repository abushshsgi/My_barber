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
import { morfWordmark, morfWordmarkWhite } from "../../branding/morf-logo";
import {
  MorphSampleMarquee,
  type MorphSampleCard,
} from "../../components/morph/MorphSampleMarquee";
import { useAuth } from "../../auth/AuthContext";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";
import { morphFont } from "../../theme/morph-font";
import { presentMorphPaywall } from "../../lib/morph-return";
import { useMorphSession } from "../../lib/morph-session";
import { useMorphAppearance } from "../../lib/MorphAppearanceContext";
import { useShellNavigation } from "../../lib/shell-nav";
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
  const { colors: pal, theme } = useMorphAppearance();
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

  const { goMorph } = useShellNavigation();

  const openCareOrIngredient = useCallback(
    (kind: "care" | "ingredient") => {
      goMorph(navigation, kind === "care" ? "MorphCare" : "MorphIngredient", {
        screen: kind === "care" ? "CareHome" : "IngredientScan",
        params: { returnTo: "MorphTryOn" },
      });
    },
    [navigation, goMorph],
  );

  const openCareCatalog = useCallback(() => {
    goMorph(navigation, "MorphCare", {
      screen: "CareHome",
      params: { openSearch: true },
    });
  }, [navigation, goMorph]);

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
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8), backgroundColor: pal.bg }]}>
      <View pointerEvents="none" style={styles.glow} />

      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <Image
            source={theme === "dark" ? morfWordmarkWhite : morfWordmark}
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
        style={{ flex: 1 }}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.body,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Pressable
            style={[styles.cta, { backgroundColor: pal.fg }]}
            onPress={onNewTryOn}
          >
            <Text style={[styles.ctaText, { color: pal.bg }]}>Yangi try-on</Text>
            <View style={[styles.ctaArrow, { backgroundColor: pal.bg }]}>
              <Ionicons
                name="arrow-up"
                size={16}
                color={pal.fg}
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
              <View style={[styles.toolIcon, { backgroundColor: pal.iconTile, borderColor: pal.line }]}>
                <Ionicons name={tool.icon} size={20} color={pal.fg} />
              </View>
              <Text style={[styles.toolLabel, { color: pal.muted }]} numberOfLines={2}>
                {tool.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.careSheet, { backgroundColor: pal.card, borderColor: pal.line }]}>
          <View style={styles.careRow}>
            <Pressable
              style={[
                styles.careCard,
                { backgroundColor: pal.iconTile, borderColor: pal.fg },
                styles.careCardActive,
              ]}
              onPress={() => openCareOrIngredient("care")}
            >
              <View style={[styles.careIcon, { backgroundColor: pal.card }]}>
                <Ionicons name="water-outline" size={20} color={pal.fg} />
              </View>
              <Text style={[styles.careTitle, { color: pal.fg }]}>Parvarish</Text>
              <Text style={[styles.careSub, { color: pal.muted }]} numberOfLines={2}>
                Sochingiz uchun shaxsiy tavsiyalar
              </Text>
            </Pressable>

            <Pressable
              style={[styles.careCard, { backgroundColor: pal.iconTile, borderColor: pal.line }]}
              onPress={() => openCareOrIngredient("ingredient")}
            >
              <View style={[styles.careIcon, { backgroundColor: pal.card }]}>
                <Ionicons name="flask-outline" size={20} color={pal.fg} />
              </View>
              <Text style={[styles.careTitle, { color: pal.fg }]}>Tarkib</Text>
              <Text style={[styles.careSub, { color: pal.muted }]} numberOfLines={2}>
                Mahsulot tarkibini skan qiling
              </Text>
            </Pressable>
          </View>

          <View style={styles.careSearchRow}>
            <Pressable
              style={[styles.careSearchField, { backgroundColor: pal.iconTile, borderColor: pal.line }]}
              onPress={openCareCatalog}
            >
              <Ionicons name="search" size={16} color={pal.muted} />
              <Text style={[styles.careSearchPlaceholder, { color: pal.muted }]} numberOfLines={1}>
                Shampun, balsam, gigiyena…
              </Text>
            </Pressable>
            <Pressable
              style={[styles.careSearchBtn, { backgroundColor: pal.fg }]}
              onPress={openCareCatalog}
              accessibilityLabel="Qidiruv"
            >
              <Ionicons name="search" size={18} color={pal.bg} />
            </Pressable>
          </View>
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
  root: { flex: 1, backgroundColor: "#FAFAFA" },
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
    borderColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  limitLow: { backgroundColor: "#CA8A04" },
  limitText: { ...morphFont, fontSize: 10, fontWeight: "700", color: "#111111" },
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
    ...morphFont,
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#111111",
  },
  ctaArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FAFAFA",
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
    ...morphFont,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "500",
    color: "rgba(255,255,255,0.5)",
    lineHeight: 13,
  },
  section: { marginTop: 28 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    ...morphFont,
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
  sectionLink: {
    ...morphFont,
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.4)",
  },
  exploreLink: { flexDirection: "row", alignItems: "center", gap: 2 },
  careSheet: {
    marginTop: 20,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
  },
  careRow: {
    flexDirection: "row",
    gap: 10,
  },
  careCard: {
    flex: 1,
    minHeight: 120,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    justifyContent: "flex-end",
    gap: 4,
  },
  careCardActive: {
    borderWidth: 1.5,
  },
  careIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  careTitle: {
    ...morphFont,
    fontWeight: "700",
    fontSize: 13,
  },
  careSub: {
    ...morphFont,
    fontSize: 10,
    lineHeight: 13,
  },
  careSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  careSearchField: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  careSearchPlaceholder: {
    ...morphFont,
    flex: 1,
    fontSize: 12,
  },
  careSearchBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
