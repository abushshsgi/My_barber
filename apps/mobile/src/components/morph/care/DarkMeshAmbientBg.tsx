import { StyleSheet, View } from "react-native";
import { SOFT_PAPER } from "../../../theme/morph-appearance";

/** Soft Paper ambient — parvarish / care fon. */
export function DarkMeshAmbientBg() {
  return <View pointerEvents="none" style={styles.root} />;
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SOFT_PAPER.bg,
  },
});
