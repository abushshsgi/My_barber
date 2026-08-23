import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppShell } from "../../lib/AppShellContext";

type Props = {
  /** welcome — Get Started; creating — API; ready — tayyor; error — xato */
  phase?: "welcome" | "creating" | "ready" | "error";
  error?: string | null;
  cardholderName?: string;
  onGetStarted?: () => void;
};

const BG = "#F3F6F0";
const INK = "#0F3D2E";
const GREEN = "#1A5C45";
const CARD = "#C8E06A";
const CARD_BACK = "#1B3A2F";

/** Birinchi kirish — yashil kartali onboarding + hamyon yaratish. */
export function WalletCreatingScreen({
  phase = "welcome",
  error,
  cardholderName,
  onGetStarted,
}: Props) {
  const insets = useSafeAreaInsets();
  const { shell } = useAppShell();
  const isMorph = shell === "morph";
  const brand = isMorph ? "Morf AI" : "Mysaloon";
  const holder = (cardholderName || "Foydalanuvchi").trim();
  const tilt = useSharedValue(-8);
  const floatY = useSharedValue(0);

  useEffect(() => {
    tilt.value = withTiming(-10, { duration: 700, easing: Easing.out(Easing.cubic) });
    floatY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [tilt, floatY]);

  const cardAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }, { rotate: `${tilt.value}deg` }],
  }));

  const busy = phase === "creating" || phase === "ready";
  const ctaLabel =
    phase === "error"
      ? "Qayta urinish"
      : phase === "creating"
        ? "Yaratilmoqda…"
        : phase === "ready"
          ? "Tayyor!"
          : "Get Started";

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + 20,
          paddingBottom: Math.max(insets.bottom, 16) + 12,
        },
      ]}
    >
      <View style={styles.logoRow}>
        <View style={styles.logoBlock} />
        <View style={[styles.logoBlock, styles.logoBlockOffset]} />
        <Text style={styles.logoText}>{brand}</Text>
      </View>

      <View style={styles.stage}>
        <View style={styles.cardBack} />
        <Animated.View style={[styles.cardFrontWrap, cardAnim]}>
          <LinearGradient
            colors={[CARD, "#B5D45A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardFront}
          >
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.balLabel}>Mavjud balans</Text>
                <Text style={styles.balValue}>0 so'm</Text>
              </View>
              <View style={styles.chip} />
            </View>
            <Text style={styles.cardNumber}>•••• •••• •••• ••••</Text>
            <View style={styles.cardBottom}>
              <View style={{ flex: 1 }}>
                <Text style={styles.holderLabel}>Karta egasi</Text>
                <Text style={styles.holderName} numberOfLines={1}>
                  {holder}
                </Text>
              </View>
              <View style={styles.mc}>
                <View style={[styles.mcDot, { backgroundColor: "#EB001B" }]} />
                <View style={[styles.mcDot, styles.mcDotR, { backgroundColor: "#F79E1B" }]} />
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>
          {phase === "error"
            ? "Hamyon ochilmadi"
            : phase === "creating"
              ? "Hamyoningiz yaratilmoqda"
              : phase === "ready"
                ? "Hamyon tayyor!"
                : "Kundalik xarajatlaringizni oson kuzating"}
        </Text>
        <Text style={styles.sub}>
          {error
            ? error
            : phase === "creating"
              ? "Raqam berilmoqda va karta chiqarilmoqda…"
              : phase === "ready"
                ? "Balans va rekvizitlar tayyor."
                : "Byudjet, o'tkazma va to'lovlarni bitta hamyonda boshqaring — oddiy va xavfsiz."}
        </Text>
      </View>

      <Pressable
        style={[styles.cta, busy && styles.ctaBusy]}
        disabled={busy}
        onPress={onGetStarted}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
      >
        {phase === "creating" ? (
          <ActivityIndicator color="#FFF" />
        ) : phase === "ready" ? (
          <Ionicons name="checkmark" size={22} color="#FFF" />
        ) : (
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 24,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  logoBlock: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: GREEN,
  },
  logoBlockOffset: {
    marginTop: 8,
    marginLeft: -4,
  },
  logoText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "700",
    color: INK,
    letterSpacing: -0.2,
  },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 220,
  },
  cardBack: {
    position: "absolute",
    width: "86%",
    maxWidth: 320,
    aspectRatio: 1.586,
    borderRadius: 22,
    backgroundColor: CARD_BACK,
    transform: [{ rotate: "8deg" }, { translateY: 10 }],
  },
  cardFrontWrap: {
    width: "88%",
    maxWidth: 330,
  },
  cardFront: {
    aspectRatio: 1.586,
    borderRadius: 22,
    padding: 22,
    justifyContent: "space-between",
    shadowColor: "#0F3D2E",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  balLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(15,61,46,0.65)",
  },
  balValue: {
    marginTop: 4,
    fontSize: 26,
    fontWeight: "800",
    color: INK,
    letterSpacing: -0.6,
  },
  chip: {
    width: 36,
    height: 26,
    borderRadius: 5,
    backgroundColor: "#D4B06A",
    borderWidth: 1,
    borderColor: "rgba(15,61,46,0.2)",
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: INK,
    letterSpacing: 1.6,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  holderLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(15,61,46,0.55)",
    letterSpacing: 0.4,
  },
  holderName: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "700",
    color: INK,
  },
  mc: {
    width: 36,
    height: 24,
    justifyContent: "center",
  },
  mcDot: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    left: 0,
    opacity: 0.92,
  },
  mcDotR: {
    left: 12,
  },
  copy: {
    marginBottom: 20,
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: INK,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  sub: {
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(15,61,46,0.72)",
    maxWidth: 340,
  },
  cta: {
    height: 56,
    borderRadius: 28,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBusy: {
    opacity: 0.85,
  },
  ctaText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
