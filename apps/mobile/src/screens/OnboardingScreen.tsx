import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { updateMe } from "../api/user";
import { useAuth } from "../auth/AuthContext";
import { OnboardingMap } from "../components/onboarding/OnboardingMap";
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
 * 1) Ism-sharif (alohida sahifa)
 * 2) Yosh (alohida sahifa)
 * 3) To'liq ekran Google Maps + GPS — joylashuv aniqlanganda akkaunt yaratiladi
 */
export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshMe } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [firstName, setFirstNameRaw] = useState("");
  const [lastName, setLastNameRaw] = useState("");
  const [age, setAge] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);
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
      // Joylashuv aniqlandi → akkaunt yaratiladi
      await finish(nextLat, nextLng);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Joylashuvni aniqlab bo'lmadi");
    } finally {
      setLocating(false);
    }
  }, [finish]);

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

  // ——— 3-sahifa: to'liq ekran xarita ———
  if (step === 3) {
    return (
      <View style={styles.mapRoot}>
        <OnboardingMap latitude={lat} longitude={lng} />

        <View style={[styles.mapTopBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => setStep(2)}
            style={styles.mapBack}
            disabled={busy}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={colors.fg} />
          </Pressable>
        </View>

        <View style={[styles.mapBottom, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          {error ? <Text style={styles.mapError}>{error}</Text> : null}
          <Pressable
            style={[styles.gpsPrimary, busy && styles.disabled]}
            onPress={() => void detectLocation()}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="navigate" size={20} color="#FFF" />
                <Text style={styles.gpsPrimaryText}>Joylashuvni aniqlash</Text>
              </>
            )}
          </Pressable>
        </View>

        {saving ? (
          <View style={styles.savingOverlay}>
            <ActivityIndicator color="#FFF" size="large" />
            <Text style={styles.savingText}>Akkaunt yaratilmoqda…</Text>
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

  mapRoot: { flex: 1, backgroundColor: colors.surface, position: "relative" },
  mapTopBar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 12,
    zIndex: 2,
  },
  mapBack: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  mapBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    zIndex: 2,
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
  gpsPrimary: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: colors.fg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  gpsPrimaryText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
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
