import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
 * Login dan keyin — ism, familiya va yosh bitta sahifada.
 * Joylashuv mehmon picker orqali oldindan saqlangan.
 */
export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshMe } = useAuth();

  const [firstName, setFirstNameRaw] = useState("");
  const [lastName, setLastNameRaw] = useState("");
  const [age, setAge] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [ageTouched, setAgeTouched] = useState(false);
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
  const ageError =
    ageTouched && !ageOk ? "Yosh 10–100 oralig'ida bo'lishi kerak" : null;

  const canSubmit = nameValidation.ok && ageOk && !saving;

  const finish = useCallback(async () => {
    if (finishingRef.current) return;
    const checked = validateDisplayName(`${firstName} ${lastName}`);
    if (!checked.ok) {
      setNameTouched(true);
      setError(NAME_ERRORS[checked.errorKey]);
      return;
    }
    const ageValue = parseInt(age, 10);
    if (!Number.isFinite(ageValue) || ageValue < 10 || ageValue > 100) {
      setAgeTouched(true);
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

  if (saving) {
    return <AccountCreatingScreen />;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + 8 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
      >
        <View style={styles.hero}>
          <Text style={styles.kicker}>Akkaunt</Text>
          <Text style={styles.title}>O‘zingiz haqingizda</Text>
          <Text style={styles.sub}>
            Ism, familiya va yosh bir sahifada. Shu akkaunt MySaloon va Morf AI uchun.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Ism</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Ali"
            placeholderTextColor={colors.muted}
            autoComplete="given-name"
            autoFocus
            style={styles.input}
          />

          <Text style={styles.label}>Familiya</Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Karimov"
            placeholderTextColor={colors.muted}
            autoComplete="family-name"
            style={styles.input}
          />
          {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}

          <Text style={styles.label}>Yosh</Text>
          <TextInput
            value={age}
            onChangeText={(v) => {
              setAgeTouched(true);
              setAge(v.replace(/\D/g, "").slice(0, 2));
            }}
            placeholder="25"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            maxLength={2}
            style={styles.input}
          />
          {ageError ? <Text style={styles.fieldError}>{ageError}</Text> : null}
          {error && !nameError && !ageError ? (
            <Text style={styles.fieldError}>{error}</Text>
          ) : null}
        </View>

        <Pressable
          style={[styles.primary, !canSubmit && styles.disabled]}
          onPress={() => void finish()}
          disabled={saving}
        >
          <Text style={styles.primaryText}>Davom etish</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "flex-start",
  },
  hero: {
    marginTop: 28,
    marginBottom: 22,
    gap: 8,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.6,
  },
  sub: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    color: colors.muted,
    maxWidth: 340,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    gap: 8,
  },
  label: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: colors.fg,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    minHeight: 52,
    paddingHorizontal: 16,
    fontSize: 17,
    color: colors.fg,
  },
  fieldError: { fontSize: 13, lineHeight: 18, color: "#FF3B30", fontWeight: "600" },
  primary: {
    marginTop: 22,
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.45 },
});
