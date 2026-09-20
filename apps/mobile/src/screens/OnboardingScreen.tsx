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
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeBottom, safeTop } from "../lib/safe-area";
import { updateMe } from "../api/user";
import { useAuth } from "../auth/AuthContext";
import { ProfileHeroIllustration } from "../components/welcome/LoginHeroIllustration";
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
  const { t } = useTranslation();
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
        <Text style={styles.saving}>
          {t("onboarding.saving", { defaultValue: "Saqlanmoqda..." })}
        </Text>
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
          { paddingBottom: safeBottom(insets.bottom, 28) },
        ]}
      >
        <View style={styles.hero}>
          <ProfileHeroIllustration size={scale(148)} />
          <Text style={styles.title}>{t("onboarding.nameTitle")}</Text>
          <Text style={styles.sub}>{t("onboarding.nameHeroSub")}</Text>
          <View style={styles.progressRow}>
            {[0, 1, 2].map((i) => {
              const on = i < filledCount;
              return (
                <View
                  key={i}
                  style={[styles.progressSeg, on && styles.progressSegOn]}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.fields}>
          <Field
            icon="person-outline"
            label={t("onboarding.firstName")}
            active={focus === "first"}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Ali"
            autoComplete="given-name"
            autoFocus
            onFocus={() => setFocus("first")}
            onBlur={() => setFocus(null)}
          />
          <Field
            icon="people-outline"
            label={t("onboarding.lastName")}
            active={focus === "last"}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Karimov"
            autoComplete="family-name"
            onFocus={() => setFocus("last")}
            onBlur={() => setFocus(null)}
          />
          <Field
            icon="calendar-outline"
            label={t("onboarding.age")}
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
          <Text style={styles.helper}>{t("onboarding.nameHelper")}</Text>
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
              accessibilityLabel={t("onboarding.continue")}
            >
              <Text style={styles.primaryText}>{t("onboarding.continue")}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.forest} />
            </Pressable>
          </Animated.View>

          <Text style={styles.foot}>{t("onboarding.nameFoot")}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  icon,
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
  icon: keyof typeof Ionicons.glyphMap;
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
      <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
        <Ionicons name={icon} size={18} color={active ? colors.forest : colors.muted} />
      </View>
      <View style={styles.fieldBody}>
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
          selectionColor={colors.forest}
          {...(Platform.OS === "android"
            ? { includeFontPadding: false, textAlignVertical: "center" as const }
            : null)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  saving: {
    color: colors.forest,
    fontSize: fontSize(15),
    fontWeight: "600",
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: scale(24),
    justifyContent: "center",
  },
  hero: {
    alignItems: "center",
    marginBottom: verticalScale(18),
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    gap: moderateScale(8),
    marginTop: verticalScale(18),
  },
  progressSeg: {
    flex: 1,
    height: verticalScale(5),
    borderRadius: moderateScale(999),
    backgroundColor: "#EEF6E0",
  },
  progressSegOn: {
    backgroundColor: colors.lime,
  },
  title: {
    marginTop: verticalScale(6),
    fontSize: fontSize(28),
    lineHeight: fontSize(34),
    fontWeight: "800",
    color: colors.forest,
    letterSpacing: -0.6,
    textAlign: "center",
  },
  sub: {
    marginTop: verticalScale(8),
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    color: colors.muted,
    textAlign: "center",
    maxWidth: scale(300),
  },
  fields: {
    gap: moderateScale(10),
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
    backgroundColor: "#F7F8F5",
    borderRadius: moderateScale(20),
    borderWidth: 1.5,
    borderColor: "transparent",
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
  },
  fieldActive: {
    backgroundColor: "#F4FBE6",
    borderColor: colors.lime,
  },
  iconWrap: {
    width: scale(36),
    height: scale(36),
    borderRadius: moderateScale(12),
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: colors.lime,
  },
  fieldBody: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: fontSize(11),
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 0.4,
    marginBottom: verticalScale(2),
  },
  fieldLabelActive: {
    color: colors.forest,
  },
  input: {
    fontSize: fontSize(17),
    fontWeight: "700",
    color: colors.fg,
    letterSpacing: -0.3,
    paddingVertical: Platform.OS === "android" ? verticalScale(2) : 0,
  },
  helper: {
    marginTop: verticalScale(14),
    paddingHorizontal: scale(2),
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: colors.muted,
    textAlign: "center",
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
    marginTop: verticalScale(24),
  },
  primary: {
    minHeight: verticalScale(56),
    borderRadius: moderateScale(28),
    backgroundColor: colors.lime,
    paddingHorizontal: scale(22),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(8),
  },
  primaryText: {
    color: colors.forest,
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
