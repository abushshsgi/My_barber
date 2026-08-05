import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedImageColumns } from "../components/welcome/AnimatedImageColumns";
import { setWelcomeSeen } from "../lib/guest";
import { colors } from "../theme/colors";

type Props = {
  onFinish: () => void;
};

/**
 * Ilova birinchi ochilganda — rasmdagi Get Started layout.
 * Sartarosh + Morf AI kollaj ustunlari yuqoriga/pastga aylanadi.
 */
export function GetStartedScreen({ onFinish }: Props) {
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const galleryH = Math.min(Math.max(winH * 0.46, 280), 420);

  const onGetStarted = async () => {
    await setWelcomeSeen();
    onFinish();
  };

  return (
    <View style={[styles.outer, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.card}>
        <AnimatedImageColumns height={galleryH} />

        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>

        <View style={styles.copy}>
          <Text style={styles.title}>Sartaroshxonani{"\n"}oson bron qiling!</Text>
          <Text style={styles.subtitle}>
            Morf AI uslublar, yaqin sartaroshlar va salonlar — hammasi bir joyda.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={() => void onGetStarted()}
          accessibilityRole="button"
          accessibilityLabel="Boshlash"
        >
          <Text style={styles.ctaText}>Boshlash</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: "#EFEFEF",
    paddingHorizontal: 10,
  },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 36,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 20,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D8D8D8",
  },
  dotActive: {
    width: 22,
    backgroundColor: "#FF8A3D",
    borderRadius: 5,
  },
  copy: {
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: colors.fg,
    textAlign: "center",
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    color: colors.muted,
    textAlign: "center",
    maxWidth: 300,
  },
  cta: {
    marginTop: 12,
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: "#4DA3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPressed: { opacity: 0.88 },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
