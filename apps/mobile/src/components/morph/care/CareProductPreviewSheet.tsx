import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
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

const C = {
  bg: "#FFFFFF",
  fg: "#111827",
  muted: "#6B7280",
  line: "#E5E7EB",
  soft: "#F3F4F6",
  soft2: "#F9FAFB",
  ink: "#111827",
  accent: "#111827",
};

function fitLabelKey(score: number): "excellent" | "good" | "ok" | "poor" {
  if (score >= 85) return "excellent";
  if (score >= 72) return "good";
  if (score >= 58) return "ok";
  return "poor";
}

const FIT_FALLBACK = {
  uz: {
    fitTitle: "Sochingizga mosligi",
    excellent: "Juda mos",
    good: "Yaxshi mos",
    ok: "O‘rtacha mos",
    poor: "Kam mos",
    tarkibTap: "Tarkibni ko‘rish",
    ingredientsCount: "{{count}} ta",
  },
  ru: {
    fitTitle: "Подходит волосам",
    excellent: "Отлично",
    good: "Хорошо",
    ok: "Средне",
    poor: "Слабо",
    tarkibTap: "Смотреть состав",
    ingredientsCount: "{{count}} шт.",
  },
} as const;

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

function Row({
  icon,
  title,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: string;
}) {
  if (!children?.trim()) return null;
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={14} color={C.fg} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowText} numberOfLines={2}>
          {children}
        </Text>
      </View>
    </View>
  );
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
  const labelKey = fitLabelKey(fit);
  const isPage = mode === "page";
  const lang = (i18n.language || "uz").startsWith("ru") ? "ru" : "uz";
  const fb = FIT_FALLBACK[lang];
  const [panel, setPanel] = useState<"info" | "tarkib">("info");

  const imageUri = useMemo(
    () => resolveMediaUrl(product.image_url, { width: 640 }) || product.image_url,
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
  const fitVerdict = t(`care.preview.fit.${labelKey}`, { defaultValue: fb[labelKey] });

  const openTarkib = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPanel("tarkib");
  };
  const backToInfo = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPanel("info");
  };

  const padBottom = Math.max(bottomInset, 12);

  /* —— Tarkib panel (shu layout ichida) —— */
  if (panel === "tarkib") {
    return (
      <View style={[styles.card, isPage && styles.cardPage, { paddingBottom: padBottom }]}>
        <StatusBar style="dark" />
        <View style={styles.tarkibTop}>
          <Pressable style={styles.navBtn} onPress={backToInfo} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={C.fg} />
          </Pressable>
          <Text style={styles.tarkibHeadTitle}>
            {t("care.catalog.ingredients", { defaultValue: "Tarkib" })}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <Text style={styles.tarkibName} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.tarkibMeta}>
          {fit}% · {fitVerdict} ·{" "}
          {t("ingredient.ingredientsCount", {
            count: ingredients.length,
            defaultValue: fb.ingredientsCount.replace("{{count}}", String(ingredients.length)),
          })}
        </Text>

        {product.warnings_uz?.trim() ? (
          <View style={styles.noteBox}>
            <Ionicons name="alert-circle-outline" size={15} color={C.fg} />
            <Text style={styles.noteText} numberOfLines={2}>
              {product.warnings_uz}
            </Text>
          </View>
        ) : null}

        {product.pros_uz?.trim() ? (
          <View style={styles.noteBox}>
            <Ionicons name="checkmark-circle-outline" size={15} color={C.fg} />
            <Text style={styles.noteText} numberOfLines={2}>
              {product.pros_uz}
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>
          {t("ingredient.listTitle", { defaultValue: "Ingredientlar" })}
        </Text>
        <View style={styles.ingWrap}>
          {ingredients.length === 0 ? (
            <Text style={styles.emptyText}>
              {t("care.catalog.empty", { defaultValue: "—" })}
            </Text>
          ) : (
            ingredients.slice(0, 16).map((ing, i) => (
              <View key={`${ing}-${i}`} style={styles.ingChip}>
                <Text style={styles.ingChipText} numberOfLines={1}>
                  {ing}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    );
  }

  /* —— Asosiy mahsulot info (scroll yo‘q) —— */
  return (
    <View style={[styles.card, isPage && styles.cardPage, { paddingBottom: padBottom }]}>
      <StatusBar style="dark" />
      {!isPage ? <View style={styles.grab} /> : null}

      <View style={styles.hero}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.heroImg} contentFit="cover" />
        ) : (
          <View style={[styles.heroImg, styles.heroPh]}>
            <Ionicons name="flask-outline" size={28} color={C.muted} />
          </View>
        )}
        <Pressable style={styles.heroClose} onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={18} color={C.fg} />
        </Pressable>
        <View style={styles.heroCat}>
          <Text style={styles.heroCatText}>
            {t(`care.catalog.categories.${product.category}`, {
              defaultValue: product.category,
            })}
          </Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {product.name}
      </Text>
      {product.brand ? (
        <Text style={styles.brand} numberOfLines={1}>
          {product.brand}
        </Text>
      ) : null}

      <View style={styles.fitRow}>
        <View style={styles.fitBadge}>
          <Text style={styles.fitPct}>{fit}%</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fitLabel}>{fitTitle}</Text>
          <Text style={styles.fitVerdict}>{fitVerdict}</Text>
        </View>
      </View>

      {userTags.length > 0 ? (
        <View style={styles.chipRow}>
          {userTags.map((tag) => {
            const ok = suitable.includes(tag);
            const bad = notSuitable.includes(tag);
            return (
              <View key={tag} style={styles.chip}>
                <Ionicons
                  name={ok ? "checkmark" : bad ? "close" : "remove"}
                  size={11}
                  color={C.fg}
                />
                <Text style={styles.chipText}>{tagLabel(tag)}</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <Pressable style={styles.tarkibCta} onPress={openTarkib}>
        <Ionicons name="flask-outline" size={16} color={C.fg} />
        <Text style={styles.tarkibCtaText}>
          {t("care.catalog.ingredients", { defaultValue: "Tarkib" })}
          {ingredients.length > 0 ? ` · ${ingredients.length}` : ""}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={C.muted} />
      </Pressable>

      <View style={styles.list}>
        {suitable.length > 0 ? (
          <Row icon="thumbs-up-outline" title={t("care.catalog.who")}>
            {suitable.map(tagLabel).join(" · ")}
          </Row>
        ) : null}
        {notSuitable.length > 0 ? (
          <Row icon="thumbs-down-outline" title={t("care.catalog.whoNot")}>
            {notSuitable.map(tagLabel).join(" · ")}
          </Row>
        ) : null}
        <Row icon="bulb-outline" title={t("care.catalog.purpose")}>
          {product.purpose_uz}
        </Row>
        <Row icon="hand-left-outline" title={t("care.catalog.usage")}>
          {product.usage_uz}
        </Row>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.addBtn, added && styles.addBtnAdded]}
          onPress={onAdd}
          disabled={added}
        >
          <Ionicons
            name={added ? "checkmark-circle" : "bag-add-outline"}
            size={18}
            color={added ? C.fg : "#fff"}
          />
          <Text style={[styles.addBtnText, added && styles.addBtnTextAdded]} numberOfLines={1}>
            {added
              ? t("care.myProducts.alreadyAdded")
              : t("care.myProducts.addFromCatalog")}
          </Text>
        </Pressable>
        {added && onUseInCare ? (
          <Pressable style={styles.careBtn} onPress={onUseInCare}>
            <Text style={styles.careBtnText} numberOfLines={1}>
              {t("care.myProducts.useInCare")}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 6,
    maxHeight: "86%",
    overflow: "hidden",
  },
  cardPage: {
    maxHeight: undefined,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    flex: 1,
  },
  grab: {
    alignSelf: "center",
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.line,
    marginBottom: 6,
  },
  hero: {
    width: "100%",
    height: 112,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: C.soft,
    marginBottom: 8,
  },
  heroImg: { width: "100%", height: "100%" },
  heroPh: { alignItems: "center", justifyContent: "center" },
  heroClose: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  heroCat: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  heroCatText: {
    ...morphFont,
    fontSize: 10,
    fontWeight: "700",
    color: C.fg,
  },
  title: {
    ...morphFont,
    fontSize: 16,
    fontWeight: "800",
    color: C.fg,
    letterSpacing: -0.2,
  },
  brand: {
    ...morphFont,
    fontSize: 12,
    color: C.muted,
    marginTop: 1,
    marginBottom: 6,
  },
  fitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: C.soft2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    marginBottom: 6,
  },
  fitBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: C.fg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
  },
  fitPct: { ...morphFont, fontSize: 12, fontWeight: "800", color: C.fg },
  fitLabel: { ...morphFont, fontSize: 10, fontWeight: "600", color: C.muted },
  fitVerdict: { ...morphFont, fontSize: 14, fontWeight: "700", color: C.fg },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: C.soft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  chipText: { ...morphFont, fontSize: 11, fontWeight: "600", color: C.fg },
  tarkibCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: C.soft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    marginBottom: 6,
  },
  tarkibCtaText: {
    ...morphFont,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: C.fg,
  },
  list: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    backgroundColor: C.soft2,
    overflow: "hidden",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  rowIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  rowBody: { flex: 1, gap: 1 },
  rowTitle: {
    ...morphFont,
    fontSize: 10,
    fontWeight: "700",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  rowText: {
    ...morphFont,
    fontSize: 12,
    lineHeight: 16,
    color: C.fg,
  },
  footer: {
    marginTop: "auto",
    gap: 8,
    paddingTop: 4,
  },
  addBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: C.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addBtnAdded: {
    backgroundColor: C.soft,
    borderWidth: 1,
    borderColor: C.line,
  },
  addBtnText: {
    ...morphFont,
    fontSize: 13.5,
    fontWeight: "700",
    color: "#fff",
    flexShrink: 1,
  },
  addBtnTextAdded: { color: C.fg },
  careBtn: {
    height: 42,
    borderRadius: 12,
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  careBtnText: {
    ...morphFont,
    fontSize: 13,
    fontWeight: "700",
    color: C.fg,
  },
  /* Tarkib panel */
  tarkibTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  tarkibHeadTitle: {
    ...morphFont,
    fontSize: 15,
    fontWeight: "800",
    color: C.fg,
  },
  tarkibName: {
    ...morphFont,
    fontSize: 15,
    fontWeight: "700",
    color: C.fg,
  },
  tarkibMeta: {
    ...morphFont,
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
    marginBottom: 10,
  },
  noteBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: C.soft2,
    borderRadius: 12,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    marginBottom: 6,
  },
  noteText: {
    ...morphFont,
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: C.fg,
  },
  sectionLabel: {
    ...morphFont,
    fontSize: 10,
    fontWeight: "700",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 6,
    marginBottom: 6,
  },
  ingWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  ingChip: {
    backgroundColor: C.soft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  ingChipText: {
    ...morphFont,
    fontSize: 11,
    fontWeight: "600",
    color: C.fg,
  },
  emptyText: { ...morphFont, fontSize: 12, color: C.muted },
});
