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
 * Onboarding — Uzum Tezkor: markaziy kollaj, matn, pastida pill CTA.
 */
export function GetStartedScreen({ onFinish }: Props) {
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const galleryH = Math.min(Math.max(winH * 0.42, 260), 380);

  const onGetStarted = async () => {
    await setWelcomeSeen();
    onFinish();
  };

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, 12) + 16,
        },
      ]}
    >
      <View style={styles.top}>
        <AnimatedImageColumns height={galleryH} />

        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        <Text style={styles.title}>
          Sartaroshxonani{"\n"}oson bron qiling
        </Text>
        <Text style={styles.subtitle}>
          Morf AI uslublar, yaqin salonlar va bron — hammasi bir joyda.
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        onPress={() => void onGetStarted()}
        accessibilityRole="button"
        accessibilityLabel="Davom etish"
      >
        <Text style={styles.ctaText}>Davom etish</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  top: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E5E5EA",
  },
  dotActive: {
    backgroundColor: colors.fg,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  title: {
    marginTop: 8,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
    color: colors.fg,
    textAlign: "center",
    letterSpacing: -0.5,
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
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
