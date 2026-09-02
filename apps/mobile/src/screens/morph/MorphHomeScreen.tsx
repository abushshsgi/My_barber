import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { fetchHairstyles } from "../../api/hairstyles";
import { genderToAudience, getAppGender } from "../../lib/guest";
import { ScreenWrapper } from "../../components/layout/ScreenWrapper";
import {
  IS_SMALL_DEVICE,
  clamp,
  fontSize,
  moderateScale,
  radius,
  scale,
  spacing,
  useResponsive,
  verticalScale,
} from "../../utils/responsive";
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

/** Marquee ikki qatordan iborat — qolgan joy shu nisbatda bo'linadi. */
const MARQUEE_ROWS = 2;

export function MorphHomeScreen({ navigation }: Props) {
  const { isSmall } = useResponsive();
  const { isAuthenticated } = useAuth();
  const session = useMorphSession();
  const gate = useMorphLimitGate();
  const { colors: pal, theme } = useMorphAppearance();
  const [samplesLoading, setSamplesLoading] = useState(true);
  const [samples, setSamples] = useState<MorphSampleCard[]>([]);
  const [marqueeHeight, setMarqueeHeight] = useState(0);

  const loadSamples = useCallback(async () => {
    setSamplesLoading(true);
    try {
      const gender = await getAppGender();
      const rows = await fetchHairstyles(genderToAudience(gender));
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

  /** Marquee kartochkalari qolgan bo'sh joyga qarab o'lchanadi — scroll kerak emas. */
  const sampleCardHeight = useMemo(() => {
    if (marqueeHeight <= 0) return undefined;
    const rowGap = moderateScale(10);
    const perRow = (marqueeHeight - rowGap * (MARQUEE_ROWS - 1)) / MARQUEE_ROWS;
    return clamp(Math.floor(perRow), 72, verticalScale(150));
  }, [marqueeHeight]);

  return (
    <ScreenWrapper
      withTabDock
      padded={false}
      backgroundColor={pal.bg}
      statusBarStyle={theme === "dark" ? "light" : "dark"}
      contentStyle={styles.body}
    >
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

      <View style={styles.hero}>
        <Pressable
          style={[styles.cta, { backgroundColor: pal.fg }]}
          onPress={onNewTryOn}
        >
          <Text style={[styles.ctaText, { color: pal.bg }]}>Yangi try-on</Text>
          <View style={[styles.ctaArrow, { backgroundColor: pal.bg }]}>
            <Ionicons
              name="arrow-up"
              size={ICON.sm}
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
              <Ionicons name={tool.icon} size={ICON.md} color={pal.fg} />
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
              <Ionicons name="water-outline" size={ICON.md} color={pal.fg} />
            </View>
            <Text style={[styles.careTitle, { color: pal.fg }]}>Parvarish</Text>
            <Text
              style={[styles.careSub, { color: pal.muted }]}
              numberOfLines={isSmall ? 1 : 2}
            >
              Sochingiz uchun shaxsiy tavsiyalar
            </Text>
          </Pressable>

          <Pressable
            style={[styles.careCard, { backgroundColor: pal.iconTile, borderColor: pal.line }]}
            onPress={() => openCareOrIngredient("ingredient")}
          >
            <View style={[styles.careIcon, { backgroundColor: pal.card }]}>
              <Ionicons name="flask-outline" size={ICON.md} color={pal.fg} />
            </View>
            <Text style={[styles.careTitle, { color: pal.fg }]}>Tarkib</Text>
            <Text
              style={[styles.careSub, { color: pal.muted }]}
              numberOfLines={isSmall ? 1 : 2}
            >
              Mahsulot tarkibini skan qiling
            </Text>
          </Pressable>
        </View>

        <View style={styles.careSearchRow}>
          <Pressable
            style={[styles.careSearchField, { backgroundColor: pal.iconTile, borderColor: pal.line }]}
            onPress={openCareCatalog}
          >
            <Ionicons name="search" size={ICON.sm} color={pal.muted} />
            <Text style={[styles.careSearchPlaceholder, { color: pal.muted }]} numberOfLines={1}>
              Shampun, balsam, gigiyena…
            </Text>
          </Pressable>
          <Pressable
            style={[styles.careSearchBtn, { backgroundColor: pal.fg }]}
            onPress={openCareCatalog}
            accessibilityLabel="Qidiruv"
          >
            <Ionicons name="search" size={ICON.md} color={pal.bg} />
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
              size={ICON.xs}
              color="rgba(255,255,255,0.4)"
              style={styles.arrowRot}
            />
          </Pressable>
        </View>
        <View
          style={styles.marqueeSlot}
          onLayout={(e) => setMarqueeHeight(e.nativeEvent.layout.height)}
        >
          <MorphSampleMarquee
            rowA={rowA}
            rowB={rowB}
            loading={samplesLoading}
            cardHeight={sampleCardHeight}
            onPressStyle={onSamplePress}
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}

/** Ionicons o'lchamlari — ekran kengligiga moslashadi. */
const ICON = {
  xs: scale(12),
  sm: scale(16),
  md: scale(20),
} as const;

const CTA_HEIGHT = verticalScale(IS_SMALL_DEVICE ? 44 : 48);
const TOOL_TILE = scale(IS_SMALL_DEVICE ? 46 : 56);
const CARE_ICON = scale(IS_SMALL_DEVICE ? 30 : 36);
const FIELD_HEIGHT = verticalScale(IS_SMALL_DEVICE ? 40 : 44);

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: scale(20),
    justifyContent: "flex-start",
    gap: spacing.xs,
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(16),
    paddingBottom: spacing.xxs,
    minHeight: verticalScale(IS_SMALL_DEVICE ? 36 : 44),
  },
  headerBrand: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  wordmarkLogo: {
    width: scale(IS_SMALL_DEVICE ? 140 : 168),
    height: verticalScale(IS_SMALL_DEVICE ? 28 : 34),
  },
  limitBadge: {
    position: "absolute",
    top: -verticalScale(2),
    right: -scale(8),
    minWidth: scale(28),
    height: scale(22),
    paddingHorizontal: scale(6),
    borderRadius: radius.pill,
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  limitLow: { backgroundColor: "#CA8A04" },
  limitText: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "700",
    color: "#111111",
  },
  hero: {
    alignItems: "center",
    paddingTop: spacing.md,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    maxWidth: scale(360),
    minHeight: CTA_HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: "#FFF",
    paddingLeft: scale(20),
    paddingRight: scale(8),
    paddingVertical: moderateScale(8),
    gap: moderateScale(12),
  },
  ctaText: {
    ...morphFont,
    flex: 1,
    fontSize: fontSize(13),
    fontWeight: "600",
    color: "#111111",
  },
  ctaArrow: {
    width: CTA_HEIGHT - moderateScale(12),
    height: CTA_HEIGHT - moderateScale(12),
    borderRadius: (CTA_HEIGHT - moderateScale(12)) / 2,
    backgroundColor: "#FAFAFA",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowRot: { transform: [{ rotate: "45deg" }] },
  tools: {
    marginTop: spacing.md,
    flexDirection: "row",
    justifyContent: "center",
    gap: moderateScale(8),
  },
  tool: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: scale(16),
    minWidth: scale(96),
  },
  toolIcon: {
    width: TOOL_TILE,
    height: TOOL_TILE,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  toolLabel: {
    ...morphFont,
    textAlign: "center",
    fontSize: fontSize(10),
    fontWeight: "500",
    color: "rgba(255,255,255,0.5)",
    lineHeight: fontSize(13),
  },
  section: {
    flex: 1,
    minHeight: 0,
    marginTop: spacing.lg,
  },
  marqueeSlot: {
    flex: 1,
    minHeight: 0,
    justifyContent: "center",
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
  sectionLink: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "500",
    color: "rgba(255,255,255,0.4)",
  },
  exploreLink: { flexDirection: "row", alignItems: "center", gap: moderateScale(2) },
  careSheet: {
    marginTop: spacing.md,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: moderateScale(14),
    gap: spacing.sm,
  },
  careRow: {
    flexDirection: "row",
    gap: moderateScale(10),
  },
  careCard: {
    flex: 1,
    minHeight: verticalScale(IS_SMALL_DEVICE ? 92 : 120),
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: moderateScale(IS_SMALL_DEVICE ? 10 : 14),
    justifyContent: "flex-end",
    gap: moderateScale(4),
  },
  careCardActive: {
    borderWidth: 1.5,
  },
  careIcon: {
    width: CARE_ICON,
    height: CARE_ICON,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  careTitle: {
    ...morphFont,
    fontWeight: "700",
    fontSize: fontSize(13),
  },
  careSub: {
    ...morphFont,
    fontSize: fontSize(10),
    lineHeight: fontSize(13),
  },
  careSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
  },
  careSearchField: {
    flex: 1,
    height: FIELD_HEIGHT,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(12),
    gap: moderateScale(8),
  },
  careSearchPlaceholder: {
    ...morphFont,
    flex: 1,
    fontSize: fontSize(12),
  },
  careSearchBtn: {
    width: FIELD_HEIGHT,
    height: FIELD_HEIGHT,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
