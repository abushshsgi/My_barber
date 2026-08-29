import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMorphAppearance } from "../../../lib/MorphAppearanceContext";
import { morphFont } from "../../../theme/morph-font";

export type QuickPrompt = {
  id: string;
  label: string;
};

type Props = {
  prompts: QuickPrompt[];
  onSelect: (prompt: QuickPrompt) => void;
  disabled?: boolean;
};

const CHIP_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  face_shape: "happy-outline",
  style_pick: "sparkles",
  beard_style: "person-outline",
  care_routine: "water-outline",
  product_tips: "gift-outline",
  barber_visit: "cut-outline",
};

export function QuickPromptChips({ prompts, onSelect, disabled }: Props) {
  const { colors: pal, theme } = useMorphAppearance();
  const isDark = theme === "dark";

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {prompts.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => onSelect(item)}
          disabled={disabled}
          style={({ pressed }) => [
            styles.chip,
            isDark ? styles.chipDark : styles.chipLight,
            disabled && styles.chipDisabled,
            pressed && (isDark ? styles.chipPressedDark : styles.chipPressedLight),
          ]}
          accessibilityRole="button"
        >
          <Ionicons
            name={CHIP_ICONS[item.id] ?? "sparkles-outline"}
            size={13}
            color={isDark ? "#737373" : "#111111"}
          />
          <Text
            style={[
              styles.chipText,
              { color: isDark ? "#E4E4E7" : "#3F3F46" },
            ]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingTop: 4,
    paddingBottom: 2,
    gap: 8,
    flexGrow: 1,
    justifyContent: "flex-start",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: 220,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  chipLight: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.16)",
    shadowColor: "#111111",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  chipDark: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.25)",
    shadowColor: "#111111",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipPressedLight: {
    opacity: 0.85,
    backgroundColor: "rgba(237, 233, 254, 0.95)",
    borderColor: "rgba(124, 58, 237, 0.4)",
  },
  chipPressedDark: {
    opacity: 0.85,
    backgroundColor: "rgba(139, 92, 246, 0.22)",
    borderColor: "rgba(167, 139, 250, 0.5)",
  },
  chipText: {
    ...morphFont,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "500",
  },
});
