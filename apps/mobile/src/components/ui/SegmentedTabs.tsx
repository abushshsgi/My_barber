import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Tab = { key: string; label: string };

type Props = {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
};

/** Native segmented control (Kelayotgan / Tarix). */
export function SegmentedTabs({ tabs, active, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      {tabs.map((tab) => {
        const on = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, on ? styles.tabOn : styles.tabOff]}
          >
            <Text style={[styles.label, on ? styles.labelOn : styles.labelOff]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: moderateScale(8),
  },
  tab: {
    borderRadius: 999,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(9),
  },
  tabOn: {
    backgroundColor: colors.fg,
  },
  tabOff: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: fontSize(13),
    fontWeight: "700",
  },
  labelOn: {
    color: "#FFF",
  },
  labelOff: {
    color: colors.muted,
  },
});
