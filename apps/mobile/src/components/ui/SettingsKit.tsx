import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { colors } from "../../theme/colors";

type RowProps = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconDark?: boolean;
  darkText?: boolean;
  trailing?: ReactNode;
  badge?: number;
  onPress?: () => void;
  last?: boolean;
  destructive?: boolean;
};

export function SettingsRow({
  title,
  subtitle,
  icon,
  iconDark,
  darkText,
  trailing,
  badge,
  onPress,
  last,
  destructive,
}: RowProps) {
  const body = (
    <View style={[styles.row, !last && styles.rowBorder, darkText && styles.rowDarkBorder]}>
      {icon ? (
        <View style={[styles.iconWrap, iconDark && styles.iconDark]}>
          <Ionicons name={icon} size={18} color={iconDark || darkText ? "#FFF" : colors.fg} />
        </View>
      ) : null}
      <View style={styles.textCol}>
        <Text
          style={[
            styles.title,
            darkText && styles.titleDark,
            destructive && styles.destructive,
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, darkText && styles.subtitleDark]}>{subtitle}</Text>
        ) : null}
      </View>
      {badge != null && badge > 0 ? (
        <View style={[styles.badge, darkText && styles.badgeOnDark]}>
          <Text style={[styles.badgeText, darkText && styles.badgeTextOnDark]}>
            {badge > 99 ? "99+" : badge}
          </Text>
        </View>
      ) : null}
      {trailing ??
        (onPress ? (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={darkText ? "rgba(255,255,255,0.55)" : colors.muted}
          />
        ) : null)}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {body}
    </Pressable>
  );
}

export function SettingsGroup({
  title,
  children,
  dark,
}: {
  title?: string;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <View style={styles.groupWrap}>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      <View style={[styles.group, dark && styles.groupDark]}>{children}</View>
    </View>
  );
}

export function ToggleRow({
  title,
  value,
  onValueChange,
  last,
}: {
  title: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{value ? "Yoqilgan" : "O'chirilgan"}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#D1D1D6", true: colors.fg }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#D1D1D6"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  groupWrap: {
    marginBottom: 20,
  },
  groupTitle: {
    marginBottom: 8,
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: colors.muted,
    textTransform: "uppercase",
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  groupDark: {
    backgroundColor: "#18181B",
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    minHeight: 56,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  pressed: {
    opacity: 0.82,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  iconDark: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.fg,
  },
  titleDark: {
    color: "#FFFFFF",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  subtitleDark: {
    color: "rgba(255,255,255,0.7)",
  },
  destructive: {
    color: "#FF3B30",
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeOnDark: {
    backgroundColor: "#FFFFFF",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFF",
  },
  badgeTextOnDark: {
    color: colors.fg,
  },
  rowDarkBorder: {
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
});
