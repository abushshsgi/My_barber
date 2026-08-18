import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Pressable,
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

type Props = NativeStackScreenProps<ProfileStackParamList, "SecurityPassword">;

export function SecurityPasswordScreen({ navigation }: Props) {
  const pal = useShellTheme();
  const data = useProfileData();
  const { refreshMe } = useAuth();
  const hasPassword = Boolean(data.user?.has_password);
  const [oldPassword, setOldPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      if (nextPassword.trim().length < 8) {
        throw new Error("Parol kamida 8 belgidan iborat bo'lishi kerak.");
      }
      if (hasPassword) {
        await changePassword(oldPassword, nextPassword.trim());
        setOk("Parol yangilandi.");
      } else {
        await setPassword(nextPassword.trim());
        setOk("Parol saqlandi.");
      }
      setOldPassword("");
      setNextPassword("");
      await refreshMe();
      data.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message.replace(/^API \d+:\s*/, "") : "Xatolik");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <StatusBar style={pal.status} />
      <NativeHeader
        title={hasPassword ? "Parolni o'zgartirish" : "Parol qo'shish"}
        onBack={() => navigation.goBack()}
      />
      <View style={styles.body}>
        {hasPassword ? (
          <TextInput
            value={oldPassword}
            onChangeText={setOldPassword}
            secureTextEntry
            placeholder="Joriy parol"
            placeholderTextColor={pal.muted}
            style={[
              styles.input,
              {
                color: pal.fg,
                backgroundColor: pal.card,
                borderColor: pal.border,
                fontFamily: pal.font.fontFamily,
              },
            ]}
          />
        ) : (
          <Text style={[styles.hint, { color: pal.muted, fontFamily: pal.font.fontFamily }]}>
            SMS o'rniga parol bilan kirish uchun yangi parol o'rnating.
          </Text>
        )}
        <TextInput
          value={nextPassword}
          onChangeText={setNextPassword}
          secureTextEntry
          placeholder="Yangi parol (kamida 8 belgi)"
          placeholderTextColor={pal.muted}
          style={[
            styles.input,
            {
              color: pal.fg,
              backgroundColor: pal.card,
              borderColor: pal.border,
              fontFamily: pal.font.fontFamily,
            },
          ]}
        />
        {error ? <Text style={styles.err}>{error}</Text> : null}
        {ok ? <Text style={[styles.ok, { color: pal.accent }]}>{ok}</Text> : null}
        <Pressable
          onPress={() => void submit()}
          disabled={busy}
          style={[styles.cta, { backgroundColor: pal.fg }]}
        >
          {busy ? (
            <ActivityIndicator color={pal.bg} />
          ) : (
            <Text style={[styles.ctaText, { color: pal.bg, fontFamily: pal.font.fontFamily }]}>
              Saqlash
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: 16, gap: 12 },
  hint: { fontSize: 14, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },
  err: { color: "#FF3B30", fontSize: 13 },
  ok: { fontSize: 13, fontWeight: "600" },
  cta: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { fontSize: 16, fontWeight: "700" },
});
