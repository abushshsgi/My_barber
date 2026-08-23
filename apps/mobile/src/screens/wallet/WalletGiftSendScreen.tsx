import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  MAX_GIFT_AMOUNT,
  MIN_GIFT_AMOUNT,
  parseWalletBalance,
  sendGift,
  type ApiWalletRecipient,
} from "../../api/wallet";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useGiftDesigns, useRecipientSearch, useWalletMe } from "../../hooks/useWallet";
import { designColorsById, formatSomLabel } from "../../lib/wallet-format";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletGiftSend">;

/** 3-qadam: oluvchini tanlash va yuborish. */
export function WalletGiftSendScreen({ navigation, route }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const { designId, amount } = route.params;
  const me = useWalletMe();
  const { designs } = useGiftDesigns();
  const design = designs.find((d) => d.id === designId);
  const fee = design ? parseWalletBalance(design.fee) : 5_000;
  const palette = designColorsById(designId);
  const total = amount + fee;

  const [query, setQuery] = useState("");
  const [recipient, setRecipient] = useState<ApiWalletRecipient | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { results, loading: searchLoading } = useRecipientSearch(recipient ? "" : query);

  const canSend =
    !!recipient &&
    amount >= MIN_GIFT_AMOUNT &&
    amount <= MAX_GIFT_AMOUNT &&
    !sending;

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
        {
          text: "OK",
          onPress: () => navigation.navigate("WalletHome"),
        },
      ]);
    } catch (e) {
      Alert.alert("Xato", e instanceof Error ? e.message : "Yuborilmadi");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <NativeHeader title="Kimga" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={[palette.from, palette.to]} style={styles.preview}>
          <Text style={[styles.previewLabel, { color: palette.accent }]}>
            {(design?.name_uz || design?.name || designId).toUpperCase()}
          </Text>
          <Text style={[styles.previewAmt, { color: palette.accent }]}>
            {formatSomLabel(amount)}
          </Text>
          <Text style={[styles.previewToLabel, { color: palette.accent }]}>KIMGA</Text>
          <Text style={[styles.previewTo, { color: palette.accent }]} numberOfLines={1}>
            {recipient?.full_name || "Oluvchini tanlang"}
          </Text>
        </LinearGradient>

        <Text style={styles.section}>OLUVCHI</Text>
        {recipient ? (
          <Pressable
            style={styles.recipientChip}
            onPress={() => {
              setRecipient(null);
              setQuery("");
            }}
          >
            <Ionicons name="person" size={16} color={colors.fg} />
            <View style={{ flex: 1 }}>
              <Text style={styles.recipientName}>{recipient.full_name}</Text>
              <Text style={styles.recipientMeta}>
                {recipient.phone || recipient.wallet_number}
              </Text>
            </View>
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

        <Text style={styles.section}>XABAR (ixtiyoriy)</Text>
        <TextInput
          style={styles.messageInput}
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
          <Text style={styles.breakDown}>
            {formatSomLabel(amount)} + {formatSomLabel(fee)}
          </Text>
          <Text style={styles.bal}>{formatSomLabel(me.balance)}</Text>
        </View>
        <View style={styles.checkoutBottom}>
          <View>
            <Text style={styles.jamiLabel}>JAMI</Text>
            <Text style={styles.jami}>{formatSomLabel(total)}</Text>
          </View>
          <Pressable
            style={[styles.sendBtn, !canSend && styles.sendOff]}
            onPress={() => void onSend()}
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
  content: { padding: 16, paddingBottom: 140 },
  preview: {
    borderRadius: 24,
    padding: 18,
    minHeight: 140,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    opacity: 0.7,
  },
  previewAmt: { marginTop: 8, fontSize: 28, fontWeight: "800" },
  previewToLabel: {
    marginTop: 16,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    opacity: 0.55,
  },
  previewTo: { marginTop: 2, fontSize: 14, fontWeight: "600" },
  section: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 1.1,
  },
  recipientChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  recipientName: { fontSize: 14, fontWeight: "700", color: colors.fg },
  recipientMeta: { marginTop: 2, fontSize: 12, color: colors.muted },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.fg },
  resultRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  resultName: { fontSize: 14, fontWeight: "700", color: colors.fg },
  resultMeta: { marginTop: 2, fontSize: 12, color: colors.muted },
  messageInput: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: colors.fg,
    textAlignVertical: "top",
  },
  checkout: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 20,
    backgroundColor: "#FFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  checkoutTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  breakDown: { fontSize: 12, color: colors.muted },
  bal: { fontSize: 12, fontWeight: "600", color: colors.muted },
  checkoutBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  jamiLabel: { fontSize: 10, fontWeight: "700", color: colors.muted },
  jami: { fontSize: 18, fontWeight: "800", color: colors.fg },
  sendBtn: {
    minWidth: 140,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  sendOff: { opacity: 0.35 },
  sendText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  err: { marginTop: 8, fontSize: 12, color: "#DC2626", textAlign: "center" },
});
