import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMorphAppearance } from "../../lib/MorphAppearanceContext";
import { safeBottom, safeTop } from "../../lib/safe-area";
import { morphFont } from "../../theme/morph-font";
import { fontSize, scale, verticalScale } from "../../utils/responsive";

type Props = {
  title: string;
  body: string;
  cta: string;
  backA11y: string;
  onOpenCare: () => void;
  onBack: () => void;
};

export function HairProfileGate({ title, body, cta, backA11y, onOpenCare, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { colors: pal } = useMorphAppearance();
  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: pal.bg,
          paddingTop: safeTop(insets.top, 12),
          paddingBottom: safeBottom(insets.bottom, 24),
        },
      ]}
    >
      <Pressable style={styles.back} onPress={onBack} accessibilityLabel={backA11y} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={pal.fg} />
      </Pressable>
      <View style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: pal.fg + "10" }]}>
          <Ionicons name="leaf-outline" size={28} color={pal.fg} />
        </View>
        <Text style={[styles.title, { color: pal.fg }]}>{title}</Text>
        <Text style={[styles.body, { color: pal.muted }]}>{body}</Text>
        <Pressable style={[styles.cta, { backgroundColor: pal.fg }]} onPress={onOpenCare}>
          <Text style={[styles.ctaText, { color: pal.bg }]}>{cta}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: scale(24),
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,17,17,0.06)",
  },
  card: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: verticalScale(48),
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginTop: verticalScale(20),
    fontFamily: morphFont.semibold,
    fontSize: fontSize(22),
    lineHeight: fontSize(28),
    letterSpacing: -0.4,
    textAlign: "center",
  },
  body: {
    marginTop: verticalScale(10),
    maxWidth: 320,
    fontFamily: morphFont.regular,
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    textAlign: "center",
  },
  cta: {
    marginTop: verticalScale(28),
    minHeight: 52,
    paddingHorizontal: scale(28),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    fontFamily: morphFont.semibold,
    fontSize: fontSize(15),
    letterSpacing: -0.2,
  },
});
