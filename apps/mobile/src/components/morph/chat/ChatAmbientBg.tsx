import { StyleSheet, View } from "react-native";
import { useMorphAppearance } from "../../../lib/MorphAppearanceContext";

/** Soft Paper ambient — theme palette fon. */
export function ChatAmbientBg() {
  const { colors } = useMorphAppearance();
  return (
    <View
      pointerEvents="none"
      style={[styles.root, { backgroundColor: colors.bg }]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
