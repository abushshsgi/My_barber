import { StyleSheet, View } from "react-native";
import { SOFT_PAPER } from "../../../theme/morph-appearance";

/** Soft Paper ambient — parvarish / care fon. */
export function DarkMeshAmbientBg() {
  return <View pointerEvents="none" style={styles.root} />;
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SOFT_PAPER.bg,
  },
});
