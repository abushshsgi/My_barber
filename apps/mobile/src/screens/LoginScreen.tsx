import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
  checkPhone,
  formatUzPhoneDisplay,
  normalizeUzPhone,
} from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import { useGoogleAuth } from "../auth/GoogleAuthSession";
import { getLastPhone } from "../auth/storage";
import { morfWordmarkWhite } from "../branding/morf-logo";
import { BrandLogo } from "../components/BrandLogo";
import { GoogleGlyph } from "../components/GoogleGlyph";
import { useAppShell } from "../lib/AppShellContext";
import { setPendingReferralCode } from "../lib/referral-storage";
import { colors } from "../theme/colors";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../utils/responsive";

type Step = "choose" | "phone" | "password" | "code";

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const google = useGoogleAuth();
  const { shell } = useAppShell();
  const morph = shell === "morph";

  const [step, setStep] = useState<Step>("choose");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [password, setPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const showError = error || google.error;
  const showBusy = busy || google.busy;
  const googleWaiting = showBusy || !google.ready;
  const titleStyle = [styles.title, morph && styles.titleMorph];
  const subStyle = [styles.sub, morph && styles.subMorph];

  useEffect(() => {
    void getLastPhone().then((p) => {
      if (p) setPhone(formatUzPhoneDisplay(p));
    });
  }, []);

  const onGoogle = async () => {
    setError(null);
    google.clearError();
    await setPendingReferralCode(referralCode);
    await google.promptGoogle();
  };

  const onContinuePhone = async () => {
    const nine = normalizeUzPhone(phone);
    if (nine.length !== 9) {
      setError("Telefon raqamini to'liq kiriting (90 123 45 67).");
      return;
    }
    setBusy(true);
    setError(null);
    setHint(null);
    try {
      const check = await checkPhone(nine);
      setHasPassword(check.has_password);
      if (check.has_password) {
        setStep("password");
      } else {
        const sent = await auth.requestPhoneCode(nine);
        setHint(sent.debug_code ? `Dev kod: ${sent.debug_code}` : sent.detail);
        setStep("code");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kod yuborilmadi");
    } finally {
      setBusy(false);
    }
  };

  const onVerifyCode = async () => {
    const nine = normalizeUzPhone(phone);
    if (code.trim().length < 4) {
      setError("SMS kodni kiriting.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await auth.signInWithPhoneCode(nine, code.trim(), referralCode.trim() || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kod noto'g'ri");
    } finally {
      setBusy(false);
    }
  };

  const onPasswordLogin = async () => {
    const nine = normalizeUzPhone(phone);
    if (!password.trim()) {
      setError("Parolni kiriting.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await auth.signInWithPassword(nine, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parol noto'g'ri");
    } finally {
      setBusy(false);
    }
  };

  const onSendOtpInstead = async () => {
    const nine = normalizeUzPhone(phone);
    setBusy(true);
    setError(null);
    try {
      const sent = await auth.requestPhoneCode(nine);
      setHint(sent.debug_code ? `Dev kod: ${sent.debug_code}` : sent.detail);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kod yuborilmadi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.root,
        morph && styles.rootMorph,
        { paddingTop: insets.top + 8 },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.body}>
        {/* Markaz — logo + sarlavha (Uzum Tezkor uslubi) */}
        <View style={styles.centerBlock}>
          {morph ? (
            <Image
              source={morfWordmarkWhite}
              style={styles.morphMark}
              resizeMode="contain"
              accessibilityLabel="Morf AI"
            />
          ) : (
            <BrandLogo size="xl" />
          )}

          {step === "choose" ? (
            <>
              <Text style={titleStyle}>
                {morph ? "Morf AI ga kiring" : "Mysaloon ga kiring"}
              </Text>
              <Text style={subStyle}>
                Bitta akkaunt — MySaloon va Morf AI uchun
              </Text>
              <Text style={[styles.refLabel, morph && styles.subMorph]}>Taklif kodi (ixtiyoriy)</Text>
              <TextInput
                value={referralCode}
                onChangeText={(v) => setReferralCode(v.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="ABCD1234"
                placeholderTextColor={morph ? "rgba(255,255,255,0.35)" : colors.muted}
                style={[styles.field, morph && styles.fieldMorph]}
                maxLength={8}
              />
            </>
          ) : null}

          {step === "phone" ? (
            <>
              <Text style={titleStyle}>Raqam bilan davom eting</Text>
              <Text style={subStyle}>SMS kod yuboriladi</Text>
              <View style={[styles.phoneRow, morph && styles.phoneRowMorph]}>
                <Text style={[styles.prefix, morph && styles.prefixMorph]}>+998</Text>
                <TextInput
                  value={phone}
                  onChangeText={(t) => setPhone(formatUzPhoneDisplay(t))}
                  keyboardType="phone-pad"
                  placeholder="90 123 45 67"
                  placeholderTextColor={morph ? "rgba(255,255,255,0.35)" : colors.muted}
                  style={[styles.phoneInput, morph && styles.phoneInputMorph]}
                  maxLength={13}
                  autoFocus
                />
              </View>
            </>
          ) : null}

          {step === "password" ? (
            <>
              <Text style={titleStyle}>Parolingizni kiriting</Text>
              <Text style={subStyle}>+998 {formatUzPhoneDisplay(phone)}</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Parol"
                placeholderTextColor={morph ? "rgba(255,255,255,0.35)" : colors.muted}
                style={[styles.field, morph && styles.fieldMorph]}
                autoFocus
              />
              <Pressable onPress={onSendOtpInstead} disabled={busy} hitSlop={8}>
                <Text style={[styles.link, morph && styles.titleMorph]}>SMS kod bilan kirish</Text>
              </Pressable>
            </>
          ) : null}

          {step === "code" ? (
            <>
              <Text style={titleStyle}>SMS kodni kiriting</Text>
              <Text style={subStyle}>+998 {formatUzPhoneDisplay(phone)}</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                placeholder="••••"
                placeholderTextColor={morph ? "rgba(255,255,255,0.35)" : colors.muted}
                style={[styles.field, styles.codeField, morph && styles.fieldMorph]}
                maxLength={6}
                autoFocus
              />
              {hint ? (
                <Text style={[styles.hint, morph && styles.subMorph]}>{hint}</Text>
              ) : null}
            </>
          ) : null}

          {showError ? <Text style={styles.error}>{showError}</Text> : null}
        </View>

        {/* Past — pill tugmalar */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
          {step === "choose" ? (
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [
                  styles.outlineBtn,
                  morph && styles.outlineBtnMorph,
                  googleWaiting && styles.btnDisabled,
                  pressed && !googleWaiting && styles.pressed,
                ]}
                onPress={() => void onGoogle()}
                disabled={showBusy || !google.ready}
                accessibilityRole="button"
                accessibilityLabel="Google bilan davom etish"
              >
                <GoogleGlyph size={22} />
                <Text style={[styles.outlineBtnText, morph && styles.outlineBtnTextMorph]}>
                  Google bilan davom etish
                </Text>
                {googleWaiting ? (
                  <ActivityIndicator color={morph ? "#FFF" : colors.muted} />
                ) : null}
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  morph && styles.primaryBtnMorph,
                  pressed && styles.pressed,
                ]}
                onPress={() => setStep("phone")}
                accessibilityRole="button"
              >
                <Ionicons name="call-outline" size={18} color={morph ? "#0A0A0A" : "#FFF"} />
                <Text style={[styles.primaryBtnText, morph && styles.primaryBtnTextMorph]}>
                  Telefon bilan kirish
                </Text>
              </Pressable>
            </View>
          ) : null}

          {step === "phone" ? (
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  morph && styles.primaryBtnMorph,
                  busy && styles.btnDisabled,
                  pressed && !busy && styles.pressed,
                ]}
                onPress={onContinuePhone}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={morph ? "#0A0A0A" : "#FFF"} />
                ) : (
                  <Text style={[styles.primaryBtnText, morph && styles.primaryBtnTextMorph]}>
                    Davom etish
                  </Text>
                )}
              </Pressable>
              <Pressable onPress={() => setStep("choose")} hitSlop={8}>
                <Text style={[styles.secondaryLink, morph && styles.subMorph]}>Orqaga</Text>
              </Pressable>
            </View>
          ) : null}

          {step === "password" ? (
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  morph && styles.primaryBtnMorph,
                  busy && styles.btnDisabled,
                  pressed && !busy && styles.pressed,
                ]}
                onPress={onPasswordLogin}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={morph ? "#0A0A0A" : "#FFF"} />
                ) : (
                  <Text style={[styles.primaryBtnText, morph && styles.primaryBtnTextMorph]}>
                    Kirish
                  </Text>
                )}
              </Pressable>
              <Pressable onPress={() => setStep("phone")} hitSlop={8}>
                <Text style={[styles.secondaryLink, morph && styles.subMorph]}>Orqaga</Text>
              </Pressable>
            </View>
          ) : null}

          {step === "code" ? (
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  morph && styles.primaryBtnMorph,
                  busy && styles.btnDisabled,
                  pressed && !busy && styles.pressed,
                ]}
                onPress={onVerifyCode}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={morph ? "#0A0A0A" : "#FFF"} />
                ) : (
                  <Text style={[styles.primaryBtnText, morph && styles.primaryBtnTextMorph]}>
                    Tasdiqlash
                  </Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => setStep(hasPassword ? "password" : "phone")}
                hitSlop={8}
              >
                <Text style={[styles.secondaryLink, morph && styles.subMorph]}>Orqaga</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={[styles.legal, morph && styles.subMorph]}>
            Davom etish orqali{" "}
            <Text style={[styles.legalLink, morph && styles.titleMorph]}>
              foydalanish shartlari
            </Text>{" "}
            va{" "}
            <Text style={[styles.legalLink, morph && styles.titleMorph]}>
              maxfiylik siyosati
            </Text>
            ga rozilik bildirasiz. Akkaunt MySaloon va Morf AI da ishlaydi.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  rootMorph: {
    backgroundColor: "#FAFAFA",
  },
  morphMark: {
    width: scale(180),
    height: verticalScale(44),
  },
  body: {
    flex: 1,
    paddingHorizontal: scale(24),
    justifyContent: "space-between",
  },
  centerBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: verticalScale(24),
    gap: moderateScale(10),
  },
  title: {
    marginTop: verticalScale(28),
    fontSize: fontSize(26),
    fontWeight: "800",
    color: colors.fg,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  sub: {
    marginTop: verticalScale(6),
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    color: colors.muted,
    textAlign: "center",
    maxWidth: scale(280),
  },
  phoneRow: {
    marginTop: verticalScale(22),
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    borderWidth: 1.5,
    borderColor: colors.fg,
    borderRadius: moderateScale(16),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(14),
    backgroundColor: "#FFFFFF",
  },
  prefix: {
    fontSize: fontSize(20),
    fontWeight: "800",
    color: colors.fg,
    marginRight: scale(10),
    letterSpacing: -0.3,
  },
  phoneInput: {
    flex: 1,
    fontSize: fontSize(20),
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.3,
    paddingVertical: 0,
  },
  field: {
    marginTop: verticalScale(22),
    alignSelf: "stretch",
    minHeight: verticalScale(56),
    borderRadius: moderateScale(16),
    backgroundColor: colors.surface,
    paddingHorizontal: scale(18),
    fontSize: fontSize(17),
    fontWeight: "600",
    color: colors.fg,
  },
  refLabel: {
    alignSelf: "stretch",
    marginTop: verticalScale(16),
    marginBottom: -verticalScale(12),
    fontSize: fontSize(12),
    fontWeight: "600",
    color: colors.muted,
  },
  codeField: {
    textAlign: "center",
    letterSpacing: 10,
    fontSize: fontSize(28),
    fontWeight: "800",
  },
  hint: {
    marginTop: verticalScale(8),
    fontSize: fontSize(13),
    color: colors.muted,
    textAlign: "center",
  },
  link: {
    marginTop: verticalScale(14),
    fontSize: fontSize(15),
    fontWeight: "700",
    color: colors.fg,
    textAlign: "center",
  },
  error: {
    marginTop: verticalScale(16),
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: "#FF3B30",
    textAlign: "center",
    maxWidth: scale(300),
  },
  footer: {
    gap: moderateScale(14),
  },
  actions: {
    gap: moderateScale(12),
  },
  outlineBtn: {
    minHeight: verticalScale(56),
    borderRadius: moderateScale(28),
    borderWidth: 1.5,
    borderColor: colors.fg,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(10),
    paddingHorizontal: scale(20),
  },
  outlineBtnText: {
    fontSize: fontSize(16),
    fontWeight: "700",
    color: colors.fg,
  },
  primaryBtn: {
    minHeight: verticalScale(56),
    borderRadius: moderateScale(28),
    backgroundColor: colors.fg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(10),
    paddingHorizontal: scale(20),
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: fontSize(16),
    fontWeight: "800",
  },
  btnDisabled: { opacity: 0.55 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  secondaryLink: {
    textAlign: "center",
    fontSize: fontSize(15),
    fontWeight: "700",
    color: colors.muted,
    paddingVertical: verticalScale(4),
  },
  legal: {
    marginTop: verticalScale(4),
    fontSize: fontSize(12),
    lineHeight: fontSize(18),
    color: colors.muted,
    textAlign: "center",
    paddingHorizontal: scale(8),
  },
  legalLink: {
    color: colors.fg,
    fontWeight: "700",
  },
  titleMorph: { color: "#FFFFFF" },
  subMorph: { color: "rgba(255,255,255,0.55)" },
  outlineBtnMorph: {
    borderColor: "rgba(255,255,255,0.85)",
    backgroundColor: "transparent",
  },
  outlineBtnTextMorph: { color: "#FFFFFF" },
  primaryBtnMorph: { backgroundColor: "#FFFFFF" },
  primaryBtnTextMorph: { color: "#0A0A0A" },
  phoneRowMorph: {
    borderColor: "rgba(255,255,255,0.55)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  prefixMorph: { color: "#FFFFFF" },
  phoneInputMorph: { color: "#FFFFFF" },
  fieldMorph: {
    backgroundColor: "rgba(255,255,255,0.08)",
    color: "#FFFFFF",
  },
});
