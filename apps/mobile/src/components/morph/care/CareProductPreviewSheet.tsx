import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
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

const SHEET_H = 560;

const C = {
  glass: "rgba(255,255,255,0.96)",
  glassSoft: "rgba(248,250,252,0.92)",
  glassChip: "#F1F5F9",
  fg: "#0F172A",
  muted: "#64748B",
  line: "rgba(15,23,42,0.08)",
  accent: "#0F172A",
  ok: "#059669",
  bad: "#DC2626",
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
    ingredientsCount: "{{count}} ta",
  },
  ru: {
    fitTitle: "Подходит волосам",
    excellent: "Отлично",
    good: "Хорошо",
    ok: "Средне",
    poor: "Слабо",
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

function InfoBlock({
  icon,
  tint,
  title,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint?: string;
  title: string;
  children: string;
}) {
  if (!children?.trim()) return null;
  return (
    <View style={styles.infoBlock}>
      <View style={styles.infoHead}>
        <Ionicons name={icon} size={14} color={tint || C.fg} />
        <Text style={[styles.infoTitle, tint ? { color: tint } : null]}>{title}</Text>
      </View>
      <Text style={styles.infoText}>{children}</Text>
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

  const padBottom = Math.max(bottomInset, 6);
  const shellStyle = [
    styles.card,
    isPage ? styles.cardPage : { height: SHEET_H },
  ];

  /* —— Faqat mahsulot tarkibi —— */
  if (panel === "tarkib") {
    return (
      <View style={shellStyle}>
        <StatusBar style="dark" />
        {!isPage ? <View style={styles.grab} /> : null}

        <View style={styles.tarkibTop}>
          <Pressable style={styles.navBtn} onPress={backToInfo} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={C.fg} />
          </Pressable>
          <Text style={styles.tarkibHeadTitle}>
            {t("care.catalog.ingredients", { defaultValue: "Tarkib" })}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.tarkibBody}
          showsVerticalScrollIndicator={false}
        >
          {ingredients.length === 0 ? (
            <Text style={styles.emptyText}>
              {t("care.catalog.empty", { defaultValue: "—" })}
            </Text>
          ) : (
            ingredients.map((ing, i) => (
              <View key={`${ing}-${i}`} style={styles.ingRow}>
                <Text style={styles.ingIndex}>{i + 1}</Text>
                <Text style={styles.ingName}>{ing}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={shellStyle}>
      <StatusBar style="dark" />
      {!isPage ? <View style={styles.grab} /> : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <View style={styles.topRow}>
          <View style={styles.thumbWrap}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={[styles.thumb, styles.thumbPh]}>
                <Ionicons name="flask-outline" size={32} color={C.muted} />
              </View>
            )}
          </View>

          <View style={styles.topMeta}>
            <View style={styles.catPill}>
              <Text style={styles.catPillText}>
                {t(`care.catalog.categories.${product.category}`, {
                  defaultValue: product.category,
                })}
              </Text>
            </View>
            <Text style={styles.title} numberOfLines={2}>
              {product.name}
            </Text>
            {product.brand ? (
              <Text style={styles.brand} numberOfLines={1}>
                {product.brand}
              </Text>
            ) : null}
          </View>

          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={18} color={C.fg} />
          </Pressable>
        </View>

        <View style={styles.fitRow}>
          <View style={styles.fitBadge}>
            <Text style={styles.fitPct}>{fit}%</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fitLabel}>{fitTitle}</Text>
            <Text style={styles.fitVerdict}>{fitVerdict}</Text>
          </View>
        </View>

        <Pressable style={styles.tarkibCta} onPress={openTarkib}>
          <Ionicons name="flask-outline" size={16} color={C.fg} />
          <Text style={styles.tarkibCtaText}>
            {t("care.catalog.ingredients", { defaultValue: "Tarkib" })}
            {ingredients.length > 0 ? ` · ${ingredients.length}` : ""}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={C.muted} />
        </Pressable>

        <View style={styles.infoGrid}>
          <InfoBlock icon="thumbs-up-outline" tint={C.ok} title={t("care.catalog.who")}>
            {suitable.map(tagLabel).join(" · ")}
          </InfoBlock>
          <InfoBlock icon="thumbs-down-outline" tint={C.bad} title={t("care.catalog.whoNot")}>
            {notSuitable.map(tagLabel).join(" · ")}
          </InfoBlock>
          <InfoBlock icon="bulb-outline" title={t("care.catalog.purpose")}>
            {product.purpose_uz}
          </InfoBlock>
          <InfoBlock icon="hand-left-outline" title={t("care.catalog.usage")}>
            {product.usage_uz}
          </InfoBlock>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: padBottom }]}>
        {added && onUseInCare ? (
          <View style={styles.footerRow}>
            <View style={[styles.addBtn, styles.addBtnAdded, styles.footerHalf]}>
              <Ionicons name="checkmark-circle" size={18} color={C.fg} />
              <Text style={[styles.addBtnText, styles.addBtnTextAdded]} numberOfLines={1}>
                {t("care.myProducts.alreadyAdded")}
              </Text>
            </View>
            <Pressable
              style={[styles.careBtn, styles.careBtnPrimary, styles.footerHalf]}
              onPress={onUseInCare}
            >
              <Ionicons name="sparkles" size={16} color="#fff" />
              <Text style={[styles.careBtnText, styles.careBtnTextPrimary]} numberOfLines={1}>
                {t("care.myProducts.useInCare")}
              </Text>
            </Pressable>
          </View>
        ) : (
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
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.glass,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.7)",
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    overflow: "hidden",
    width: "100%",
  },
  cardPage: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderWidth: 0,
  },
  grab: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(15,23,42,0.16)",
    marginBottom: 10,
  },
  scroll: { flex: 1 },
  scrollBody: { paddingBottom: 12, gap: 8 },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  thumbWrap: {
    width: 96,
    height: 96,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: C.glassSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  thumb: { width: "100%", height: "100%" },
  thumbPh: { alignItems: "center", justifyContent: "center" },
  topMeta: { flex: 1, paddingRight: 4, gap: 4 },
  catPill: {
    alignSelf: "flex-start",
    backgroundColor: C.glassChip,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  catPillText: {
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
    lineHeight: 20,
  },
  brand: {
    ...morphFont,
    fontSize: 12,
    color: C.muted,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.glassChip,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  fitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: C.glassSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  fitBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: C.fg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  fitPct: { ...morphFont, fontSize: 12, fontWeight: "800", color: C.fg },
  fitLabel: { ...morphFont, fontSize: 11, fontWeight: "600", color: C.muted },
  fitVerdict: { ...morphFont, fontSize: 14, fontWeight: "700", color: C.fg, marginTop: 1 },
  tarkibCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: C.glassChip,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  tarkibCtaText: {
    ...morphFont,
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: C.fg,
  },
  infoGrid: { gap: 8 },
  infoBlock: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.glassSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    gap: 4,
  },
  infoHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoTitle: {
    ...morphFont,
    fontSize: 10,
    fontWeight: "700",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  infoText: {
    ...morphFont,
    fontSize: 13,
    lineHeight: 18,
    color: C.fg,
  },
  footer: {
    gap: 6,
    paddingTop: 8,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerHalf: {
    flex: 1,
  },
  addBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: C.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 10,
  },
  addBtnAdded: {
    backgroundColor: C.glassChip,
    borderWidth: 1,
    borderColor: C.line,
  },
  addBtnText: {
    ...morphFont,
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    flexShrink: 1,
  },
  addBtnTextAdded: { color: C.fg },
  careBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: C.glassChip,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  careBtnPrimary: {
    backgroundColor: C.accent,
    borderWidth: 0,
  },
  careBtnText: {
    ...morphFont,
    fontSize: 14,
    fontWeight: "700",
    color: C.fg,
    flexShrink: 1,
  },
  careBtnTextPrimary: {
    color: "#fff",
  },
  tarkibTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.glassChip,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  tarkibHeadTitle: {
    ...morphFont,
    fontSize: 16,
    fontWeight: "800",
    color: C.fg,
  },
  tarkibBody: { paddingBottom: 20 },
  ingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  ingIndex: {
    ...morphFont,
    width: 22,
    fontSize: 12,
    fontWeight: "700",
    color: C.muted,
    marginTop: 1,
  },
  ingName: {
    ...morphFont,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: C.fg,
    fontWeight: "500",
  },
  emptyText: { ...morphFont, fontSize: 13, color: C.muted, paddingVertical: 20 },
});
