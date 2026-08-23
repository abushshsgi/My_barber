import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MAX_GIFT_AMOUNT, MIN_GIFT_AMOUNT, parseWalletBalance, sendGift } from "../../api/wallet";
import { useAuth } from "../../auth/AuthContext";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useGiftDesigns, useWalletMe } from "../../hooks/useWallet";
import { maskWalletDisplay, rememberRecipientSent } from "../../lib/recipient-history";
import { designColorsById, formatSomAmount, formatSomLabel } from "../../lib/wallet-format";
import type { WalletStackParamList } from "../../navigation/WalletStack";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletGiftAmount">;

const PURPLE = "#7C5CFF";
const PRESETS = [50_000, 100_000, 200_000, 500_000, 1_000_000] as const;
const AVATAR = ["#F5C542", "#A78BFA", "#34D399", "#FB923C", "#60A5FA", "#F472B6"];
const CARD_W = Math.min(Dimensions.get("window").width * 0.72, 280);
const CARD_GAP = 14;
const SIDE_PAD = (Dimensions.get("window").width - CARD_W) / 2;

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

/** 2-qadam: summa + gift card carousel → yuborish. */
export function WalletGiftAmountScreen({ navigation, route }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const { recipientUserId, recipientName, recipientWallet } = route.params;
  const { user } = useAuth();
  const me = useWalletMe();
  const { designs, loading: designsLoading } = useGiftDesigns();
  const walletMasked = maskWalletDisplay(recipientWallet);

  const [digits, setDigits] = useState("100000");
  const [designId, setDesignId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const carouselRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (designs.length && designId && !designs.find((d) => d.id === designId)) {
      setDesignId(null);
    }
  }, [designs, designId]);

  const design = designs.find((d) => d.id === designId);
  const fee = design ? parseWalletBalance(design.fee) : 0;

  const amount = useMemo(() => {
    const n = Number(digits.replace(/\D/g, "")) || 0;
    return Math.min(n, MAX_GIFT_AMOUNT);
  }, [digits]);

  const total = amount + fee;
  const valid = amount >= MIN_GIFT_AMOUNT && amount <= MAX_GIFT_AMOUNT;
  const canSend = !!designId && valid && !sending;

  const onAmountChange = (t: string) => {
    const raw = t.replace(/\D/g, "");
    if (!raw) {
      setDigits("");
      return;
    }
    const n = Number(raw) || 0;
    setDigits(String(Math.min(n, MAX_GIFT_AMOUNT)));
  };

  const onCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / (CARD_W + CARD_GAP));
    const d = designs[idx];
    if (d && d.id !== designId) setDesignId(d.id);
  };

  const selectDesign = (id: string, index: number) => {
    setDesignId(id);
    carouselRef.current?.scrollTo({
      x: index * (CARD_W + CARD_GAP),
      animated: true,
    });
  };

  const onSend = async () => {
    if (!designId) {
      Alert.alert("Diqqat", "Sovg'a kartasini tanlang.");
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
        message: "",
        recipient_user_id: recipientUserId,
      });
      if (user?.id) {
        await rememberRecipientSent(user.id, {
          userId: recipientUserId,
          fullName: recipientName,
          walletMasked,
        });
      }
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
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.recipientCard}>
            <View style={[styles.avatar, { backgroundColor: avatarTone(recipientUserId) }]}>
              <Text style={styles.avatarText}>{initials(recipientName)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.toLabel}>Kimga</Text>
              <Text style={styles.toName} numberOfLines={1}>
                {recipientName}
              </Text>
              <Text style={styles.toMeta} numberOfLines={1}>
                {walletMasked}
              </Text>
            </View>
          </View>

          <Text style={styles.enterLabel}>Summani kiriting</Text>
          <View style={styles.amountBlock}>
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
            Balans: {formatSomLabel(me.balance)}
            {design ? ` · Dizayn ${formatSomLabel(fee)}` : ""}
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

          <Text style={styles.giftTitle}>Sovg'a kartasi</Text>
          <Text style={styles.giftHint}>Kartani tanlang — keyin yuborish ochiladi</Text>

          {designsLoading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={PURPLE} />
          ) : (
            <ScrollView
              ref={carouselRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={CARD_W + CARD_GAP}
              snapToAlignment="start"
              contentContainerStyle={styles.carousel}
              onMomentumScrollEnd={onCarouselScroll}
              onScrollEndDrag={onCarouselScroll}
            >
              {designs.map((d, idx) => {
                const c = designColorsById(d.id);
                const on = d.id === designId;
                const dFee = parseWalletBalance(d.fee);
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => selectDesign(d.id, idx)}
                    style={[styles.giftCardWrap, on && styles.giftCardWrapOn]}
                  >
                    <LinearGradient
                      colors={[c.from, c.to]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.giftCard}
                    >
                      {on ? (
                        <View style={styles.giftCheck}>
                          <Ionicons name="checkmark" size={14} color="#0A0A0A" />
                        </View>
                      ) : null}
                      <View style={styles.giftTop}>
                        <Ionicons name="gift" size={18} color={c.accent} />
                        <Text style={[styles.giftBrand, { color: c.accent }]}>Mysaloon</Text>
                      </View>
                      <Text style={[styles.giftName, { color: c.accent }]} numberOfLines={2}>
                        {(d.name_uz || d.name).toUpperCase()}
                      </Text>
                      <Text style={[styles.giftFee, { color: c.accent }]}>
                        Dizayn · {formatSomLabel(dFee)}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </ScrollView>

        {designId ? (
          <Pressable
            style={[styles.sendBtn, !canSend && styles.sendBtnOff]}
            disabled={!canSend}
            onPress={() => void onSend()}
          >
            {sending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.sendText}>Yuborish · {formatSomLabel(total)}</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "800",
    color: "#0A0A0A",
    letterSpacing: -0.3,
  },
  scroll: { paddingBottom: 20 },
  recipientCard: {
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: "#7C5CFF",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "800", color: "#FFF" },
  toLabel: { fontSize: 11, fontWeight: "600", color: "#9CA3AF", letterSpacing: 0.4 },
  toName: { marginTop: 2, fontSize: 16, fontWeight: "700", color: "#0A0A0A" },
  toMeta: { marginTop: 2, fontSize: 12, color: "#9CA3AF" },
  enterLabel: {
    marginTop: 32,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  amountBlock: {
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  amountInput: {
    width: "100%",
    fontSize: 52,
    fontWeight: "800",
    color: "#0A0A0A",
    letterSpacing: -1.6,
    textAlign: "center",
    padding: 0,
    includeFontPadding: false,
  },
  som: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "700",
    color: "#9CA3AF",
  },
  balanceHint: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
  },
  presets: {
    gap: 8,
    paddingVertical: 18,
    paddingHorizontal: 16,
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
  giftTitle: {
    marginTop: 4,
    marginHorizontal: 16,
    fontSize: 17,
    fontWeight: "800",
    color: "#0A0A0A",
  },
  giftHint: {
    marginTop: 4,
    marginBottom: 14,
    marginHorizontal: 16,
    fontSize: 13,
    color: "#9CA3AF",
  },
  carousel: {
    paddingHorizontal: SIDE_PAD,
    gap: CARD_GAP,
    paddingBottom: 8,
  },
  giftCardWrap: {
    width: CARD_W,
    borderRadius: 24,
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  giftCardWrapOn: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  giftCard: {
    height: 168,
    borderRadius: 24,
    padding: 18,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  giftCheck: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  giftTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  giftBrand: { fontSize: 13, fontWeight: "700" },
  giftName: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  giftFee: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.8,
  },
  sendBtn: {
    marginTop: 8,
    marginHorizontal: 16,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnOff: { opacity: 0.35 },
  sendText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
