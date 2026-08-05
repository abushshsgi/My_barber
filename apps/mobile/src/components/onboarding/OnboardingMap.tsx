import { useEffect, useRef } from "react";
import { Platform, StyleSheet } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from "react-native-maps";

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

/** Native — Android Google Maps / iOS Apple Maps. */
export function OnboardingMap({ latitude, longitude }: Props) {
  const mapRef = useRef<MapView | null>(null);
  const lat = latitude ?? DEFAULT_MAP_REGION.latitude;
  const lng = longitude ?? DEFAULT_MAP_REGION.longitude;

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
      showsUserLocation
      showsMyLocationButton={false}
      toolbarEnabled={false}
    >
      {latitude != null && longitude != null ? (
        <Marker coordinate={{ latitude, longitude }} pinColor="#FF5C5C" />
      ) : null}
    </MapView>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill },
});
