import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

const KEYS: { label: string; sub?: string; action?: "back" | "empty" }[] = [
  { label: "1" },
  { label: "2", sub: "ABC" },
  { label: "3", sub: "DEF" },
  { label: "4", sub: "GHI" },
  { label: "5", sub: "JKL" },
  { label: "6", sub: "MNO" },
  { label: "7", sub: "PQRS" },
  { label: "8", sub: "TUV" },
  { label: "9", sub: "WXYZ" },
  { label: "", action: "empty" },
  { label: "0" },
  { label: "⌫", action: "back" },
];

type Props = {
  onDigit: (d: string) => void;
  onBackspace: () => void;
};

export function AmountKeypad({ onDigit, onBackspace }: Props) {
  return (
    <View style={styles.grid}>
      {KEYS.map((k, i) => {
        if (k.action === "empty") {
          return <View key={`e-${i}`} style={styles.key} />;
        }
        if (k.action === "back") {
          return (
            <Pressable
              key="back"
              style={styles.key}
              onPress={onBackspace}
              accessibilityRole="button"
              accessibilityLabel="O'chirish"
            >
              <Ionicons name="backspace-outline" size={22} color="#0A0A0A" />
            </Pressable>
          );
        }
        return (
          <Pressable
            key={k.label}
            style={styles.key}
            onPress={() => onDigit(k.label)}
            accessibilityRole="button"
            accessibilityLabel={k.label}
          >
            <Text style={styles.digit}>{k.label}</Text>
            {k.sub ? <Text style={styles.sub}>{k.sub}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  key: {
    width: "31%",
    aspectRatio: 1.55,
    borderRadius: 14,
    backgroundColor: "#FFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.08)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  digit: {
    fontSize: 22,
    fontWeight: "600",
    color: "#0A0A0A",
  },
  sub: {
    marginTop: 1,
    fontSize: 8,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: "#9CA3AF",
  },
});
