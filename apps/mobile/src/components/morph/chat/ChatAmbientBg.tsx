import { StyleSheet, View } from "react-native";
import { SOFT_PAPER } from "../../../theme/morph-appearance";

/** Soft Paper ambient — ochiq fon, gradient yo‘q. */
export function ChatAmbientBg() {
  return <View pointerEvents="none" style={styles.root} />;
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SOFT_PAPER.bg,
  },
});
