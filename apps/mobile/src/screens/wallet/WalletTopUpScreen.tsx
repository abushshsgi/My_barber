import { useTranslation } from "react-i18next";
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
import { useHideTabBar } from "../../hooks/useHideTabBar";
import {
  claimCardDeposit,
  fetchReceivingCard,
  initCardDeposit,
  MIN_TOPUP_AMOUNT,
  type CardDeposit,
} from "../../api/wallet";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useCardDeposits, useWalletMe } from "../../hooks/useWallet";
import { formatSomAmount, formatSomLabel } from "../../lib/wallet-format";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import { colors } from "../../theme/colors";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletTopUp">;

const PRESETS = [50_000, 100_000, 200_000, 500_000] as const;
const OPEN = new Set(["awaiting_payment", "claimed"]);

function parseDigits(raw: string) {
  const d = raw.replace(/\D/g, "");
  return d ? Number(d) : 0;
}

function groupCard(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function WalletTopUpScreen({ navigation }: Props) {
  const { t } = useTranslation();
  useHideTabBar();
  const me = useWalletMe();
  const [amount, setAmount] = useState(100_000);
  const [custom, setCustom] = useState("");
  const [deposit, setDeposit] = useState<CardDeposit | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [pendingReview, setPendingReview] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const deposits = useCardDeposits(pendingReview);

  useEffect(() => {
    void fetchReceivingCard()
      .then(() => setCardError(null))
      .catch((e) => {
        setCardError(e instanceof Error ? e.message.replace(/^API \d+:\s*/, "") : "Karta sozlanmagan");
      });
  }, []);

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
        title={t("wallet.topUp")}
        onBack={() => navigation.goBack()}
        border
      />
      <ScrollView style={{ flex: 1, width: "100%" }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.balCard}>
          <View style={styles.balIcon}>
            <Ionicons name="wallet-outline" size={18} color={colors.fg} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.balLabel}>Hamyon balansi</Text>
            <Text style={styles.balValue}>{formatSomLabel(me.balance)}</Text>
          </View>
        </View>
        <View style={styles.method}>
          <Text style={styles.methodStep}>1</Text>
          <Text style={styles.methodText}>Summani tanlang</Text>
        </View>
        <View style={styles.method}>
          <Text style={styles.methodStep}>2</Text>
          <Text style={styles.methodText}>Kartaga o'tkazing va izohga kodni yozing</Text>
        </View>
        <View style={styles.method}>
          <Text style={styles.methodStep}>3</Text>
          <Text style={styles.methodText}>Chek rasmini yuklang. Admin tasdiqlagach balans oshadi</Text>
        </View>
        {cardError ? <Text style={styles.cardError}>{cardError}</Text> : null}

        {!deposit || deposit.status === "approved" || deposit.status === "rejected" ? (
          <>
            <Text style={styles.section}>Summa</Text>
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
                      {formatSomAmount(p)}
                    </Text>
                    <Text style={[styles.presetSub, active && styles.presetSubActive]}>so'm</Text>
                    {active ? <Ionicons name="checkmark-circle" size={16} color={colors.fg} /> : <View style={styles.dot} />}
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.section}>Boshqa summa</Text>
            <TextInput
              style={styles.input}
              placeholder="150 000"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              value={custom}
              onChangeText={(raw) => {
                const n = parseDigits(raw);
                setCustom(n ? formatSomAmount(n) : "");
                if (n) setAmount(n);
              }}
            />
            <Text style={styles.help}>Kamida {formatSomLabel(MIN_TOPUP_AMOUNT)}</Text>

            <Pressable
              style={[styles.cta, (submitting || !!cardError) && styles.ctaDisabled]}
              onPress={start}
              disabled={submitting || !!cardError}
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
            <Text style={styles.payTitle}>
              Aniq {formatSomLabel(parseDigits(String(deposit.amount)))} o'tkazing
            </Text>
            <Text style={styles.help}>
              Izohga pastdagi kodni yozing. Keyin o'tkazma chekini shu yerga yuklang.
            </Text>
            <Pressable
              style={styles.refBox}
              onPress={() => void copy(deposit.transaction_ref, "Izoh kodi")}
            >
              <Text style={styles.refLabel}>Izohga yoziladigan kod · bosing, nusxa olinadi</Text>
              <Text style={styles.refValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {deposit.transaction_ref}
              </Text>
            </Pressable>

            {card ? (
              <View style={styles.copyBlock}>
                <CopyRow
                  label="Karta raqami"
                  value={groupCard(card.number || card.masked)}
                  onCopy={() => void copy((card.number || card.masked).replace(/\D/g, ""), "Karta")}
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
                    {receiptUri ? "Chek tanlandi. Boshqa rasm qo'yish" : "O'tkazma chekining rasmini tanlang"}
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
        <Text style={styles.copyValue} numberOfLines={2}>{value}</Text>
      </View>
      <Ionicons name="copy-outline" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: "100%", maxWidth: "100%", minWidth: 0, backgroundColor: colors.bg },
  content: { width: "100%", maxWidth: "100%", padding: moderateScale(16), paddingBottom: verticalScale(40) },
  sub: { fontSize: fontSize(13), color: colors.muted, marginBottom: verticalScale(16), marginTop: -verticalScale(4) },
  balCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
    backgroundColor: colors.surface,
    borderRadius: moderateScale(18),
    padding: moderateScale(16),
  },
  balIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(14),
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  balLabel: { fontSize: fontSize(12), color: colors.muted, fontWeight: "600" },
  balValue: { marginTop: verticalScale(2), color: colors.fg, fontSize: fontSize(22), fontWeight: "800" },
  method: {
    marginTop: verticalScale(8),
    flexDirection: "row",
    gap: moderateScale(10),
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: moderateScale(16),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
  },
  methodStep: {
    width: scale(28),
    height: scale(28),
    borderRadius: moderateScale(14),
    backgroundColor: colors.fg,
    color: "#FFF",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: fontSize(13),
    fontWeight: "800",
    lineHeight: fontSize(16),
    overflow: "visible",
  },
  methodText: { flex: 1, flexShrink: 1, minWidth: 0, fontSize: fontSize(14), lineHeight: fontSize(19), color: colors.fg, fontWeight: "600" },
  cardError: { marginTop: verticalScale(10), color: "#B42318", fontSize: fontSize(13), lineHeight: fontSize(18) },
  payTitle: { marginTop: verticalScale(8), fontSize: fontSize(20), fontWeight: "800", color: colors.fg },
  refBox: {
    marginTop: verticalScale(14),
    backgroundColor: colors.fg,
    borderRadius: moderateScale(18),
    padding: moderateScale(16),
  },
  refLabel: { color: "rgba(255,255,255,0.62)", fontSize: fontSize(12), fontWeight: "600" },
  refValue: { marginTop: verticalScale(6), color: "#FFF", fontSize: fontSize(26), fontWeight: "800", letterSpacing: 0.4 },
  section: {
    marginTop: verticalScale(22),
    marginBottom: verticalScale(10),
    fontSize: fontSize(15),
    fontWeight: "700",
    color: colors.fg,
  },
  grid: { gap: moderateScale(8) },
  preset: {
    width: "100%",
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: moderateScale(14),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(14),
    backgroundColor: colors.bg,
  },
  presetActive: { borderColor: colors.fg, backgroundColor: colors.surface },
  presetLabel: { flex: 1, fontSize: fontSize(16), fontWeight: "800", color: colors.fg },
  presetLabelActive: { color: colors.fg },
  presetSub: { fontSize: fontSize(12), color: colors.muted, fontWeight: "600" },
  presetSubActive: { color: colors.muted },
  dot: {
    width: scale(16),
    height: scale(16),
    borderRadius: moderateScale(8),
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: moderateScale(14),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    fontSize: fontSize(16),
    fontWeight: "600",
    color: colors.fg,
  },
  help: { marginTop: verticalScale(8), fontSize: fontSize(12), color: colors.muted },
  cta: {
    marginTop: verticalScale(24),
    height: verticalScale(54),
    borderRadius: moderateScale(14),
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: "#FFF", fontSize: fontSize(16), fontWeight: "800" },
  copyBlock: { gap: moderateScale(8) },
  copyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: moderateScale(14),
    padding: moderateScale(14),
    gap: moderateScale(10),
  },
  copyLabel: {
    fontSize: fontSize(10),
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  copyValue: { marginTop: verticalScale(4), fontSize: fontSize(15), fontWeight: "700", color: colors.fg },
  pickBtn: {
    marginTop: verticalScale(16),
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: moderateScale(14),
    padding: moderateScale(14),
  },
  pickText: { fontSize: fontSize(14), fontWeight: "700", color: colors.fg },
  preview: {
    marginTop: verticalScale(12),
    height: verticalScale(160),
    borderRadius: moderateScale(14),
    width: "100%",
  },
  pendingBox: {
    marginTop: verticalScale(24),
    alignItems: "center",
    gap: moderateScale(12),
    padding: moderateScale(24),
  },
  pendingText: { fontSize: fontSize(14), fontWeight: "600", color: colors.muted },
});
