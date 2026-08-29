import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = {
  title: string;
  linkLabel?: string;
  onPressLink?: () => void;
};

export function SectionHeader({ title, linkLabel = "Hammasi", onPressLink }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {onPressLink ? (
        <Pressable onPress={onPressLink} style={styles.link} hitSlop={8}>
          <Text style={styles.linkText}>{linkLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(14),
  },
  title: {
    fontSize: fontSize(15),
    fontWeight: "700",
    color: colors.fg,
    letterSpacing: -0.2,
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(2),
  },
  linkText: {
    fontSize: fontSize(11),
    fontWeight: "600",
    color: colors.muted,
  },
});
