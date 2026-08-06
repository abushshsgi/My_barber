import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

type Props = {
  /** Wordmark ostida ko'rsatish (default true). */
  showWordmark?: boolean;
  size?: "md" | "lg" | "xl";
};

const SIZES = {
  md: { icon: 56, font: 28, gap: 12 },
  lg: { icon: 72, font: 34, gap: 14 },
  xl: { icon: 88, font: 40, gap: 16 },
} as const;

/** Markazlashgan Mysaloon brand — Uzum-uslubidagi splash/login. */
export function BrandLogo({ showWordmark = true, size = "lg" }: Props) {
  const s = SIZES[size];
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconRing, { width: s.icon + 16, height: s.icon + 16, borderRadius: (s.icon + 16) / 2 }]}>
        <Image
          source={require("../../assets/icon.png")}
          style={{ width: s.icon, height: s.icon, borderRadius: s.icon * 0.22 }}
          resizeMode="contain"
          accessibilityLabel="Mysaloon"
        />
      </View>
      {showWordmark ? (
        <Text style={[styles.wordmark, { fontSize: s.font, marginTop: s.gap }]}>
          Mysaloon<Text style={styles.dot}>.</Text>
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  iconRing: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F6FA",
  },
  wordmark: {
    fontWeight: "900",
    color: colors.fg,
    letterSpacing: -1.2,
    textAlign: "center",
  },
  dot: { color: colors.brandDot },
});
