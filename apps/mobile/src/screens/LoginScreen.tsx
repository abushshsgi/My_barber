import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
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
import {
  checkPhone,
  formatUzPhoneDisplay,
  normalizeUzPhone,
} from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import { useGoogleAuth } from "../auth/GoogleAuthSession";
import { getLastPhone } from "../auth/storage";
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
    <View style={styles.root}>
      <LinearGradient
        colors={["#F7F7F8", "#FFFFFF", "#F3F4F6"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={[styles.blobTop, { top: insets.top + 40 }]} pointerEvents="none" />
      <View style={styles.blobBottom} pointerEvents="none" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: Math.max(insets.top, 12) + 12,
              paddingBottom: Math.max(insets.bottom, 16) + 24,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.logo}>
              Mysaloon<Text style={styles.dot}>.</Text>
            </Text>
            <View style={styles.logoRule} />
            <Text style={styles.title}>Xush kelibsiz</Text>
            <Text style={styles.sub}>
              Google yoki telefon orqali mysaloon.uz hisobingizga kiring.
            </Text>
          </View>

          <View style={styles.card}>
            {step === "choose" ? (
              <View style={styles.stack}>
                <Pressable
                  style={({ pressed }) => [
                    styles.googleBtn,
                    googleWaiting && styles.googleBtnWaiting,
                    pressed && !googleWaiting && styles.pressed,
                  ]}
                  onPress={() => void onGoogle()}
                  disabled={showBusy || !google.ready}
                  accessibilityRole="button"
                  accessibilityLabel="Google bilan davom etish"
                >
                  <View style={styles.googleIconWrap}>
                    <GoogleGlyph size={20} />
                  </View>
                  <Text style={styles.googleText}>Google bilan davom etish</Text>
                  {googleWaiting ? (
                    <ActivityIndicator color={colors.muted} style={styles.googleSpinner} />
                  ) : (
                    <View style={styles.googleSpinnerSlot} />
                  )}
                </Pressable>

                <View style={styles.dividerRow}>
                  <View style={styles.line} />
                  <Text style={styles.or}>yoki</Text>
                  <View style={styles.line} />
                </View>

                <Pressable
                  style={({ pressed }) => [styles.phoneBtn, pressed && styles.pressed]}
                  onPress={() => setStep("phone")}
                  accessibilityRole="button"
                >
                  <Ionicons name="call-outline" size={18} color="#FFF" />
                  <Text style={styles.phoneBtnText}>Telefon bilan kirish</Text>
                </Pressable>
              </View>
            ) : null}

            {step === "phone" ? (
              <View style={styles.stack}>
                <Text style={styles.label}>Telefon raqam</Text>
                <View style={styles.phoneRow}>
                  <Text style={styles.prefix}>+998</Text>
                  <TextInput
                    value={phone}
                    onChangeText={(t) => setPhone(formatUzPhoneDisplay(t))}
                    keyboardType="phone-pad"
                    placeholder="90 123 45 67"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    maxLength={13}
                  />
                </View>
                <Pressable
                  style={[styles.primary, busy && styles.disabled]}
                  onPress={onContinuePhone}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryText}>Davom etish</Text>
                  )}
                </Pressable>
                <Pressable onPress={() => setStep("choose")}>
                  <Text style={styles.backLink}>← Orqaga</Text>
                </Pressable>
              </View>
            ) : null}

            {step === "password" ? (
              <View style={styles.stack}>
                <Text style={styles.label}>Parol</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="Parolingiz"
                  placeholderTextColor={colors.muted}
                  style={styles.inputBox}
                />
                <Pressable
                  style={[styles.primary, busy && styles.disabled]}
                  onPress={onPasswordLogin}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryText}>Kirish</Text>
                  )}
                </Pressable>
                <Pressable onPress={onSendOtpInstead} disabled={busy}>
                  <Text style={styles.link}>SMS kod bilan kirish</Text>
                </Pressable>
                <Pressable onPress={() => setStep("phone")}>
                  <Text style={styles.backLink}>← Orqaga</Text>
                </Pressable>
              </View>
            ) : null}

            {step === "code" ? (
              <View style={styles.stack}>
                <Text style={styles.label}>SMS kod</Text>
                <Text style={styles.codeHint}>
                  +998 {formatUzPhoneDisplay(phone)} raqamiga yuborildi
                </Text>
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  placeholder="••••"
                  placeholderTextColor={colors.muted}
                  style={styles.inputBox}
                  maxLength={6}
                />
                {hint ? <Text style={styles.hint}>{hint}</Text> : null}
                <Pressable
                  style={[styles.primary, busy && styles.disabled]}
                  onPress={onVerifyCode}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryText}>Tasdiqlash</Text>
                  )}
                </Pressable>
                <Pressable onPress={() => setStep(hasPassword ? "password" : "phone")}>
                  <Text style={styles.backLink}>← Orqaga</Text>
                </Pressable>
              </View>
            ) : null}

            {showError ? <Text style={styles.error}>{showError}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  blobTop: {
    position: "absolute",
    right: -48,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(10,10,10,0.04)",
  },
  blobBottom: {
    position: "absolute",
    left: -60,
    bottom: 120,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,92,92,0.06)",
  },
  hero: { marginBottom: 28 },
  logo: {
    fontSize: 30,
    fontWeight: "900",
    color: colors.fg,
    letterSpacing: -0.9,
  },
  dot: { color: colors.brandDot },
  logoRule: {
    marginTop: 12,
    width: 36,
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(10,10,10,0.18)",
  },
  title: {
    marginTop: 22,
    fontSize: 28,
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.5,
  },
  sub: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    maxWidth: 320,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(10,10,10,0.06)",
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 18,
    shadowColor: "#0A0A0A",
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 2,
  },
  stack: { gap: 14 },
  googleBtn: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 12,
  },
  googleBtnWaiting: { opacity: 0.72 },
  googleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8F9FA",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  googleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.fg,
    letterSpacing: -0.2,
  },
  googleSpinner: { marginRight: 2 },
  googleSpinnerSlot: { width: 20, height: 20 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 2,
  },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  or: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  phoneBtn: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: colors.fg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  phoneBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700", letterSpacing: -0.2 },
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, letterSpacing: 0.6, textTransform: "uppercase" },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  prefix: { fontSize: 16, fontWeight: "700", color: colors.fg, marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: colors.fg, paddingVertical: 12 },
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
  primary: {
    marginTop: 4,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  disabled: { opacity: 0.65 },
  backLink: { marginTop: 8, fontSize: 14, fontWeight: "600", color: colors.muted, textAlign: "center" },
  link: { textAlign: "center", fontSize: 14, fontWeight: "600", color: colors.fg },
  codeHint: { fontSize: 13, color: colors.muted, marginTop: -4 },
  hint: { fontSize: 12, color: colors.muted },
  error: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 18,
    color: "#FF3B30",
    textAlign: "center",
  },
});
