import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { HomeCategoryKey } from "../../api/types";
import { CATEGORY_LABELS } from "../../lib/mappers";
import { colors } from "../../theme/colors";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

const KEYS: HomeCategoryKey[] = ["all", "barber", "beauty", "nails"];

type Props = {
  active: HomeCategoryKey;
  onChange: (key: HomeCategoryKey) => void;
};

/** Kategoriya chip'lari — Barchasi / Barber / Go'zallik / Manikyur. */
export function HomeCategories({ active, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {KEYS.map((key) => {
          const selected = key === active;
          return (
            <Pressable
              key={key}
              onPress={() => onChange(key)}
              style={[styles.chip, selected ? styles.chipOn : styles.chipOff]}
            >
              <Text style={[styles.label, selected ? styles.labelOn : styles.labelOff]}>
                {CATEGORY_LABELS[key]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingLeft: scale(16),
  },
  row: {
    gap: moderateScale(8),
    paddingRight: scale(16),
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
  },
  chipOn: {
    backgroundColor: colors.fg,
  },
  chipOff: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: "rgba(10,10,10,0.85)",
  },
  label: {
    fontSize: fontSize(12),
    fontWeight: "700",
  },
  labelOn: {
    color: "#FFFFFF",
  },
  labelOff: {
    color: colors.fg,
  },
});
