import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { resolveMediaUrl } from "../../../api/media";
import type { CareProduct } from "../../../api/care";
import {
  estimateProductFit,
  type CareQuizAnswers,
} from "../../../lib/morph-ai-care";
import { morphFont } from "../../../theme/morph-font";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  product: CareProduct;
  quiz: CareQuizAnswers;
  added: boolean;
  bottomInset?: number;
  mode?: "sheet" | "page";
  onClose: () => void;
  onAdd: () => void;
  onUseInCare?: () => void;
};

function fitTone(score: number): {
  color: string;
  bg: string;
  labelKey: "excellent" | "good" | "ok" | "poor";
} {
  if (score >= 85) return { color: "#34D399", bg: "rgba(52,211,153,0.12)", labelKey: "excellent" };
  if (score >= 72) return { color: "#A78BFA", bg: "rgba(167,139,250,0.14)", labelKey: "good" };
  if (score >= 58) return { color: "#FBBF24", bg: "rgba(251,191,36,0.12)", labelKey: "ok" };
  return { color: "#FB7185", bg: "rgba(251,113,133,0.14)", labelKey: "poor" };
}

const FIT_FALLBACK = {
  uz: {
    fitTitle: "Sochingizga mosligi",
    yourHair: "Sizning sochingiz",
    excellent: "Juda mos",
    good: "Yaxshi mos",
    ok: "O‘rtacha mos",
    poor: "Kam mos",
    tarkibTap: "Tarkibni ko‘rish",
    ingredientsCount: "{{count}} ta ingredient",
  },
  ru: {
    fitTitle: "Подходит вашим волосам",
    yourHair: "Ваши волосы",
    excellent: "Отлично подходит",
    good: "Хорошо подходит",
    ok: "Средне подходит",
    poor: "Слабо подходит",
    tarkibTap: "Смотреть состав",
    ingredientsCount: "{{count}} ингредиентов",
  },
} as const;

function InfoTile({
  icon,
  iconColor,
  iconBg,
  title,
  children,
  warn,
  half,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  children: string;
  warn?: boolean;
  half?: boolean;
}) {
  if (!children?.trim()) return null;
  return (
    <View style={[styles.tile, half && styles.tileHalf, warn && styles.tileWarn]}>
      <View style={styles.tileHead}>
        <View style={[styles.tileIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={13} color={iconColor} />
        </View>
        <Text style={[styles.tileTitle, warn && styles.tileTitleWarn]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <Text style={[styles.tileBody, warn && styles.tileBodyWarn]} numberOfLines={half ? 5 : 8}>
        {children}
      </Text>
    </View>
  );
}

function parseIngredients(product: CareProduct): string[] {
  if (product.ingredients?.length) {
    return product.ingredients.map((s) => s.trim()).filter(Boolean);
  }
  const raw = product.ingredients_text?.trim() || "";
  if (!raw) return [];
  return raw
    .split(/[,;·•\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

export function CareProductPreviewSheet({
  product,
  quiz,
  added,
  bottomInset = 16,
  mode = "sheet",
  onClose,
  onAdd,
  onUseInCare,
}: Props) {
  const { t, i18n } = useTranslation();
  const fit = useMemo(() => estimateProductFit(product, quiz), [product, quiz]);
  const tone = fitTone(fit);
  const isPage = mode === "page";
  const lang = (i18n.language || "uz").startsWith("ru") ? "ru" : "uz";
  const fb = FIT_FALLBACK[lang];
  const [panel, setPanel] = useState<"info" | "tarkib">("info");

  const imageUri = useMemo(
    () => resolveMediaUrl(product.image_url, { width: 800 }) || product.image_url,
    [product.image_url],
  );

  const ingredients = useMemo(() => parseIngredients(product), [product]);

  const tagLabel = (tag: string) => t(`care.catalog.tags.${tag}`, { defaultValue: tag });

  const userTags = useMemo(
    () =>
      [
        quiz.condition,
        quiz.texture,
        quiz.colorStatus === "natural" ? "natural" : quiz.colorStatus,
      ].filter(Boolean) as string[],
    [quiz],
  );

  const suitable = product.suitable_for || [];
  const notSuitable = product.not_suitable_for || [];

  const fitTitle = t("care.preview.fitTitle", { defaultValue: fb.fitTitle });
  const fitVerdict = t(`care.preview.fit.${tone.labelKey}`, {
    defaultValue: fb[tone.labelKey],
  });

  const openTarkib = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPanel("tarkib");
  };

  const backToInfo = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPanel("info");
  };

  const tarkibPanel = (
    <View style={styles.tarkibFull}>
      <LinearGradient
        colors={["#16161A", "#0A0A0C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.tarkibNav}>
        <Pressable style={styles.tarkibBack} onPress={backToInfo} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </Pressable>
        <View style={styles.tarkibBadge}>
          <Ionicons name="flask" size={12} color="#C4B5FD" />
          <Text style={styles.tarkibBadgeText}>
            {t("care.catalog.ingredients", { defaultValue: "Tarkib" })}
          </Text>
        </View>
        <Pressable style={styles.tarkibBack} onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={18} color="#fff" />
        </Pressable>
      </View>

      <Text style={styles.tarkibProduct} numberOfLines={2}>
        {product.name}
      </Text>
      {product.brand ? <Text style={styles.tarkibBrand}>{product.brand}</Text> : null}

      <View style={styles.tarkibScoreRow}>
        <Text style={[styles.tarkibScore, { color: tone.color }]}>{fit}</Text>
        <Text style={styles.tarkibScoreDenom}>/ 100</Text>
      </View>
      <Text style={[styles.tarkibVerdict, { color: tone.color }]}>{fitVerdict}</Text>
      <Text style={styles.tarkibHint}>
        {t("care.routine.fitYou", { pct: fit, defaultValue: `${fit}% mos` })} ·{" "}
        {t("ingredient.ingredientsCount", {
          count: ingredients.length || 0,
          defaultValue: fb.ingredientsCount.replace("{{count}}", String(ingredients.length)),
        })}
      </Text>

      {product.warnings_uz?.trim() ? (
        <View style={styles.tarkibWarn}>
          <Ionicons name="warning-outline" size={14} color="#FDA4AF" />
          <Text style={styles.tarkibWarnText}>{product.warnings_uz}</Text>
        </View>
      ) : null}

      {product.pros_uz?.trim() ? (
        <View style={styles.tarkibGood}>
          <Ionicons name="checkmark-circle-outline" size={14} color="#6EE7B7" />
          <Text style={styles.tarkibGoodText}>{product.pros_uz}</Text>
        </View>
      ) : null}

      <Text style={styles.tarkibListTitle}>
        {t("ingredient.listTitle", { defaultValue: "Ingredientlar" })}
      </Text>
      {ingredients.length > 0 ? (
        <View style={styles.ingGrid}>
          {ingredients.map((ing, i) => (
            <View key={`${ing}-${i}`} style={styles.ingChip}>
              <Text style={styles.ingChipText}>{ing}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.tarkibEmpty}>
          {t("care.catalog.empty", { defaultValue: "Tarkib ma’lumoti yo‘q" })}
        </Text>
      )}
    </View>
  );

  const infoBody = (
    <>
      <View style={[styles.hero, isPage && styles.heroPage]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.heroImg} contentFit="cover" />
        ) : (
          <LinearGradient colors={["#EEF2FF", "#E0E7FF"]} style={[styles.heroImg, styles.heroPh]}>
            <Ionicons name="flask-outline" size={40} color="#6366F1" />
          </LinearGradient>
        )}
        <LinearGradient
          colors={["rgba(0,0,0,0.35)", "transparent", "rgba(0,0,0,0.25)"]}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Pressable
          style={styles.heroClose}
          onPress={onClose}
          hitSlop={10}
          accessibilityLabel={t("common.back")}
        >
          <Ionicons name="close" size={20} color="#0F172A" />
        </Pressable>
        <View style={styles.heroCat}>
          <Ionicons name="pricetag-outline" size={11} color="#4F46E5" />
          <Text style={styles.heroCatText}>
            {t(`care.catalog.categories.${product.category}`, {
              defaultValue: product.category,
            })}
          </Text>
        </View>
      </View>

      <Text style={styles.title}>{product.name}</Text>
      {product.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}

      <View style={styles.fitLite}>
        <View
          style={[
            styles.fitRingLite,
            { borderColor: tone.color === "#A78BFA" ? "#4F46E5" : tone.color },
          ]}
        >
          <Text
            style={[
              styles.fitPctLite,
              { color: tone.color === "#A78BFA" ? "#4F46E5" : tone.color },
            ]}
          >
            {fit}%
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fitLabelLite}>{fitTitle}</Text>
          <Text style={styles.fitVerdictLite}>{fitVerdict}</Text>
        </View>
      </View>

      {userTags.length > 0 ? (
        <View style={styles.chipRow}>
          {userTags.map((tag) => {
            const ok = suitable.includes(tag);
            const bad = notSuitable.includes(tag);
            return (
              <View
                key={tag}
                style={[
                  styles.chip,
                  ok && styles.chipOk,
                  bad && styles.chipBad,
                  !ok && !bad && styles.chipNeutral,
                ]}
              >
                <Ionicons
                  name={ok ? "checkmark-circle" : bad ? "close-circle" : "ellipse-outline"}
                  size={12}
                  color={ok ? "#059669" : bad ? "#DC2626" : "#64748B"}
                />
                <Text
                  style={[
                    styles.chipText,
                    ok && styles.chipTextOk,
                    bad && styles.chipTextBad,
                  ]}
                >
                  {tagLabel(tag)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Tarkib CTA — bosilganda alohida panel */}
      <Pressable style={styles.tarkibCta} onPress={openTarkib}>
        <LinearGradient
          colors={["#1F1F24", "#121216"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.tarkibCtaIcon}>
          <Ionicons name="flask" size={18} color="#C4B5FD" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tarkibCtaTitle}>
            {t("care.catalog.ingredients", { defaultValue: "Tarkib" })}
          </Text>
          <Text style={styles.tarkibCtaSub}>
            {t("care.preview.tarkibTap", { defaultValue: fb.tarkibTap })}
            {ingredients.length > 0
              ? ` · ${ingredients.length} ${lang === "ru" ? "ингр." : "ta"}`
              : ""}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.45)" />
      </Pressable>

      {(suitable.length > 0 || notSuitable.length > 0) ? (
        <View style={styles.grid}>
          {suitable.length > 0 ? (
            <View style={[styles.whoCard, styles.whoOk, styles.gridItem]}>
              <View style={styles.tileHead}>
                <Ionicons name="thumbs-up-outline" size={13} color="#059669" />
                <Text style={[styles.whoTitle, { color: "#059669" }]}>
                  {t("care.catalog.who")}
                </Text>
              </View>
              <Text style={styles.whoBody} numberOfLines={4}>
                {suitable.map(tagLabel).join(" · ")}
              </Text>
            </View>
          ) : null}
          {notSuitable.length > 0 ? (
            <View style={[styles.whoCard, styles.whoBad, styles.gridItem]}>
              <View style={styles.tileHead}>
                <Ionicons name="thumbs-down-outline" size={13} color="#DC2626" />
                <Text style={[styles.whoTitle, { color: "#DC2626" }]}>
                  {t("care.catalog.whoNot")}
                </Text>
              </View>
              <Text style={styles.whoBody} numberOfLines={4}>
                {notSuitable.map(tagLabel).join(" · ")}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.grid}>
        <InfoTile
          half
          icon="bulb-outline"
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
          title={t("care.catalog.purpose")}
        >
          {product.purpose_uz}
        </InfoTile>
        <InfoTile
          half
          icon="hand-left-outline"
          iconColor="#0284C7"
          iconBg="#E0F2FE"
          title={t("care.catalog.usage")}
        >
          {product.usage_uz}
        </InfoTile>
        <InfoTile
          half
          icon="sparkles-outline"
          iconColor="#059669"
          iconBg="#ECFDF5"
          title={t("care.catalog.pros")}
        >
          {product.pros_uz}
        </InfoTile>
        <InfoTile
          half
          icon="remove-circle-outline"
          iconColor="#64748B"
          iconBg="#F1F5F9"
          title={t("care.catalog.cons")}
        >
          {product.cons_uz}
        </InfoTile>
      </View>
    </>
  );

  const actions = (
    <View style={[styles.actions, { paddingBottom: Math.max(bottomInset, 10) }]}>
      <Pressable
        style={[styles.addBtn, added && styles.addBtnAdded, styles.addBtnFlex]}
        onPress={onAdd}
        disabled={added}
      >
        <Ionicons
          name={added ? "checkmark-circle" : "bag-add-outline"}
          size={18}
          color={added ? "#4F46E5" : "#fff"}
        />
        <Text style={[styles.addBtnText, added && styles.addBtnTextAdded]} numberOfLines={1}>
          {added
            ? t("care.myProducts.alreadyAdded")
            : t("care.myProducts.addFromCatalog")}
        </Text>
      </Pressable>
      {added && onUseInCare ? (
        <Pressable style={styles.careBtn} onPress={onUseInCare}>
          <Ionicons name="water-outline" size={18} color="#fff" />
          <Text style={styles.careBtnText} numberOfLines={1}>
            {t("care.myProducts.useInCare")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.card, isPage && styles.cardPage, panel === "tarkib" && styles.cardTarkib]}>
      <StatusBar style={panel === "tarkib" ? "light" : "dark"} />
      {panel === "info" && !isPage ? <View style={styles.grab} /> : null}
      <ScrollView
        style={styles.scrollFlex}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        bounces={false}
        contentContainerStyle={[styles.scroll, panel === "tarkib" && styles.scrollTarkib]}
      >
        {panel === "tarkib" ? tarkibPanel : infoBody}
      </ScrollView>
      {panel === "info" ? actions : null}
      {panel === "tarkib" ? (
        <View style={[styles.actions, styles.actionsTarkib, { paddingBottom: Math.max(bottomInset, 10) }]}>
          <Pressable style={styles.tarkibBackBtn} onPress={backToInfo}>
            <Ionicons name="arrow-back" size={16} color="#fff" />
            <Text style={styles.tarkibBackBtnText}>
              {t("common.back", { defaultValue: "Orqaga" })}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 14,
    maxHeight: "94%",
    overflow: "hidden",
  },
  cardPage: {
    maxHeight: undefined,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    flex: 1,
    paddingTop: 0,
  },
  grab: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(15,23,42,0.12)",
    marginBottom: 8,
  },
  scrollFlex: { flexGrow: 0, flexShrink: 1 },
  scroll: { gap: 10, paddingBottom: 8 },
  hero: {
    width: "100%",
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#EEF2FF",
  },
  heroPage: { height: 220 },
  heroImg: { width: "100%", height: "100%" },
  heroPh: { alignItems: "center", justifyContent: "center" },
  heroClose: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 4,
  },
  heroCat: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  heroCatText: {
    ...morphFont,
    fontSize: 11,
    fontWeight: "700",
    color: "#4F46E5",
  },
  title: {
    ...morphFont,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  brand: {
    ...morphFont,
    fontSize: 13,
    color: "rgba(15,23,42,0.5)",
    marginTop: -6,
  },
  fitLite: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
  },
  fitRingLite: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  fitPctLite: { ...morphFont, fontSize: 13, fontWeight: "800" },
  fitLabelLite: {
    ...morphFont,
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  fitVerdictLite: {
    ...morphFont,
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 1,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  chipOk: { backgroundColor: "#ECFDF5" },
  chipBad: { backgroundColor: "#FEF2F2" },
  chipNeutral: { backgroundColor: "#F1F5F9" },
  chipText: { ...morphFont, fontSize: 11.5, fontWeight: "600", color: "#475569" },
  chipTextOk: { color: "#059669" },
  chipTextBad: { color: "#DC2626" },
  cardTarkib: {
    backgroundColor: "#0A0A0C",
  },
  scrollTarkib: {
    paddingTop: 4,
    flexGrow: 1,
  },
  tarkibCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    overflow: "hidden",
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 64,
  },
  tarkibCtaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(196,181,253,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  tarkibCtaTitle: {
    ...morphFont,
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  tarkibCtaSub: {
    ...morphFont,
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    marginTop: 2,
  },
  tarkibFull: {
    borderRadius: 20,
    overflow: "hidden",
    padding: 16,
    gap: 10,
    minHeight: 360,
  },
  tarkibNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  tarkibBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  tarkibBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(196,181,253,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tarkibBadgeText: {
    ...morphFont,
    fontSize: 11,
    fontWeight: "700",
    color: "#C4B5FD",
    letterSpacing: 0.3,
  },
  tarkibProduct: {
    ...morphFont,
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  tarkibBrand: {
    ...morphFont,
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    marginTop: -6,
  },
  tarkibScoreRow: { flexDirection: "row", alignItems: "flex-end", gap: 4, marginTop: 8 },
  tarkibScore: {
    ...morphFont,
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 48,
  },
  tarkibScoreDenom: {
    ...morphFont,
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.35)",
    marginBottom: 8,
  },
  tarkibVerdict: {
    ...morphFont,
    fontSize: 16,
    fontWeight: "700",
  },
  tarkibHint: {
    ...morphFont,
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
  },
  tarkibListTitle: {
    ...morphFont,
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tarkibWarn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "rgba(251,113,133,0.12)",
    borderRadius: 12,
    padding: 10,
  },
  tarkibWarnText: {
    ...morphFont,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#FDA4AF",
  },
  tarkibGood: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "rgba(110,231,183,0.1)",
    borderRadius: 12,
    padding: 10,
  },
  tarkibGoodText: {
    ...morphFont,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#A7F3D0",
  },
  ingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  ingChip: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: "100%",
  },
  ingChipText: {
    ...morphFont,
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.78)",
  },
  tarkibEmpty: {
    ...morphFont,
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },
  actionsTarkib: {
    backgroundColor: "#0A0A0C",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingTop: 10,
  },
  tarkibBackBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  tarkibBackBtnText: {
    ...morphFont,
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridItem: {
    flexGrow: 1,
    flexBasis: "47%",
    minWidth: "46%",
  },
  whoCard: {
    borderRadius: 14,
    padding: 10,
    gap: 6,
  },
  whoOk: { backgroundColor: "#ECFDF5" },
  whoBad: { backgroundColor: "#FEF2F2" },
  whoTitle: { ...morphFont, fontSize: 11, fontWeight: "700" },
  whoBody: {
    ...morphFont,
    fontSize: 11.5,
    lineHeight: 16,
    color: "#334155",
  },
  tile: {
    borderRadius: 14,
    padding: 11,
    backgroundColor: "#F8FAFC",
    gap: 6,
    width: "100%",
  },
  tileHalf: {
    width: "48%",
    flexGrow: 1,
    flexBasis: "47%",
  },
  tileWarn: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "rgba(180,83,9,0.15)",
  },
  tileHead: { flexDirection: "row", alignItems: "center", gap: 7 },
  tileIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tileTitle: {
    ...morphFont,
    flex: 1,
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.2,
  },
  tileTitleWarn: { color: "#B45309" },
  tileBody: {
    ...morphFont,
    fontSize: 12.5,
    lineHeight: 17,
    color: "#334155",
  },
  tileBodyWarn: { color: "#92400E" },
  actions: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
  },
  addBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#4F46E5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addBtnFlex: { flex: 1 },
  addBtnAdded: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "rgba(79,70,229,0.25)",
  },
  addBtnText: {
    ...morphFont,
    fontSize: 13.5,
    fontWeight: "700",
    color: "#fff",
    flexShrink: 1,
  },
  addBtnTextAdded: { color: "#4F46E5" },
  careBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#3B82F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  careBtnText: {
    ...morphFont,
    fontSize: 13.5,
    fontWeight: "700",
    color: "#fff",
    flexShrink: 1,
  },
});
