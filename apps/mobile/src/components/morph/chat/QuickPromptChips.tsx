import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { morphFont } from "../../../theme/morph-font";
import { useMorphAppearance } from "../../../lib/MorphAppearanceContext";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../../utils/responsive";

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
  const { colors: pal } = useMorphAppearance();

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
            {
              backgroundColor: pal.card,
              borderColor: pal.line,
            },
            disabled && styles.chipDisabled,
            pressed && { opacity: 0.85, backgroundColor: pal.cardStrong },
          ]}
          accessibilityRole="button"
        >
          <Ionicons
            name={CHIP_ICONS[item.id] ?? "sparkles-outline"}
            size={13}
            color={pal.fg}
          />
          <Text style={[styles.chipText, { color: pal.fg }]} numberOfLines={1}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingTop: verticalScale(4),
    paddingBottom: verticalScale(2),
    gap: moderateScale(8),
    flexGrow: 1,
    justifyContent: "flex-start",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(6),
    maxWidth: scale(220),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(16),
    borderWidth: 1,
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipText: {
    ...morphFont,
    fontSize: fontSize(12.5),
    lineHeight: fontSize(16),
    fontWeight: "500",
  },
});
