import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeTop } from "../lib/safe-area";
import { colors } from "../theme/colors";
import {
  fontSize,
  moderateScale,
  radius,
  scale,
  spacing,
  verticalScale,
} from "../utils/responsive";

/** MySaloon shell faqat tez orada salonlar qo'shiladi degan xabarni ko'rsatadi. */
export function MysaloonBlockedMessage() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: safeTop(insets.top, 16) }]}>
      <View style={styles.iconWrap}>
        <Ionicons name="storefront-outline" size={scale(56)} color={colors.fg} />
      </View>
      <Text style={styles.title}>{t("comingSoon.title")}</Text>
      <Text style={styles.sub}>{t("comingSoon.sub")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(24),
  },
  iconWrap: {
    width: scale(80),
    height: scale(80),
    borderRadius: moderateScale(24),
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize(20),
    fontWeight: "800",
    letterSpacing: -0.4,
    color: colors.fg,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  sub: {
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    color: colors.muted,
    textAlign: "center",
  },
});
