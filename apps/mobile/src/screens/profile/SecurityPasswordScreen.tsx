import { useTranslation } from "react-i18next";
import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { changePassword, setPassword } from "../../api/auth";
import { useAuth } from "../../auth/AuthContext";
import { useProfileData } from "../../hooks/useProfileData";
import { useShellTheme } from "../../lib/useShellTheme";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<ProfileStackParamList, "SecurityPassword">;

export function SecurityPasswordScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const pal = useShellTheme();
  const data = useProfileData();
  const { refreshMe } = useAuth();
  const hasPassword = Boolean(data.user?.has_password);
  const isGoogle = Boolean(data.user) && (data.user?.sign_in_method === "google" || !data.user?.phone);
  const [oldPassword, setOldPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNext, setShowNext] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      if (isGoogle) {
        throw new Error("Google hisobida parol qo'yilmaydi.");
      }
      if (nextPassword.trim().length < 8) {
        throw new Error("Parol kamida 8 belgidan iborat bo'lishi kerak.");
      }
      if (nextPassword.trim() !== confirmPassword.trim()) {
        throw new Error("Parollar mos kelmadi.");
      }
      if (hasPassword) {
        if (!oldPassword.trim()) throw new Error("Joriy parolni kiriting.");
        await changePassword(oldPassword, nextPassword.trim());
        setOk("Parol yangilandi. Keyingi kirishda shu parol ishlaydi.");
      } else {
        await setPassword(nextPassword.trim());
        setOk("Parol saqlandi. Endi telefon va shu parol bilan kirasiz.");
      }
      setOldPassword("");
      setNextPassword("");
      setConfirmPassword("");
      await refreshMe();
      data.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message.replace(/^API \d+:\s*/, "") : "Xatolik");
    } finally {
      setBusy(false);
    }
  };

  const fieldStyle = [
    styles.input,
    {
      color: pal.fg,
      backgroundColor: pal.card,
      borderColor: pal.border,
      fontFamily: pal.font.fontFamily,
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <StatusBar style={pal.status} />
      <NativeHeader
        title={isGoogle ? "Parol" : hasPassword ? "Parolni o'zgartirish" : "Parol qo'shish"}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={[styles.hero, { backgroundColor: pal.iconTile }]}>
          <Ionicons name={isGoogle ? "logo-google" : "lock-closed-outline"} size={22} color={pal.fg} />
        </View>
        {isGoogle ? (
          <Text style={[styles.hint, { color: pal.muted, fontFamily: pal.font.fontFamily }]}>
            Google hisobida parol yo'q. Kirish Google orqali qoladi. Parol faqat telefon raqam bilan
            kirgan hisobda qo'yiladi.
          </Text>
        ) : (
          <>
            <Text style={[styles.hint, { color: pal.muted, fontFamily: pal.font.fontFamily }]}>
              {hasPassword
                ? "Yangi parolni saqlang. Keyingi safar telefon va shu parol bilan kirasiz."
                : "Parol qo'yilgach, SMS o'rniga telefon va shu parol bilan kirishingiz mumkin."}
            </Text>
            {hasPassword ? (
              <TextInput
                value={oldPassword}
                onChangeText={setOldPassword}
                secureTextEntry
                placeholder="Joriy parol"
                placeholderTextColor={pal.muted}
                style={fieldStyle}
              />
            ) : null}
            <View>
              <TextInput
                value={nextPassword}
                onChangeText={setNextPassword}
                secureTextEntry={!showNext}
                placeholder="Yangi parol (kamida 8 belgi)"
                placeholderTextColor={pal.muted}
                style={[fieldStyle, styles.inputPad]}
              />
              <Pressable style={styles.eye} onPress={() => setShowNext((v) => !v)} hitSlop={8}>
                <Ionicons name={showNext ? "eye-off-outline" : "eye-outline"} size={18} color={pal.muted} />
              </Pressable>
            </View>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showNext}
              placeholder="Parolni tasdiqlang"
              placeholderTextColor={pal.muted}
              style={fieldStyle}
            />
            <Text style={[styles.rule, { color: nextPassword.trim().length >= 8 ? pal.fg : pal.muted }]}>
              {nextPassword.trim().length}/8 belgi
            </Text>
            {error ? <Text style={styles.err}>{error}</Text> : null}
            {ok ? <Text style={[styles.ok, { color: pal.accent }]}>{ok}</Text> : null}
            <Pressable
              onPress={() => void submit()}
              disabled={busy || nextPassword.trim().length < 8}
              style={[styles.cta, { backgroundColor: pal.fg, opacity: nextPassword.trim().length < 8 ? 0.45 : 1 }]}
            >
              {busy ? (
                <ActivityIndicator color={pal.bg} />
              ) : (
                <Text style={[styles.ctaText, { color: pal.bg, fontFamily: pal.font.fontFamily }]}>
                  {t("common.save")}
                </Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: moderateScale(16), gap: moderateScale(12), paddingBottom: verticalScale(40) },
  hero: {
    width: scale(48),
    height: scale(48),
    borderRadius: moderateScale(16),
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { fontSize: fontSize(14), lineHeight: fontSize(20) },
  input: {
    borderWidth: 1,
    borderRadius: moderateScale(14),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(14),
    fontSize: fontSize(16),
  },
  inputPad: { paddingRight: scale(44) },
  eye: { position: "absolute", right: scale(12), top: 0, bottom: 0, justifyContent: "center" },
  rule: { fontSize: fontSize(12), fontWeight: "600" },
  err: { color: "#FF3B30", fontSize: fontSize(13) },
  ok: { fontSize: fontSize(13), fontWeight: "600", lineHeight: fontSize(18) },
  cta: {
    marginTop: verticalScale(8),
    minHeight: verticalScale(48),
    borderRadius: moderateScale(14),
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { fontSize: fontSize(16), fontWeight: "700" },
});
