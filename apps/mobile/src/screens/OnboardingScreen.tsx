import { Ionicons } from "@expo/vector-icons";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { updateMe } from "../api/user";
import { useAuth } from "../auth/AuthContext";
import { getAppGender, getGuestLocation } from "../lib/guest";
import { roundCoord } from "../lib/onboarding";
import {
  sanitizeDisplayNameInput,
  validateDisplayName,
  type DisplayNameErrorKey,
} from "../lib/validate-display-name";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../utils/responsive";

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
 * Login dan keyin — ism, familiya, yosh. Minimal Morph B&W.
 */
export function OnboardingScreen({ onComplete }: { onComplete?: () => void }) {
  const insets = useSafeAreaInsets();
  const { user, refreshMe } = useAuth();

  const [firstName, setFirstNameRaw] = useState("");
  const [lastName, setLastNameRaw] = useState("");
  const [age, setAge] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [ageTouched, setAgeTouched] = useState(false);
  const [focus, setFocus] = useState<"first" | "last" | "age" | null>("first");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const finishingRef = useRef(false);
  const ctaScale = useSharedValue(1);

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
  const filledCount =
    (firstName.trim() ? 1 : 0) + (lastName.trim() ? 1 : 0) + (ageOk ? 1 : 0);

  const ctaAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

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

    ctaScale.value = withSequence(
      withSpring(0.94, { damping: 14 }),
      withSpring(1, { damping: 12 }),
    );

    finishingRef.current = true;
    setSaving(true);
    setError(null);
    const birthYear = new Date().getFullYear() - ageValue;
    const [first, ...rest] = checked.value.split(" ");
    const startedAt = Date.now();
    try {
      const guest = await getGuestLocation();
      const gender = await getAppGender();
      await updateMe({
        first_name: first ?? "",
        last_name: rest.join(" "),
        birth_year: birthYear,
        onboarding_completed: true,
        ...(gender ? { gender } : {}),
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
      onComplete?.();
    } catch (e) {
      finishingRef.current = false;
      setSaving(false);
      setError(e instanceof Error ? e.message : "Saqlashda xatolik");
    }
  }, [age, ctaScale, firstName, lastName, onComplete, refreshMe]);

  if (saving) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.saving}>Saqlanmoqda…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + 8 }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, 16) + 28 },
        ]}
      >
        <View style={styles.progressRow}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.progressSeg, i < filledCount && styles.progressSegOn]}
            />
          ))}
        </View>

        <Text style={styles.title}>Ismingizni{"\n"}kiriting</Text>
        <Text style={styles.sub}>
          MySaloon va Morf AI uchun bitta profil.
        </Text>

        <View style={styles.card}>
          <Field
            label="Ism"
            active={focus === "first"}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Ali"
            autoComplete="given-name"
            autoFocus
            onFocus={() => setFocus("first")}
            onBlur={() => setFocus(null)}
          />
          <View style={styles.divider} />
          <Field
            label="Familiya"
            active={focus === "last"}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Karimov"
            autoComplete="family-name"
            onFocus={() => setFocus("last")}
            onBlur={() => setFocus(null)}
          />
          <View style={styles.divider} />
          <Field
            label="Yosh"
            active={focus === "age"}
            value={age}
            onChangeText={(v) => {
              setAgeTouched(true);
              setAge(v.replace(/\D/g, "").slice(0, 2));
            }}
            placeholder="25"
            keyboardType="number-pad"
            maxLength={2}
            onFocus={() => setFocus("age")}
            onBlur={() => setFocus(null)}
          />
        </View>

        {nameError || ageError || error ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={14} color="#FF3B30" />
            <Text style={styles.fieldError}>{nameError || ageError || error}</Text>
          </View>
        ) : null}

        <Animated.View style={ctaAnimStyle}>
          <Pressable
            style={[styles.primary, !canSubmit && styles.disabled]}
            onPress={() => void finish()}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Davom etish"
          >
            <Text style={styles.primaryText}>Davom etish</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>
        </Animated.View>

        <Text style={styles.foot}>
          Keyin try-on va bronlarga shu akkaunt bilan kirasiz.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  active,
  value,
  onChangeText,
  placeholder,
  autoComplete,
  autoFocus,
  keyboardType,
  maxLength,
  onFocus,
  onBlur,
}: {
  label: string;
  active: boolean;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  autoComplete?: "given-name" | "family-name";
  autoFocus?: boolean;
  keyboardType?: "number-pad";
  maxLength?: number;
  onFocus: () => void;
  onBlur: () => void;
}) {
  return (
    <View style={[styles.field, active && styles.fieldActive]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A3A3A3"
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onFocus={onFocus}
        onBlur={onBlur}
        style={styles.input}
        underlineColorAndroid="transparent"
        {...(Platform.OS === "android"
          ? { includeFontPadding: false, textAlignVertical: "center" as const }
          : null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  saving: {
    color: "#111111",
    fontSize: fontSize(15),
    fontWeight: "600",
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: scale(24),
    justifyContent: "center",
  },
  progressRow: {
    flexDirection: "row",
    gap: moderateScale(6),
    marginBottom: verticalScale(28),
  },
  progressSeg: {
    flex: 1,
    height: verticalScale(3),
    borderRadius: moderateScale(2),
    backgroundColor: "#E5E5E5",
  },
  progressSegOn: {
    backgroundColor: "#111111",
  },
  title: {
    fontSize: fontSize(32),
    lineHeight: fontSize(38),
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -1,
    marginBottom: verticalScale(10),
  },
  sub: {
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    color: "#737373",
    marginBottom: verticalScale(28),
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(20),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.1)",
    overflow: "hidden",
  },
  field: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(10),
  },
  fieldActive: {
    backgroundColor: "#F7F7F7",
  },
  fieldLabel: {
    fontSize: fontSize(12),
    fontWeight: "700",
    color: "#737373",
    letterSpacing: 0.2,
    marginBottom: verticalScale(4),
    textTransform: "uppercase",
  },
  input: {
    fontSize: fontSize(18),
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -0.3,
    paddingVertical: Platform.OS === "android" ? verticalScale(4) : verticalScale(2),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(17,17,17,0.08)",
    marginLeft: scale(16),
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(6),
    marginTop: verticalScale(14),
    paddingHorizontal: scale(2),
  },
  fieldError: {
    flex: 1,
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: "#FF3B30",
    fontWeight: "600",
  },
  primary: {
    marginTop: verticalScale(28),
    minHeight: verticalScale(54),
    borderRadius: moderateScale(16),
    backgroundColor: "#111111",
    paddingHorizontal: scale(20),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(8),
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: fontSize(16),
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.4,
  },
  foot: {
    marginTop: verticalScale(18),
    textAlign: "center",
    fontSize: fontSize(12),
    lineHeight: fontSize(18),
    color: "#A3A3A3",
  },
});
