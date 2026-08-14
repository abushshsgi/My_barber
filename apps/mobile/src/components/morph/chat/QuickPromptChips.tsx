import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

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
  style_pick: "sparkles-outline",
  care_routine: "water-outline",
  product_tips: "gift-outline",
  barber_visit: "cut-outline",
};

export function QuickPromptChips({ prompts, onSelect, disabled }: Props) {
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
            disabled && styles.chipDisabled,
            pressed && styles.chipPressed,
          ]}
          accessibilityRole="button"
        >
          <Ionicons
            name={CHIP_ICONS[item.id] ?? "ellipse-outline"}
            size={14}
            color="#3F3F46"
          />
          <Text style={styles.chipText} numberOfLines={1}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingTop: 16,
    paddingBottom: 4,
    gap: 8,
    flexGrow: 1,
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: 220,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#EBEAE7",
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipPressed: {
    opacity: 0.78,
  },
  chipText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "500",
    color: "#3F3F46",
  },
});
