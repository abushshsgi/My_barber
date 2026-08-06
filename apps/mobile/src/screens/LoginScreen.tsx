import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
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
import {
  checkPhone,
  formatUzPhoneDisplay,
  normalizeUzPhone,
} from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import { useGoogleAuth } from "../auth/GoogleAuthSession";
import { getLastPhone } from "../auth/storage";
import { BrandLogo } from "../components/BrandLogo";
import { GoogleGlyph } from "../components/GoogleGlyph";
import { colors } from "../theme/colors";

type Step = "choose" | "phone" | "password" | "code";

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const google = useGoogleAuth();

  const [step, setStep] = useState<Step>("choose");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const showError = error || google.error;
  const showBusy = busy || google.busy;
  const googleWaiting = showBusy || !google.ready;

  useEffect(() => {
    void getLastPhone().then((p) => {
      if (p) setPhone(formatUzPhoneDisplay(p));
    });
  }, []);

  const onGoogle = async () => {
    setError(null);
    google.clearError();
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
      await auth.signInWithPhoneCode(nine, code.trim());
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
      style={[styles.root, { paddingTop: insets.top + 8 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.body}>
        {/* Markaz — logo + sarlavha (Uzum Tezkor uslubi) */}
        <View style={styles.centerBlock}>
          <BrandLogo size="xl" />

          {step === "choose" ? (
            <>
              <Text style={styles.title}>Mysaloon ga kiring</Text>
              <Text style={styles.sub}>Google yoki telefon orqali davom eting</Text>
            </>
          ) : null}

          {step === "phone" ? (
            <>
              <Text style={styles.title}>Raqam bilan davom eting</Text>
              <Text style={styles.sub}>SMS kod yuboriladi</Text>
              <View style={styles.phoneRow}>
                <Text style={styles.prefix}>+998</Text>
                <TextInput
                  value={phone}
                  onChangeText={(t) => setPhone(formatUzPhoneDisplay(t))}
                  keyboardType="phone-pad"
                  placeholder="90 123 45 67"
                  placeholderTextColor={colors.muted}
                  style={styles.phoneInput}
                  maxLength={13}
                  autoFocus
                />
              </View>
            </>
          ) : null}

          {step === "password" ? (
            <>
              <Text style={styles.title}>Parolingizni kiriting</Text>
              <Text style={styles.sub}>+998 {formatUzPhoneDisplay(phone)}</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Parol"
                placeholderTextColor={colors.muted}
                style={styles.field}
                autoFocus
              />
              <Pressable onPress={onSendOtpInstead} disabled={busy} hitSlop={8}>
                <Text style={styles.link}>SMS kod bilan kirish</Text>
              </Pressable>
            </>
          ) : null}

          {step === "code" ? (
            <>
              <Text style={styles.title}>SMS kodni kiriting</Text>
              <Text style={styles.sub}>+998 {formatUzPhoneDisplay(phone)}</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                placeholder="••••"
                placeholderTextColor={colors.muted}
                style={[styles.field, styles.codeField]}
                maxLength={6}
                autoFocus
              />
              {hint ? <Text style={styles.hint}>{hint}</Text> : null}
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
                  googleWaiting && styles.btnDisabled,
                  pressed && !googleWaiting && styles.pressed,
                ]}
                onPress={() => void onGoogle()}
                disabled={showBusy || !google.ready}
                accessibilityRole="button"
                accessibilityLabel="Google bilan davom etish"
              >
                <GoogleGlyph size={22} />
                <Text style={styles.outlineBtnText}>Google bilan davom etish</Text>
                {googleWaiting ? <ActivityIndicator color={colors.muted} /> : null}
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                onPress={() => setStep("phone")}
                accessibilityRole="button"
              >
                <Ionicons name="call-outline" size={18} color="#FFF" />
                <Text style={styles.primaryBtnText}>Telefon bilan kirish</Text>
              </Pressable>
            </View>
          ) : null}

          {step === "phone" ? (
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  busy && styles.btnDisabled,
                  pressed && !busy && styles.pressed,
                ]}
                onPress={onContinuePhone}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Davom etish</Text>
                )}
              </Pressable>
              <Pressable onPress={() => setStep("choose")} hitSlop={8}>
                <Text style={styles.secondaryLink}>Orqaga</Text>
              </Pressable>
            </View>
          ) : null}

          {step === "password" ? (
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  busy && styles.btnDisabled,
                  pressed && !busy && styles.pressed,
                ]}
                onPress={onPasswordLogin}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Kirish</Text>
                )}
              </Pressable>
              <Pressable onPress={() => setStep("phone")} hitSlop={8}>
                <Text style={styles.secondaryLink}>Orqaga</Text>
              </Pressable>
            </View>
          ) : null}

          {step === "code" ? (
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  busy && styles.btnDisabled,
                  pressed && !busy && styles.pressed,
                ]}
                onPress={onVerifyCode}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Tasdiqlash</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => setStep(hasPassword ? "password" : "phone")}
                hitSlop={8}
              >
                <Text style={styles.secondaryLink}>Orqaga</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.legal}>
            Davom etish orqali{" "}
            <Text style={styles.legalLink}>foydalanish shartlari</Text> va{" "}
            <Text style={styles.legalLink}>maxfiylik siyosati</Text>ga rozilik
            bildirasiz.
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
  body: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  centerBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 24,
    gap: 10,
  },
  title: {
    marginTop: 28,
    fontSize: 26,
    fontWeight: "800",
    color: colors.fg,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  sub: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 280,
  },
  phoneRow: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    borderBottomWidth: 2,
    borderBottomColor: colors.fg,
    paddingBottom: 10,
    paddingHorizontal: 4,
  },
  prefix: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.fg,
    marginRight: 10,
    letterSpacing: -0.5,
  },
  phoneInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.5,
    paddingVertical: 0,
  },
  field: {
    marginTop: 22,
    alignSelf: "stretch",
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    fontSize: 17,
    fontWeight: "600",
    color: colors.fg,
  },
  codeField: {
    textAlign: "center",
    letterSpacing: 10,
    fontSize: 28,
    fontWeight: "800",
  },
  hint: {
    marginTop: 8,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
  link: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: "700",
    color: colors.fg,
    textAlign: "center",
  },
  error: {
    marginTop: 16,
    fontSize: 13,
    lineHeight: 18,
    color: "#FF3B30",
    textAlign: "center",
    maxWidth: 300,
  },
  footer: {
    gap: 14,
  },
  actions: {
    gap: 12,
  },
  outlineBtn: {
    minHeight: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.fg,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 20,
  },
  outlineBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.fg,
  },
  primaryBtn: {
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: colors.fg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 20,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  btnDisabled: { opacity: 0.55 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  secondaryLink: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: colors.muted,
    paddingVertical: 4,
  },
  legal: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  legalLink: {
    color: colors.fg,
    fontWeight: "700",
  },
});
