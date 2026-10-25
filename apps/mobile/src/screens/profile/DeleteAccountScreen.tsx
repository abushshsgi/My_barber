import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useAuth } from "../../auth/AuthContext";
import { API_BASE } from "../../api/config";
import { useShellTheme } from "../../lib/useShellTheme";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<ProfileStackParamList, "DeleteAccount">;

type Step = "confirm" | "request" | "verify" | "success";

export function DeleteAccountScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const pal = useShellTheme();
  const [step, setStep] = useState<Step>("confirm");
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);

  const handleRequest = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/account-deletion-request/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.email || undefined,
          phone: user?.phone || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setRequestId(String(data.request_id));
        setDebugCode(data.debug_code || null);
        setStep("verify");
      } else {
        Alert.alert(t("common.error"), data.detail || t("profile.deleteError"));
      }
    } catch (err) {
      Alert.alert(t("common.error"), t("errors.network"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!requestId || !code.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/account-deletion-verify/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          code: code.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep("success");
        setTimeout(() => {
          signOut();
        }, 2000);
      } else {
        Alert.alert(t("common.error"), data.detail || t("profile.verifyError"));
      }
    } catch (err) {
      Alert.alert(t("common.error"), t("errors.network"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <StatusBar style={pal.status} />
      <NativeHeader title={t("profile.deleteAccount")} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {step === "confirm" && (
          <View style={styles.card}>
            <View style={[styles.iconBox, { backgroundColor: "#FEE2E2" }]}>
              <Ionicons name="warning-outline" size={32} color="#DC2626" />
            </View>
            <Text style={[styles.title, { color: pal.fg, fontFamily: pal.font.fontFamily }]}>
              {t("profile.deleteConfirmTitle")}
            </Text>
            <Text style={[styles.body, { color: pal.muted, fontFamily: pal.font.fontFamily }]}>
              {t("profile.deleteConfirmBody")}
            </Text>
            <Text style={[styles.warning, { color: "#DC2626", fontFamily: pal.font.fontFamily }]}>
              {t("profile.deleteWarning")}
            </Text>

            <Pressable
              onPress={handleRequest}
              disabled={loading}
              style={({ pressed }) => [
                styles.button,
                styles.deleteButton,
                pressed && styles.buttonPressed,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>{t("profile.deleteRequest")}</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            >
              <Text style={[styles.buttonText, styles.cancelText]}>{t("common.cancel")}</Text>
            </Pressable>
          </View>
        )}

        {step === "verify" && (
          <View style={styles.card}>
            <View style={[styles.iconBox, { backgroundColor: "#DBEAFE" }]}>
              <Ionicons name="mail-outline" size={32} color="#2563EB" />
            </View>
            <Text style={[styles.title, { color: pal.fg, fontFamily: pal.font.fontFamily }]}>
              {t("profile.verifyTitle")}
            </Text>
            <Text style={[styles.body, { color: pal.muted, fontFamily: pal.font.fontFamily }]}>
              {t("profile.verifyBody")}
            </Text>

            {debugCode && (
              <View style={[styles.debugBox, { backgroundColor: pal.card, borderColor: pal.border }]}>
                <Text style={[styles.debugLabel, { color: pal.muted }]}>Debug code:</Text>
                <Text style={[styles.debugCode, { color: pal.fg }]}>{debugCode}</Text>
              </View>
            )}

            <TextInput
              style={[styles.input, { backgroundColor: pal.card, borderColor: pal.border, color: pal.fg }]}
              placeholder={t("profile.codePlaceholder")}
              placeholderTextColor={pal.muted}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />

            <Pressable
              onPress={handleVerify}
              disabled={loading || code.length !== 6}
              style={({ pressed }) => [
                styles.button,
                styles.primaryButton,
                (pressed || loading || code.length !== 6) && styles.buttonPressed,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>{t("profile.verifyConfirm")}</Text>
              )}
            </Pressable>
          </View>
        )}

        {step === "success" && (
          <View style={styles.card}>
            <View style={[styles.iconBox, { backgroundColor: "#D1FAE5" }]}>
              <Ionicons name="checkmark-circle-outline" size={32} color="#059669" />
            </View>
            <Text style={[styles.title, { color: pal.fg, fontFamily: pal.font.fontFamily }]}>
              {t("profile.deleteSuccessTitle")}
            </Text>
            <Text style={[styles.body, { color: pal.muted, fontFamily: pal.font.fontFamily }]}>
              {t("profile.deleteSuccessBody")}
            </Text>
            <ActivityIndicator size="large" color={pal.accent} style={{ marginTop: verticalScale(16) }} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    padding: scale(16),
    paddingTop: verticalScale(24),
  },
  card: {
    padding: scale(20),
    borderRadius: moderateScale(20),
    borderWidth: StyleSheet.hairlineWidth,
    gap: verticalScale(16),
  },
  iconBox: {
    width: scale(64),
    height: scale(64),
    borderRadius: moderateScale(32),
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  title: {
    fontSize: fontSize(20),
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    textAlign: "center",
  },
  warning: {
    fontSize: fontSize(13),
    fontWeight: "600",
    textAlign: "center",
    marginTop: verticalScale(8),
  },
  button: {
    paddingVertical: verticalScale(14),
    borderRadius: moderateScale(14),
    alignItems: "center",
  },
  buttonPressed: { opacity: 0.7 },
  deleteButton: {
    backgroundColor: "#DC2626",
  },
  primaryButton: {
    backgroundColor: "#2563EB",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: fontSize(15),
    fontWeight: "600",
  },
  cancelText: {
    color: "#6B7280",
  },
  input: {
    padding: scale(14),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    fontSize: fontSize(16),
    textAlign: "center",
    letterSpacing: 4,
  },
  debugBox: {
    padding: scale(12),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    marginTop: verticalScale(8),
  },
  debugLabel: {
    fontSize: fontSize(12),
    marginBottom: verticalScale(4),
  },
  debugCode: {
    fontSize: fontSize(18),
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 2,
  },
});
