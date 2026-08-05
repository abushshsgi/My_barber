import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";
import { NativeBackButton } from "./NativeBackButton";

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

  if (largeTitle) {
    return (
      <View style={[styles.largeWrap, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.largeTop}>
          {onBack ? <NativeBackButton onPress={onBack} /> : <View style={styles.spacer} />}
          {right ?? <View style={styles.spacer} />}
        </View>
        <Text style={styles.largeTitle}>{title}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: Math.max(insets.top, 8) },
        border && styles.border,
      ]}
    >
      <View style={styles.row}>
        {onBack ? <NativeBackButton onPress={onBack} /> : <View style={styles.spacer} />}
        <Text style={styles.title} numberOfLines={1}>
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
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  border: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: colors.fg,
    letterSpacing: -0.3,
  },
  right: {
    minWidth: 40,
    alignItems: "flex-end",
  },
  spacer: {
    width: 40,
    height: 40,
  },
  largeWrap: {
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  largeTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  largeTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillLight: {
    backgroundColor: colors.surface,
  },
  pillDark: {
    backgroundColor: colors.fg,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.fg,
  },
  pillTextDark: {
    color: "#FFFFFF",
  },
});
