import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
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
  MAX_GIFT_AMOUNT,
  MIN_GIFT_AMOUNT,
  parseWalletBalance,
  sendGift,
  type ApiWalletRecipient,
} from "../../api/wallet";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useGiftDesigns, useRecipientSearch, useWalletMe } from "../../hooks/useWallet";
import { designColorsById, formatSomAmount, formatSomLabel } from "../../lib/wallet-format";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletGift">;

const PRESETS = [
  { label: "50k", amount: 50_000 },
  { label: "100k", amount: 100_000 },
  { label: "200k", amount: 200_000 },
  { label: "500k", amount: 500_000 },
  { label: "1M", amount: 1_000_000 },
] as const;

export function WalletGiftScreen({ navigation }: Props) {
  useHideTabBar();
  const me = useWalletMe();
  const { designs, loading: designsLoading } = useGiftDesigns();
  const [designId, setDesignId] = useState("classic");
  const [amount, setAmount] = useState(100_000);
  const [custom, setCustom] = useState("100 000");
  const [query, setQuery] = useState("");
  const [recipient, setRecipient] = useState<ApiWalletRecipient | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { results, loading: searchLoading } = useRecipientSearch(recipient ? "" : query);

  const design = designs.find((d) => d.id === designId) ?? designs[0];
  const fee = design ? parseWalletBalance(design.fee) : 5_000;
  const palette = designColorsById(design?.id ?? designId);
  const total = amount + fee;
  const canSend = !!recipient && amount >= MIN_GIFT_AMOUNT && amount <= MAX_GIFT_AMOUNT && !sending;

  useEffect(() => {
    if (designs.length && !designs.find((d) => d.id === designId)) {
      setDesignId(designs[0]!.id);
    }
  }, [designs, designId]);

  const onSend = async () => {
    if (!canSend || !recipient) {
      Alert.alert("Diqqat", "Qabul qiluvchini tanlang.");
      return;
    }
    if (total > me.balance) {
      Alert.alert("Yetarli emas", "Balans yetarli emas.");
      return;
    }
    setSending(true);
    try {
      await sendGift({
        design_id: designId,
        gift_amount: amount,
        message,
        recipient_user_id: recipient.user_id,
      });
      me.refresh();
      Alert.alert("Yuborildi", `${formatSomLabel(amount)} sovg'a yuborildi.`, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert("Xato", e instanceof Error ? e.message : "Yuborilmadi");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.root}>
      <NativeHeader title="Hamyon" onBack={() => navigation.goBack()} />
      <Text style={styles.subHeader}>Sovg'a karta</Text>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={[palette.from, palette.to]} style={styles.preview}>
          <View style={styles.previewTop}>
            <Ionicons name="gift" size={18} color={palette.accent} />
            <Text style={[styles.brand, { color: palette.accent }]}>
              Mysaloon<Text style={{ color: colors.brandDot }}>.</Text>
            </Text>
          </View>
          <Text style={[styles.designName, { color: palette.accent }]}>
            {(design?.name_uz || design?.name || "KLASSIK").toUpperCase()}
          </Text>
          <Text style={[styles.previewAmt, { color: palette.accent }]}>
            {formatSomLabel(amount)}
          </Text>
          <Text style={[styles.previewToLabel, { color: palette.accent }]}>KIMGA</Text>
          <Text style={[styles.previewTo, { color: palette.accent }]} numberOfLines={1}>
            {recipient?.full_name || "Sovg'a oluvchi"}
          </Text>
        </LinearGradient>

        <View style={styles.rowBetween}>
          <Text style={styles.section}>DIZAYNNI TANLANG</Text>
          <Text style={styles.feeHint}>
            {design?.name_uz || "Klassik"} · {formatSomLabel(fee)}
          </Text>
        </View>
        {designsLoading ? (
          <ActivityIndicator color={colors.fg} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.swatches}>
            {designs.map((d) => {
              const c = designColorsById(d.id);
              const active = d.id === designId;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => setDesignId(d.id)}
                  style={[styles.swatch, { backgroundColor: c.from }, active && styles.swatchActive]}
                >
                  {active ? <Ionicons name="checkmark" size={16} color={c.accent} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <Text style={styles.section}>KIMGA</Text>
        {recipient ? (
          <Pressable
            style={styles.recipientChip}
            onPress={() => {
              setRecipient(null);
              setQuery("");
            }}
          >
            <Ionicons name="person" size={16} color={colors.fg} />
            <Text style={styles.recipientName}>{recipient.full_name}</Text>
            <Ionicons name="close" size={16} color={colors.muted} />
          </Pressable>
        ) : (
          <>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Ism, telefon yoki hamyon raqami"
                placeholderTextColor={colors.muted}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
              />
            </View>
            {searchLoading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
            {results.map((r) => (
              <Pressable
                key={r.user_id}
                style={styles.resultRow}
                onPress={() => {
                  setRecipient(r);
                  setQuery("");
                }}
              >
                <Text style={styles.resultName}>{r.full_name}</Text>
                <Text style={styles.resultMeta}>{r.phone || r.wallet_number}</Text>
              </Pressable>
            ))}
          </>
        )}

        <Text style={styles.section}>SUMMANI TANLANG</Text>
        <Text style={styles.help}>
          {formatSomLabel(MIN_GIFT_AMOUNT)} — {formatSomLabel(MAX_GIFT_AMOUNT)}
        </Text>
        <Text style={styles.bigAmt}>{formatSomLabel(amount)}</Text>
        <View style={styles.chips}>
          {PRESETS.map((p) => (
            <Pressable
              key={p.label}
              style={[styles.chip, amount === p.amount && styles.chipActive]}
              onPress={() => {
                setAmount(p.amount);
                setCustom(formatSomAmount(p.amount));
              }}
            >
              <Text style={[styles.chipText, amount === p.amount && styles.chipTextActive]}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.amountInputRow}>
          <TextInput
            style={styles.amountInput}
            keyboardType="number-pad"
            value={custom}
            onChangeText={(t) => {
              const n = Number(t.replace(/\D/g, "")) || 0;
              setCustom(n ? formatSomAmount(n) : "");
              if (n) setAmount(n);
            }}
          />
          <Text style={styles.somFixed}>so'm</Text>
        </View>

        <Text style={styles.section}>XABAR (ixtiyoriy)</Text>
        <TextInput
          style={[styles.amountInput, { minHeight: 72, textAlignVertical: "top" }]}
          multiline
          maxLength={280}
          placeholder="Qisqa tilak..."
          placeholderTextColor={colors.muted}
          value={message}
          onChangeText={setMessage}
        />
      </ScrollView>

      <View style={styles.checkout}>
        <View style={styles.checkoutTop}>
          <Text style={styles.checkoutBreak}>
            {formatSomLabel(amount)} + {formatSomLabel(fee)}
          </Text>
          <Text style={styles.checkoutBal}>{formatSomLabel(me.balance)}</Text>
        </View>
        <View style={styles.checkoutBottom}>
          <View>
            <Text style={styles.jamiLabel}>JAMI</Text>
            <Text style={styles.jami}>{formatSomLabel(total)}</Text>
          </View>
          <Pressable
            style={[styles.sendBtn, !canSend && styles.sendDisabled]}
            onPress={onSend}
            disabled={!canSend}
          >
            {sending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.sendText}>Yuborish</Text>
            )}
          </Pressable>
        </View>
        {!recipient ? (
          <Text style={styles.err}>Qabul qiluvchini tanlang.</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  subHeader: {
    marginTop: -6,
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 13,
    color: colors.muted,
  },
  content: { padding: 16, paddingBottom: 160 },
  preview: {
    borderRadius: 26,
    padding: 20,
    minHeight: 180,
  },
  previewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: { fontSize: 14, fontWeight: "700" },
  designName: {
    marginTop: 28,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    opacity: 0.7,
  },
  previewAmt: { marginTop: 6, fontSize: 28, fontWeight: "800" },
  previewToLabel: {
    marginTop: 18,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    opacity: 0.55,
  },
  previewTo: { marginTop: 2, fontSize: 14, fontWeight: "600" },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  section: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 1.1,
  },
  feeHint: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  swatches: { gap: 10, paddingVertical: 4 },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchActive: {
    borderWidth: 2,
    borderColor: colors.fg,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.fg },
  resultRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  resultName: { fontSize: 14, fontWeight: "700", color: colors.fg },
  resultMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  recipientChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
  },
  recipientName: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.fg },
  help: { fontSize: 12, color: colors.muted, marginTop: -4 },
  bigAmt: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: "800",
    color: colors.fg,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.fg },
  chipText: { fontSize: 13, fontWeight: "700", color: colors.fg },
  chipTextActive: { color: "#FFF" },
  amountInputRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: "700",
    color: colors.fg,
  },
  somFixed: { fontSize: 14, color: colors.muted, fontWeight: "600" },
  checkout: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.fg,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
  },
  checkoutTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  checkoutBreak: { color: "rgba(255,255,255,0.55)", fontSize: 12 },
  checkoutBal: { color: "rgba(255,255,255,0.55)", fontSize: 12 },
  checkoutBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  jamiLabel: { color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: "700" },
  jami: { color: "#FFF", fontSize: 20, fontWeight: "800", marginTop: 2 },
  sendBtn: {
    backgroundColor: "#FFF",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    minWidth: 120,
    alignItems: "center",
  },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: colors.fg, fontWeight: "800", fontSize: 15 },
  err: { marginTop: 10, color: "#F87171", fontSize: 12, fontWeight: "600" },
});
