import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

/** Yengil AI fon — binafsha/krem bloblar. */
export function ChatAmbientBg() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={["#F7F3FF", "#F4F1EA", "#FAF8F5"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.blobTop} />
      <View style={styles.blobRight} />
      <View style={styles.blobBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  blobTop: {
    position: "absolute",
    top: -80,
    left: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(167, 139, 250, 0.18)",
  },
  blobRight: {
    position: "absolute",
    top: 120,
    right: -90,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(6, 182, 212, 0.08)",
  },
  blobBottom: {
    position: "absolute",
    bottom: 80,
    left: "18%",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(124, 58, 237, 0.07)",
  },
});
