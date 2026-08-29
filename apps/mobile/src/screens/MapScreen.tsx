import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from "react-native-maps";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchSalonsNearby } from "../api/catalog";
import type { ApiNearbySalon } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { LIGHT_MAP_STYLE } from "../components/onboarding/mapStyles";
import { DEFAULT_MAP_REGION } from "../components/onboarding/OnboardingMap";
import { getGuestLocation } from "../lib/guest";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { scaleFont } from "../theme/layout";
import { colors } from "../theme/colors";
import {
  moderateScale,
  scale,
  verticalScale,
} from "../utils/responsive";

function parseCoord(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

type MapSalon = {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceKm: number;
  rating: number;
};

function toMapSalon(row: ApiNearbySalon): MapSalon | null {
  const lat = parseCoord(row.salon.latitude);
  const lng = parseCoord(row.salon.longitude);
  if (lat == null || lng == null) return null;
  return {
    id: row.salon.id,
    name: row.salon.name,
    address: row.salon.address || "",
    lat,
    lng,
    distanceKm: row.distance_km ?? 0,
    rating: row.salon.rating_avg ?? 0,
  };
}

/** Asosiy Xarita tab — yaqin salonlar markerlari. */
export function MapScreen() {
  const insets = useSafeAreaInsets();
  const tabBarH = useBottomTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width, height } = useWindowDimensions();
  const { user } = useAuth();
  const mapRef = useRef<MapView | null>(null);
  const fs = (n: number) => scaleFont(n, width);

  const [region, setRegion] = useState<Region>(DEFAULT_MAP_REGION);
  const [salons, setSalons] = useState<MapSalon[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [showUser, setShowUser] = useState(false);

  const sheetH = Math.min(Math.max(height * 0.26, 160), 230);
  const mapBottomPad = sheetH + 8;

  const loadAround = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);
    try {
      const nearby = await fetchSalonsNearby(lat, lng, 40);
      const mapped = nearby.map(toMapSalon).filter((s): s is MapSalon => !!s);
      setSalons(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Salonlar yuklanmadi");
      setSalons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyCenter = useCallback(
    (lat: number, lng: number, animate = true) => {
      const next: Region = {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.045,
        longitudeDelta: 0.045,
      };
      setRegion(next);
      if (animate) {
        mapRef.current?.animateToRegion(next, 400);
      }
      void loadAround(lat, lng);
    },
    [loadAround],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const guest = await getGuestLocation();
      const lat =
        parseCoord(user?.latitude) ?? guest?.latitude ?? DEFAULT_MAP_REGION.latitude;
      const lng =
        parseCoord(user?.longitude) ?? guest?.longitude ?? DEFAULT_MAP_REGION.longitude;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!cancelled) {
          setShowUser(status === "granted");
          setMapReady(true);
        }
      } catch {
        if (!cancelled) setMapReady(true);
      }

      if (!cancelled) applyCenter(lat, lng, false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.latitude, user?.longitude, applyCenter]);

  const goMyLocation = useCallback(async () => {
    setLocating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Joylashuv ruxsati kerak");
        return;
      }
      setShowUser(true);
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      applyCenter(pos.coords.latitude, pos.coords.longitude);
    } catch (e) {
      setError(e instanceof Error ? e.message : "GPS topilmadi");
    } finally {
      setLocating(false);
    }
  }, [applyCenter]);

  const onOpenSalon = useCallback(
    (s: MapSalon) => {
      navigation.navigate("SalonDetail", {
        salonId: String(s.id),
        distanceKm: s.distanceKm,
      });
    },
    [navigation],
  );

  const onSelectSalon = useCallback((s: MapSalon) => {
    setSelectedId(s.id);
    mapRef.current?.animateToRegion(
      {
        latitude: s.lat,
        longitude: s.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      350,
    );
  }, []);

  const selected = useMemo(
    () => salons.find((s) => s.id === selectedId) ?? null,
    [salons, selectedId],
  );

  return (
    <View style={styles.root}>
      {mapReady ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          initialRegion={region}
          customMapStyle={Platform.OS === "ios" ? LIGHT_MAP_STYLE : undefined}
          userInterfaceStyle="light"
          showsUserLocation={showUser}
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
          loadingEnabled
          mapPadding={{ top: insets.top + 56, right: 12, bottom: mapBottomPad + tabBarH, left: 12 }}
          onRegionChangeComplete={(r) => setRegion(r)}
        >
          {salons.map((s) => (
            <Marker
              key={s.id}
              coordinate={{ latitude: s.lat, longitude: s.lng }}
              title={s.name}
              description={s.address}
              pinColor={s.id === selectedId ? "#FF5C5C" : "#0A0A0A"}
              onPress={() => onSelectSalon(s)}
            />
          ))}
        </MapView>
      ) : (
        <View style={styles.mapBoot}>
          <ActivityIndicator color={colors.fg} size="large" />
        </View>
      )}

      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={styles.titlePill}>
          <Ionicons name="map" size={14} color={colors.fg} />
          <Text style={[styles.titleText, { fontSize: fs(14) }]}>Xarita</Text>
        </View>
        <Pressable style={styles.locBtn} onPress={goMyLocation} disabled={locating}>
          {locating ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Ionicons name="locate" size={18} color="#FFF" />
          )}
        </Pressable>
      </View>

      <View
        style={[
          styles.sheet,
          {
            height: sheetH,
            bottom: tabBarH,
            paddingBottom: 10,
          },
        ]}
      >
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHead}>
          <Text style={[styles.sheetTitle, { fontSize: fs(15) }]}>
            Yaqin salonlar
          </Text>
          <Text style={[styles.sheetCount, { fontSize: fs(12) }]}>
            {loading ? "…" : `${salons.length} ta`}
          </Text>
        </View>
        {error ? <Text style={[styles.err, { fontSize: fs(12) }]}>{error}</Text> : null}
        {selected ? (
          <Text style={[styles.selectedHint, { fontSize: fs(12) }]} numberOfLines={1}>
            Tanlangan: {selected.name}
          </Text>
        ) : null}
        {loading && salons.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 16 }} color={colors.fg} />
        ) : (
          <FlatList
            data={salons}
            keyExtractor={(item) => String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listPad}
            initialNumToRender={6}
            windowSize={5}
            maxToRenderPerBatch={6}
            removeClippedSubviews
            renderItem={({ item }) => {
              const active = item.id === selectedId;
              return (
                <Pressable
                  style={[styles.card, active && styles.cardActive, { width: Math.min(width * 0.62, 220) }]}
                  onPress={() => onOpenSalon(item)}
                  onLongPress={() => onSelectSalon(item)}
                >
                  <Text style={[styles.cardName, { fontSize: fs(13) }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.cardMeta, { fontSize: fs(11) }]} numberOfLines={1}>
                    {item.distanceKm > 0
                      ? `${item.distanceKm.toFixed(1)} km`
                      : item.address || "Manzil"}
                    {item.rating > 0 ? ` · ★ ${item.rating.toFixed(1)}` : ""}
                  </Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              !loading ? (
                <Text style={[styles.empty, { fontSize: fs(12) }]}>
                  Bu atrofda salon topilmadi
                </Text>
              ) : null
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  mapBoot: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scale(14),
    zIndex: 2,
  },
  titlePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(6),
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  titleText: { fontWeight: "800", color: colors.fg },
  locBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(20),
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: moderateScale(22),
    borderTopRightRadius: moderateScale(22),
    paddingTop: verticalScale(8),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    zIndex: 2,
  },
  sheetHandle: {
    alignSelf: "center",
    width: scale(36),
    height: verticalScale(4),
    borderRadius: moderateScale(2),
    backgroundColor: colors.border,
    marginBottom: verticalScale(8),
  },
  sheetHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(6),
  },
  sheetTitle: { fontWeight: "800", color: colors.fg },
  sheetCount: { color: colors.muted, fontWeight: "600" },
  selectedHint: {
    paddingHorizontal: scale(16),
    color: colors.muted,
    marginBottom: verticalScale(4),
  },
  err: { paddingHorizontal: scale(16), color: "#EF4444", marginBottom: verticalScale(4) },
  listPad: { paddingHorizontal: scale(14), gap: moderateScale(10), paddingTop: verticalScale(4) },
  card: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(14),
    padding: moderateScale(12),
    borderWidth: 1,
    borderColor: "transparent",
  },
  cardActive: {
    borderColor: colors.fg,
    backgroundColor: "#FFF",
  },
  cardName: { fontWeight: "700", color: colors.fg },
  cardMeta: { marginTop: verticalScale(4), color: colors.muted },
  empty: { color: colors.muted, paddingHorizontal: scale(8), paddingTop: verticalScale(12) },
});
