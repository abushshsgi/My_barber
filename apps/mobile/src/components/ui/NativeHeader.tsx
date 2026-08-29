import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useShellTheme } from "../../lib/useShellTheme";
import { colors } from "../../theme/colors";
import { NativeBackButton } from "./NativeBackButton";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
  border?: boolean;
  largeTitle?: boolean;
};

/** Native stack header — back + title + optional right. */
export function NativeHeader({
  title,
  onBack,
  right,
  border = true,
  largeTitle = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const pal = useShellTheme();

  if (largeTitle) {
    return (
      <View style={[styles.largeWrap, { paddingTop: Math.max(insets.top, 12), backgroundColor: pal.bg }]}>
        <View style={styles.largeTop}>
          {onBack ? <NativeBackButton onPress={onBack} /> : <View style={styles.spacer} />}
          {right ?? <View style={styles.spacer} />}
        </View>
        <Text style={[styles.largeTitle, { color: pal.fg, fontFamily: pal.font.fontFamily }]}>
          {title}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: Math.max(insets.top, 8), backgroundColor: pal.bg },
        border && [styles.border, { borderBottomColor: pal.border }],
      ]}
    >
      <View style={styles.row}>
        {onBack ? <NativeBackButton onPress={onBack} /> : <View style={styles.spacer} />}
        <Text
          style={[styles.title, { color: pal.fg, fontFamily: pal.font.fontFamily }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <View style={styles.right}>{right ?? <View style={styles.spacer} />}</View>
      </View>
    </View>
  );
}

export function HeaderPill({
  label,
  icon,
  dark,
  onPress,
}: {
  label: string;
  icon?: ReactNode;
  dark?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, dark ? styles.pillDark : styles.pillLight]}
    >
      {icon}
      <Text style={[styles.pillText, dark && styles.pillTextDark]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bg,
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(10),
  },
  border: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    minHeight: verticalScale(44),
  },
  title: {
    flex: 1,
    fontSize: fontSize(17),
    fontWeight: "700",
    color: colors.fg,
    letterSpacing: -0.3,
  },
  right: {
    minWidth: scale(40),
    alignItems: "flex-end",
  },
  spacer: {
    width: scale(40),
    height: scale(40),
  },
  largeWrap: {
    backgroundColor: colors.bg,
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(8),
  },
  largeTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(8),
  },
  largeTitle: {
    fontSize: fontSize(28),
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.6,
    marginBottom: verticalScale(4),
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(6),
    borderRadius: 999,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
  },
  pillLight: {
    backgroundColor: colors.surface,
  },
  pillDark: {
    backgroundColor: colors.fg,
  },
  pillText: {
    fontSize: fontSize(12),
    fontWeight: "700",
    color: colors.fg,
  },
  pillTextDark: {
    color: "#FFFFFF",
  },
});
