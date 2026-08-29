import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { morphFont } from "../../theme/morph-font";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

/** Morph AI tab placeholder — qorong‘u uslub. */
export function MorphPlaceholderScreen({
  title,
  subtitle,
  icon = "sparkles-outline",
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const sub = subtitle ?? t("placeholder.comingSoon");
  return (
    <View style={[styles.root, { paddingTop: insets.top + 48 }]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={28} color="rgba(255,255,255,0.85)" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: scale(28),
    alignItems: "center",
  },
  iconWrap: {
    width: scale(56),
    height: scale(56),
    borderRadius: moderateScale(18),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },
  title: {
    marginTop: verticalScale(18),
    ...morphFont,
    fontSize: fontSize(18),
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  subtitle: {
    marginTop: verticalScale(8),
    maxWidth: scale(280),
    ...morphFont,
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },
});
