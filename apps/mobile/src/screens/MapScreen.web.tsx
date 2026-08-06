import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchSalonsNearby } from "../api/catalog";
import type { ApiNearbySalon } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { DEFAULT_MAP_REGION } from "../components/onboarding/OnboardingMap";
import { getGuestLocation } from "../lib/guest";
import { scaleFont } from "../theme/layout";
import { colors } from "../theme/colors";

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

/**
 * Web preview — react-native-maps webda crash beradi.
 * Native MapScreen.tsx Android/iOS da qoladi.
 */
export function MapScreen() {
  const insets = useSafeAreaInsets();
  const tabBarH = useBottomTabBarHeight();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const fs = (n: number) => scaleFont(n, width);

  const [salons, setSalons] = useState<MapSalon[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [centerLabel, setCenterLabel] = useState("Joylashuv");

  const loadAround = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);
    try {
      const nearby = await fetchSalonsNearby(lat, lng, 40);
      const mapped = nearby.map(toMapSalon).filter((s): s is MapSalon => !!s);
      setSalons(mapped);
      setCenterLabel(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Salonlar yuklanmadi");
      setSalons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const guest = await getGuestLocation();
      const lat =
        parseCoord(user?.latitude) ?? guest?.latitude ?? DEFAULT_MAP_REGION.latitude;
      const lng =
        parseCoord(user?.longitude) ?? guest?.longitude ?? DEFAULT_MAP_REGION.longitude;
      if (!cancelled) void loadAround(lat, lng);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.latitude, user?.longitude, loadAround]);

  const goMyLocation = useCallback(async () => {
    setLocating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Joylashuv ruxsati kerak");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await loadAround(pos.coords.latitude, pos.coords.longitude);
    } catch (e) {
      setError(e instanceof Error ? e.message : "GPS topilmadi");
    } finally {
      setLocating(false);
    }
  }, [loadAround]);

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 10) }]}>
      <View style={styles.topBar}>
        <View style={styles.titlePill}>
          <Ionicons name="map" size={14} color={colors.fg} />
          <Text style={[styles.titleText, { fontSize: fs(14) }]}>Xarita</Text>
        </View>
        <Pressable style={styles.locBtn} onPress={() => void goMyLocation()} disabled={locating}>
          {locating ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Ionicons name="locate" size={18} color="#FFF" />
          )}
        </Pressable>
      </View>

      <Text style={[styles.hint, { fontSize: fs(12) }]}>
        Web preview — to‘liq xarita Android/iOS APKda. Markaz: {centerLabel}
      </Text>

      {error ? <Text style={[styles.err, { fontSize: fs(12) }]}>{error}</Text> : null}

      <Text style={[styles.section, { fontSize: fs(15) }]}>
        Yaqin salonlar {loading ? "…" : `(${salons.length})`}
      </Text>

      {loading && salons.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.fg} />
      ) : (
        <FlatList
          data={salons}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.listPad, { paddingBottom: tabBarH + 24 }]}
          renderItem={({ item }) => {
            const active = item.id === selectedId;
            return (
              <Pressable
                style={[styles.card, active && styles.cardActive]}
                onPress={() => setSelectedId(item.id)}
              >
                <Text style={[styles.cardName, { fontSize: fs(14) }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.cardMeta, { fontSize: fs(12) }]} numberOfLines={2}>
                  {item.address || "Manzil"}
                  {item.distanceKm > 0 ? ` · ${item.distanceKm.toFixed(1)} km` : ""}
                  {item.rating > 0 ? ` · ★ ${item.rating.toFixed(1)}` : ""}
                </Text>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            !loading ? (
              <Text style={[styles.empty, { fontSize: fs(13) }]}>
                Bu atrofda salon topilmadi
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titlePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  titleText: { fontWeight: "800", color: colors.fg },
  locBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { color: colors.muted, marginBottom: 10, fontWeight: "500" },
  err: { color: "#EF4444", marginBottom: 8 },
  section: { fontWeight: "800", color: colors.fg, marginBottom: 10 },
  listPad: { gap: 10 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "transparent",
  },
  cardActive: {
    borderColor: colors.fg,
    backgroundColor: "#FFF",
  },
  cardName: { fontWeight: "700", color: colors.fg },
  cardMeta: { marginTop: 4, color: colors.muted },
  empty: { color: colors.muted, paddingTop: 24, textAlign: "center" },
});
