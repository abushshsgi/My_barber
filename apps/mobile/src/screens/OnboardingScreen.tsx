import { Ionicons } from "@expo/vector-icons";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
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
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
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

function initialsOf(first: string, last: string): string {
  const a = first.trim().charAt(0);
  const b = last.trim().charAt(0);
  const out = `${a}${b}`.toUpperCase();
  return out || "?";
}

/**
 * Login dan keyin — ism, familiya va yosh bitta sahifada.
 * Animatsiya + avatar preview + ikonali maydonlar.
 */
export function OnboardingScreen() {
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

  const floatA = useSharedValue(0);
  const floatB = useSharedValue(0);
  const avatarPulse = useSharedValue(0);
  const ctaScale = useSharedValue(1);

  useEffect(() => {
    floatA.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    floatB.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
    avatarPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [avatarPulse, floatA, floatB]);

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

  const shapeAStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(floatA.value, [0, 1], [0, -14]) },
      { translateX: interpolate(floatA.value, [0, 1], [0, 8]) },
    ],
  }));

  const shapeBStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(floatB.value, [0, 1], [0, 12]) },
      { rotate: `${interpolate(floatB.value, [0, 1], [-8, 10])}deg` },
    ],
  }));

  const avatarRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(avatarPulse.value, [0, 1], [1, 1.04]) }],
    opacity: interpolate(avatarPulse.value, [0, 1], [0.45, 0.85]),
  }));

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
  }, [age, ctaScale, firstName, lastName, refreshMe]);

  if (saving) {
    return <AccountCreatingScreen />;
  }

  const initials = initialsOf(firstName, lastName);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + 4 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Animated.View style={[styles.blobA, shapeAStyle]} pointerEvents="none" />
      <Animated.View style={[styles.blobB, shapeBStyle]} pointerEvents="none" />
      <View style={styles.blobC} pointerEvents="none" />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, 16) + 28 },
        ]}
      >
        <Animated.View entering={FadeInDown.duration(480).delay(40)} style={styles.topRow}>
          <View style={styles.brandPill}>
            <View style={styles.brandDot} />
            <Text style={styles.brandText}>Mysaloon</Text>
          </View>
          <View style={styles.progressRow}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[styles.progressSeg, i < filledCount && styles.progressSegOn]}
              />
            ))}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(520).delay(120)}
          style={styles.avatarBlock}
        >
          <Animated.View style={[styles.avatarRing, avatarRingStyle]} />
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.avatarBadge}>
            <Ionicons name="sparkles" size={12} color="#FFF" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(180)} style={styles.hero}>
          <Text style={styles.title}>Profilingizni{"\n"}to‘ldiring</Text>
          <Text style={styles.sub}>
            Ism, familiya va yosh — bitta qadam. Shu akkaunt MySaloon va Morf AI uchun.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(520).delay(260)} style={styles.fields}>
          <FieldShell
            icon="person-outline"
            label="Ism"
            active={focus === "first"}
            done={Boolean(firstName.trim())}
          >
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Ali"
              placeholderTextColor={colors.muted}
              autoComplete="given-name"
              autoFocus
              onFocus={() => setFocus("first")}
              onBlur={() => setFocus(null)}
              style={styles.input}
            />
          </FieldShell>

          <FieldShell
            icon="people-outline"
            label="Familiya"
            active={focus === "last"}
            done={Boolean(lastName.trim())}
          >
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Karimov"
              placeholderTextColor={colors.muted}
              autoComplete="family-name"
              onFocus={() => setFocus("last")}
              onBlur={() => setFocus(null)}
              style={styles.input}
            />
          </FieldShell>

          {nameError ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color="#FF3B30" />
              <Text style={styles.fieldError}>{nameError}</Text>
            </View>
          ) : null}

          <FieldShell
            icon="calendar-outline"
            label="Yosh"
            active={focus === "age"}
            done={ageOk}
            trailing={
              age ? (
                <View style={styles.ageChip}>
                  <Text style={styles.ageChipText}>{age} yosh</Text>
                </View>
              ) : null
            }
          >
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
              onFocus={() => setFocus("age")}
              onBlur={() => setFocus(null)}
              style={styles.input}
            />
          </FieldShell>

          {ageError ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color="#FF3B30" />
              <Text style={styles.fieldError}>{ageError}</Text>
            </View>
          ) : null}

          {error && !nameError && !ageError ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color="#FF3B30" />
              <Text style={styles.fieldError}>{error}</Text>
            </View>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(480).delay(360)} style={ctaAnimStyle}>
          <Pressable
            style={[styles.primary, !canSubmit && styles.disabled]}
            onPress={() => void finish()}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Davom etish"
          >
            <Text style={styles.primaryText}>Davom etish</Text>
            <View style={styles.primaryIcon}>
              <Ionicons name="arrow-forward" size={18} color={colors.fg} />
            </View>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(420).delay(420)}>
          <Text style={styles.foot}>
            Keyin Morf AI try-on va bronlarga o‘sha akkaunt bilan kirasiz
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldShell({
  icon,
  label,
  active,
  done,
  trailing,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  done: boolean;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={[styles.fieldShell, active && styles.fieldShellActive]}>
      <View style={[styles.fieldIcon, done && styles.fieldIconDone]}>
        <Ionicons
          name={done ? "checkmark" : icon}
          size={16}
          color={done ? "#FFF" : colors.fg}
        />
      </View>
      <View style={styles.fieldBody}>
        <View style={styles.fieldLabelRow}>
          <Text style={styles.fieldLabel}>{label}</Text>
          {trailing}
        </View>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FAFAF8",
  },
  blobA: {
    position: "absolute",
    top: -verticalScale(40),
    right: -scale(50),
    width: scale(180),
    height: scale(180),
    borderRadius: moderateScale(90),
    backgroundColor: "rgba(255,92,92,0.12)",
  },
  blobB: {
    position: "absolute",
    top: verticalScale(180),
    left: -scale(60),
    width: scale(140),
    height: scale(140),
    borderRadius: moderateScale(36),
    backgroundColor: "rgba(10,10,10,0.05)",
    transform: [{ rotate: "18deg" }],
  },
  blobC: {
    position: "absolute",
    bottom: verticalScale(120),
    right: -scale(30),
    width: scale(100),
    height: scale(100),
    borderRadius: moderateScale(50),
    borderWidth: 14,
    borderColor: "rgba(250,204,21,0.28)",
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: scale(22),
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: verticalScale(8),
    marginBottom: verticalScale(18),
  },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    backgroundColor: "#FFF",
    borderRadius: 999,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(7),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  brandDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: moderateScale(4),
    backgroundColor: colors.brandDot,
  },
  brandText: {
    fontSize: fontSize(13),
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.2,
  },
  progressRow: { flexDirection: "row", gap: moderateScale(5) },
  progressSeg: {
    width: scale(18),
    height: verticalScale(5),
    borderRadius: moderateScale(3),
    backgroundColor: "rgba(10,10,10,0.12)",
  },
  progressSegOn: { backgroundColor: colors.fg, width: scale(22) },
  avatarBlock: {
    alignSelf: "center",
    marginBottom: verticalScale(18),
    width: scale(104),
    height: scale(104),
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRing: {
    position: "absolute",
    width: scale(104),
    height: scale(104),
    borderRadius: moderateScale(52),
    borderWidth: 2,
    borderColor: colors.brandDot,
  },
  avatar: {
    width: scale(88),
    height: scale(88),
    borderRadius: moderateScale(44),
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFF",
    fontSize: fontSize(28),
    fontWeight: "800",
    letterSpacing: 1,
  },
  avatarBadge: {
    position: "absolute",
    right: scale(2),
    bottom: verticalScale(4),
    width: scale(28),
    height: scale(28),
    borderRadius: moderateScale(14),
    backgroundColor: colors.brandDot,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FAFAF8",
  },
  hero: { marginBottom: verticalScale(20), gap: moderateScale(8) },
  title: {
    fontSize: fontSize(30),
    lineHeight: fontSize(36),
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.8,
  },
  sub: {
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    fontWeight: "500",
    color: colors.muted,
    maxWidth: scale(340),
  },
  fields: { gap: moderateScale(12) },
  fieldShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
    backgroundColor: "#FFF",
    borderRadius: moderateScale(18),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    borderWidth: 1.5,
    borderColor: "transparent",
    shadowColor: "#0A0A0A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  fieldShellActive: {
    borderColor: colors.fg,
  },
  fieldIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(14),
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldIconDone: {
    backgroundColor: colors.fg,
  },
  fieldBody: { flex: 1, gap: moderateScale(2) },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: {
    fontSize: fontSize(12),
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 0.2,
  },
  input: {
    paddingVertical: verticalScale(2),
    fontSize: fontSize(17),
    fontWeight: "700",
    color: colors.fg,
    letterSpacing: -0.2,
  },
  ageChip: {
    backgroundColor: "rgba(255,92,92,0.12)",
    borderRadius: 999,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
  },
  ageChipText: {
    fontSize: fontSize(11),
    fontWeight: "800",
    color: colors.brandDot,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(6),
    paddingHorizontal: scale(4),
  },
  fieldError: {
    flex: 1,
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: "#FF3B30",
    fontWeight: "600",
  },
  primary: {
    marginTop: verticalScale(22),
    minHeight: verticalScale(58),
    borderRadius: moderateScale(29),
    backgroundColor: colors.fg,
    paddingLeft: scale(22),
    paddingRight: scale(8),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  primaryText: { color: "#FFF", fontSize: fontSize(16), fontWeight: "800" },
  primaryIcon: {
    width: scale(42),
    height: scale(42),
    borderRadius: moderateScale(21),
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.4 },
  foot: {
    marginTop: verticalScale(14),
    textAlign: "center",
    fontSize: fontSize(12),
    lineHeight: fontSize(17),
    color: colors.muted,
    paddingHorizontal: scale(12),
  },
});
