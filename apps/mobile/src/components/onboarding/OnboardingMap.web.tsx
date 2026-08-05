import { createElement } from "react";
import { StyleSheet, View } from "react-native";

export const DEFAULT_MAP_REGION = {
  latitude: 41.3111,
  longitude: 69.2797,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

type Props = {
  latitude: number | null;
  longitude: number | null;
};

/** Web — Google Maps embed (react-native-maps webda ishlamaydi). */
export function OnboardingMap({ latitude, longitude }: Props) {
  const lat = latitude ?? DEFAULT_MAP_REGION.latitude;
  const lng = longitude ?? DEFAULT_MAP_REGION.longitude;
  const q = encodeURIComponent(`${lat},${lng}`);
  const src = `https://www.google.com/maps?q=${q}&z=16&output=embed`;

  return (
    <View style={styles.fill}>
      {createElement("iframe", {
        title: "Google Maps",
        src,
        style: { border: 0, width: "100%", height: "100%" },
        loading: "lazy",
        referrerPolicy: "no-referrer-when-downgrade",
        allowFullScreen: true,
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill },
});
