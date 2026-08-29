import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { morphFont } from "../../../theme/morph-font";
import { SOFT_PAPER } from "../../../theme/morph-appearance";

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
            name={CHIP_ICONS[item.id] ?? "sparkles-outline"}
            size={13}
            color={SOFT_PAPER.fg}
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
    backgroundColor: SOFT_PAPER.card,
    borderWidth: 1,
    borderColor: SOFT_PAPER.line,
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipPressed: {
    opacity: 0.85,
    backgroundColor: SOFT_PAPER.soft,
  },
  chipText: {
    ...morphFont,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "500",
    color: SOFT_PAPER.fg,
  },
});
