import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  MAX_GIFT_AMOUNT,
  MIN_GIFT_AMOUNT,
  parseWalletBalance,
} from "../../api/wallet";
import { AmountKeypad } from "../../components/wallet/AmountKeypad";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useGiftDesigns, useWalletMe } from "../../hooks/useWallet";
import { formatSomAmount, formatSomLabel } from "../../lib/wallet-format";
import type { WalletStackParamList } from "../../navigation/WalletStack";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletGiftAmount">;

const PRESETS = [50_000, 100_000, 200_000, 500_000, 1_000_000] as const;

/** 2-qadam: o'tkazma summasi (keypad). */
export function WalletGiftAmountScreen({ navigation, route }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const { designId } = route.params;
  const me = useWalletMe();
  const { designs } = useGiftDesigns();
  const design = designs.find((d) => d.id === designId);
  const fee = design ? parseWalletBalance(design.fee) : 5_000;

  const [digits, setDigits] = useState("100000");
  const amount = useMemo(() => {
    const n = Number(digits.replace(/\D/g, "")) || 0;
    return Math.min(n, MAX_GIFT_AMOUNT);
  }, [digits]);

  const valid = amount >= MIN_GIFT_AMOUNT && amount <= MAX_GIFT_AMOUNT;
  const total = amount + fee;

  const onDigit = (d: string) => {
    setDigits((prev) => {
      const next = `${prev}${d}`.replace(/^0+(?=\d)/, "");
      if (next.length > 9) return prev;
      const n = Number(next) || 0;
      if (n > MAX_GIFT_AMOUNT) return String(MAX_GIFT_AMOUNT);
      return next;
    });
  };

  const onBackspace = () => {
    setDigits((prev) => prev.slice(0, -1));
  };

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <NativeHeader title="Summa" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text style={styles.title}>Summani kiriting</Text>
        <Text style={styles.sub}>
          O'tkazmoqchi bo'lgan summani tanlang yoki yozing.
        </Text>

        <View style={styles.amountWrap}>
          <View style={styles.glow} />
          <Text style={styles.amount}>{formatSomAmount(amount)} so'm</Text>
          <Text style={styles.balance}>
            Balansingiz: {formatSomLabel(me.balance)}
          </Text>
          <Text style={styles.feeLine}>
            Dizayn {formatSomLabel(fee)} · Jami {formatSomLabel(total)}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presets}
        >
          {PRESETS.map((p) => {
            const on = amount === p;
            return (
              <Pressable
                key={p}
                style={[styles.preset, on && styles.presetOn]}
                onPress={() => setDigits(String(p))}
              >
                <Text style={[styles.presetText, on && styles.presetTextOn]}>
                  {formatSomAmount(p)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          style={[styles.cta, !valid && styles.ctaOff]}
          disabled={!valid}
          onPress={() =>
            navigation.navigate("WalletGiftSend", { designId, amount })
          }
        >
          <Text style={styles.ctaText}>Davom etish</Text>
        </Pressable>

        <View style={styles.keypad}>
          <AmountKeypad onDigit={onDigit} onBackspace={onBackspace} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7F7F8" },
  body: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0A0A0A",
    letterSpacing: -0.5,
  },
  sub: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#8E8E93",
  },
  amountWrap: {
    marginTop: 28,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  glow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  amount: {
    fontSize: 40,
    fontWeight: "800",
    color: "#0A0A0A",
    letterSpacing: -1,
  },
  balance: {
    marginTop: 8,
    fontSize: 13,
    color: "#8E8E93",
  },
  feeLine: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  presets: {
    gap: 8,
    paddingVertical: 18,
  },
  preset: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.1)",
  },
  presetOn: {
    backgroundColor: "#0A0A0A",
    borderColor: "#0A0A0A",
  },
  presetText: { fontSize: 13, fontWeight: "700", color: "#0A0A0A" },
  presetTextOn: { color: "#FFF" },
  cta: {
    height: 54,
    borderRadius: 27,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  ctaOff: { opacity: 0.35 },
  ctaText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  keypad: { marginTop: 4 },
});
