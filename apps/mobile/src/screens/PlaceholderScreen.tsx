import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";

type Props = {
  title: string;
  subtitle?: string;
};

/** Keyingi sahifalar uchun joy — agentlar keyin to'ldiriladi. */
export function PlaceholderScreen({ title, subtitle }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        {subtitle ?? "Bu sahifa keyingi bosqichda React Native da yoziladi."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
});
