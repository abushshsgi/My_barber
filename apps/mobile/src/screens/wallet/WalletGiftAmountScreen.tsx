import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
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
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useGiftDesigns, useRecipientSearch, useWalletMe } from "../../hooks/useWallet";
import { formatSomAmount, formatSomLabel } from "../../lib/wallet-format";
import type { WalletStackParamList } from "../../navigation/WalletStack";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletGiftAmount">;

const PURPLE = "#7C5CFF";
const PRESETS = [50_000, 100_000, 200_000, 500_000, 1_000_000] as const;
const AVATAR = ["#F5C542", "#A78BFA", "#34D399", "#FB923C", "#60A5FA", "#F472B6"];

const SEND_AS = [
  { id: "gift", label: "Sovg'a" },
  { id: "split", label: "Bo'lish" },
  { id: "cash", label: "Naqd" },
  { id: "other", label: "Boshqa" },
] as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
  }
  return (name.charAt(0) || "?").toUpperCase();
}

function avatarTone(id: number): string {
  return AVATAR[Math.abs(id) % AVATAR.length]!;
}

/**
 * Sovg'a yuborish — rasmdagidek Send money layout:
 * To / For / Send as + summa + suggestion ro'yxati.
 */
export function WalletGiftAmountScreen({ navigation, route }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const { designId } = route.params;
  const me = useWalletMe();
  const { designs } = useGiftDesigns();
  const design = designs.find((d) => d.id === designId);
  const fee = design ? parseWalletBalance(design.fee) : 5_000;

  const [digits, setDigits] = useState("100000");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [recipient, setRecipient] = useState<ApiWalletRecipient | null>(null);
  const [sending, setSending] = useState(false);
  const [sendAs] = useState<"gift">("gift");

  const { results, loading: searchLoading } = useRecipientSearch(query);
  const amount = useMemo(() => {
    const n = Number(digits.replace(/\D/g, "")) || 0;
    return Math.min(n, MAX_GIFT_AMOUNT);
  }, [digits]);

  const total = amount + fee;
  const valid = amount >= MIN_GIFT_AMOUNT && amount <= MAX_GIFT_AMOUNT;
  const canSend = !!recipient && valid && !sending;

  const onAmountChange = (t: string) => {
    const raw = t.replace(/\D/g, "");
    if (!raw) {
      setDigits("");
      return;
    }
    const n = Number(raw) || 0;
    setDigits(String(Math.min(n, MAX_GIFT_AMOUNT)));
  };

  const onSend = async () => {
    if (!recipient) {
      Alert.alert("Diqqat", "Qabul qiluvchini tanlang.");
      return;
    }
    if (!valid) {
      Alert.alert(
        "Summa",
        `${formatSomLabel(MIN_GIFT_AMOUNT)} — ${formatSomLabel(MAX_GIFT_AMOUNT)}`,
      );
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
        { text: "OK", onPress: () => navigation.navigate("WalletHome") },
      ]);
    } catch (e) {
      Alert.alert("Xato", e instanceof Error ? e.message : "Yuborilmadi");
    } finally {
      setSending(false);
    }
  };

  return (
    <LinearGradient
      colors={["#EDE7FF", "#F7F5FF", "#FFFFFF"]}
      locations={[0, 0.35, 1]}
      style={styles.root}
    >
      <View style={[styles.safe, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color="#0A0A0A" />
          </Pressable>
          <Text style={styles.headerTitle}>Pul yuborish</Text>
          <Pressable
            style={styles.schedule}
            onPress={() => Alert.alert("Tez orada", "Rejalashtirish tez orada.")}
          >
            <Ionicons name="calendar-outline" size={14} color="#6B7280" />
            <Text style={styles.scheduleText}>Jadval</Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Kimga</Text>
              <Pressable
                style={styles.cardValueWrap}
                onPress={() => {
                  /* focus search below */
                }}
              >
                <Text
                  style={[styles.cardValue, recipient ? styles.cardValueOn : null]}
                  numberOfLines={1}
                >
                  {recipient?.full_name || "Tanlang"}
                </Text>
                <Ionicons name="chevron-down" size={14} color={PURPLE} />
              </Pressable>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Nima uchun</Text>
              <TextInput
                style={styles.forInput}
                placeholder="Masalan: Tug'ilgan kun"
                placeholderTextColor="#9CA3AF"
                value={message}
                onChangeText={setMessage}
                maxLength={280}
              />
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.sendAsBlock}>
              <Text style={styles.cardLabel}>Yuborish turi</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                {SEND_AS.map((item) => {
                  const on = item.id === sendAs;
                  const locked = item.id !== "gift";
                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.typeChip, on && styles.typeChipOn, locked && styles.typeChipOff]}
                      disabled={locked}
                      onPress={() => undefined}
                    >
                      <Text style={[styles.typeChipText, on && styles.typeChipTextOn]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          <Text style={styles.enterLabel}>Summani kiriting</Text>
          <View style={styles.amountRow}>
            <TextInput
              style={styles.amountInput}
              keyboardType="number-pad"
              value={digits ? formatSomAmount(amount) : ""}
              onChangeText={onAmountChange}
              placeholder="0"
              placeholderTextColor="#D1D5DB"
              selectionColor={PURPLE}
            />
            <Text style={styles.som}>so'm</Text>
          </View>
          <Text style={styles.balanceHint}>
            Balans: {formatSomLabel(me.balance)} · Dizayn {formatSomLabel(fee)}
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presets}
          >
            {PRESETS.map((p) => (
              <Pressable
                key={p}
                style={[styles.preset, amount === p && styles.presetOn]}
                onPress={() => setDigits(String(p))}
              >
                <Text style={[styles.presetText, amount === p && styles.presetTextOn]}>
                  {formatSomAmount(p)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.suggestTitle}>Takliflar</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Ism, telefon yoki hamyon"
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
            {query ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </Pressable>
            ) : null}
          </View>

          {searchLoading ? (
            <ActivityIndicator style={{ marginTop: 16 }} color={PURPLE} />
          ) : results.length === 0 ? (
            <Text style={styles.emptySuggest}>
              {query.trim().length < 2
                ? "Qidirish uchun kamida 2 belgi yozing"
                : "Natija topilmadi"}
            </Text>
          ) : (
            <View style={styles.suggestList}>
              {results.map((r, idx) => {
                const selected = recipient?.user_id === r.user_id;
                return (
                  <Pressable
                    key={r.user_id}
                    style={[styles.suggestRow, idx === results.length - 1 && styles.suggestRowLast]}
                    onPress={() => setRecipient(selected ? null : r)}
                  >
                    <View style={[styles.check, selected && styles.checkOn]}>
                      {selected ? (
                        <Ionicons name="checkmark" size={12} color="#FFF" />
                      ) : null}
                    </View>
                    <View style={[styles.avatar, { backgroundColor: avatarTone(r.user_id) }]}>
                      <Text style={styles.avatarText}>{initials(r.full_name)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggestName} numberOfLines={1}>
                        {r.full_name}
                      </Text>
                      <Text style={styles.suggestPhone} numberOfLines={1}>
                        {r.phone || r.wallet_number}
                      </Text>
                    </View>
                    <Ionicons name="person-outline" size={16} color="#C4C4C8" />
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>

        <Pressable
          style={[styles.sendBtn, !canSend && styles.sendBtnOff]}
          disabled={!canSend}
          onPress={() => void onSend()}
        >
          {sending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.sendText}>
              Yuborish · {formatSomLabel(total)}
            </Text>
          )}
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: "#0A0A0A",
    letterSpacing: -0.3,
  },
  schedule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.1)",
  },
  scheduleText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  scroll: { paddingBottom: 20 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 4,
    shadowColor: "#7C5CFF",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  cardLabel: {
    width: 88,
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  cardValueWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
    maxWidth: "85%",
  },
  cardValueOn: { color: PURPLE },
  forInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#0A0A0A",
    textAlign: "right",
    padding: 0,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(15,23,42,0.08)",
  },
  sendAsBlock: { paddingVertical: 12, gap: 10 },
  chipsRow: { gap: 8, paddingRight: 8 },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
  },
  typeChipOn: { borderColor: PURPLE },
  typeChipOff: { opacity: 0.45 },
  typeChipText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  typeChipTextOn: { color: PURPLE },
  enterLabel: {
    marginTop: 28,
    textAlign: "center",
    fontSize: 13,
    color: "#9CA3AF",
  },
  amountRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 8,
  },
  amountInput: {
    fontSize: 44,
    fontWeight: "800",
    color: "#0A0A0A",
    letterSpacing: -1,
    minWidth: 120,
    textAlign: "right",
    padding: 0,
  },
  som: {
    fontSize: 18,
    fontWeight: "700",
    color: "#9CA3AF",
    marginBottom: 8,
  },
  balanceHint: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
  },
  presets: {
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  preset: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#FFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.1)",
  },
  presetOn: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  presetText: { fontSize: 13, fontWeight: "700", color: "#0A0A0A" },
  presetTextOn: { color: "#FFF" },
  suggestTitle: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "800",
    color: "#0A0A0A",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.08)",
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#0A0A0A", padding: 0 },
  emptySuggest: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 13,
    color: "#9CA3AF",
  },
  suggestList: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
  },
  suggestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(15,23,42,0.08)",
  },
  suggestRowLast: { borderBottomWidth: 0 },
  check: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 13, fontWeight: "800", color: "#FFF" },
  suggestName: { fontSize: 14, fontWeight: "700", color: "#0A0A0A" },
  suggestPhone: { marginTop: 2, fontSize: 12, color: "#9CA3AF" },
  sendBtn: {
    marginTop: 8,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnOff: { opacity: 0.35 },
  sendText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
