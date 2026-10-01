import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useShellTheme } from "../../lib/useShellTheme";
import { moderateScale, scale } from "../../utils/responsive";

export const NATIVE_BACK_SIZE = scale(38);
export const NATIVE_BACK_ICON = 20;

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

/** Bir xil orqaga — yumaloq kvadrat, ingichka chegara, strelka. */
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
  const tile = backgroundColor ?? pal.card;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: "rgba(0,0,0,0.08)", borderless: false, radius: 18 }}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: tile,
          borderColor: pal.border,
        },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Ionicons
        name={forward ? "arrow-forward" : "arrow-back"}
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
    borderRadius: moderateScale(13),
    borderWidth: StyleSheet.hairlineWidth,
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
