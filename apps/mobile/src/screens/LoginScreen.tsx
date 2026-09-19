import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
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
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeBottom, safeTop } from "../lib/safe-area";
import {
  checkPhone,
  formatUzPhoneDisplay,
  normalizeUzPhone,
} from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import { useGoogleAuth } from "../auth/GoogleAuthSession";
import { getLastPhone } from "../auth/storage";
import { AuthLandingHero } from "../components/auth/AuthLandingHero";
import { useHideTabBar } from "../hooks/useHideTabBar";
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
  useHideTabBar();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const google = useGoogleAuth();
  const { shell } = useAppShell();
  const morph = shell === "morph";
  const navigation = useNavigation();

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

  const onGoogle = () => {
    setError(null);
    google.clearError();
    // Redirect/popup user-gesture ichida ochilsin — await qilmaymiz
    void setPendingReferralCode(referralCode);
    void google.promptGoogle();
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

  const onBack = () => {
    if (step === "code") {
      setStep(hasPassword ? "password" : "phone");
      setError(null);
      return;
    }
    if (step === "password") {
      setStep("phone");
      setError(null);
      return;
    }
    if (step === "phone") {
      setStep("choose");
      setError(null);
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate(morph ? ("MorphChat" as never) : ("Home" as never));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.root,
        morph && styles.rootMorph,
        { paddingTop: safeTop(insets.top, 8) },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="dark" />
      <View style={styles.body}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Orqaga"
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color="#111111" />
        </Pressable>

        {step === "choose" ? (
          <ScrollView
            style={styles.chooseScroll}
            contentContainerStyle={styles.chooseContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <AuthLandingHero
              title={t("auth.heroTitle")}
              subtitle={t("auth.heroSub")}
              googleLabel={t("auth.googleContinue")}
              phoneLabel={t("auth.phoneLogin")}
              onGoogle={onGoogle}
              onPhone={() => setStep("phone")}
              googleWaiting={googleWaiting}
              extra={
                <View style={styles.refWrap}>
                  <Text style={[styles.refLabel, morph && styles.subMorph]}>
                    Taklif kodi (ixtiyoriy)
                  </Text>
                  <TextInput
                    value={referralCode}
                    onChangeText={(v) => setReferralCode(v.toUpperCase())}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    placeholder="ABCD1234"
                    placeholderTextColor={morph ? "rgba(255,255,255,0.35)" : colors.muted}
                    style={[styles.refField, morph && styles.fieldMorph]}
                    maxLength={8}
                  />
                </View>
              }
            />
            {showError ? <Text style={styles.error}>{showError}</Text> : null}
          </ScrollView>
        ) : (
        <View style={styles.centerBlock}>
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
                  placeholderTextColor={colors.muted}
                  style={[styles.phoneInput, morph && styles.phoneInputMorph]}
                  maxLength={12}
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
                onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 4))}
                keyboardType="number-pad"
                placeholder="••••"
                placeholderTextColor={colors.muted}
                style={[styles.field, styles.codeField, morph && styles.fieldMorph]}
                maxLength={4}
                autoFocus
              />
              {hint ? (
                <Text style={[styles.hint, morph && styles.subMorph]}>{hint}</Text>
              ) : null}
            </>
          ) : null}

          {showError ? <Text style={styles.error}>{showError}</Text> : null}
        </View>
        )}

        <View style={[styles.footer, { paddingBottom: safeBottom(insets.bottom, 12) }]}>
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
                  <ActivityIndicator color={colors.forest} />
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
                  <ActivityIndicator color={colors.forest} />
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
                  <ActivityIndicator color={colors.forest} />
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
    backgroundColor: "#FFFFFF",
  },
  body: {
    flex: 1,
    paddingHorizontal: scale(24),
    justifyContent: "space-between",
  },
  backBtn: {
    alignSelf: "flex-start",
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(14),
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(4),
  },
  chooseScroll: { flex: 1 },
  chooseContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: verticalScale(8),
  },
  refWrap: {
    alignSelf: "stretch",
    marginTop: verticalScale(16),
  },
  refField: {
    marginTop: verticalScale(6),
    alignSelf: "stretch",
    minHeight: verticalScale(48),
    borderRadius: moderateScale(16),
    backgroundColor: "#F4F4F5",
    paddingHorizontal: scale(16),
    fontSize: fontSize(15),
    fontWeight: "600",
    color: colors.fg,
    textAlign: "center",
  },
  centerBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: verticalScale(24),
    gap: moderateScale(10),
  },
  title: {
    marginTop: verticalScale(8),
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
    fontSize: fontSize(12),
    fontWeight: "600",
    color: colors.muted,
    textAlign: "center",
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
  primaryBtn: {
    minHeight: verticalScale(56),
    borderRadius: moderateScale(28),
    backgroundColor: colors.lime,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(10),
    paddingHorizontal: scale(20),
  },
  primaryBtnText: {
    color: colors.forest,
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
  titleMorph: { color: colors.fg },
  subMorph: { color: colors.muted },
  primaryBtnMorph: { backgroundColor: colors.lime },
  primaryBtnTextMorph: { color: colors.forest },
  phoneRowMorph: {
    borderColor: colors.fg,
    backgroundColor: "#FFFFFF",
  },
  prefixMorph: { color: colors.fg },
  phoneInputMorph: { color: colors.fg },
  fieldMorph: {
    backgroundColor: colors.surface,
    color: colors.fg,
  },
});
