import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { morfMark } from "../../../branding/morf-logo";
import { moderateScale, scale, verticalScale } from "../../../utils/responsive";

/** Katalog kartochkasi — Morf belgisi (rasmga logo bosilmaydi). */
export function CareCatalogMark() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Image source={morfMark} style={styles.mark} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: verticalScale(6),
    left: scale(6),
    width: scale(22),
    height: scale(22),
    borderRadius: moderateScale(11),
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
  },
  mark: { width: scale(13), height: scale(13) },
});
