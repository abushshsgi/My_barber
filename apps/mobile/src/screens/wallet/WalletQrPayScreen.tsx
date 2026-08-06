import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
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
import { useHideTabBar } from "../../hooks/useHideTabBar";
import {
  MAX_QR_AMOUNT,
  MIN_QR_AMOUNT,
  payQr,
  resolveQrPay,
  type QrResolveResult,
} from "../../api/wallet";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useWalletMe } from "../../hooks/useWallet";
import { formatSomAmount, formatSomLabel } from "../../lib/wallet-format";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletQrPay">;

export function WalletQrPayScreen({ navigation }: Props) {
  useHideTabBar();
  const me = useWalletMe();
  const [code, setCode] = useState("");
  const [resolved, setResolved] = useState<QrResolveResult | null>(null);
  const [amount, setAmount] = useState("");
  const [resolving, setResolving] = useState(false);
  const [paying, setPaying] = useState(false);

  const onResolve = async () => {
    const trimmed = code.trim();
    if (trimmed.length < 8) {
      Alert.alert("Xato", "QR kodni kiriting.");
      return;
    }
    setResolving(true);
    try {
      const data = await resolveQrPay(trimmed);
      setResolved(data);
      if (data.request && Number(data.request.amount) > 0) {
        setAmount(formatSomAmount(Math.round(Number(data.request.amount))));
      }
      Alert.alert("Topildi", data.barber.full_name);
    } catch (e) {
      setResolved(null);
      Alert.alert("Xato", e instanceof Error ? e.message : "QR topilmadi");
    } finally {
      setResolving(false);
    }
  };

  const onPay = async () => {
    if (!resolved || paying) return;
    const amt = Number(amount.replace(/\D/g, "")) || undefined;
    if (amt != null && (amt < MIN_QR_AMOUNT || amt > MAX_QR_AMOUNT)) {
      Alert.alert(
        "Xato",
        `Summa ${formatSomLabel(MIN_QR_AMOUNT)}–${formatSomLabel(MAX_QR_AMOUNT)}`,
      );
      return;
    }
    if (amt != null && amt > me.balance) {
      Alert.alert("Yetarli emas", "Balans yetarli emas.");
      return;
    }
    setPaying(true);
    try {
      const res = await payQr({
        payload: resolved.payload,
        amount: amt,
      });
      me.refresh();
      Alert.alert("To'landi", `${formatSomLabel(Number(res.amount))} → ${res.barber_name}`, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert("Xato", e instanceof Error ? e.message : "To'lov amalga oshmadi");
    } finally {
      setPaying(false);
    }
  };

  return (
    <View style={styles.root}>
      <NativeHeader title="QR to'lov" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.info}>
          <Ionicons name="shield-checkmark-outline" size={22} color={colors.fg} />
          <Text style={styles.infoText}>
            QR imzolangan va muddati cheklangan. Faqat mysaloon sartarosh kodlarini qabul qiling.
          </Text>
        </View>

        <Text style={styles.bal}>Balans: {formatSomLabel(me.balance)}</Text>

        <Text style={styles.label}>QR kod / payload</Text>
        <TextInput
          style={styles.input}
          placeholder="mysaloon:qrpay:..."
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          value={code}
          onChangeText={setCode}
          multiline
        />
        <Pressable
          style={[styles.btn, resolving && styles.disabled]}
          onPress={onResolve}
          disabled={resolving}
        >
          {resolving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="scan-outline" size={18} color="#FFF" />
              <Text style={styles.btnText}>Tekshirish</Text>
            </>
          )}
        </Pressable>

        {resolved ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{resolved.barber.full_name}</Text>
            {resolved.account_masked ? (
              <Text style={styles.cardMeta}>Hisob: {resolved.account_masked}</Text>
            ) : null}
            {resolved.request?.note ? (
              <Text style={styles.cardMeta}>{resolved.request.note}</Text>
            ) : null}

            <Text style={[styles.label, { marginTop: 16 }]}>Summa</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder={`${MIN_QR_AMOUNT}–${MAX_QR_AMOUNT}`}
              placeholderTextColor={colors.muted}
              value={amount}
              onChangeText={(t) => {
                const n = Number(t.replace(/\D/g, "")) || 0;
                setAmount(n ? formatSomAmount(n) : "");
              }}
              editable={!resolved.request || !(Number(resolved.request.amount) > 0)}
            />

            <Pressable
              style={[styles.btn, styles.payBtn, paying && styles.disabled]}
              onPress={onPay}
              disabled={paying}
            >
              {paying ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="wallet-outline" size={18} color="#FFF" />
                  <Text style={styles.btnText}>To'lash</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  info: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 13, color: colors.fg, lineHeight: 18 },
  bal: { fontSize: 14, fontWeight: "700", color: colors.fg, marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: colors.fg,
    minHeight: 48,
  },
  btn: {
    marginTop: 14,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.fg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  payBtn: { marginTop: 18 },
  disabled: { opacity: 0.5 },
  btnText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  card: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: "800", color: colors.fg },
  cardMeta: { marginTop: 4, fontSize: 13, color: colors.muted },
});
