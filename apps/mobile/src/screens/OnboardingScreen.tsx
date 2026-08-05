import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
import { colors } from "../theme/colors";

const NAME_ERRORS: Record<DisplayNameErrorKey, string> = {
  nameRequired: "Ism va familiyani kiriting",
  nameInvalidChars: "Faqat harflar, bo'sh joy, defis (-) va apostrof (') ishlatiladi.",
  nameNeedsFull: "Ism va familiyani to'liq kiriting",
  namePartTooShort: "Har bir qism kamida 2 ta harfdan iborat bo'lishi kerak",
  nameTooLong: "Ism juda uzun",
  nameTooManyParts: "Ismda so'zlar soni juda ko'p",
};

const YELLOW = "#F5C400";

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
      try {
        await updateMe({
          first_name: first ?? "",
          last_name: rest.join(" "),
          birth_year: birthYear,
          latitude: roundCoord(finishLat),
          longitude: roundCoord(finishLng),
          onboarding_completed: true,
        });
        await refreshMe();
      } catch (e) {
        finishingRef.current = false;
        setError(e instanceof Error ? e.message : "Saqlashda xatolik");
      } finally {
        setSaving(false);
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
    if (!searchOpen || q.length < 3) {
      setSearchResults([]);
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
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [searchQuery, searchOpen]);

  const pickSearchResult = (item: GeocodeResult) => {
    setLat(item.lat);
    setLng(item.lng);
    setAddressLabel(item.full_name || item.address || item.city);
    mapRef.current?.panTo(item.lat, item.lng);
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
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
            onPress={() => setSearchOpen(true)}
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
            style={[styles.readyBtn, saving && styles.disabled]}
            onPress={onConfirmLocation}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#111" />
            ) : (
              <Text style={styles.readyText}>Tayyor</Text>
            )}
          </Pressable>
        </View>

        {saving ? (
          <View style={styles.savingOverlay}>
            <ActivityIndicator color="#FFF" size="large" />
            <Text style={styles.savingText}>Akkaunt yaratilmoqda…</Text>
          </View>
        ) : null}

        <Modal
          visible={searchOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setSearchOpen(false)}
        >
          <KeyboardAvoidingView
            style={styles.searchOverlay}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <Pressable style={styles.searchBackdrop} onPress={() => setSearchOpen(false)} />
            <View style={[styles.searchSheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.searchHeader}>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Manzil yoki ko'cha qidiring"
                  placeholderTextColor={colors.muted}
                  autoFocus
                  style={styles.searchInput}
                  returnKeyType="search"
                />
                <Pressable onPress={() => setSearchOpen(false)} hitSlop={8}>
                  <Text style={styles.searchCancel}>Yopish</Text>
                </Pressable>
              </View>
              {searching ? (
                <ActivityIndicator style={{ marginTop: 16 }} color={colors.fg} />
              ) : (
                <FlatList
                  data={searchResults}
                  keyExtractor={(item, i) => `${item.lat},${item.lng},${i}`}
                  keyboardShouldPersistTaps="handled"
                  ListEmptyComponent={
                    searchQuery.trim().length >= 3 ? (
                      <Text style={styles.searchEmpty}>Natija topilmadi</Text>
                    ) : (
                      <Text style={styles.searchEmpty}>Kamida 3 ta belgi yozing</Text>
                    )
                  }
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.searchRow}
                      onPress={() => pickSearchResult(item)}
                    >
                      <Ionicons name="location-outline" size={18} color={colors.muted} />
                      <Text style={styles.searchRowText} numberOfLines={2}>
                        {item.full_name || item.address}
                      </Text>
                    </Pressable>
                  )}
                />
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
    shadowColor: "#000",
    shadowOpacity: 0.25,
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
    backgroundColor: "#FF7A00",
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
    backgroundColor: "#FF7A00",
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
    backgroundColor: YELLOW,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  readyText: { color: "#111", fontSize: 17, fontWeight: "800" },
  searchOverlay: { flex: 1, justifyContent: "flex-end" },
  searchBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  searchSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingTop: 14,
    paddingHorizontal: 16,
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
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.fg,
  },
  searchCancel: { fontSize: 15, fontWeight: "700", color: colors.muted },
  searchEmpty: {
    textAlign: "center",
    color: colors.muted,
    paddingVertical: 24,
    fontSize: 14,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  searchRowText: { flex: 1, fontSize: 15, color: colors.fg, fontWeight: "600" },
  savingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    zIndex: 5,
  },
  savingText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
