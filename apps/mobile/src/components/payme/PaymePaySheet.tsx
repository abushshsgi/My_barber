import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeBottom } from "../../lib/safe-area";
import { morphFont } from "../../theme/morph-font";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";
import { useMorphAppearance } from "../../lib/MorphAppearanceContext";
import { SafeModal } from "../ui/SafeModal";

type Props = {
  visible: boolean;
  busy?: boolean;
  onClose: () => void;
  onPay: () => void;
};

const SHEET_OFF = 520;
const native = Platform.OS !== "web";

export function PaymePaySheet({ visible, busy, onClose, onPay }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors: pal } = useMorphAppearance();
  const [shown, setShown] = useState(visible);
  const shownRef = useRef(visible);
  const sheetY = useRef(new Animated.Value(SHEET_OFF)).current;
  const scrimOp = useRef(new Animated.Value(0)).current;
  const steps = [
    t("morph.paywall.payStep1"),
    t("morph.paywall.payStep2"),
    t("morph.paywall.payStep3"),
  ];

  useEffect(() => {
    if (visible) {
      shownRef.current = true;
      setShown(true);
      sheetY.setValue(SHEET_OFF);
      scrimOp.setValue(0);
      const frame = requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(scrimOp, {
            toValue: 1,
            duration: 360,
            easing: Easing.out(Easing.quad),
            useNativeDriver: native,
          }),
          Animated.timing(sheetY, {
            toValue: 0,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: native,
          }),
        ]).start();
      });
      return () => cancelAnimationFrame(frame);
    }
    if (!shownRef.current) return undefined;
    let cancelled = false;
    Animated.parallel([
      Animated.timing(scrimOp, {
        toValue: 0,
        duration: 280,
        easing: Easing.in(Easing.quad),
        useNativeDriver: native,
      }),
      Animated.timing(sheetY, {
        toValue: SHEET_OFF,
        duration: 400,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: native,
      }),
    ]).start(({ finished }) => {
      if (finished && !cancelled) {
        shownRef.current = false;
        setShown(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, sheetY, scrimOp]);

  return (
    <SafeModal
      visible={shown}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.wrap} pointerEvents="box-none">
        <Animated.View style={[styles.scrim, { opacity: scrimOp }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: pal.card,
              paddingBottom: safeBottom(insets.bottom, 18),
              transform: [{ translateY: sheetY }],
            },
          ]}
        >
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: pal.line }]} />
            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: pal.cardStrong }]}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color={pal.fg} />
            </Pressable>
          </View>

          <Text style={[styles.title, { color: pal.fg }]}>
            {t("morph.paywall.paySheetTitle")}
          </Text>
          <Text style={[styles.lead, { color: pal.muted }]}>
            {t("morph.paywall.paySheetLead")}
          </Text>

          <View style={styles.brands}>
            <View style={[styles.logo, { backgroundColor: "#0B1F4D" }]}>
              <Text style={[styles.logoText, { color: "#F5C518" }]}>HUMO</Text>
            </View>
            <View style={[styles.logo, { backgroundColor: "#1A56DB" }]}>
              <Text style={[styles.logoText, { color: "#FFFFFF" }]}>UZCARD</Text>
            </View>
            <View style={[styles.logo, { backgroundColor: "#5B21B6" }]}>
              <Text style={[styles.logoText, { color: "#FFFFFF" }]}>VISA</Text>
            </View>
            <View style={[styles.logo, styles.secure]}>
              <Ionicons name="shield-checkmark" size={14} color="#2563EB" />
              <Text style={styles.secureText}>3D Secure</Text>
            </View>
          </View>

          <View style={[styles.stepsBox, { backgroundColor: pal.cardStrong }]}>
            {steps.map((line, i) => (
              <View key={line} style={styles.stepRow}>
                <View style={[styles.stepNum, { backgroundColor: pal.fg }]}>
                  <Text style={[styles.stepNumText, { color: pal.bg }]}>{i + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: pal.fg }]}>{line}</Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={onPay}
            disabled={busy}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: pal.fg },
              pressed && !busy && styles.pressed,
              busy && styles.ctaBusy,
            ]}
          >
            {busy ? (
              <ActivityIndicator color={pal.bg} />
            ) : (
              <>
                <Text style={[styles.ctaText, { color: pal.bg }]}>
                  {t("morph.paywall.paySheetCta")}
                </Text>
                <Ionicons name="arrow-forward" size={18} color={pal.bg} />
              </>
            )}
          </Pressable>
        </Animated.View>
      </View>
    </SafeModal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17,17,17,0.46)",
  },
  sheet: {
    borderTopLeftRadius: moderateScale(28),
    borderTopRightRadius: moderateScale(28),
    paddingHorizontal: scale(22),
    paddingTop: verticalScale(10),
  },
  handleWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(14),
    minHeight: 28,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  closeBtn: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  brands: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: verticalScale(14),
  },
  logo: {
    minHeight: 28,
    paddingHorizontal: 9,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  secure: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: "#EEF2FF",
  },
  secureText: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "800",
    color: "#2563EB",
  },
  title: {
    ...morphFont,
    fontSize: fontSize(22),
    lineHeight: fontSize(28),
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  lead: {
    ...morphFont,
    marginTop: 8,
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
  },
  stepsBox: {
    marginTop: verticalScale(16),
    marginBottom: verticalScale(18),
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepNumText: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "800",
  },
  stepText: {
    ...morphFont,
    flex: 1,
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
  },
  cta: {
    minHeight: verticalScale(52),
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaBusy: { opacity: 0.7 },
  pressed: { opacity: 0.9 },
  ctaText: {
    ...morphFont,
    fontSize: fontSize(16),
    fontWeight: "800",
  },
});
