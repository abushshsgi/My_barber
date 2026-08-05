import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { colors } from "../../theme/colors";

type Props = {
  onPress: () => void;
  accessibilityLabel?: string;
};

/** Haqiqiy mobil orqaga — dumaloq hit area. */
export function NativeBackButton({
  onPress,
  accessibilityLabel = "Orqaga",
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
    >
      <Ionicons name="chevron-back" size={22} color={colors.fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
