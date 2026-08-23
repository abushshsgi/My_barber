import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { parseWalletBalance } from "../../api/wallet";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { useGiftDesigns } from "../../hooks/useWallet";
import { designColorsById, formatSomLabel } from "../../lib/wallet-format";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletGift">;

/** 1-qadam: sovg'a karta dizaynini tanlash. */
export function WalletGiftScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const { designs, loading } = useGiftDesigns();
  const [designId, setDesignId] = useState("classic");

  useEffect(() => {
    if (designs.length && !designs.find((d) => d.id === designId)) {
      setDesignId(designs[0]!.id);
    }
  }, [designs, designId]);

  const design = designs.find((d) => d.id === designId) ?? designs[0];
  const fee = design ? parseWalletBalance(design.fee) : 5_000;
  const palette = designColorsById(design?.id ?? designId);

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <NativeHeader title="Sovg'a yuborish" onBack={() => navigation.goBack()} />
      <Text style={styles.lead}>Avval sovg'a kartasini tanlang.</Text>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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
          <Text style={[styles.previewHint, { color: palette.accent }]}>
            Dizayn · {formatSomLabel(fee)}
          </Text>
        </LinearGradient>

        <Text style={styles.section}>DIZAYNNI TANLANG</Text>
        {loading ? (
          <ActivityIndicator color={colors.fg} />
        ) : (
          <View style={styles.grid}>
            {designs.map((d) => {
              const c = designColorsById(d.id);
              const active = d.id === designId;
              const dFee = parseWalletBalance(d.fee);
              return (
                <Pressable
                  key={d.id}
                  onPress={() => setDesignId(d.id)}
                  style={[styles.cardPick, active && styles.cardPickOn]}
                >
                  <LinearGradient colors={[c.from, c.to]} style={styles.miniCard}>
                    {active ? (
                      <View style={styles.check}>
                        <Ionicons name="checkmark" size={14} color="#0A0A0A" />
                      </View>
                    ) : null}
                    <Text style={[styles.miniName, { color: c.accent }]} numberOfLines={1}>
                      {d.name_uz || d.name}
                    </Text>
                  </LinearGradient>
                  <Text style={styles.miniFee}>{formatSomLabel(dFee)}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Pressable
        style={[styles.cta, !design && styles.ctaOff]}
        disabled={!design}
        onPress={() =>
          navigation.navigate("WalletGiftAmount", { designId: design?.id ?? designId })
        }
      >
        <Text style={styles.ctaText}>Davom etish</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  lead: {
    paddingHorizontal: 16,
    marginTop: -4,
    marginBottom: 8,
    fontSize: 13,
    color: colors.muted,
  },
  content: { padding: 16, paddingBottom: 24 },
  preview: {
    borderRadius: 26,
    padding: 20,
    minHeight: 160,
  },
  previewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: { fontSize: 14, fontWeight: "700" },
  designName: {
    marginTop: 36,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  previewHint: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.75,
  },
  section: {
    marginTop: 22,
    marginBottom: 12,
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 1.1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  cardPick: { width: "47%" },
  cardPickOn: { opacity: 1 },
  miniCard: {
    height: 88,
    borderRadius: 18,
    padding: 12,
    justifyContent: "flex-end",
  },
  check: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  miniName: { fontSize: 13, fontWeight: "700" },
  miniFee: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  cta: {
    marginHorizontal: 16,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaOff: { opacity: 0.4 },
  ctaText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
