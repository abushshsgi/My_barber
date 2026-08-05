import { useEffect, useRef, useState } from "react";
import { Appearance, Platform, StyleSheet, useColorScheme } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from "react-native-maps";
import { mapStyleForScheme } from "./mapStyles";

export const DEFAULT_MAP_REGION: Region = {
  latitude: 41.3111,
  longitude: 69.2797,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

type Props = {
  latitude: number | null;
  longitude: number | null;
};

/** Native — faqat joylashuv: POI/kartochka yo'q, Google UI yo'q, dark/light tema. */
export function OnboardingMap({ latitude, longitude }: Props) {
  const mapRef = useRef<MapView | null>(null);
  const systemScheme = useColorScheme();
  const [scheme, setScheme] = useState<"light" | "dark">(
    () => (Appearance.getColorScheme() === "dark" ? "dark" : "light"),
  );

  useEffect(() => {
    setScheme(systemScheme === "dark" ? "dark" : "light");
  }, [systemScheme]);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setScheme(colorScheme === "dark" ? "dark" : "light");
    });
    return () => sub.remove();
  }, []);

  const lat = latitude ?? DEFAULT_MAP_REGION.latitude;
  const lng = longitude ?? DEFAULT_MAP_REGION.longitude;
  const customMapStyle = mapStyleForScheme(scheme);

  useEffect(() => {
    if (latitude == null || longitude == null) return;
    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      },
      450,
    );
  }, [latitude, longitude]);

  return (
    <MapView
      ref={mapRef}
      style={styles.fill}
      provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
      initialRegion={{
        ...DEFAULT_MAP_REGION,
        latitude: lat,
        longitude: lng,
      }}
      customMapStyle={customMapStyle}
      userInterfaceStyle={scheme}
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass={false}
      showsScale={false}
      showsTraffic={false}
      showsBuildings={false}
      showsIndoors={false}
      showsPointsOfInterests={false}
      toolbarEnabled={false}
      rotateEnabled
      scrollEnabled
      zoomEnabled
      pitchEnabled={false}
      moveOnMarkerPress={false}
    >
      {latitude != null && longitude != null ? (
        <Marker
          coordinate={{ latitude, longitude }}
          pinColor="#FF5C5C"
          tappable={false}
        />
      ) : null}
    </MapView>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill },
});
