import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";
import { useShellTheme } from "../../lib/useShellTheme";

type Props = {
  onPress: () => void;
  accessibilityLabel?: string;
};

/** Haqiqiy mobil orqaga — dumaloq hit area. */
export function NativeBackButton({
  onPress,
  accessibilityLabel = "Orqaga",
}: Props) {
  const pal = useShellTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: "rgba(0,0,0,0.1)", borderless: true, radius: 22 }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: pal.iconTile },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name="chevron-back" size={22} color={pal.fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
