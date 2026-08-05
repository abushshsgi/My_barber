import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useProfileData } from "../../hooks/useProfileData";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<ProfileStackParamList, "Security">;

function SecRow({
  title,
  subtitle,
  action,
  onAction,
  last,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.border]}>
      <View style={styles.main}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function SecurityScreen({ navigation }: Props) {
  const data = useProfileData();
  const hasPassword = Boolean(data.user?.has_password);

  return (
    <View style={styles.root}>
      <NativeHeader title="Kirish va xavfsizlik" onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <SecRow
          title="Parol"
          subtitle={hasPassword ? "Parol o'rnatilgan" : "SMS orqali kirish"}
          action={hasPassword ? "O'zgartirish" : "Qo'shish"}
        />
        <SecRow
          title="Kirish usuli"
          subtitle="Hisobingiz telefon raqami orqali tasdiqlangan."
        />
        <SecRow
          title="Faol sessiyalar"
          subtitle={"Hisobingiz ochiq bo'lgan qurilmalarni ko'ring va bekor qiling."}
          action="Boshqarish"
          last
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: 16 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 18,
  },
  border: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  main: { flex: 1 },
  title: { fontSize: 16, fontWeight: "700", color: colors.fg },
  sub: { marginTop: 4, fontSize: 13, lineHeight: 18, color: colors.muted },
  action: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.fg,
    textDecorationLine: "underline",
    marginTop: 2,
  },
});
