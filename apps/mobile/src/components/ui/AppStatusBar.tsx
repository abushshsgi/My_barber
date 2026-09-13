import { Platform, StatusBar as RNStatusBar } from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useEffect } from "react";

export {
  SAFE_BOTTOM_MIN,
  SAFE_TOP_MIN,
  safeBottom,
  safeBottomPad,
  safeTop,
  useSafePads,
} from "../../lib/safe-area";

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
