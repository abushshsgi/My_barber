import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useProfileData } from "../../hooks/useProfileData";
import { useShellTheme } from "../../lib/useShellTheme";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<ProfileStackParamList, "Security">;

export function SecurityScreen({ navigation }: Props) {
  const data = useProfileData();
  const pal = useShellTheme();
  const hasPassword = Boolean(data.user?.has_password);

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <StatusBar style={pal.status} />
      <NativeHeader title="Kirish va xavfsizlik" onBack={() => navigation.goBack()} />
      <View style={[styles.card, { backgroundColor: pal.card, borderColor: pal.border }]}>
        <SecRow
          pal={pal}
          icon="key"
          title="Parol"
          subtitle={hasPassword ? "Parol o'rnatilgan" : "SMS orqali kirish"}
          action={hasPassword ? "O'zgartirish" : "Qo'shish"}
          onAction={() => navigation.navigate("SecurityPassword")}
        />
        <SecRow
          pal={pal}
          icon="phone-portrait"
          title="Kirish usuli"
          subtitle="Hisobingiz telefon raqami orqali tasdiqlangan."
        />
        <SecRow
          pal={pal}
          icon="laptop-outline"
          title="Faol sessiyalar"
          subtitle="Hisobingiz ochiq bo'lgan qurilmalarni ko'ring va bekor qiling."
          action="Boshqarish"
          onAction={() => navigation.navigate("SecuritySessions")}
          last
        />
      </View>
    </View>
  );
}

function SecRow({
  pal,
  icon,
  title,
  subtitle,
  action,
  onAction,
  last,
}: {
  pal: ReturnType<typeof useShellTheme>;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  last?: boolean;
}) {
  return (
    <View
      style={[styles.row, !last && styles.border, !last && { borderBottomColor: pal.border }]}
    >
      <View style={[styles.iconTile, { backgroundColor: pal.iconTile }]}>
        <Ionicons name={icon} size={18} color={pal.fg} />
      </View>
      <View style={styles.main}>
        <Text style={[styles.title, { color: pal.fg, fontFamily: pal.font.fontFamily }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.sub, { color: pal.muted, fontFamily: pal.font.fontFamily }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.action, { color: pal.accent, fontFamily: pal.font.fontFamily }]}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: {
    marginHorizontal: scale(16),
    marginTop: verticalScale(8),
    borderRadius: moderateScale(18),
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowOpacity: 0,
    elevation: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: moderateScale(14),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(16),
  },
  border: { borderBottomWidth: StyleSheet.hairlineWidth },
  iconTile: {
    width: scale(34),
    height: scale(34),
    borderRadius: moderateScale(10),
    alignItems: "center",
    justifyContent: "center",
  },
  main: { flex: 1 },
  title: { fontSize: fontSize(16), fontWeight: "700" },
  sub: { marginTop: verticalScale(4), fontSize: fontSize(13), lineHeight: fontSize(18) },
  action: { fontSize: fontSize(13), fontWeight: "600", marginTop: verticalScale(2) },
});
