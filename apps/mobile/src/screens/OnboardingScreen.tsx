import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { updateMe } from "../api/user";
import { useAuth } from "../auth/AuthContext";
import { ONBOARDING_STEPS, roundCoord } from "../lib/onboarding";
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

export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshMe } = useAuth();

  const [step, setStep] = useState(1);
  const [firstName, setFirstNameRaw] = useState("");
  const [lastName, setLastNameRaw] = useState("");
  const [age, setAge] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [gpsAttempted, setGpsAttempted] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

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

  const detectLocation = useCallback(async () => {
    setLocating(true);
    setGpsAttempted(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Joylashuv ruxsati berilmadi. Sozlamalardan yoqing.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Joylashuvni aniqlab bo'lmadi");
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    if (step !== 3 || gpsAttempted) return;
    void detectLocation();
  }, [step, gpsAttempted, detectLocation]);

  const canNext =
    (step === 1 && nameValidation.ok) ||
    (step === 2 && ageOk) ||
    (step === 3 && lat != null && lng != null && !locating);

  const finish = async () => {
    if (lat == null || lng == null) {
      setError("GPS orqali joylashuvni aniqlang");
      return;
    }
    const checked = validateDisplayName(`${firstName} ${lastName}`);
    if (!checked.ok) {
      setNameTouched(true);
      setStep(1);
      setError(NAME_ERRORS[checked.errorKey]);
      return;
    }
    if (!ageOk) {
      setStep(2);
      setError("Yosh 10–100 oralig'ida bo'lishi kerak");
      return;
    }

    const birthYear = new Date().getFullYear() - ageNum;
    const [first, ...rest] = checked.value.split(" ");
    setSaving(true);
    setError(null);
    try {
      await updateMe({
        first_name: first ?? "",
        last_name: rest.join(" "),
        birth_year: birthYear,
        latitude: roundCoord(lat),
        longitude: roundCoord(lng),
        onboarding_completed: true,
      });
      await refreshMe();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  };

  const onPrimary = () => {
    setError(null);
    if (step === 1 && !nameValidation.ok) {
      setNameTouched(true);
      setError(NAME_ERRORS[nameValidation.errorKey]);
      return;
    }
    if (step === 2 && !ageOk) {
      setError("Yosh 10–100 oralig'ida bo'lishi kerak");
      return;
    }
    if (step < 3) {
      if (canNext) setStep((s) => s + 1);
      return;
    }
    if (canNext) void finish();
  };

  const busy = saving || locating;
  const primaryLabel =
    step < 3 ? "Davom etish" : saving ? "Saqlanmoqda…" : "Tayyor";

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.logo}>
          Mysaloon<Text style={styles.dot}>.</Text>
        </Text>
        <Text style={styles.title}>Profilni to'ldiring</Text>
        <Text style={styles.sub}>
          Tavsiyalar va yaqin salonlar uchun bir necha ma'lumot kerak.
        </Text>

        <View style={styles.steps}>
          {ONBOARDING_STEPS.map((label, i) => {
            const n = i + 1;
            const active = n === step;
            const done = n < step;
            return (
              <View key={label} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepDot,
                    (active || done) && styles.stepDotOn,
                  ]}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  ) : (
                    <Text style={[styles.stepNum, (active || done) && styles.stepNumOn]}>
                      {n}
                    </Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, active && styles.stepLabelOn]}>{label}</Text>
              </View>
            );
          })}
        </View>

        {step === 1 ? (
          <View style={styles.stack}>
            <Text style={styles.label}>Ism va familiya</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Ism"
              placeholderTextColor={colors.muted}
              autoComplete="given-name"
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
            {nameError ? (
              <Text style={styles.fieldError}>{nameError}</Text>
            ) : (
              <Text style={styles.hint}>
                Faqat harflar, bo'sh joy, defis (-) va apostrof (').
              </Text>
            )}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.stack}>
            <Text style={styles.label}>Yoshingiz</Text>
            <TextInput
              value={age}
              onChangeText={(v) => setAge(v.replace(/\D/g, "").slice(0, 2))}
              placeholder="Masalan: 25"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              maxLength={2}
              style={[styles.inputBox, styles.ageInput]}
            />
            <Text style={styles.hint}>Xizmatlar va tavsiyalar yoshga mos tanlanadi.</Text>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.stack}>
            <Text style={styles.label}>Joylashuv</Text>
            <View style={styles.locCard}>
              <Ionicons name="location" size={22} color={colors.fg} />
              <View style={styles.locText}>
                {lat != null && lng != null ? (
                  <>
                    <Text style={styles.locTitle}>Joylashuv aniqlandi</Text>
                    <Text style={styles.locCoords}>
                      {lat.toFixed(5)}, {lng.toFixed(5)}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.locTitle}>
                      {locating ? "Aniqlanmoqda…" : "Joylashuv kerak"}
                    </Text>
                    <Text style={styles.locCoords}>
                      GPS yoqing yoki quyidagi tugmani bosing.
                    </Text>
                  </>
                )}
              </View>
            </View>
            <Pressable
              style={[styles.gpsBtn, busy && styles.disabled]}
              onPress={() => void detectLocation()}
              disabled={busy}
            >
              {locating ? (
                <ActivityIndicator color={colors.fg} />
              ) : (
                <>
                  <Ionicons name="navigate" size={18} color={colors.fg} />
                  <Text style={styles.gpsText}>
                    {lat != null ? "Joylashuvni qayta aniqlash" : "GPS orqali aniqlash"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.primary, (!canNext || busy) && styles.disabled]}
          onPress={onPrimary}
          disabled={busy || (step === 3 && (lat == null || lng == null))}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.primaryText}>{primaryLabel}</Text>
          )}
        </Pressable>

        {step > 1 ? (
          <Pressable onPress={() => setStep((s) => s - 1)} disabled={busy}>
            <Text style={styles.backLink}>← Orqaga</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24 },
  logo: {
    marginTop: 20,
    fontSize: 28,
    fontWeight: "900",
    color: colors.fg,
    letterSpacing: -0.8,
  },
  dot: { color: colors.brandDot },
  title: {
    marginTop: 24,
    fontSize: 26,
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.4,
  },
  sub: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    marginBottom: 24,
  },
  steps: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
    gap: 8,
  },
  stepItem: { flex: 1, alignItems: "center", gap: 6 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  stepDotOn: {
    backgroundColor: colors.fg,
    borderColor: colors.fg,
  },
  stepNum: { fontSize: 13, fontWeight: "800", color: colors.muted },
  stepNumOn: { color: "#FFF" },
  stepLabel: { fontSize: 11, fontWeight: "600", color: colors.muted },
  stepLabelOn: { color: colors.fg },
  stack: { gap: 12 },
  label: { fontSize: 14, fontWeight: "800", color: colors.fg },
  inputBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    minHeight: 52,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.fg,
  },
  ageInput: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 1,
  },
  hint: { fontSize: 12, lineHeight: 17, color: colors.muted },
  fieldError: { fontSize: 12, lineHeight: 17, color: "#FF3B30", fontWeight: "600" },
  locCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locText: { flex: 1, gap: 2 },
  locTitle: { fontSize: 15, fontWeight: "700", color: colors.fg },
  locCoords: { fontSize: 12, color: colors.muted },
  gpsBtn: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.fg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  gpsText: { fontSize: 14, fontWeight: "700", color: colors.fg },
  primary: {
    marginTop: 24,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  disabled: { opacity: 0.55 },
  backLink: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: colors.muted,
  },
  error: {
    marginTop: 16,
    fontSize: 13,
    lineHeight: 18,
    color: "#FF3B30",
  },
});
