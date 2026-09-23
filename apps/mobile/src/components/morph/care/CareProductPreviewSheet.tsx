import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeBackButton } from "../../../components/ui/NativeBackButton";
import { safeBottom } from "../../../components/ui/AppStatusBar";
import { resolveMediaUrl } from "../../../api/media";
import type { CareProduct } from "../../../api/care";
import {
  estimateProductFit,
  type CareQuizAnswers,
} from "../../../lib/morph-ai-care";
import { morphFont } from "../../../theme/morph-font";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../../utils/responsive";

type Props = {
  product: CareProduct;
  quiz: CareQuizAnswers;
  added: boolean;
  /** Qo‘shimcha pastki offset (masalan parent Modal). Hook insets asosiy manba. */
  bottomInset?: number;
  mode?: "sheet" | "page";
  onClose: () => void;
  onAdd: () => void | Promise<void>;
  onUseInCare?: () => void;
};

const SHEET_H_FALLBACK = 560;

const C = {
  glass: "rgba(255,255,255,0.96)",
  glassSoft: "rgba(248,250,252,0.92)",
  glassChip: "#F0F0F0",
  fg: "#111111",
  muted: "#64748B",
  line: "rgba(15,23,42,0.08)",
  accent: "#111111",
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
  bottomInset = 0,
  mode = "sheet",
  onClose,
  onAdd,
  onUseInCare,
}: Props) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const sheetH = Math.round(
    Math.min(SHEET_H_FALLBACK, Math.max(340, winH * (winH < 700 ? 0.72 : 0.78))),
  );
  const fit = useMemo(
    () =>
      typeof product.match_percent === "number"
        ? Math.max(0, Math.min(100, Math.round(product.match_percent)))
        : estimateProductFit(product, quiz),
    [product, quiz],
  );
  const labelKey = fitLabelKey(fit);
  const isPage = mode === "page";
  const lang = (i18n.language || "uz").startsWith("ru") ? "ru" : "uz";
  const fb = FIT_FALLBACK[lang];
  const [panel, setPanel] = useState<"info" | "tarkib">("info");
  const [justAdded, setJustAdded] = useState(false);
  const shownAdded = added || justAdded;

  const pressAdd = () => {
    if (shownAdded) return;
    setJustAdded(true);
    try {
      const pending = onAdd();
      if (pending && typeof (pending as Promise<void>).then === "function") {
        void Promise.resolve(pending).catch(() => setJustAdded(false));
      }
    } catch {
      setJustAdded(false);
    }
  };

  const imageUri = useMemo(
    () => resolveMediaUrl(product.image_url, { width: 480 }) || product.image_url,
    [product.image_url],
  );
  const ingredients = useMemo(() => parseIngredients(product), [product]);
  const tagLabel = (tag: string) => t(`care.catalog.tags.${tag}`, { defaultValue: tag });

  const suitable = product.suitable_for || [];
  const notSuitable = product.not_suitable_for || [];
  const fitTitle = t("care.preview.fitTitle", { defaultValue: fb.fitTitle });
  const fitVerdict = t(`care.preview.fit.${labelKey}`, { defaultValue: fb[labelKey] });

  const openTarkib = () => {
    setPanel("tarkib");
  };
  const backToInfo = () => {
    setPanel("info");
  };

  /** System nav / gesture bar dan dinamik masofa (Android 3-button + iOS home). */
  const padBottom = safeBottom(Math.max(insets.bottom, bottomInset), 12);
  const shellStyle = [
    styles.card,
    isPage ? styles.cardPage : { height: sheetH },
  ];

  /* —— Faqat mahsulot tarkibi —— */
  if (panel === "tarkib") {
    return (
      <View style={shellStyle}>
        <StatusBar style="dark" />
        {!isPage ? <View style={styles.grab} /> : null}

        <View style={styles.tarkibTop}>
          <NativeBackButton onPress={backToInfo} accessibilityLabel={t("common.back")} />
          <Text style={styles.tarkibHeadTitle}>
            {t("care.catalog.ingredients", { defaultValue: "Tarkib" })}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.tarkibBody, { paddingBottom: padBottom + verticalScale(12) }]}
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
        <View style={styles.sheetNav}>
          <NativeBackButton onPress={onClose} accessibilityLabel={t("common.back")} />
        </View>
        <View style={styles.topRow}>
          <View style={styles.thumbWrap}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.thumb}
                contentFit="contain"
                cachePolicy="memory-disk"
                priority="high"
                transition={60}
              />
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

        {(product.fit_reasons || []).slice(0, 3).map((reason) => (
          <Text key={reason} style={styles.reasonText}>
            {reason}
          </Text>
        ))}

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
        {shownAdded && onUseInCare ? (
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
            style={[styles.addBtn, shownAdded && styles.addBtnAdded]}
            onPress={pressAdd}
            disabled={shownAdded}
          >
            <Ionicons
              name={shownAdded ? "checkmark-circle" : "bag-add-outline"}
              size={18}
              color={shownAdded ? C.fg : "#fff"}
            />
            <Text style={[styles.addBtnText, shownAdded && styles.addBtnTextAdded]} numberOfLines={1}>
              {shownAdded
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
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.7)",
    borderBottomWidth: 0,
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(8),
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
    width: scale(36),
    height: verticalScale(4),
    borderRadius: moderateScale(2),
    backgroundColor: "rgba(15,23,42,0.16)",
    marginBottom: verticalScale(10),
  },
  scroll: { flex: 1 },
  scrollBody: { paddingBottom: verticalScale(12), gap: moderateScale(8) },
  sheetNav: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(2),
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: moderateScale(12),
  },
  thumbWrap: {
    width: scale(120),
    height: scale(120),
    borderRadius: moderateScale(18),
    overflow: "hidden",
    backgroundColor: C.glassSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  thumb: { width: "100%", height: "100%" },
  thumbPh: { alignItems: "center", justifyContent: "center" },
  topMeta: { flex: 1, paddingRight: scale(4), gap: moderateScale(4) },
  catPill: {
    alignSelf: "flex-start",
    backgroundColor: C.glassChip,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  catPillText: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "700",
    color: C.fg,
  },
  title: {
    ...morphFont,
    fontSize: fontSize(16),
    fontWeight: "800",
    color: C.fg,
    letterSpacing: -0.2,
    lineHeight: fontSize(20),
  },
  brand: {
    ...morphFont,
    fontSize: fontSize(12),
    color: C.muted,
  },
  closeBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: moderateScale(16),
    backgroundColor: C.glassChip,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  fitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(12),
    borderRadius: moderateScale(14),
    backgroundColor: C.glassSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  fitBadge: {
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(22),
    borderWidth: 2.5,
    borderColor: C.fg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  fitPct: { ...morphFont, fontSize: fontSize(12), fontWeight: "800", color: C.fg },
  fitLabel: { ...morphFont, fontSize: fontSize(11), fontWeight: "600", color: C.muted },
  fitVerdict: { ...morphFont, fontSize: fontSize(14), fontWeight: "700", color: C.fg, marginTop: 1 },
  reasonText: {
    ...morphFont,
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: C.muted,
    marginTop: verticalScale(6),
  },
  tarkibCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(14),
    borderRadius: moderateScale(14),
    backgroundColor: C.glassChip,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  tarkibCtaText: {
    ...morphFont,
    flex: 1,
    fontSize: fontSize(14),
    fontWeight: "700",
    color: C.fg,
  },
  infoGrid: { gap: moderateScale(8) },
  infoBlock: {
    borderRadius: moderateScale(14),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    backgroundColor: C.glassSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    gap: moderateScale(4),
  },
  infoHead: { flexDirection: "row", alignItems: "center", gap: moderateScale(6) },
  infoTitle: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "700",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  infoText: {
    ...morphFont,
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: C.fg,
  },
  footer: {
    zIndex: 4,
    gap: moderateScale(10),
    paddingTop: verticalScale(16),
    paddingHorizontal: scale(16),
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
  },
  footerHalf: {
    flex: 1,
  },
  addBtn: {
    height: verticalScale(50),
    borderRadius: moderateScale(14),
    backgroundColor: C.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(8),
    paddingHorizontal: scale(10),
  },
  addBtnAdded: {
    backgroundColor: C.glassChip,
    borderWidth: 1,
    borderColor: C.line,
  },
  addBtnText: {
    ...morphFont,
    fontSize: fontSize(14),
    fontWeight: "700",
    color: "#fff",
    flexShrink: 1,
  },
  addBtnTextAdded: { color: C.fg },
  careBtn: {
    height: verticalScale(50),
    borderRadius: moderateScale(14),
    backgroundColor: C.glassChip,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(6),
    paddingHorizontal: scale(10),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  careBtnPrimary: {
    backgroundColor: C.accent,
    borderWidth: 0,
  },
  careBtnText: {
    ...morphFont,
    fontSize: fontSize(14),
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
    marginBottom: verticalScale(8),
  },
  navBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: moderateScale(18),
    backgroundColor: C.glassChip,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  tarkibHeadTitle: {
    ...morphFont,
    fontSize: fontSize(16),
    fontWeight: "800",
    color: C.fg,
  },
  tarkibBody: { paddingBottom: verticalScale(20) },
  ingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: moderateScale(12),
    paddingVertical: verticalScale(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  ingIndex: {
    ...morphFont,
    width: scale(22),
    fontSize: fontSize(12),
    fontWeight: "700",
    color: C.muted,
    marginTop: 1,
  },
  ingName: {
    ...morphFont,
    flex: 1,
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    color: C.fg,
    fontWeight: "500",
  },
  emptyText: { ...morphFont, fontSize: fontSize(13), color: C.muted, paddingVertical: verticalScale(20) },
});
