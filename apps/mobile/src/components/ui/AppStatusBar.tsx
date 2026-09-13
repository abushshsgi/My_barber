import { Platform, StatusBar as RNStatusBar } from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useEffect } from "react";

type Props = {
  /** Och fon → dark; to‘q/xarita → light */
  style?: "dark" | "light" | "auto";
};

/**
 * Expo + RN StatusBar — Android edge-to-edge da kontrast ishonchli bo‘lsin.
 */
export function AppStatusBar({ style = "dark" }: Props) {
  useEffect(() => {
    const bar =
      style === "light"
        ? "light-content"
        : style === "dark"
          ? "dark-content"
          : "default";
    RNStatusBar.setBarStyle(bar, true);
    if (Platform.OS === "android") {
      RNStatusBar.setTranslucent(true);
      RNStatusBar.setBackgroundColor("transparent", true);
    }
  }, [style]);

  return <ExpoStatusBar style={style} />;
}

/** Notch/status bar ostidagi yuqori padding — kontent safe area dan biroz pastroq. */
export function safeTop(insetsTop: number, extra = 10): number {
  const androidFallback =
    Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 28) : 0;
  /** Edge-to-edge da ba’zan insets.top=0 keladi — status bar balandligini kafolatla. */
  const iosFallback = Platform.OS === "ios" && insetsTop < 20 ? 47 : 0;
  return Math.max(insetsTop, androidFallback, iosFallback, 8) + extra;
}
