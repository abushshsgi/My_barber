import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  geocodeAddress,
  reverseGeocodeAddress,
  validateLocation,
  type GeocodeResult,
} from "../api/geo";
import {
  DEFAULT_MAP_REGION,
  OnboardingMap,
  type OnboardingMapHandle,
} from "../components/onboarding/OnboardingMap";
import { setGuestLocation } from "../lib/guest";
import type { LocationEntryMode } from "./GetStartedScreen";
import { colors } from "../theme/colors";

type Props = {
  onFinish: () => void;
  /** `search` — 4-chi ekran (qo'lda manzil); `map` — GPS/xarita. */
  initialMode?: LocationEntryMode;
};

/** Mehgon joylashuvi — qidiruv yoki xarita. */
export function LocationPickerScreen({
  onFinish,
  initialMode = "map",
}: Props) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<OnboardingMapHandle | null>(null);
  const reverseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gpsOnceRef = useRef(false);
  const finishingRef = useRef(false);

  const [mode, setMode] = useState<LocationEntryMode>(initialMode);
  const [lat, setLat] = useState(DEFAULT_MAP_REGION.latitude);
  const [lng, setLng] = useState(DEFAULT_MAP_REGION.longitude);
  const [addressLabel, setAddressLabel] = useState("Joylashuvni tanlang");
  const [cityLabel, setCityLabel] = useState("");
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  /** Xarita mount — ruxsat so'rovidan keyin (Android crash oldini olish). */
  const [mapReady, setMapReady] = useState(false);
  const [hasLocationPerm, setHasLocationPerm] = useState(false);

  const detectLocation = useCallback(async () => {
    setLocating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setHasLocationPerm(false);
        setError(
          Platform.OS === "web"
            ? "Joylashuv ruxsati berilmadi. Brauzerda ruxsatni yoqing."
            : "Joylashuv ruxsati berilmadi. Sozlamalardan joylashuvni yoqing.",
        );
        return;
      }
      setHasLocationPerm(true);
      const pos = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error("GPS topilmadi (timeout). Qayta urinib ko'ring.")),
            18_000,
          );
        }),
      ]);
      const nextLat = pos.coords.latitude;
      const nextLng = pos.coords.longitude;
      setLat(nextLat);
      setLng(nextLng);
      mapRef.current?.panTo(nextLat, nextLng);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Joylashuvni aniqlab bo'lmadi");
    } finally {
      setLocating(false);
    }
  }, []);

  const onMapCoords = useCallback((nextLat: number, nextLng: number) => {
    setLat(nextLat);
    setLng(nextLng);
  }, []);

  useEffect(() => {
    if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current);
    reverseTimerRef.current = setTimeout(() => {
      void reverseGeocodeAddress(lat, lng).then((r) => {
        if (!r) return;
        const full = r.full_name || r.address || r.city || "Tanlangan joy";
        setAddressLabel(full);
        setCityLabel(r.city || "");
      });
    }, 450);
    return () => {
      if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current);
    };
  }, [lat, lng]);

  // Xarita: avval ruxsat → keyin MapView (kalitsiz / erta mount crash bermasin).
  useEffect(() => {
    if (mode !== "map") {
      setMapReady(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const current = await Location.getForegroundPermissionsAsync();
        if (cancelled) return;
        if (current.status === "granted") {
          setHasLocationPerm(true);
        } else {
          const req = await Location.requestForegroundPermissionsAsync();
          if (cancelled) return;
          setHasLocationPerm(req.status === "granted");
        }
      } catch {
        if (!cancelled) setHasLocationPerm(false);
      } finally {
        if (!cancelled) setMapReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  // GPS bir marta — xarita ochilgandan keyin.
  useEffect(() => {
    if (mode !== "map" || !mapReady) return;
    if (gpsOnceRef.current) return;
    gpsOnceRef.current = true;
    if (hasLocationPerm) {
      void detectLocation();
    }
  }, [mode, mapReady, hasLocationPerm, detectLocation]);

  useEffect(() => {
    if (mode !== "search") return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    let alive = true;
    setSearching(true);
    const t = setTimeout(() => {
      void geocodeAddress(q).then((rows) => {
        if (!alive) return;
        setSearchResults(rows);
        setSearching(false);
      });
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [searchQuery, mode]);

  const openMap = useCallback(() => {
    setMode("map");
    setSearchQuery("");
    setSearchResults([]);
    setError(null);
  }, []);

  const openSearch = useCallback(() => {
    setMode("search");
    setSearchQuery("");
    setSearchResults([]);
    setError(null);
  }, []);

  const pickSearchResult = (item: GeocodeResult) => {
    setLat(item.lat);
    setLng(item.lng);
    setAddressLabel(item.full_name || item.address || item.city);
    setCityLabel(item.city || "");
    setMode("map");
    setSearchQuery("");
    setSearchResults([]);
    requestAnimationFrame(() => {
      mapRef.current?.panTo(item.lat, item.lng);
    });
  };

  const onConfirm = async () => {
    if (finishingRef.current || locating) return;
    finishingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const geo = await validateLocation(lat, lng).catch(() => null);
      await setGuestLocation({
        latitude: lat,
        longitude: lng,
        address: addressLabel,
        region: geo?.region_from_gps,
      });
      onFinish();
    } catch (e) {
      finishingRef.current = false;
      setSaving(false);
      setError(e instanceof Error ? e.message : "Saqlashda xatolik");
    }
  };

  const busy = saving || locating;
  const streetLine = addressLabel.split(",")[0]?.trim() || addressLabel;

  // ——— 4-chi ekran: qo'lda manzil qidiruv ———
  if (mode === "search") {
    return (
      <View
        style={[
          styles.searchRoot,
          {
            paddingTop: insets.top + 8,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <View style={styles.searchNav}>
          <Pressable
            onPress={openMap}
            hitSlop={10}
            style={styles.backCircle}
            accessibilityLabel="Orqaga"
          >
            <Ionicons name="arrow-back" size={22} color={colors.fg} />
          </Pressable>
          <Text style={styles.searchNavTitle}>Joylashuvni tanlang</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.searchField}>
          <Ionicons name="search" size={20} color={colors.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Ko'cha, mahalla yoki manzil"
            placeholderTextColor={colors.muted}
            autoFocus
            style={styles.searchFieldInput}
            returnKeyType="search"
            underlineColorAndroid="transparent"
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {searching ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={colors.fg} />
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item, i) => `${item.lat},${item.lng},${i}`}
            keyboardShouldPersistTaps="handled"
            style={styles.searchList}
            contentContainerStyle={styles.searchListContent}
            ListEmptyComponent={
              <Text style={styles.searchEmpty}>
                {searchQuery.trim().length >= 2
                  ? "Natija topilmadi"
                  : "Ko'cha yoki joy nomini yozing"}
              </Text>
            }
            ListFooterComponent={
              <Pressable style={styles.mapPickRow} onPress={openMap}>
                <View style={styles.mapPickIcon}>
                  <Ionicons name="map" size={20} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mapPickTitle}>Kartada tanlash</Text>
                  <Text style={styles.mapPickSub}>Xaritadan pin qo'ying</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            }
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.searchRow, pressed && styles.pressed]}
                onPress={() => pickSearchResult(item)}
              >
                <View style={styles.searchIconWrap}>
                  <Ionicons name="location" size={18} color={colors.fg} />
                </View>
                <View style={styles.searchRowBody}>
                  <Text style={styles.searchRowTitle} numberOfLines={1}>
                    {item.address || item.city || "Manzil"}
                  </Text>
                  <Text style={styles.searchRowSub} numberOfLines={2}>
                    {item.full_name || item.city}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
    );
  }

  // ——— Xarita ———
  return (
    <View style={styles.mapRoot}>
      {mapReady ? (
        <OnboardingMap
          ref={mapRef}
          latitude={lat}
          longitude={lng}
          onCoordsChange={onMapCoords}
          showUserLocation={hasLocationPerm}
        />
      ) : (
        <View style={styles.mapBoot}>
          <ActivityIndicator size="large" color={colors.fg} />
          <Text style={styles.mapBootText}>Xarita tayyorlanmoqda…</Text>
        </View>
      )}

      {/* Markaz pin + hint */}
      <View pointerEvents="none" style={styles.centerPinWrap}>
        <View style={styles.pinHint}>
          <Text style={styles.pinHintTitle}>Kirish joyini belgilang</Text>
          <Text style={styles.pinHintSub}>
            Markerni kerakli joyga torting — yaqin salonlar aniqroq chiqadi
          </Text>
        </View>
        <View style={styles.centerPinHead}>
          <Ionicons name="home" size={18} color="#FFF" />
        </View>
        <View style={styles.centerPinStem} />
        <View style={styles.pinDot} />
      </View>

      <View style={[styles.mapTopBar, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={openSearch}
          style={styles.backCircle}
          accessibilityLabel="Qidiruvga qaytish"
        >
          <Ionicons name="arrow-back" size={22} color={colors.fg} />
        </Pressable>
        <Pressable
          onPress={openSearch}
          style={styles.searchPill}
          disabled={busy}
          accessibilityLabel="Qidiruv"
        >
          <Ionicons name="search" size={18} color={colors.fg} />
          <Text style={styles.searchPillText}>Qidiruv</Text>
        </Pressable>
      </View>

      <Pressable
        style={[
          styles.gpsFab,
          { bottom: Math.max(insets.bottom, 16) + 200 },
          locating && styles.disabled,
        ]}
        onPress={() => void detectLocation()}
        disabled={busy}
        accessibilityLabel="GPS"
      >
        {locating ? (
          <ActivityIndicator color={colors.fg} />
        ) : (
          <Ionicons name="navigate" size={22} color={colors.fg} />
        )}
      </Pressable>

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 14) + 8 }]}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Manzilni tasdiqlang</Text>

        <View style={styles.addressRow}>
          <View style={styles.addressIcon}>
            <Ionicons name="home" size={18} color={colors.fg} />
          </View>
          <View style={styles.addressBody}>
            <Text style={styles.addressTitle} numberOfLines={1}>
              {streetLine}
            </Text>
            <Text style={styles.addressSub} numberOfLines={1}>
              {cityLabel || addressLabel}
            </Text>
          </View>
        </View>

        {error ? <Text style={styles.mapError}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.confirmBtn,
            (locating || saving) && styles.disabled,
            pressed && !busy && styles.pressed,
          ]}
          onPress={() => void onConfirm()}
          disabled={locating || saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.confirmText}>Manzilni tasdiqlash</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Search (4th screen)
  searchRoot: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
  },
  searchNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    marginBottom: 16,
  },
  searchNavTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
    color: colors.fg,
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      web: { boxShadow: "0 2px 10px rgba(0,0,0,0.08)" },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
      },
    }),
  },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 0,
  },
  searchFieldInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.fg,
    paddingVertical: 12,
    borderWidth: 0,
    ...(Platform.OS === "web"
      ? ({ outlineStyle: "none", outlineWidth: 0 } as object)
      : null),
  },
  searchList: { flex: 1 },
  searchListContent: { paddingTop: 12, paddingBottom: 32 },
  searchEmpty: {
    textAlign: "center",
    color: colors.muted,
    paddingVertical: 36,
    fontSize: 14,
    fontWeight: "500",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  searchIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  searchRowBody: { flex: 1, gap: 2, paddingTop: 2 },
  searchRowTitle: { fontSize: 15, color: colors.fg, fontWeight: "700" },
  searchRowSub: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "500",
    lineHeight: 18,
  },
  mapPickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  mapPickIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  mapPickTitle: { fontSize: 15, fontWeight: "800", color: colors.fg },
  mapPickSub: { marginTop: 2, fontSize: 12, fontWeight: "500", color: colors.muted },

  // Map
  mapRoot: { flex: 1, backgroundColor: "#EEF0F3", position: "relative" },
  mapBoot: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#EEF0F3",
  },
  mapBootText: { fontSize: 14, fontWeight: "600", color: colors.muted },
  mapTopBar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 14,
    zIndex: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  searchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: "#FFF",
    ...Platform.select({
      web: { boxShadow: "0 2px 12px rgba(0,0,0,0.12)" },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
      },
    }),
  },
  searchPillText: { fontSize: 15, fontWeight: "700", color: colors.fg },
  gpsFab: {
    position: "absolute",
    right: 16,
    zIndex: 3,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: { boxShadow: "0 4px 14px rgba(0,0,0,0.14)" },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.16,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        elevation: 5,
      },
    }),
  },
  centerPinWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "38%",
    alignItems: "center",
    zIndex: 2,
    marginTop: -64,
  },
  pinHint: {
    maxWidth: 300,
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    ...Platform.select({
      web: { boxShadow: "0 6px 20px rgba(0,0,0,0.12)" },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      },
    }),
  },
  pinHintTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.fg,
    textAlign: "center",
  },
  pinHintSub: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
    color: colors.muted,
    textAlign: "center",
  },
  centerPinHead: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFF",
    ...Platform.select({
      web: { boxShadow: "0 4px 12px rgba(0,0,0,0.28)" },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.28,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 5,
      },
    }),
  },
  centerPinStem: {
    width: 3,
    height: 12,
    backgroundColor: colors.fg,
    borderRadius: 2,
    marginTop: -2,
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(10,10,10,0.35)",
    marginTop: 2,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 4,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 14,
    ...Platform.select({
      web: { boxShadow: "0 -8px 28px rgba(0,0,0,0.1)" },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -4 },
        elevation: 12,
      },
    }),
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E5EA",
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.4,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  addressIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  addressBody: { flex: 1, gap: 2 },
  addressTitle: { fontSize: 16, fontWeight: "800", color: colors.fg },
  addressSub: { fontSize: 13, fontWeight: "500", color: colors.muted },
  mapError: {
    textAlign: "center",
    backgroundColor: "#FFF0F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: "600",
    color: "#FF3B30",
  },
  confirmBtn: {
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.88 },
});
