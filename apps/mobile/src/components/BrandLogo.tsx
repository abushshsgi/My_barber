import { Image, StyleSheet, View } from "react-native";

type Props = {
  /** Wordmark ostida ko'rsatish (default true). Brand PNG allaqachon wordmark. */
  showWordmark?: boolean;
  size?: "md" | "lg" | "xl";
};

const SIZES = {
  md: { icon: 160 },
  lg: { icon: 220 },
  xl: { icon: 280 },
} as const;

/** Markazlashgan Mysaloon brand — native splash bilan bir xil. */
export function BrandLogo({ size = "lg" }: Props) {
  const s = SIZES[size];
  return (
    <View style={styles.wrap}>
      <Image
        source={require("../../assets/brand/mysaloon-logo.png")}
        style={{ width: s.icon, height: s.icon }}
        resizeMode="contain"
        accessibilityLabel="Mysaloon"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
});
