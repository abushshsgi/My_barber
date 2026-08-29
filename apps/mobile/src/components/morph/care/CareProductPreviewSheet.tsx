import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import type { CareProduct } from "../../../api/care";
import {
  estimateProductFit,
  type CareQuizAnswers,
} from "../../../lib/morph-ai-care";
import { morphFont } from "../../../theme/morph-font";

type Props = {
  product: CareProduct;
  quiz: CareQuizAnswers;
  added: boolean;
  bottomInset?: number;
  /** Full page (no grab / maxHeight) vs bottom sheet */
  mode?: "sheet" | "page";
  onClose: () => void;
  onAdd: () => void;
  onUseInCare?: () => void;
};

function fitTone(score: number): { color: string; bg: string; labelKey: string } {
  if (score >= 85) return { color: "#059669", bg: "#ECFDF5", labelKey: "excellent" };
  if (score >= 72) return { color: "#4F46E5", bg: "#EEF2FF", labelKey: "good" };
  if (score >= 58) return { color: "#D97706", bg: "#FFFBEB", labelKey: "ok" };
  return { color: "#DC2626", bg: "#FEF2F2", labelKey: "poor" };
}

function InfoBlock({
  icon,
  iconColor,
  iconBg,
  title,
  children,
  warn,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  children: string;
  warn?: boolean;
}) {
  if (!children?.trim()) return null;
  return (
    <View style={[styles.block, warn && styles.blockWarn]}>
      <View style={styles.blockHead}>
        <View style={[styles.blockIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={14} color={iconColor} />
        </View>
        <Text style={[styles.blockTitle, warn && styles.blockTitleWarn]}>{title}</Text>
      </View>
      <Text style={[styles.blockBody, warn && styles.blockBodyWarn]}>{children}</Text>
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
  const { t } = useTranslation();
  const fit = useMemo(() => estimateProductFit(product, quiz), [product, quiz]);
  const tone = fitTone(fit);
  const tagLabel = (tag: string) => t(`care.catalog.tags.${tag}`, { defaultValue: tag });
  const isPage = mode === "page";

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
  const ingredientsPreview =
    product.ingredients_text?.trim() ||
    (product.ingredients || []).slice(0, 8).join(", ");

  const body = (
    <>
      <View style={[styles.media, isPage && styles.mediaPage]}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.img} />
        ) : (
          <View style={[styles.img, styles.imgPh]}>
            <Ionicons name="flask-outline" size={40} color="#6366F1" />
          </View>
        )}
        {!isPage ? (
          <Pressable
            style={styles.close}
            onPress={onClose}
            hitSlop={8}
            accessibilityLabel={t("common.back")}
          >
            <Ionicons name="close" size={18} color="#0F172A" />
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.title}>{product.name}</Text>
      {product.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}

      <View style={styles.metaRow}>
        <View style={styles.catPill}>
          <Ionicons name="pricetag-outline" size={12} color="#4F46E5" />
          <Text style={styles.catText}>
            {t(`care.catalog.categories.${product.category}`, {
              defaultValue: product.category,
            })}
          </Text>
        </View>
      </View>

      <View style={[styles.fitCard, { backgroundColor: tone.bg }]}>
        <View style={styles.fitLeft}>
          <View style={[styles.fitRing, { borderColor: tone.color }]}>
            <Text style={[styles.fitPct, { color: tone.color }]}>{fit}</Text>
            <Text style={[styles.fitPctSub, { color: tone.color }]}>%</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fitLabel}>{t("care.preview.fitTitle")}</Text>
            <Text style={[styles.fitVerdict, { color: tone.color }]}>
              {t(`care.preview.fit.${tone.labelKey}`)}
            </Text>
            <Text style={styles.fitHint}>{t("care.routine.fitYou", { pct: fit })}</Text>
          </View>
        </View>
      </View>

      {userTags.length > 0 ? (
        <View style={styles.profileCard}>
          <View style={styles.blockHead}>
            <View style={[styles.blockIcon, { backgroundColor: "#EEF2FF" }]}>
              <Ionicons name="person-outline" size={14} color="#4F46E5" />
            </View>
            <Text style={styles.blockTitle}>{t("care.preview.yourHair")}</Text>
          </View>
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
        </View>
      ) : null}

      {suitable.length > 0 || notSuitable.length > 0 ? (
        <View style={styles.whoRow}>
          {suitable.length > 0 ? (
            <View style={[styles.whoCard, styles.whoOk]}>
              <View style={styles.blockHead}>
                <Ionicons name="thumbs-up-outline" size={14} color="#059669" />
                <Text style={[styles.whoTitle, { color: "#059669" }]}>
                  {t("care.catalog.who")}
                </Text>
              </View>
              <Text style={styles.whoBody}>{suitable.map(tagLabel).join(" · ")}</Text>
            </View>
          ) : null}
          {notSuitable.length > 0 ? (
            <View style={[styles.whoCard, styles.whoBad]}>
              <View style={styles.blockHead}>
                <Ionicons name="thumbs-down-outline" size={14} color="#DC2626" />
                <Text style={[styles.whoTitle, { color: "#DC2626" }]}>
                  {t("care.catalog.whoNot")}
                </Text>
              </View>
              <Text style={styles.whoBody}>{notSuitable.map(tagLabel).join(" · ")}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <InfoBlock
        icon="bulb-outline"
        iconColor="#4F46E5"
        iconBg="#EEF2FF"
        title={t("care.catalog.purpose")}
      >
        {product.purpose_uz}
      </InfoBlock>

      <InfoBlock
        icon="hand-left-outline"
        iconColor="#0284C7"
        iconBg="#E0F2FE"
        title={t("care.catalog.usage")}
      >
        {product.usage_uz}
      </InfoBlock>

      <InfoBlock
        icon="sparkles-outline"
        iconColor="#059669"
        iconBg="#ECFDF5"
        title={t("care.catalog.pros")}
      >
        {product.pros_uz}
      </InfoBlock>

      {product.cons_uz?.trim() ? (
        <InfoBlock
          icon="remove-circle-outline"
          iconColor="#64748B"
          iconBg="#F1F5F9"
          title={t("care.catalog.cons")}
        >
          {product.cons_uz}
        </InfoBlock>
      ) : null}

      <InfoBlock
        icon="warning-outline"
        iconColor="#B45309"
        iconBg="#FFF7ED"
        title={t("care.catalog.warnings")}
        warn
      >
        {product.warnings_uz}
      </InfoBlock>

      {ingredientsPreview ? (
        <InfoBlock
          icon="flask-outline"
          iconColor="#7C3AED"
          iconBg="#F5F3FF"
          title={t("care.catalog.ingredients")}
        >
          {ingredientsPreview}
        </InfoBlock>
      ) : null}
    </>
  );

  return (
    <View
      style={[
        styles.card,
        isPage && styles.cardPage,
        { paddingBottom: Math.max(bottomInset, isPage ? 8 : 12) },
      ]}
    >
      {!isPage ? <View style={styles.grab} /> : null}
      {isPage ? (
        <View style={styles.scroll}>{body}</View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          {body}
        </ScrollView>
      )}

      <View style={styles.actions}>
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
          <Text
            style={[styles.addBtnText, added && styles.addBtnTextAdded]}
            numberOfLines={1}
          >
            {added
              ? t("care.myProducts.alreadyAdded")
              : t("care.myProducts.addFromCatalog")}
          </Text>
        </Pressable>
        {added && onUseInCare ? (
          <Pressable
            style={styles.careBtn}
            onPress={onUseInCare}
            accessibilityLabel={t("care.myProducts.useInCare")}
          >
            <Ionicons name="water-outline" size={18} color="#fff" />
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
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: "92%",
  },
  cardPage: {
    maxHeight: undefined,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  grab: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(15,23,42,0.14)",
    marginBottom: 10,
  },
  scroll: { gap: 8, paddingBottom: 12 },
  media: {
    width: "100%",
    height: 160,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#EEF2FF",
  },
  mediaPage: {
    height: 200,
  },
  img: { width: "100%", height: "100%" },
  imgPh: { alignItems: "center", justifyContent: "center" },
  close: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
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
    color: "rgba(15,23,42,0.55)",
    marginTop: -2,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  catText: {
    ...morphFont,
    fontSize: 12,
    fontWeight: "700",
    color: "#4F46E5",
  },
  fitCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.04)",
  },
  fitLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  fitRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    flexDirection: "row",
  },
  fitPct: { ...morphFont, fontSize: 20, fontWeight: "800" },
  fitPctSub: { ...morphFont, fontSize: 11, fontWeight: "700", marginTop: 4 },
  fitLabel: {
    ...morphFont,
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  fitVerdict: { ...morphFont, fontSize: 16, fontWeight: "800", marginTop: 2 },
  fitHint: {
    ...morphFont,
    fontSize: 12,
    color: "rgba(15,23,42,0.5)",
    marginTop: 2,
  },
  profileCard: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#F8FAFC",
    gap: 10,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipOk: { backgroundColor: "#ECFDF5" },
  chipBad: { backgroundColor: "#FEF2F2" },
  chipNeutral: { backgroundColor: "#F1F5F9" },
  chipText: { ...morphFont, fontSize: 12, fontWeight: "600", color: "#475569" },
  chipTextOk: { color: "#059669" },
  chipTextBad: { color: "#DC2626" },
  whoRow: { flexDirection: "row", gap: 8 },
  whoCard: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    gap: 6,
  },
  whoOk: { backgroundColor: "#ECFDF5" },
  whoBad: { backgroundColor: "#FEF2F2" },
  whoTitle: { ...morphFont, fontSize: 11, fontWeight: "700" },
  whoBody: {
    ...morphFont,
    fontSize: 12,
    lineHeight: 16,
    color: "#334155",
  },
  block: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#F8FAFC",
    gap: 8,
  },
  blockWarn: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "rgba(180,83,9,0.15)",
  },
  blockHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  blockIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  blockTitle: {
    ...morphFont,
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  blockTitleWarn: { color: "#B45309" },
  blockBody: {
    ...morphFont,
    fontSize: 13,
    lineHeight: 19,
    color: "#334155",
  },
  blockBodyWarn: { color: "#92400E" },
  actions: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  addBtn: {
    height: 50,
    borderRadius: 16,
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
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    flexShrink: 1,
  },
  addBtnTextAdded: { color: "#4F46E5" },
  careBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#3B82F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  careBtnText: {
    ...morphFont,
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    flexShrink: 1,
  },
});
