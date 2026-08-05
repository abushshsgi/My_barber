import { Ionicons } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
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
  getGoogleClientId,
  normalizeUzPhone,
} from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import { getLastPhone } from "../auth/storage";
import { colors } from "../theme/colors";

WebBrowser.maybeCompleteAuthSession();

type Step = "choose" | "phone" | "password" | "code";

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const googleClientId = getGoogleClientId();

  const [step, setStep] = useState<Step>("choose");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const redirectUri = useMemo(
    () =>
      AuthSession.makeRedirectUri({
        scheme: "mysaloon",
        preferLocalhost: true,
      }),
    [],
  );

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    googleClientId
      ? {
          clientId: googleClientId,
          iosClientId: googleClientId,
          androidClientId: googleClientId,
          webClientId: googleClientId,
          redirectUri,
        }
      : { clientId: "unused.apps.googleusercontent.com", redirectUri },
  );

  useEffect(() => {
    if (__DEV__) {
      console.log("[google-auth] redirectUri =", redirectUri);
    }
  }, [redirectUri]);

  useEffect(() => {
    void getLastPhone().then((p) => {
      if (p) setPhone(formatUzPhoneDisplay(p));
    });
  }, []);

  useEffect(() => {
    if (response?.type !== "success") return;
    const idToken =
      response.params.id_token ||
      (response as { authentication?: { idToken?: string } }).authentication?.idToken;
    if (!idToken) {
      setError("Google token olinmadi.");
      return;
    }
    setBusy(true);
    setError(null);
    void auth
      .signInWithGoogle(idToken)
      .catch((err) => setError(err instanceof Error ? err.message : "Google kirish xato"))
      .finally(() => setBusy(false));
  }, [response, auth]);

  const onGoogle = async () => {
    setError(null);
    if (!googleClientId) {
      setError(
        "Google Client ID sozlanmagan. EXPO_PUBLIC_GOOGLE_CLIENT_ID yoki app.json extra.googleClientId qo'shing.",
      );
      return;
    }
    setBusy(true);
    try {
      await promptAsync({ useProxy: false, showInRecents: true } as never);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google ochilmadi";
      setError(
        /redirect/i.test(msg)
          ? `${msg}\n\nGoogle Console → Authorized redirect URIs ga qo'shing:\n${redirectUri}`
          : msg,
      );
    } finally {
      setBusy(false);
    }
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
      style={[styles.root, { paddingTop: Math.max(insets.top, 16) }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.logo}>
          Mysaloon<Text style={styles.dot}>.</Text>
        </Text>
        <Text style={styles.title}>Xush kelibsiz</Text>
        <Text style={styles.sub}>
          Google yoki telefon orqali mysaloon.uz hisobingizga kiring.
        </Text>

        {step === "choose" ? (
          <View style={styles.stack}>
            <Pressable
              style={[styles.googleBtn, busy && styles.disabled]}
              onPress={onGoogle}
              disabled={busy || (!!googleClientId && !request)}
            >
              {busy ? (
                <ActivityIndicator color={colors.fg} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color={colors.fg} />
                  <Text style={styles.googleText}>Google bilan davom etish</Text>
                </>
              )}
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.line} />
              <Text style={styles.or}>yoki</Text>
              <View style={styles.line} />
            </View>

            <Pressable style={styles.phoneBtn} onPress={() => setStep("phone")}>
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
            <Text style={styles.codeHint}>+998 {formatUzPhoneDisplay(phone)} raqamiga yuborildi</Text>
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

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  logo: {
    marginTop: 28,
    fontSize: 28,
    fontWeight: "900",
    color: colors.fg,
    letterSpacing: -0.8,
  },
  dot: { color: colors.brandDot },
  title: {
    marginTop: 28,
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
    marginBottom: 28,
  },
  stack: { gap: 12 },
  googleBtn: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleText: { fontSize: 15, fontWeight: "700", color: colors.fg },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  or: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  phoneBtn: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.fg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  phoneBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "700", color: colors.fg },
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
  backLink: { marginTop: 8, fontSize: 14, fontWeight: "600", color: colors.muted },
  link: { textAlign: "center", fontSize: 14, fontWeight: "600", color: colors.fg },
  codeHint: { fontSize: 13, color: colors.muted, marginTop: -4 },
  hint: { fontSize: 12, color: colors.muted },
  error: {
    marginTop: 16,
    fontSize: 13,
    lineHeight: 18,
    color: "#FF3B30",
  },
});
