import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useShellNavigation } from "../lib/shell-nav";
import { colors } from "../theme/colors";
import {
  fontSize,
  moderateScale,
  radius,
  scale,
  spacing,
  verticalScale,
} from "../utils/responsive";

type Props = {
  compact?: boolean;
};

/** Salonlar yo‘q — kutish matni + Morf AI ga qaytish. */
export function ComingSoonSalons({ compact = false }: Props) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { goMorph } = useShellNavigation();

  return (
    <View style={[styles.card, compact && styles.compact]}>
      <View style={styles.iconWrap}>
        <Ionicons name="storefront-outline" size={compact ? 20 : 24} color={colors.fg} />
      </View>
      <Text style={[styles.title, compact && styles.titleSm]}>{t("comingSoon.title")}</Text>
      <Text style={[styles.sub, compact && styles.subSm]}>{t("comingSoon.sub")}</Text>
      <Pressable
        onPress={() => goMorph(navigation as never, "MorphTryOn")}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
      >
        <Ionicons name="sparkles" size={16} color="#FFF" />
        <Text style={styles.ctaText}>{t("comingSoon.cta")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: scale(16),
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(22),
    borderRadius: moderateScale(20),
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
  },
  compact: {
    marginHorizontal: 0,
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(14),
  },
  iconWrap: {
    width: scale(48),
    height: scale(48),
    borderRadius: moderateScale(16),
    backgroundColor: colors.promo,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginTop: spacing.md,
    fontSize: fontSize(17),
    fontWeight: "800",
    letterSpacing: -0.3,
    color: colors.fg,
    textAlign: "center",
  },
  titleSm: {
    fontSize: fontSize(15),
  },
  sub: {
    marginTop: verticalScale(6),
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: colors.muted,
    textAlign: "center",
  },
  subSm: {
    fontSize: fontSize(12),
    lineHeight: fontSize(16),
  },
  cta: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    backgroundColor: colors.fg,
    borderRadius: radius.pill,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
  },
  ctaPressed: {
    opacity: 0.88,
  },
  ctaText: {
    fontSize: fontSize(13),
    fontWeight: "700",
    color: "#FFF",
  },
});
