import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useShellTheme } from "../../lib/useShellTheme";
import { moderateScale, scale } from "../../utils/responsive";

export const NATIVE_BACK_SIZE = scale(40);
export const NATIVE_BACK_ICON = 22;

type Props = {
  onPress: () => void;
  accessibilityLabel?: string;
  /** Icon color override (default: theme fg). */
  color?: string;
  /** Circle tile behind icon. Default uses shell iconTile. */
  backgroundColor?: string;
  /** Use chevron-forward instead of back. */
  forward?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Haqiqiy mobil orqaga — bir xil 40×40 dumaloq hit area. */
export function NativeBackButton({
  onPress,
  accessibilityLabel = "Orqaga",
  color,
  backgroundColor,
  forward = false,
  style,
}: Props) {
  const pal = useShellTheme();
  const iconColor = color ?? pal.fg;
  const tile = backgroundColor ?? pal.iconTile;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: "rgba(0,0,0,0.1)", borderless: true, radius: 22 }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: tile },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Ionicons
        name={forward ? "chevron-forward" : "chevron-back"}
        size={NATIVE_BACK_ICON}
        color={iconColor}
      />
    </Pressable>
  );
}

/** Header balance uchun bo‘sh joy — back bilan bir xil o‘lcham. */
export function NativeBackSpacer({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.btn, styles.spacer, style]} />;
}

const styles = StyleSheet.create({
  btn: {
    width: NATIVE_BACK_SIZE,
    height: NATIVE_BACK_SIZE,
    borderRadius: moderateScale(20),
    alignItems: "center",
    justifyContent: "center",
  },
  spacer: {
    backgroundColor: "transparent",
  },
  pressed: {
    opacity: 0.7,
  },
});
