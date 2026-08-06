import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  claimCardDeposit,
  initCardDeposit,
  MIN_TOPUP_AMOUNT,
  type CardDeposit,
} from "../../api/wallet";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useCardDeposits, useWalletMe } from "../../hooks/useWallet";
import { formatSomAmount, formatSomLabel } from "../../lib/wallet-format";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletTopUp">;

const PRESETS = [50_000, 100_000, 200_000, 500_000] as const;
const OPEN = new Set(["awaiting_payment", "claimed"]);

function parseDigits(raw: string) {
  const d = raw.replace(/\D/g, "");
  return d ? Number(d) : 0;
}

export function WalletTopUpScreen({ navigation }: Props) {
  const me = useWalletMe();
  const [amount, setAmount] = useState(100_000);
  const [custom, setCustom] = useState("");
  const [deposit, setDeposit] = useState<CardDeposit | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [pendingReview, setPendingReview] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const deposits = useCardDeposits(pendingReview);

  useEffect(() => {
    const open = deposits.deposits.find((d) => OPEN.has(d.status));
    if (open && !deposit) setDeposit(open);
  }, [deposits.deposits, deposit]);

  useEffect(() => {
    if (!pendingReview || !deposit) return;
    const latest = deposits.deposits.find((d) => d.id === deposit.id);
    if (!latest) return;
    if (latest.status === "approved") {
      setPendingReview(false);
      setDeposit(latest);
      me.refresh();
      Alert.alert("Muvaffaqiyat", "Balans to'ldirildi. Admin tasdiqladi.");
    } else if (latest.status === "rejected") {
      setPendingReview(false);
      Alert.alert("Rad etildi", latest.review_note || "To'lov rad etildi.");
    }
  }, [deposits.deposits, pendingReview, deposit, me]);

  const activeCustom = custom.length > 0;
  const effective = activeCustom ? parseDigits(custom) : amount;

  const start = async () => {
    if (submitting) return;
    if (effective < MIN_TOPUP_AMOUNT) {
      Alert.alert("Xato", `Minimal summa — ${formatSomLabel(MIN_TOPUP_AMOUNT)}`);
      return;
    }
    setSubmitting(true);
    try {
      const d = await initCardDeposit(effective);
      setDeposit(d);
      setReceiptUri(null);
    } catch (e) {
      Alert.alert("Xato", e instanceof Error ? e.message : "Boshlab bo'lmadi");
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async (value: string, label: string) => {
    try {
      const { setStringAsync } = await import("expo-clipboard");
      await setStringAsync(value);
      Alert.alert("Nusxa", `${label} nusxa olindi`);
    } catch {
      Alert.alert(label, value);
    }
  };

  const pickReceipt = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Ruxsat", "Galereyaga ruxsat bering.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    if ((asset.fileSize ?? 0) > 8 * 1024 * 1024) {
      Alert.alert("Xato", "Rasm 8 MB dan katta bo'lmasin.");
      return;
    }
    setReceiptUri(asset.uri);
  };

  const claim = async () => {
    if (!deposit || !receiptUri || claiming) return;
    setClaiming(true);
    try {
      const updated = await claimCardDeposit(deposit.id, {
        uri: receiptUri,
        name: "receipt.jpg",
        type: "image/jpeg",
      });
      setDeposit(updated);
      setPendingReview(true);
      deposits.refresh();
      Alert.alert("Yuborildi", "Chek yuborildi. Admin tekshiradi.");
    } catch (e) {
      Alert.alert("Xato", e instanceof Error ? e.message : "Yuklash xatosi");
    } finally {
      setClaiming(false);
    }
  };

  const card = deposit?.receiving_card;

  return (
    <View style={styles.root}>
      <NativeHeader
        title="To'ldirish"
        onBack={() => navigation.goBack()}
        border
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sub}>Hamyon balansini oshiring</Text>

        <View style={styles.balCard}>
          <Text style={styles.balLabel}>JORIY BALANS</Text>
          <Text style={styles.balValue}>{formatSomLabel(me.balance)}</Text>
        </View>

        {!deposit || deposit.status === "approved" || deposit.status === "rejected" ? (
          <>
            <Text style={styles.section}>SUMMANI TANLANG</Text>
            <View style={styles.grid}>
              {PRESETS.map((p) => {
                const active = !activeCustom && amount === p;
                return (
                  <Pressable
                    key={p}
                    style={[styles.preset, active && styles.presetActive]}
                    onPress={() => {
                      setAmount(p);
                      setCustom("");
                    }}
                  >
                    <Text style={[styles.presetLabel, active && styles.presetLabelActive]}>
                      {p >= 1_000_000 ? `${p / 1_000_000}M` : `${p / 1000}k`}
                    </Text>
                    <Text style={[styles.presetSub, active && styles.presetSubActive]}>
                      {formatSomAmount(p)} SO'M
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.section}>BOSHQA SUMMA</Text>
            <TextInput
              style={styles.input}
              placeholder="Masalan, 150 000"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              value={custom}
              onChangeText={(t) => {
                const n = parseDigits(t);
                setCustom(n ? formatSomAmount(n) : "");
                if (n) setAmount(n);
              }}
            />
            <Text style={styles.help}>Minimal summa — {formatSomLabel(MIN_TOPUP_AMOUNT)}</Text>

            <Pressable
              style={[styles.cta, submitting && styles.ctaDisabled]}
              onPress={start}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.ctaText}>
                  To'ldirish · {formatSomLabel(effective || amount)}
                </Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.section}>KARTA ORQALI O'TKAZING</Text>
            <Text style={styles.help}>
              Aniq {formatSomLabel(parseDigits(String(deposit.amount)))} o'tkazing va chekni yuklang.
              Admin tasdiqlagach balansga tushadi.
            </Text>

            {card ? (
              <View style={styles.copyBlock}>
                <CopyRow
                  label="Karta raqami"
                  value={card.number || card.masked}
                  onCopy={() => void copy(card.number || card.masked, "Karta")}
                />
                <CopyRow
                  label="Egasi"
                  value={card.cardholder}
                  onCopy={() => void copy(card.cardholder, "Egasi")}
                />
                <CopyRow
                  label="Bank"
                  value={card.bank}
                  onCopy={() => void copy(card.bank, "Bank")}
                />
                <CopyRow
                  label="Izoh / ref"
                  value={deposit.transaction_ref || deposit.merchant_ref}
                  onCopy={() =>
                    void copy(deposit.transaction_ref || deposit.merchant_ref, "Ref")
                  }
                />
              </View>
            ) : null}

            {deposit.status === "awaiting_payment" ? (
              <>
                <Pressable style={styles.pickBtn} onPress={pickReceipt}>
                  <Ionicons name="image-outline" size={20} color={colors.fg} />
                  <Text style={styles.pickText}>
                    {receiptUri ? "Chek tanlandi — almashtirish" : "Chek rasmini yuklash"}
                  </Text>
                </Pressable>
                {receiptUri ? (
                  <Image source={{ uri: receiptUri }} style={styles.preview} />
                ) : null}
                <Pressable
                  style={[styles.cta, (!receiptUri || claiming) && styles.ctaDisabled]}
                  onPress={claim}
                  disabled={!receiptUri || claiming}
                >
                  {claiming ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.ctaText}>Chekni yuborish</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <View style={styles.pendingBox}>
                <ActivityIndicator color={colors.fg} />
                <Text style={styles.pendingText}>Admin tekshirmoqda…</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function CopyRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <Pressable style={styles.copyRow} onPress={onCopy}>
      <View style={{ flex: 1 }}>
        <Text style={styles.copyLabel}>{label}</Text>
        <Text style={styles.copyValue}>{value}</Text>
      </View>
      <Ionicons name="copy-outline" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  sub: { fontSize: 13, color: colors.muted, marginBottom: 16, marginTop: -4 },
  balCard: {
    backgroundColor: colors.fg,
    borderRadius: 18,
    padding: 20,
  },
  balLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  balValue: {
    marginTop: 8,
    color: "#FFF",
    fontSize: 26,
    fontWeight: "800",
  },
  section: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 1.1,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  preset: {
    width: "48%",
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  presetActive: { backgroundColor: colors.fg, borderColor: colors.fg },
  presetLabel: { fontSize: 18, fontWeight: "800", color: colors.fg },
  presetLabelActive: { color: "#FFF" },
  presetSub: { marginTop: 4, fontSize: 11, color: colors.muted, fontWeight: "600" },
  presetSubActive: { color: "rgba(255,255,255,0.65)" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: "600",
    color: colors.fg,
  },
  help: { marginTop: 8, fontSize: 12, color: colors.muted },
  cta: {
    marginTop: 24,
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  copyBlock: { gap: 8 },
  copyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  copyLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  copyValue: { marginTop: 4, fontSize: 15, fontWeight: "700", color: colors.fg },
  pickBtn: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  pickText: { fontSize: 14, fontWeight: "700", color: colors.fg },
  preview: {
    marginTop: 12,
    height: 160,
    borderRadius: 14,
    width: "100%",
  },
  pendingBox: {
    marginTop: 24,
    alignItems: "center",
    gap: 12,
    padding: 24,
  },
  pendingText: { fontSize: 14, fontWeight: "600", color: colors.muted },
});
