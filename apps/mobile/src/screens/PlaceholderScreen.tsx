import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import {
  fontSize,
  scale,
  verticalScale,
} from "../utils/responsive";

type Props = {
  title: string;
  subtitle?: string;
};

/** Keyingi sahifalar uchun joy — agentlar keyin to'ldiriladi. */
export function PlaceholderScreen({ title, subtitle }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle ?? t("placeholder.pageDev")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: scale(24),
  },
  title: {
    fontSize: fontSize(20),
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: verticalScale(6),
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: colors.muted,
  },
});
