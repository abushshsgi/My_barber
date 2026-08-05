import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
import { getGuestLocation } from "../lib/guest";
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
 * Login dan keyin — faqat ism va yosh.
 * Joylashuv mehmon picker orqali oldindan saqlangan.
 */
export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshMe } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [firstName, setFirstNameRaw] = useState("");
  const [lastName, setLastNameRaw] = useState("");
  const [age, setAge] = useState("");
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

  const finish = useCallback(async () => {
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
      const guest = await getGuestLocation();
      await updateMe({
        first_name: first ?? "",
        last_name: rest.join(" "),
        birth_year: birthYear,
        onboarding_completed: true,
        ...(guest
          ? {
              latitude: roundCoord(guest.latitude),
              longitude: roundCoord(guest.longitude),
              ...(guest.region ? { region: guest.region } : {}),
            }
          : {}),
      });
      await refreshMe();
      const wait = Math.max(0, 900 - (Date.now() - startedAt));
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    } catch (e) {
      finishingRef.current = false;
      setSaving(false);
      setError(e instanceof Error ? e.message : "Saqlashda xatolik");
    }
  }, [age, firstName, lastName, refreshMe]);

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
    void finish();
  };

  if (saving) {
    return <AccountCreatingScreen />;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.page, { paddingBottom: insets.bottom + 24 }]}>
        {step === 2 ? (
          <Pressable onPress={() => setStep(1)} style={styles.backRow} disabled={saving}>
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
            ((step === 1 && !nameValidation.ok) || (step === 2 && !ageOk) || saving) &&
              styles.disabled,
          ]}
          onPress={step === 1 ? goNextFromName : goNextFromAge}
          disabled={saving}
        >
          <Text style={styles.primaryText}>{step === 1 ? "Keyingi" : "Tayyor"}</Text>
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
});
