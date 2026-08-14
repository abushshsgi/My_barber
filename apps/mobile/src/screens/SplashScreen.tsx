import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandLogo } from "../components/BrandLogo";
import { type AppLang, setAppLang } from "../lib/guest";
import { setAppLanguage } from "../i18n/config";
import { colors } from "../theme/colors";

type Props = {
  /** Til tanlash kerak (birinchi marta). */
  showLanguage?: boolean;
  onFinish: () => void;
  onLanguagePick?: (lang: AppLang) => void;
};

/**
 * Uzum Tezkor uslubi: logo o'rtada, pastida outline pill til tugmalari.
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
      <View style={styles.center}>
        <Animated.View
          style={{ opacity: logoOp, transform: [{ translateY: logoY }] }}
        >
          <BrandLogo size="xl" />
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
          <Pressable
            style={({ pressed }) => [styles.langBtn, pressed && styles.pressed]}
            onPress={() => void pick("ru")}
          >
            <Text style={styles.langTitle}>Русский</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.langBtn, pressed && styles.pressed]}
            onPress={() => void pick("uz")}
          >
            <Text style={styles.langTitle}>O'zbek</Text>
          </Pressable>
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
    paddingHorizontal: 24,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  langBlock: {
    gap: 12,
  },
  langSpacer: {
    height: 128,
  },
  langBtn: {
    minHeight: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.fg,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  langTitle: {
    color: colors.fg,
    fontSize: 16,
    fontWeight: "700",
  },
});
