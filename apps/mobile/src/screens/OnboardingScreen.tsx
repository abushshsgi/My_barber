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
import { safeBottom, safeTop } from "../lib/safe-area";
import { updateMe } from "../api/user";
import { useAuth } from "../auth/AuthContext";
import { getAppGender, getGuestLocation } from "../lib/guest";
import { roundCoord } from "../lib/onboarding";
import {
  sanitizeDisplayNameInput,
  validateDisplayName,
  type DisplayNameErrorKey,
} from "../lib/validate-display-name";
import { colors } from "../theme/colors";
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
 * Login dan keyin — ism, familiya, yosh. Soft Paper onboarding.
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
      const saveLocation = user?.require_profile_location === true && guest;
      await updateMe({
        first_name: first ?? "",
        last_name: rest.join(" "),
        birth_year: birthYear,
        onboarding_completed: true,
        ...(gender ? { gender } : {}),
        ...(saveLocation
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
  }, [age, ctaScale, firstName, lastName, onComplete, refreshMe, user?.require_profile_location]);

  if (saving) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.saving}>Saqlanmoqda…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: safeTop(insets.top, 12) }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: safeBottom(insets.bottom, 32) },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.progressRow}>
            {[0, 1, 2].map((i) => {
              const on = i < filledCount;
              const current = i === filledCount;
              return (
                <View
                  key={i}
                  style={[
                    styles.progressSeg,
                    on && styles.progressSegOn,
                    current && styles.progressSegCurrent,
                  ]}
                />
              );
            })}
          </View>
          <Text style={styles.stepHint}>
            {filledCount}/3 to'ldirildi
          </Text>

          <Text style={styles.title}>Ismingizni{"\n"}kiriting</Text>
          <Text style={styles.sub}>
            MySaloon va Morf AI uchun bitta profil.
          </Text>
        </View>

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
            <Ionicons name="alert-circle" size={15} color="#FF3B30" />
            <Text style={styles.fieldError}>{nameError || ageError || error}</Text>
          </View>
        ) : (
          <Text style={styles.helper}>Ism, familiya va yoshni kiriting.</Text>
        )}

        <View style={styles.footer}>
          <Animated.View style={ctaAnimStyle}>
            <Pressable
              style={({ pressed }) => [
                styles.primary,
                !canSubmit && styles.disabled,
                pressed && canSubmit && styles.pressed,
              ]}
              onPress={() => void finish()}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Davom etish"
            >
              <Text style={styles.primaryText}>Davom etish</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.surface} />
            </Pressable>
          </Animated.View>

          <Text style={styles.foot}>
            Keyin try-on va bronlarga shu akkaunt bilan kirasiz.
          </Text>
        </View>
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
      <Text style={[styles.fieldLabel, active && styles.fieldLabelActive]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onFocus={onFocus}
        onBlur={onBlur}
        style={styles.input}
        underlineColorAndroid="transparent"
        selectionColor={colors.fg}
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
    backgroundColor: colors.bg,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  saving: {
    color: colors.fg,
    fontSize: fontSize(15),
    fontWeight: "600",
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: scale(24),
    justifyContent: "center",
  },
  header: {
    marginBottom: verticalScale(8),
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    marginBottom: verticalScale(10),
  },
  progressSeg: {
    flex: 1,
    height: verticalScale(4),
    borderRadius: moderateScale(999),
    backgroundColor: colors.promo,
  },
  progressSegOn: {
    backgroundColor: colors.fg,
  },
  progressSegCurrent: {
    backgroundColor: colors.fg,
    opacity: 0.35,
  },
  stepHint: {
    fontSize: fontSize(12),
    fontWeight: "600",
    color: colors.muted,
    letterSpacing: 0.2,
    marginBottom: verticalScale(22),
  },
  title: {
    fontSize: fontSize(34),
    lineHeight: fontSize(40),
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -1.2,
    marginBottom: verticalScale(10),
  },
  sub: {
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    color: colors.muted,
    marginBottom: verticalScale(28),
    maxWidth: scale(300),
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(24),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
    shadowColor: colors.fg,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  field: {
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(14),
    paddingBottom: verticalScale(12),
  },
  fieldActive: {
    backgroundColor: colors.promo,
  },
  fieldLabel: {
    fontSize: fontSize(11),
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 0.8,
    marginBottom: verticalScale(6),
    textTransform: "uppercase",
  },
  fieldLabelActive: {
    color: colors.fg,
  },
  input: {
    fontSize: fontSize(19),
    fontWeight: "700",
    color: colors.fg,
    letterSpacing: -0.4,
    paddingVertical: Platform.OS === "android" ? verticalScale(4) : verticalScale(2),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: scale(18),
  },
  helper: {
    marginTop: verticalScale(14),
    paddingHorizontal: scale(2),
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: colors.muted,
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
  footer: {
    marginTop: verticalScale(28),
  },
  primary: {
    minHeight: verticalScale(56),
    borderRadius: moderateScale(28),
    backgroundColor: colors.fg,
    paddingHorizontal: scale(22),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(8),
  },
  primaryText: {
    color: colors.surface,
    fontSize: fontSize(16),
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  foot: {
    marginTop: verticalScale(16),
    textAlign: "center",
    fontSize: fontSize(12),
    lineHeight: fontSize(18),
    color: colors.muted,
    paddingHorizontal: scale(8),
  },
});
