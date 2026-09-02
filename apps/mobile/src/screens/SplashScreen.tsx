import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type AppLang, setAppLang } from "../lib/guest";
import { setAppLanguage } from "../i18n/config";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../utils/responsive";

type Props = {
  /** Til tanlash kerak (birinchi marta). */
  showLanguage?: boolean;
  onFinish: () => void;
  onLanguagePick?: (lang: AppLang) => void;
};

const LANGS: { id: AppLang; label: string; flag: string }[] = [
  { id: "uz", label: "O'zbek", flag: "🇺🇿" },
  { id: "ru", label: "Русский", flag: "🇷🇺" },
  { id: "en", label: "English", flag: "🇬🇧" },
];

/**
 * Til tanlash — oq fon, bayroqlar, qorong‘u status bar ikonlari.
 */
export function SplashScreen({
  showLanguage = false,
  onFinish,
  onLanguagePick,
}: Props) {
  const insets = useSafeAreaInsets();
  const logoOp = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(20)).current;
  const langOp = useRef(new Animated.Value(0)).current;
  const langY = useRef(new Animated.Value(24)).current;
  const [langReady, setLangReady] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOp, {
        toValue: 1,
        duration: 560,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoY, {
        toValue: 0,
        duration: 560,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      if (showLanguage) {
        setLangReady(true);
        Animated.parallel([
          Animated.timing(langOp, {
            toValue: 1,
            duration: 380,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(langY, {
            toValue: 0,
            duration: 380,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
        return;
      }
      setTimeout(() => onFinish(), 420);
    });
  }, [logoOp, logoY, langOp, langY, showLanguage, onFinish]);

  const pick = async (lang: AppLang) => {
    await setAppLang(lang);
    await setAppLanguage(lang);
    onLanguagePick?.(lang);
    onFinish();
  };

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 12) + 16,
        },
      ]}
    >
      <StatusBar style="dark" />
      <View style={styles.center}>
        <Animated.View
          style={{
            opacity: logoOp,
            transform: [{ translateY: logoY }],
            alignItems: "center",
          }}
        >
          <Text style={styles.brand}>
            Mysaloon
            <Text style={styles.brandDot}>.</Text>
          </Text>
        </Animated.View>
      </View>

      {showLanguage ? (
        <Animated.View
          style={[
            styles.langBlock,
            {
              opacity: langOp,
              transform: [{ translateY: langY }],
              pointerEvents: langReady ? "auto" : "none",
            },
          ]}
        >
          {LANGS.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.langBtn, pressed && styles.pressed]}
              onPress={() => void pick(item.id)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Text style={styles.flag}>{item.flag}</Text>
              <Text style={styles.langTitle}>{item.label}</Text>
            </Pressable>
          ))}
        </Animated.View>
      ) : (
        <View style={styles.langSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: scale(24),
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontSize: fontSize(42),
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -1.2,
  },
  brandDot: {
    color: "#F97316",
  },
  langBlock: {
    gap: moderateScale(12),
  },
  langSpacer: {
    height: verticalScale(128),
  },
  langBtn: {
    minHeight: verticalScale(56),
    borderRadius: moderateScale(28),
    borderWidth: 1.5,
    borderColor: "#111111",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: scale(12),
    paddingHorizontal: scale(20),
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  flag: {
    fontSize: fontSize(22),
  },
  langTitle: {
    color: "#111111",
    fontSize: fontSize(16),
    fontWeight: "700",
  },
});
