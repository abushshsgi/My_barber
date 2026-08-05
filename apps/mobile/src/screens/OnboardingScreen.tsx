import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
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
import { updateMe } from "../api/user";
import { useAuth } from "../auth/AuthContext";
import {
  DEFAULT_MAP_REGION,
  OnboardingMap,
  type OnboardingMapHandle,
} from "../components/onboarding/OnboardingMap";
import { roundCoord } from "../lib/onboarding";
import {
  sanitizeDisplayNameInput,
  validateDisplayName,
  type DisplayNameErrorKey,
} from "../lib/validate-display-name";
import { AccountCreatingScreen } from "./AccountCreatingScreen";
import { colors } from "../theme/colors";

const NAME_ERRORS: Record<DisplayNameErrorKey, string> = {
  nameRequired: "Ism va familiyani kiriting",
  nameInvalidChars: "Faqat harflar, bo'sh joy, defis (-) va apostrof (') ishlatiladi.",
  nameNeedsFull: "Ism va familiyani to'liq kiriting",
  namePartTooShort: "Har bir qism kamida 2 ta harfdan iborat bo'lishi kerak",
  nameTooLong: "Ism juda uzun",
  nameTooManyParts: "Ismda so'zlar soni juda ko'p",
};

const ACCENT = colors.brandDot;

function splitPrefillName(user: {
  first_name?: string;
  last_name?: string;
  full_name?: string;
}): { first: string; last: string } {
  const first = (user.first_name || "").trim();
  const last = (user.last_name || "").trim();
  if (first || last) {
    return {
      first: sanitizeDisplayNameInput(first),
      last: sanitizeDisplayNameInput(last),
    };
  }
  const full = (user.full_name || "").trim();
  if (!full) return { first: "", last: "" };
  const parts = full.split(/\s+/);
  return {
    first: sanitizeDisplayNameInput(parts[0] ?? ""),
    last: sanitizeDisplayNameInput(parts.slice(1).join(" ")),
  };
}

/**
 * Yangi user onboarding:
 * 1) Ism-sharif
 * 2) Yosh
 * 3) Xarita picker (GPS / qidiruv / zoom) → Tayyor → akkaunt
 */
export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshMe } = useAuth();
  const mapRef = useRef<OnboardingMapHandle | null>(null);
  const reverseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gpsOnceRef = useRef(false);
  const searchSlide = useRef(new Animated.Value(0)).current;
  const searchBackdropOp = useRef(new Animated.Value(0)).current;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [firstName, setFirstNameRaw] = useState("");
  const [lastName, setLastNameRaw] = useState("");
  const [age, setAge] = useState("");
  const [lat, setLat] = useState(DEFAULT_MAP_REGION.latitude);
  const [lng, setLng] = useState(DEFAULT_MAP_REGION.longitude);
  const [addressLabel, setAddressLabel] = useState("Joylashuvni tanlang");
  const [locating, setLocating] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const finishingRef = useRef(false);

  useEffect(() => {
    if (prefilled || !user) return;
    const p = splitPrefillName(user);
    if (p.first || p.last) {
      setFirstNameRaw(p.first);
      setLastNameRaw(p.last);
    }
    setPrefilled(true);
  }, [user, prefilled]);

  const setFirstName = useCallback((value: string) => {
    setNameTouched(true);
    setFirstNameRaw(sanitizeDisplayNameInput(value));
  }, []);

  const setLastName = useCallback((value: string) => {
    setNameTouched(true);
    setLastNameRaw(sanitizeDisplayNameInput(value));
  }, []);

  const nameValidation = useMemo(
    () => validateDisplayName(`${firstName} ${lastName}`),
    [firstName, lastName],
  );

  const nameError =
    nameTouched && !nameValidation.ok ? NAME_ERRORS[nameValidation.errorKey] : null;

  const ageNum = parseInt(age, 10);
  const ageOk = Number.isFinite(ageNum) && ageNum >= 10 && ageNum <= 100;

  const finish = useCallback(
    async (finishLat: number, finishLng: number) => {
      if (finishingRef.current) return;
      const checked = validateDisplayName(`${firstName} ${lastName}`);
      if (!checked.ok) {
        setNameTouched(true);
        setStep(1);
        setError(NAME_ERRORS[checked.errorKey]);
        return;
      }
      const ageValue = parseInt(age, 10);
      if (!Number.isFinite(ageValue) || ageValue < 10 || ageValue > 100) {
        setStep(2);
        setError("Yosh 10–100 oralig'ida bo'lishi kerak");
        return;
      }

      finishingRef.current = true;
      setSaving(true);
      setError(null);
      const birthYear = new Date().getFullYear() - ageValue;
      const [first, ...rest] = checked.value.split(" ");
      const startedAt = Date.now();
      try {
        const geo = await validateLocation(finishLat, finishLng).catch(() => null);
        await updateMe({
          first_name: first ?? "",
          last_name: rest.join(" "),
          birth_year: birthYear,
          latitude: roundCoord(finishLat),
          longitude: roundCoord(finishLng),
          ...(geo?.region_from_gps ? { region: geo.region_from_gps } : {}),
          onboarding_completed: true,
        });
        await refreshMe();
        // Logo ekrani kamida qisqa ko'rinsin; Home GPS bo'yicha yuklanadi.
        const wait = Math.max(0, 900 - (Date.now() - startedAt));
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        // Muvaffaqiyat: AppGate RootTabs ga o'tadi — saving ni o'chirmaymiz.
      } catch (e) {
        finishingRef.current = false;
        setSaving(false);
        setError(e instanceof Error ? e.message : "Saqlashda xatolik");
      }
    },
    [age, firstName, lastName, refreshMe],
  );

  const detectLocation = useCallback(async () => {
    setLocating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Joylashuv ruxsati berilmadi. Brauzerda ruxsatni yoqing.");
        return;
      }
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
        setAddressLabel(r.full_name || r.address || r.city || "Tanlangan joy");
      });
    }, 450);
    return () => {
      if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current);
    };
  }, [lat, lng]);

  useEffect(() => {
    if (step !== 3 || gpsOnceRef.current) return;
    gpsOnceRef.current = true;
    void detectLocation();
  }, [step, detectLocation]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!searchOpen || q.length < 2) {
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
  }, [searchQuery, searchOpen]);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    setSearchQuery("");
    setSearchResults([]);
    searchSlide.setValue(0);
    searchBackdropOp.setValue(0);
    Animated.parallel([
      Animated.timing(searchBackdropOp, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(searchSlide, {
        toValue: 1,
        friction: 9,
        tension: 65,
        useNativeDriver: true,
      }),
    ]).start();
  }, [searchBackdropOp, searchSlide]);

  const closeSearch = useCallback(() => {
    Animated.parallel([
      Animated.timing(searchBackdropOp, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(searchSlide, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setSearchOpen(false);
        setSearchQuery("");
        setSearchResults([]);
      }
    });
  }, [searchBackdropOp, searchSlide]);

  const pickSearchResult = (item: GeocodeResult) => {
    setLat(item.lat);
    setLng(item.lng);
    setAddressLabel(item.full_name || item.address || item.city);
    mapRef.current?.panTo(item.lat, item.lng);
    closeSearch();
  };

  const onConfirmLocation = () => {
    setError(null);
    void finish(lat, lng);
  };

  const goNextFromName = () => {
    setError(null);
    if (!nameValidation.ok) {
      setNameTouched(true);
      setError(NAME_ERRORS[nameValidation.errorKey]);
      return;
    }
    setStep(2);
  };

  const goNextFromAge = () => {
    setError(null);
    if (!ageOk) {
      setError("Yosh 10–100 oralig'ida bo'lishi kerak");
      return;
    }
    setStep(3);
  };

  const busy = saving || locating;

  // Tayyor → oq ekran + Mysaloon logo (xarita overlay emas)
  if (saving) {
    return <AccountCreatingScreen />;
  }

  // ——— 3-sahifa: joylashuv picker ———
  if (step === 3) {
    return (
      <View style={styles.mapRoot}>
        <OnboardingMap
          ref={mapRef}
          latitude={lat}
          longitude={lng}
          onCoordsChange={onMapCoords}
        />

        {/* Markaz pin — xarita suriladi, pin o'rtada qoladi */}
        <View pointerEvents="none" style={styles.centerPinWrap}>
          <View style={styles.centerPinHead}>
            <View style={styles.centerPinDot} />
          </View>
          <View style={styles.centerPinStem} />
        </View>

        <View style={[styles.mapTopBar, { paddingTop: insets.top + 10 }]}>
          <Pressable
            onPress={() => setStep(2)}
            style={styles.mapBack}
            disabled={busy}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </Pressable>

          <View style={styles.addressPill}>
            <Text style={styles.addressText} numberOfLines={2}>
              {addressLabel}
            </Text>
          </View>

          <Pressable
            onPress={openSearch}
            style={styles.roundBtn}
            disabled={busy}
            hitSlop={8}
            accessibilityLabel="Qidiruv"
          >
            <Ionicons name="search" size={20} color="#FFF" />
          </Pressable>
        </View>

        <View style={[styles.sideControls, { bottom: Math.max(insets.bottom, 16) + 88 }]}>
          <View style={styles.zoomStack}>
            <Pressable
              style={styles.zoomBtn}
              onPress={() => mapRef.current?.zoomIn()}
              hitSlop={6}
            >
              <Ionicons name="add" size={24} color="#FFF" />
            </Pressable>
            <View style={styles.zoomDivider} />
            <Pressable
              style={styles.zoomBtn}
              onPress={() => mapRef.current?.zoomOut()}
              hitSlop={6}
            >
              <Ionicons name="remove" size={24} color="#FFF" />
            </Pressable>
          </View>

          <Pressable
            style={[styles.roundBtn, styles.gpsFab, locating && styles.disabled]}
            onPress={() => void detectLocation()}
            disabled={busy}
            accessibilityLabel="GPS"
          >
            {locating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Ionicons name="navigate" size={22} color="#FFF" />
            )}
          </Pressable>
        </View>

        <View style={[styles.mapBottom, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          {error ? <Text style={styles.mapError}>{error}</Text> : null}
          <Pressable
            style={styles.readyBtn}
            onPress={onConfirmLocation}
            disabled={locating}
          >
            <Text style={styles.readyText}>Tayyor</Text>
          </Pressable>
        </View>

        {searchOpen ? (
          <View style={styles.searchOverlay} pointerEvents="box-none">
            <Animated.View style={[styles.searchBackdrop, { opacity: searchBackdropOp }]}>
              <Pressable style={StyleSheet.absoluteFill} onPress={closeSearch} />
            </Animated.View>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.searchSheetWrap}
              pointerEvents="box-none"
            >
              <Animated.View
                style={[
                  styles.searchSheet,
                  {
                    paddingBottom: insets.bottom + 16,
                    transform: [
                      {
                        translateY: searchSlide.interpolate({
                          inputRange: [0, 1],
                          outputRange: [420, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.searchHandle} />
                <View style={styles.searchHeader}>
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Ko'cha, mahalla yoki manzil"
                    placeholderTextColor={colors.muted}
                    autoFocus
                    style={styles.searchInput}
                    returnKeyType="search"
                  />
                  <Pressable onPress={closeSearch} hitSlop={8}>
                    <Text style={styles.searchCancel}>Yopish</Text>
                  </Pressable>
                </View>
                {searching ? (
                  <ActivityIndicator style={{ marginTop: 16 }} color={ACCENT} />
                ) : (
                  <FlatList
                    data={searchResults}
                    keyExtractor={(item, i) => `${item.lat},${item.lng},${i}`}
                    keyboardShouldPersistTaps="handled"
                    style={styles.searchList}
                    ListEmptyComponent={
                      searchQuery.trim().length >= 2 ? (
                        <Text style={styles.searchEmpty}>Natija topilmadi</Text>
                      ) : (
                        <Text style={styles.searchEmpty}>
                          Ko'cha yoki joy nomini yozing
                        </Text>
                      )
                    }
                    renderItem={({ item }) => (
                      <Pressable
                        style={styles.searchRow}
                        onPress={() => pickSearchResult(item)}
                      >
                        <View style={styles.searchIconWrap}>
                          <Ionicons name="location" size={18} color={ACCENT} />
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
              </Animated.View>
            </KeyboardAvoidingView>
          </View>
        ) : null}
      </View>
    );
  }

  // ——— 1 / 2 sahifa ———
  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.page, { paddingBottom: insets.bottom + 24 }]}>
        {step === 2 ? (
          <Pressable onPress={() => setStep(1)} style={styles.backRow} disabled={busy}>
            <Ionicons name="chevron-back" size={20} color={colors.muted} />
            <Text style={styles.backText}>Orqaga</Text>
          </Pressable>
        ) : (
          <View style={styles.backSpacer} />
        )}

        {step === 1 ? (
          <View style={styles.pageBody}>
            <Text style={styles.pageTitle}>Ism va familiya</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Ism"
              placeholderTextColor={colors.muted}
              autoComplete="given-name"
              autoFocus
              style={styles.inputBox}
            />
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Familiya"
              placeholderTextColor={colors.muted}
              autoComplete="family-name"
              style={styles.inputBox}
            />
            {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}
            {error && !nameError ? <Text style={styles.fieldError}>{error}</Text> : null}
          </View>
        ) : (
          <View style={styles.pageBody}>
            <Text style={styles.pageTitle}>Yoshingiz</Text>
            <TextInput
              value={age}
              onChangeText={(v) => setAge(v.replace(/\D/g, "").slice(0, 2))}
              placeholder="25"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              maxLength={2}
              autoFocus
              style={[styles.inputBox, styles.ageInput]}
            />
            {error ? <Text style={styles.fieldError}>{error}</Text> : null}
          </View>
        )}

        <Pressable
          style={[
            styles.primary,
            ((step === 1 && !nameValidation.ok) || (step === 2 && !ageOk) || busy) &&
              styles.disabled,
          ]}
          onPress={step === 1 ? goNextFromName : goNextFromAge}
          disabled={busy}
        >
          <Text style={styles.primaryText}>Keyingi</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  page: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  backSpacer: { height: 40, marginTop: 8 },
  backRow: {
    marginTop: 8,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    alignSelf: "flex-start",
  },
  backText: { fontSize: 15, fontWeight: "600", color: colors.muted },
  pageBody: { flex: 1, justifyContent: "center", gap: 14 },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  inputBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    minHeight: 56,
    paddingHorizontal: 16,
    fontSize: 17,
    color: colors.fg,
  },
  ageInput: {
    textAlign: "center",
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: 2,
    minHeight: 72,
  },
  fieldError: { fontSize: 13, lineHeight: 18, color: "#FF3B30", fontWeight: "600" },
  primary: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.5 },

  mapRoot: { flex: 1, backgroundColor: "#0e1626", position: "relative" },
  mapTopBar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 12,
    zIndex: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mapBack: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(20,20,20,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  addressPill: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "rgba(20,20,20,0.55)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
  },
  addressText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(20,20,20,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  sideControls: {
    position: "absolute",
    right: 14,
    zIndex: 3,
    alignItems: "center",
    gap: 12,
  },
  zoomStack: {
    borderRadius: 22,
    backgroundColor: "rgba(20,20,20,0.72)",
    overflow: "hidden",
  },
  zoomBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginHorizontal: 10,
  },
  gpsFab: {
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  centerPinWrap: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -18,
    marginTop: -44,
    width: 36,
    height: 48,
    alignItems: "center",
    zIndex: 2,
  },
  centerPinHead: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  centerPinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFF",
  },
  centerPinStem: {
    width: 3,
    height: 14,
    backgroundColor: ACCENT,
    borderRadius: 2,
    marginTop: -2,
  },
  mapBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    zIndex: 3,
    gap: 10,
  },
  mapError: {
    textAlign: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: "600",
    color: "#FF3B30",
    overflow: "hidden",
  },
  readyBtn: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ACCENT,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  readyText: { color: "#FFF", fontSize: 17, fontWeight: "800" },
  searchOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
    justifyContent: "flex-end",
  },
  searchBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  searchSheetWrap: {
    width: "100%",
    justifyContent: "flex-end",
  },
  searchSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: "72%",
    paddingTop: 8,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  searchHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 10,
  },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: ACCENT,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.fg,
  },
  searchCancel: { fontSize: 15, fontWeight: "700", color: ACCENT },
  searchList: { maxHeight: 360 },
  searchEmpty: {
    textAlign: "center",
    color: colors.muted,
    paddingVertical: 24,
    fontSize: 14,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,92,92,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  searchRowBody: { flex: 1, gap: 2 },
  searchRowTitle: { fontSize: 15, color: colors.fg, fontWeight: "700" },
  searchRowSub: { fontSize: 13, color: colors.muted, fontWeight: "500", lineHeight: 18 },
});
