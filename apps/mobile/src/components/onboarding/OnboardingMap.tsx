import { forwardRef, useImperativeHandle, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import MapView, { PROVIDER_GOOGLE, type Region } from "react-native-maps";
import { LIGHT_MAP_STYLE } from "./mapStyles";

export const DEFAULT_MAP_REGION: Region = {
  latitude: 41.3111,
  longitude: 69.2797,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

export type OnboardingMapHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  panTo: (lat: number, lng: number) => void;
};

type Props = {
  latitude: number;
  longitude: number;
  onCoordsChange: (lat: number, lng: number) => void;
  /** GPS ruxsati berilgandan keyin yoqiladi — aks holda Android crash. */
  showUserLocation?: boolean;
};

/** Native xarita; markaz pin tashqarida. */
export const OnboardingMap = forwardRef<OnboardingMapHandle, Props>(
  function OnboardingMap(
    { latitude, longitude, onCoordsChange, showUserLocation = false },
    ref,
  ) {
    const mapRef = useRef<MapView | null>(null);
    const skipRef = useRef(false);
    const deltaRef = useRef(DEFAULT_MAP_REGION.latitudeDelta);
    const centerRef = useRef({ lat: latitude, lng: longitude });
    const onCoordsRef = useRef(onCoordsChange);
    onCoordsRef.current = onCoordsChange;

    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        const { lat, lng } = centerRef.current;
        deltaRef.current = Math.max(deltaRef.current * 0.55, 0.002);
        skipRef.current = true;
        mapRef.current?.animateToRegion(
          {
            latitude: lat,
            longitude: lng,
            latitudeDelta: deltaRef.current,
            longitudeDelta: deltaRef.current,
          },
          220,
        );
      },
      zoomOut: () => {
        const { lat, lng } = centerRef.current;
        deltaRef.current = Math.min(deltaRef.current * 1.8, 0.4);
        skipRef.current = true;
        mapRef.current?.animateToRegion(
          {
            latitude: lat,
            longitude: lng,
            latitudeDelta: deltaRef.current,
            longitudeDelta: deltaRef.current,
          },
          220,
        );
      },
      panTo: (nextLat, nextLng) => {
        centerRef.current = { lat: nextLat, lng: nextLng };
        skipRef.current = true;
        mapRef.current?.animateToRegion(
          {
            latitude: nextLat,
            longitude: nextLng,
            latitudeDelta: deltaRef.current,
            longitudeDelta: deltaRef.current,
          },
          450,
        );
      },
    }));

    return (
      <View style={styles.fill}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          initialRegion={{
            latitude,
            longitude,
            latitudeDelta: deltaRef.current,
            longitudeDelta: deltaRef.current,
          }}
          // Android: custom style ba'zan tile yuklanishini yashiradi — faqat iOS.
          customMapStyle={Platform.OS === "ios" ? LIGHT_MAP_STYLE : undefined}
          userInterfaceStyle="light"
          onMapReady={() => {
            // Markazni qayta qo'yish — ba'zi Android qurilmalarda bo'sh tile oldini oladi.
            const { lat, lng } = centerRef.current;
            skipRef.current = true;
            mapRef.current?.animateToRegion(
              {
                latitude: lat,
                longitude: lng,
                latitudeDelta: deltaRef.current,
                longitudeDelta: deltaRef.current,
              },
              0,
            );
          }}
          onRegionChangeComplete={(region) => {
            deltaRef.current = region.latitudeDelta;
            centerRef.current = { lat: region.latitude, lng: region.longitude };
            if (skipRef.current) {
              skipRef.current = false;
              return;
            }
            onCoordsRef.current(region.latitude, region.longitude);
          }}
          showsUserLocation={showUserLocation}
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          showsTraffic={false}
          showsBuildings={false}
          showsIndoors={false}
          showsPointsOfInterests={false}
          toolbarEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          moveOnMarkerPress={false}
          zoomEnabled
          scrollEnabled
          loadingEnabled
          loadingIndicatorColor="#0A0A0A"
          loadingBackgroundColor="#EEF0F3"
          liteMode={false}
          mapType="standard"
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  fill: { flex: 1 },
  map: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
