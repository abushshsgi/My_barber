import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { formatSomLabel } from "../../lib/wallet-format";

type Props = {
  balance: number;
  cardholderName?: string;
  walletNumber?: string;
};

function maskNumber(n?: string) {
  if (!n) return "•••• •••• •••• ••••";
  const digits = n.replace(/\D/g, "");
  if (digits.length < 8) return n;
  const groups = digits.match(/.{1,4}/g) || [];
  return groups.join(" ");
}

export function WalletPlasticCard({ balance, cardholderName, walletNumber }: Props) {
  return (
    <View style={styles.wrap}>
      <LinearGradient colors={["#1A1A1A", "#0A0A0A"]} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.top}>
          <View style={styles.chip} />
          <Text style={styles.brand}>
            Mysaloon<Text style={styles.dot}>.</Text>
          </Text>
        </View>
        <View style={styles.mid}>
          <Text style={styles.balLabel}>BALANS</Text>
          <Text style={styles.bal}>{formatSomLabel(balance)}</Text>
        </View>
        <View style={styles.bottom}>
          <View style={{ flex: 1 }}>
            <Text style={styles.holderLabel}>EGASI</Text>
            <Text style={styles.holder} numberOfLines={1}>
              {(cardholderName || "FOYDALANUVCHI").toUpperCase()}
            </Text>
          </View>
          <Ionicons name="wifi" size={22} color="rgba(255,255,255,0.55)" style={{ transform: [{ rotate: "90deg" }] }} />
        </View>
        <Text style={styles.number}>{maskNumber(walletNumber)}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  card: {
    aspectRatio: 1.586,
    padding: 22,
    justifyContent: "space-between",
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chip: {
    width: 38,
    height: 28,
    borderRadius: 5,
    backgroundColor: "#C4A574",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  brand: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  dot: { color: colors.brandDot },
  mid: { marginTop: 8 },
  balLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  bal: {
    marginTop: 4,
    color: "#FFF",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  bottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  holderLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  holder: {
    marginTop: 2,
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  number: {
    marginTop: 10,
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1.5,
    fontVariant: ["tabular-nums"],
  },
});
