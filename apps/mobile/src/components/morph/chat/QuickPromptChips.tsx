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
            size={12}
            color="#5B5678"
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
    paddingTop: 12,
    paddingBottom: 2,
    gap: 6,
    flexGrow: 1,
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: 200,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.1)",
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipPressed: {
    opacity: 0.78,
    backgroundColor: "rgba(237, 233, 254, 0.9)",
  },
  chipText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "500",
    color: "#4C4768",
  },
});
