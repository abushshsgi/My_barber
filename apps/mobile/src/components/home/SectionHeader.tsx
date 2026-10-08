import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useShellTheme } from "../../lib/useShellTheme";
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
  const pal = useShellTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: pal.fg }]}>{title}</Text>
      {onPressLink ? (
        <Pressable onPress={onPressLink} style={styles.link} hitSlop={8}>
          <Text style={[styles.linkText, { color: pal.muted }]}>{linkLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={pal.muted} />
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
    color: "#111111",
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
    color: "#737373",
  },
});
