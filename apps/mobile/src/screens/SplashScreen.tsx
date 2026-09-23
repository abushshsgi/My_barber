import { useEffect, useRef, type ReactNode } from "react";
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
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from "react-native-svg";
import { safeBottom } from "../lib/safe-area";
import { type AppLang, setAppLang } from "../lib/guest";
import { setAppLanguage } from "../i18n/config";
import { morphFont } from "../theme/morph-font";
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

const LANGS: { id: AppLang; label: string }[] = [
  { id: "uz", label: "O‘zbek" },
  { id: "ru", label: "Русский" },
  { id: "en", label: "English" },
];

function FlagFrame({ children, id }: { children: ReactNode; id: string }) {
  return (
    <Svg width={scale(28)} height={scale(20)} viewBox="0 0 28 20">
      <Defs>
        <ClipPath id={id}>
          <Rect width="28" height="20" rx="3" />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${id})`}>{children}</G>
    </Svg>
  );
}

function FlagUz() {
  return (
    <FlagFrame id="flag-uz">
      <Rect width="28" height="20" fill="#0099B5" />
      <Rect y="6.6" width="28" height="6.8" fill="#FFFFFF" />
      <Rect y="13.4" width="28" height="6.6" fill="#1EB53A" />
      <Rect y="6.15" width="28" height="0.7" fill="#CE1126" />
      <Rect y="13.15" width="28" height="0.7" fill="#CE1126" />
      <Circle cx="6.4" cy="3.5" r="1.7" fill="#FFFFFF" />
      <Circle cx="7.15" cy="3.5" r="1.25" fill="#0099B5" />
      <Circle cx="10.2" cy="2.2" r="0.35" fill="#FFFFFF" />
      <Circle cx="11.2" cy="2.8" r="0.35" fill="#FFFFFF" />
      <Circle cx="11.6" cy="4" r="0.35" fill="#FFFFFF" />
    </FlagFrame>
  );
}

function FlagRu() {
  return (
    <FlagFrame id="flag-ru">
      <Rect width="28" height="20" fill="#FFFFFF" />
      <Rect y="6.67" width="28" height="6.66" fill="#0039A6" />
      <Rect y="13.33" width="28" height="6.67" fill="#D52B1E" />
    </FlagFrame>
  );
}

function FlagGb() {
  return (
    <FlagFrame id="flag-gb">
      <Rect width="28" height="20" fill="#012169" />
      <Path d="M0 0 L28 20 M28 0 L0 20" stroke="#FFFFFF" strokeWidth="5" />
      <Path d="M0 0 L28 20 M28 0 L0 20" stroke="#C8102E" strokeWidth="2.2" />
      <Rect x="11.2" width="5.6" height="20" fill="#FFFFFF" />
      <Rect y="7.2" width="28" height="5.6" fill="#FFFFFF" />
      <Rect x="12.4" width="3.2" height="20" fill="#C8102E" />
      <Rect y="8.4" width="28" height="3.2" fill="#C8102E" />
    </FlagFrame>
  );
}

const FLAGS = {
  uz: FlagUz,
  ru: FlagRu,
  en: FlagGb,
} as const;

/**
 * Til tanlash — oq fon, SVG bayroqlar, Jost.
 * Tugmalar animatsiyadan mustaqil bosiladi.
 */
export function SplashScreen({
  showLanguage = false,
  onFinish,
  onLanguagePick,
}: Props) {
  const insets = useSafeAreaInsets();
  const logoOp = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(16)).current;
  const langOp = useRef(new Animated.Value(showLanguage ? 0 : 1)).current;
  const langY = useRef(new Animated.Value(showLanguage ? 16 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOp, {
        toValue: 1,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoY, {
        toValue: 0,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    if (!showLanguage) {
      const timer = setTimeout(() => onFinish(), 900);
      return () => clearTimeout(timer);
    }

    Animated.parallel([
      Animated.timing(langOp, {
        toValue: 1,
        duration: 420,
        delay: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(langY, {
        toValue: 0,
        duration: 420,
        delay: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [logoOp, logoY, langOp, langY, showLanguage, onFinish]);

  const pick = (lang: AppLang) => {
    onLanguagePick?.(lang);
    onFinish();
    void setAppLang(lang);
    void setAppLanguage(lang);
  };

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top,
          paddingBottom: safeBottom(insets.bottom, 20),
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
          <Text style={styles.brand} selectable={false}>
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
            },
          ]}
        >
          {LANGS.map((item) => {
            const Flag = FLAGS[item.id];
            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.langBtn, pressed && styles.langBtnPressed]}
                onPress={() => pick(item.id)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                {({ pressed }) => (
                  <>
                    <View style={styles.flagWrap}>
                      <Flag />
                    </View>
                    <Text
                      selectable={false}
                      style={[styles.langTitle, pressed && styles.langTitlePressed]}
                    >
                      {item.label}
                    </Text>
                  </>
                )}
              </Pressable>
            );
          })}
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
    paddingHorizontal: scale(28),
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    ...morphFont,
    fontSize: fontSize(44),
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -1.4,
  },
  brandDot: {
    color: "#F97316",
  },
  langBlock: {
    gap: moderateScale(12),
    paddingBottom: verticalScale(8),
  },
  langSpacer: {
    height: verticalScale(128),
  },
  langBtn: {
    minHeight: verticalScale(58),
    borderRadius: moderateScale(999),
    borderWidth: 1.5,
    borderColor: "#111111",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(12),
    paddingHorizontal: scale(20),
    cursor: "pointer",
    userSelect: "none",
  },
  langBtnPressed: {
    backgroundColor: "#111111",
  },
  flagWrap: {
    width: scale(28),
    height: scale(20),
    borderRadius: moderateScale(3),
    overflow: "hidden",
  },
  langTitle: {
    ...morphFont,
    color: "#111111",
    fontSize: fontSize(17),
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  langTitlePressed: {
    color: "#FFFFFF",
  },
});
