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
import { type AppLang, setAppLang } from "../lib/guest";
import { colors } from "../theme/colors";

type Props = {
  /** Til tanlash kerak (birinchi marta). */
  showLanguage?: boolean;
  onFinish: () => void;
  onLanguagePick?: (lang: AppLang) => void;
};

/**
 * Birinchi ochilish: Mysaloon logo (sodda) tepada,
 * pastda O'zbek / Русский. Ortiqcha tag/progress yo'q.
 */
export function SplashScreen({
  showLanguage = false,
  onFinish,
  onLanguagePick,
}: Props) {
  const insets = useSafeAreaInsets();
  const logoOp = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(16)).current;
  const langOp = useRef(new Animated.Value(0)).current;
  const langY = useRef(new Animated.Value(28)).current;
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
      // Til allaqachon tanlangan — qisqa ko'rsatib o'tkazamiz.
      setTimeout(() => onFinish(), 420);
    });
  }, [logoOp, logoY, langOp, langY, showLanguage, onFinish]);

  const pick = async (lang: AppLang) => {
    await setAppLang(lang);
    onLanguagePick?.(lang);
    onFinish();
  };

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + 72,
          paddingBottom: Math.max(insets.bottom, 16) + 20,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.brand,
          { opacity: logoOp, transform: [{ translateY: logoY }] },
        ]}
      >
        <Text style={styles.logo}>
          Mysaloon<Text style={styles.dot}>.</Text>
        </Text>
      </Animated.View>

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
          <Text style={styles.langHint}>Tilni tanlang · Выберите язык</Text>
          <Pressable
            style={({ pressed }) => [styles.langBtn, pressed && styles.langPressed]}
            onPress={() => void pick("uz")}
          >
            <Text style={styles.langTitle}>O'zbekcha</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.langBtn, pressed && styles.langPressed]}
            onPress={() => void pick("ru")}
          >
            <Text style={styles.langTitle}>Русский</Text>
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
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  brand: {
    alignItems: "center",
  },
  logo: {
    fontSize: 44,
    fontWeight: "900",
    color: colors.fg,
    letterSpacing: -1.4,
  },
  dot: {
    color: colors.brandDot,
  },
  langBlock: {
    gap: 10,
  },
  langSpacer: {
    height: 120,
  },
  langHint: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
    marginBottom: 6,
  },
  langBtn: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  langPressed: { opacity: 0.88 },
  langTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
