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
  geocodeResultSubtitle,
  geocodeResultTitle,
  reverseGeocodeAddress,
  validateLocation,
  type GeocodeResult,
} from "../api/geo";
import {
  DEFAULT_MAP_REGION,
  OnboardingMap,
  type OnboardingMapHandle,
} from "../components/onboarding/OnboardingMap";
import { AppStatusBar, safeBottom, safeTop } from "../components/ui/AppStatusBar";
import { setGuestLocation } from "../lib/guest";
import type { LocationEntryMode } from "./GetStartedScreen";
import { colors } from "../theme/colors";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../utils/responsive";

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
  const [searchError, setSearchError] = useState<string | null>(null);
  /** Xarita ruxsatdan qat'i nazar ochiladi — permission hang mapni bloklamasin. */
  const [mapReady, setMapReady] = useState(true);
  const [hasLocationPerm, setHasLocationPerm] = useState(false);
  const [sheetH, setSheetH] = useState(200);

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

  // Ruxsat fonida — xarita allaqachon ochiq.
  useEffect(() => {
    if (mode !== "map") return;
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
      setSearchError(null);
      return;
    }
    let alive = true;
    setSearching(true);
    setSearchError(null);
    const t = setTimeout(() => {
      void geocodeAddress(q)
        .then((rows) => {
          if (!alive) return;
          setSearchResults(rows);
          setSearching(false);
          if (rows.length === 0) {
            setSearchError("Natija topilmadi — boshqa nom yoki shahar bilan urinib ko'ring");
          }
        })
        .catch((e) => {
          if (!alive) return;
          setSearchResults([]);
          setSearching(false);
          setSearchError(
            e instanceof Error ? e.message : "Qidiruv xatosi. Internetni tekshiring.",
          );
        });
    }, 320);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [searchQuery, mode]);

  const openMap = useCallback(() => {
    setMode("map");
    setMapReady(true);
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
    setMapReady(true);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(null);
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
  const subLine = cityLabel && cityLabel !== streetLine ? cityLabel : "";
  // GPS FAB pastki sheetdan aniq ajralib tursin
  const gpsBottom = Math.max(insets.bottom, 12) + sheetH + 28;

  if (mode === "search") {
    return (
      <View
        style={[
          styles.searchRoot,
          {
            paddingTop: safeTop(insets.top, 8),
            paddingBottom: safeBottom(insets.bottom, 0),
          },
        ]}
      >
        <AppStatusBar style="dark" />
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
                  ? searchError || "Natija topilmadi"
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
                    {geocodeResultTitle(item)}
                  </Text>
                  {geocodeResultSubtitle(item) ? (
                    <Text style={styles.searchRowSub} numberOfLines={2}>
                      {geocodeResultSubtitle(item)}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.mapRoot}>
      <AppStatusBar style="dark" />
      <View style={styles.mapLayer}>
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
          </View>
        )}
      </View>

      {/* Faqat markaz pin — yonida matn yo'q */}
      <View pointerEvents="none" style={styles.centerPinWrap}>
        <View style={styles.centerPinHead}>
          <Ionicons name="home" size={18} color="#FFF" />
        </View>
        <View style={styles.centerPinStem} />
        <View style={styles.pinDot} />
      </View>

      <View style={[styles.mapTopBar, { paddingTop: safeTop(insets.top, 10) }]}>
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

      {/* GPS — pastki sheet ustida, yashirmaslik */}
      <Pressable
        style={[styles.gpsFab, { bottom: gpsBottom }, locating && styles.disabled]}
        onPress={() => void detectLocation()}
        disabled={busy}
        accessibilityLabel="Joylashuvni aniqlash"
      >
        {locating ? (
          <ActivityIndicator color={colors.fg} />
        ) : (
          <Ionicons name="navigate" size={22} color={colors.fg} />
        )}
      </Pressable>

      <View
        style={[styles.sheet, { paddingBottom: safeBottom(insets.bottom, 8) }]}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 80 && Math.abs(h - sheetH) > 2) setSheetH(h);
        }}
      >
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Manzilni tasdiqlang</Text>

        <View style={styles.addressRow}>
          <View style={styles.addressIcon}>
            <Ionicons name="location" size={18} color={colors.fg} />
          </View>
          <View style={styles.addressBody}>
            <Text style={styles.addressTitle} numberOfLines={2}>
              {streetLine}
            </Text>
            {subLine ? (
              <Text style={styles.addressSub} numberOfLines={1}>
                {subLine}
              </Text>
            ) : null}
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
  searchRoot: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: scale(20),
  },
  searchNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: verticalScale(48),
    marginBottom: verticalScale(16),
  },
  searchNavTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: fontSize(16),
    fontWeight: "800",
    color: colors.fg,
  },
  backCircle: {
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(22),
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
    gap: moderateScale(12),
    minHeight: verticalScale(54),
    borderRadius: moderateScale(16),
    backgroundColor: colors.surface,
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(8),
    borderWidth: 0,
  },
  searchFieldInput: {
    flex: 1,
    fontSize: fontSize(15),
    fontWeight: "600",
    color: colors.fg,
    paddingVertical: verticalScale(12),
    borderWidth: 0,
    ...(Platform.OS === "web"
      ? ({ outlineStyle: "none", outlineWidth: 0 } as object)
      : null),
  },
  searchList: { flex: 1 },
  searchListContent: { paddingTop: verticalScale(12), paddingBottom: verticalScale(32) },
  searchEmpty: {
    textAlign: "center",
    color: colors.muted,
    paddingVertical: verticalScale(36),
    fontSize: fontSize(13),
    fontWeight: "500",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: moderateScale(12),
    paddingVertical: verticalScale(14),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  searchIconWrap: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(20),
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  searchRowBody: { flex: 1, gap: moderateScale(2), paddingTop: verticalScale(2) },
  searchRowTitle: { fontSize: fontSize(14), color: colors.fg, fontWeight: "700" },
  searchRowSub: {
    fontSize: fontSize(12),
    color: colors.muted,
    fontWeight: "500",
    lineHeight: fontSize(17),
  },
  mapPickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(14),
    marginTop: verticalScale(20),
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(14),
    borderRadius: moderateScale(18),
    backgroundColor: colors.surface,
  },
  mapPickIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(22),
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  mapPickTitle: { fontSize: fontSize(14), fontWeight: "800", color: colors.fg },
  mapPickSub: { marginTop: verticalScale(2), fontSize: fontSize(11), fontWeight: "500", color: colors.muted },

  mapRoot: { flex: 1, backgroundColor: "#EEF0F3" },
  mapLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 0,
  },
  mapBoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF0F3",
  },
  mapTopBar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: scale(14),
    zIndex: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  searchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    minHeight: verticalScale(44),
    paddingHorizontal: scale(16),
    borderRadius: moderateScale(22),
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
  searchPillText: { fontSize: fontSize(14), fontWeight: "700", color: colors.fg },
  gpsFab: {
    position: "absolute",
    right: scale(16),
    zIndex: 6,
    width: scale(48),
    height: scale(48),
    borderRadius: moderateScale(24),
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
        elevation: 8,
      },
    }),
  },
  centerPinWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "42%",
    alignItems: "center",
    zIndex: 2,
    marginTop: -verticalScale(28),
  },
  centerPinHead: {
    width: scale(46),
    height: scale(46),
    borderRadius: moderateScale(23),
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
    width: scale(3),
    height: verticalScale(12),
    backgroundColor: colors.fg,
    borderRadius: moderateScale(2),
    marginTop: -verticalScale(2),
  },
  pinDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: moderateScale(4),
    backgroundColor: "rgba(10,10,10,0.35)",
    marginTop: verticalScale(2),
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 4,
    backgroundColor: "#FFF",
    borderTopLeftRadius: moderateScale(28),
    borderTopRightRadius: moderateScale(28),
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(10),
    gap: moderateScale(12),
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
    width: scale(40),
    height: verticalScale(4),
    borderRadius: moderateScale(2),
    backgroundColor: "#E5E5EA",
    marginBottom: verticalScale(4),
  },
  sheetTitle: {
    fontSize: fontSize(18),
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.3,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
  },
  addressIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(20),
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  addressBody: { flex: 1, gap: moderateScale(2) },
  addressTitle: { fontSize: fontSize(14), fontWeight: "800", color: colors.fg },
  addressSub: { fontSize: fontSize(12), fontWeight: "500", color: colors.muted },
  mapError: {
    textAlign: "center",
    backgroundColor: "#FFF0F0",
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    fontSize: fontSize(12),
    fontWeight: "600",
    color: "#FF3B30",
  },
  confirmBtn: {
    minHeight: verticalScale(52),
    borderRadius: moderateScale(26),
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: { color: "#FFF", fontSize: fontSize(15), fontWeight: "800" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.88 },
});
